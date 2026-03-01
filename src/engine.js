import { LEVEL, MODES, expandLasers } from './level.js';
import { intersects, ParticleSystem, Player } from './entities.js';

const FIXED_DT = 1 / 120;

export class GameEngine {
  constructor(canvas, audio, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audio;
    this.ui = ui;

    this.level = LEVEL;
    this.player = new Player(LEVEL);
    this.particles = new ParticleSystem();

    this.events = {
      portals: [...LEVEL.modePortals],
      hazards: [...LEVEL.hazards, ...expandLasers(LEVEL)],
      pickups: [...LEVEL.collectibles],
    };

    this.state = 'menu';
    this.runType = 'normal';
    this.songTime = 0;
    this.totalTime = 0;
    this.distance = 0;
    this.attempt = 1;
    this.accum = 0;
    this.beatIndex = 0;
    this.offset = 0;
    this.showHitboxes = false;
    this.sarcasm = 65;
    this.lastNarrator = 0;
    this.toast = '';
    this.toastTimer = 0;
    this.checkpoint = null;
    this.paused = false;
    this.replayIdx = 0;
    this.replayFinished = false;
    this.konami = '';
    this.capyMode = false;
    this.cameraShake = 0;

    this.activeHazards = [];
    this.activePickups = [];
    this.activePortals = [];

    this.worldWidth = LEVEL.duration * LEVEL.speed;

    this.narratorLines = [
      'Рассказчик: Отличный план. Он даже похож на план.',
      'Рассказчик: Вы выглядите как человек, который знает Ctrl+Z.',
      'Плохой совет: нажми Alt+F4 для супер-прыжка. (НЕ НАЖИМАЙ)',
      'Поддержка: ну бывает. Но давай без "ну бывает".',
      'Рассказчик: Секрет успеха — кофе и лёгкая паника.',
      'Рассказчик: Если видишь шипы с текстом "потом" — это ловушка времени.',
      'Плохой совет: дедлайн боится, если смотреть на него немигая.',
    ];

    this.achievements = new Set();

    this.audio.onBeat((beat) => {
      this.beatIndex = beat;
      if (beat % 4 === 0) this.particles.emit(this.player.x + 10, this.level.floorY - 8, '#7df9ff', 3, 90);
    });

    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.scale = this.canvas.height / 540;
  }

  start(runType = 'normal') {
    this.runType = runType;
    this.state = 'playing';
    this.songTime = 0;
    this.totalTime = 0;
    this.distance = 0;
    this.accum = 0;
    this.player.reset();
    this.paused = false;
    this.activeHazards.length = 0;
    this.activePickups.length = 0;
    this.activePortals.length = 0;
    this.resetEventQueues();
    this.replayIdx = 0;
    this.replayFinished = false;
    this.cameraShake = 0;
    this.toastMessage('ПОГНАЛИ. Фестиваль Дедлайна официально нервничает.');
    this.audio.ensureStart();
  }

  input(isDown) {
    if (this.state !== 'playing') return;
    this.player.setInput(isDown);
  }

  togglePause() {
    if (this.state !== 'playing') return;
    this.paused = !this.paused;
    this.toastMessage(this.paused ? 'Пауза. Можно пофилософствовать о сроках.' : 'С паузы в дедлайн — как в холодный душ.');
  }

  setCheckpoint() {
    if (this.runType !== 'practice') return;
    this.checkpoint = {
      songTime: this.songTime,
      distance: this.distance,
      y: this.player.y,
      mode: this.player.mode,
    };
    this.toastMessage('Чекпоинт поставлен. Ответственность тоже.');
  }

  restartFromCheckpoint() {
    if (this.checkpoint && this.runType === 'practice') {
      this.songTime = this.checkpoint.songTime;
      this.distance = this.checkpoint.distance;
      this.player.reset(this.checkpoint.y);
      this.player.applyMode(this.checkpoint.mode);
      this.activeHazards.length = 0;
      this.activePickups.length = 0;
      this.activePortals.length = 0;
      this.reseedByTime(this.songTime);
      this.state = 'playing';
      this.toastMessage('Рестарт к чекпоинту. Хроно-магия одобряет.');
      return;
    }
    this.attempt += 1;
    this.start(this.runType);
  }

  reseedByTime(t) {
    for (const h of this.events.hazards) if (h.t < t + 4 && h.t > t - 2) this.activeHazards.push({ ...h, hit: false });
    for (const p of this.events.pickups) if (p.t < t + 4 && p.t > t - 2) this.activePickups.push({ ...p, got: false });
    for (const m of this.events.portals) if (m.t < t + 4 && m.t > t - 2) this.activePortals.push({ ...m, used: false });
  }

  update(realDt) {
    if (this.state !== 'playing' || this.paused) {
      this.draw();
      return;
    }

    this.accum += Math.min(realDt, 0.08);
    while (this.accum >= FIXED_DT) {
      this.step(FIXED_DT);
      this.accum -= FIXED_DT;
    }

    this.draw();
  }

  step(dt) {
    const timeScale = this.runType === 'replay' ? 3 : 1;
    const simDt = dt * timeScale;
    this.songTime += simDt;
    this.totalTime += dt;
    this.distance += this.level.speed * this.player.speedMul * simDt;
    this.audio.update(this.songTime + this.offset);
    this.player.tick(simDt);
    this.particles.update(simDt);

    this.spawnEvents();
    this.runReplay();
    this.collisions();
    this.updateToast(simDt);

    if (this.cameraShake > 0) this.cameraShake -= simDt;

    if (this.songTime - this.lastNarrator > 2.5 && Math.random() < this.sarcasm / 1000) {
      this.lastNarrator = this.songTime;
      this.toastMessage(this.narratorLines[(Math.random() * this.narratorLines.length) | 0]);
    }

    if (this.songTime >= this.level.duration) {
      this.finish(true);
    }
  }

  runReplay() {
    if (this.runType !== 'replay') return;
    const arr = this.level.replay;
    while (this.replayIdx < arr.length && arr[this.replayIdx].t <= this.songTime) {
      this.player.setInput(arr[this.replayIdx].down);
      this.replayIdx += 1;
    }
    if (this.replayIdx >= arr.length) this.replayFinished = true;
  }

  spawnEvents() {
    while (this.events.hazards.length && this.events.hazards[0].t < this.songTime + 5) {
      this.activeHazards.push({ ...this.events.hazards.shift(), hit: false });
    }
    while (this.events.pickups.length && this.events.pickups[0].t < this.songTime + 5) {
      this.activePickups.push({ ...this.events.pickups.shift(), got: false });
    }
    while (this.events.portals.length && this.events.portals[0].t < this.songTime + 5) {
      this.activePortals.push({ ...this.events.portals.shift(), used: false });
    }
  }

  resetEventQueues() {
    this.events.hazards = [...this.level.hazards, ...expandLasers(this.level)].sort((a, b) => a.t - b.t);
    this.events.pickups = [...this.level.collectibles].sort((a, b) => a.t - b.t);
    this.events.portals = [...this.level.modePortals].sort((a, b) => a.t - b.t);
  }

  collisions() {
    const p = this.player.rect();
    const px = this.distance;

    for (const portal of this.activePortals) {
      const x = portal.t * this.level.speed;
      const rect = { x, y: 180, w: 46, h: 260 };
      if (!portal.used && intersects(p, this.toScreenRect(rect, px))) {
        portal.used = true;
        this.player.applyMode(portal.mode);
        this.particles.emit(this.player.x + 10, this.player.y + 20, '#f8ff61', 14, 240);
        this.audio.sfx('portal');
        this.toastMessage(`Режим: ${MODES[portal.mode]} // ${portal.label}`);
      }
    }

    for (const item of this.activePickups) {
      const x = item.t * this.level.speed;
      const rect = { x, y: item.y, w: 26, h: 26 };
      if (!item.got && intersects(p, this.toScreenRect(rect, px))) {
        item.got = true;
        if (item.type === 'coffee') {
          this.player.coffee += 1;
          this.unlock('КОФЕИН 9000', this.player.coffee >= 12);
          this.audio.sfx('coffee');
          this.toastMessage('Кофе +1. Пульс +7.');
        } else if (item.type === 'urgent') {
          this.player.boostTimer = 1.5;
          this.audio.sfx('urgent');
          this.cameraShake = 0.6;
          this.toastMessage('Стикер СРОЧНО! Скорость + паника + комментарий мамы.');
        } else {
          this.player.moral += 5;
          this.audio.sfx('cookie');
          this.toastMessage('Печенька найдена. Мораль +5. Диета -1.');
        }
        this.particles.emit(this.player.x + 14, this.player.y + 12, '#8dffb4', 12, 180);
      }
    }

    for (const hz of this.activeHazards) {
      const x = hz.t * this.level.speed;
      let rect;
      if (hz.type === 'spikeWords') rect = { x, y: this.level.floorY - hz.h, w: hz.w, h: hz.h };
      else if (hz.type === 'notify') rect = { x, y: hz.y, w: hz.w, h: hz.h };
      else {
        const active = Math.abs(this.songTime - hz.t) < 0.12;
        if (!active) continue;
        rect = { x, y: hz.y, w: 50, h: hz.h };
      }
      if (intersects(p, this.toScreenRect(rect, px))) {
        hz.hit = true;
        this.die(hz.type);
        return;
      }
    }

    this.activeHazards = this.activeHazards.filter((h) => h.t > this.songTime - 3 && !h.hit);
    this.activePickups = this.activePickups.filter((i) => i.t > this.songTime - 3 && !i.got);
    this.activePortals = this.activePortals.filter((i) => i.t > this.songTime - 3 && !i.used);
  }

  toScreenRect(worldRect, px) {
    const camX = px - 220;
    return {
      x: worldRect.x - camX,
      y: worldRect.y,
      w: worldRect.w,
      h: worldRect.h,
    };
  }

  die(reason) {
    this.state = 'dead';
    this.audio.sfx('death');
    this.unlock('ПЕРВЫЙ ПЛЮХ', true);
    if (reason === 'notify') this.unlock('ПЕРЕЖИЛ УВЕДОМЛЕНИЯ', true);
    this.particles.emit(this.player.x + 12, this.player.y + 10, '#ff6f9a', 24, 360);
    this.toastMessage('Экран смерти говорит: "Ну бывает". Нажми R и сделай вид, что это было запланировано.');
  }

  finish(clear) {
    this.state = clear ? 'win' : 'dead';
    this.unlock('ДЕДЛАЙН ОТМЕНЁН (нет)', clear);
    if (this.runType === 'replay') this.unlock('Я ТОЛЬКО ПОСМОТРЮ РЕПЛЕЙ', true);
  }

  unlock(name, condition) {
    if (!condition || this.achievements.has(name)) return;
    this.achievements.add(name);
    this.toastMessage(`Достижение: ${name}`);
  }

  updateToast(dt) {
    if (this.toastTimer > 0) this.toastTimer -= dt;
    else this.toast = '';
  }

  toastMessage(text) {
    this.toast = text;
    this.toastTimer = 3.2;
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const shake = this.cameraShake > 0 ? (Math.random() - 0.5) * 8 : 0;

    ctx.setTransform(this.scale, 0, 0, this.scale, shake, 0);
    ctx.clearRect(0, 0, w / this.scale, h / this.scale);
    this.drawBackground(ctx);
    this.drawWorld(ctx);
    this.drawHud(ctx);
  }

  drawBackground(ctx) {
    ctx.fillStyle = '#0f1234';
    ctx.fillRect(0, 0, this.canvas.width / this.scale, this.canvas.height / this.scale);
    const p = this.distance;

    for (let layer = 0; layer < 3; layer += 1) {
      const speed = 0.15 + layer * 0.2;
      const yBase = 120 + layer * 70;
      ctx.fillStyle = ['#1d2c66', '#25357f', '#33489b'][layer];
      for (let i = -1; i < 12; i += 1) {
        const x = ((i * 220 - p * speed) % 2400) + 100;
        ctx.fillRect(x, yBase, 80 + ((i * 13) % 90), 240);
      }
    }

    ctx.fillStyle = '#18202d';
    ctx.fillRect(0, this.level.floorY, this.canvas.width / this.scale, 120);

    ctx.fillStyle = '#89d9ff';
    ctx.font = '14px monospace';
    for (const s of this.level.signs) {
      const x = s.x - (this.distance - 220) * 0.55;
      if (x < -300 || x > 1400) continue;
      ctx.fillRect(x, s.y, 180, 24);
      ctx.fillStyle = '#02142d';
      ctx.fillText(s.t, x + 4, s.y + 16);
      ctx.fillStyle = '#89d9ff';
    }
  }

  drawWorld(ctx) {
    const camX = this.distance - 220;

    for (const portal of this.activePortals) {
      const x = portal.t * this.level.speed - camX;
      ctx.fillStyle = '#d57bff';
      ctx.fillRect(x, 180, 34, 260);
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.fillText('ПОРТАЛ', x - 10, 172);
    }

    for (const item of this.activePickups) {
      const x = item.t * this.level.speed - camX;
      if (item.type === 'coffee') {
        ctx.fillStyle = '#6b3a18';
        ctx.fillRect(x, item.y, 24, 18);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 24, item.y + 5, 4, 8);
      } else if (item.type === 'urgent') {
        ctx.fillStyle = '#ff507a';
        ctx.fillRect(x, item.y, 28, 18);
        ctx.fillStyle = '#fff';
        ctx.fillText('СРОЧНО', x - 6, item.y + 13);
      } else {
        ctx.fillStyle = '#dcb86f';
        ctx.beginPath();
        ctx.arc(x + 12, item.y + 12, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const hz of this.activeHazards) {
      const x = hz.t * this.level.speed - camX;
      if (hz.type === 'spikeWords') {
        ctx.fillStyle = '#ff5c8a';
        ctx.beginPath();
        ctx.moveTo(x, this.level.floorY);
        ctx.lineTo(x + hz.w / 2, this.level.floorY - hz.h);
        ctx.lineTo(x + hz.w, this.level.floorY);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.fillText(hz.txt, x, this.level.floorY - hz.h - 6);
      } else if (hz.type === 'notify') {
        ctx.fillStyle = '#f5f0ff';
        ctx.fillRect(x, hz.y, hz.w, hz.h);
        ctx.fillStyle = '#1b1435';
        ctx.fillText('⚠', x + 6, hz.y + 16);
        ctx.fillText(hz.txt, x + 20, hz.y + 16);
      } else {
        const active = Math.abs(this.songTime - hz.t) < 0.12;
        if (!active) continue;
        ctx.fillStyle = '#ff2b6c';
        ctx.fillRect(x, hz.y, 50, hz.h);
        ctx.fillStyle = '#fff';
        ctx.fillText('ЛАЗЕР ПРИНТЕРА', x - 22, hz.y - 6);
      }
    }

    this.drawPlayer(ctx);
    this.particles.draw(ctx);

    if (this.showHitboxes) {
      ctx.strokeStyle = '#0f0';
      const p = this.player.rect();
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }
  }

  drawPlayer(ctx) {
    const p = this.player;
    if (this.capyMode) {
      ctx.fillStyle = '#b47a45';
      ctx.fillRect(p.x, p.y + 8, 36, 22);
      ctx.fillRect(p.x + 26, p.y + 2, 12, 12);
      ctx.fillStyle = '#000';
      ctx.fillRect(p.x + 30, p.y + 6, 2, 2);
      ctx.fillStyle = '#fff';
      ctx.fillText('КАПИБАРА?', p.x - 12, p.y - 8);
      return;
    }

    if (p.mode === 'cube') {
      ctx.save();
      ctx.translate(p.x + 18, p.y + 18);
      ctx.rotate(this.songTime * 4);
      ctx.fillStyle = '#7df9ff';
      ctx.fillRect(-16, -16, 32, 32);
      ctx.restore();
    } else if (p.mode === 'ship') {
      ctx.fillStyle = '#f7ff9c';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + 18);
      ctx.lineTo(p.x + 34, p.y + 8);
      ctx.lineTo(p.x + 34, p.y + 28);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = '#67ffd8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + 30);
      ctx.lineTo(p.x + 36, p.y + 4);
      ctx.stroke();
    }
  }

  drawHud(ctx) {
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    const progress = Math.min(100, (this.songTime / this.level.duration) * 100);
    ctx.fillText(`Уровень: ${this.level.name}`, 18, 26);
    ctx.fillText(`Прогресс: ${progress.toFixed(1)}%`, 18, 48);
    ctx.fillText(`Attempt #${this.attempt}`, 18, 70);
    ctx.fillText(`Режим: ${this.player.modeName()}`, 18, 92);

    if (this.state === 'dead') {
      ctx.fillStyle = '#ff8fb1';
      ctx.font = '26px sans-serif';
      ctx.fillText('ВЫ УПАЛИ В ПАПКУ "РАЗНОЕ"', 290, 150);
      ctx.font = '16px sans-serif';
      ctx.fillText('R — рестарт, C — чекпоинт (в Practice), P — пауза', 290, 176);
    }

    if (this.state === 'win') {
      ctx.fillStyle = '#95ffc0';
      ctx.font = '28px sans-serif';
      ctx.fillText('100% COMPLETE', 360, 150);
      ctx.font = '18px sans-serif';
      ctx.fillText('Вы победили дедлайн. Дедлайн в слезах. Но завтра новый.', 260, 180);
    }

    if (this.toast) {
      this.ui.setToast(this.toast);
    }

    if (this.ui.devOverlay) {
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(820, 8, 260, 110);
      ctx.fillStyle = '#65ff83';
      ctx.font = '13px monospace';
      ctx.fillText(`fps: ${this.ui.fps.toFixed(1)}`, 830, 28);
      ctx.fillText(`songTime: ${this.songTime.toFixed(3)}`, 830, 44);
      ctx.fillText(`beatIndex: ${this.beatIndex}`, 830, 60);
      ctx.fillText(`mode: ${this.player.mode}`, 830, 76);
      ctx.fillText(`speedMul: ${this.player.speedMul.toFixed(2)}`, 830, 92);
      ctx.fillText(`offset: ${this.offset.toFixed(3)}`, 830, 108);
    }
  }

  toggleHitboxes() {
    this.showHitboxes = !this.showHitboxes;
    this.toastMessage(this.showHitboxes ? 'Хитбоксы включены. Магия стала математикой.' : 'Хитбоксы выключены. Вернулась поэзия.');
  }

  applyKonami() {
    this.capyMode = !this.capyMode;
    this.toastMessage(this.capyMode ? 'Режим Капибары активирован. Капи-квадрат бежит к славе.' : 'Режим Капибары деактивирован. Скучный куб вернулся.');
  }
}
