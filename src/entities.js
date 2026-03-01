import { MODES } from './level.js';

const MODE_KEYS = {
  cube: MODES.cube,
  ship: MODES.ship,
  wave: MODES.wave,
};

export class Player {
  constructor(level) {
    this.level = level;
    this.x = 220;
    this.y = level.floorY - 36;
    this.vy = 0;
    this.w = 36;
    this.h = 36;
    this.dead = false;
    this.mode = 'cube';
    this.inputDown = false;
    this.waveDir = -1;
    this.boostTimer = 0;
    this.moral = 0;
    this.coffee = 0;
  }

  reset(y = this.level.floorY - 36) {
    this.y = y;
    this.vy = 0;
    this.mode = 'cube';
    this.waveDir = -1;
    this.inputDown = false;
    this.boostTimer = 0;
    this.dead = false;
  }

  applyMode(mode) {
    this.mode = mode;
    if (mode === 'cube') {
      this.vy = Math.min(this.vy, 0);
    }
  }

  get speedMul() {
    return this.boostTimer > 0 ? 1.45 : 1;
  }

  tick(dt) {
    if (this.boostTimer > 0) {
      this.boostTimer -= dt;
      if (this.boostTimer < 0) this.boostTimer = 0;
    }

    if (this.mode === 'cube') {
      if (this.inputDown && this.onGround()) {
        this.vy = -this.level.jumpVelocity;
      }
      this.vy += this.level.gravity * dt;
      this.y += this.vy * dt;
      if (this.y + this.h >= this.level.floorY) {
        this.y = this.level.floorY - this.h;
        this.vy = 0;
      }
    } else if (this.mode === 'ship') {
      const thrust = this.inputDown ? -this.level.shipThrust : this.level.gravity * 0.7;
      this.vy += thrust * dt;
      this.vy *= 0.985;
      this.y += this.vy * dt;
    } else {
      if (this.inputDown) {
        this.waveDir = -1;
      } else {
        this.waveDir = 1;
      }
      this.y += this.waveDir * this.level.waveSpeedY * dt;
    }

    const ceil = 40;
    if (this.y < ceil) {
      this.y = ceil;
      this.vy = 0;
    }
    if (this.y + this.h > this.level.floorY) {
      this.y = this.level.floorY - this.h;
      this.vy = 0;
    }
  }

  onGround() {
    return this.y + this.h >= this.level.floorY - 0.1;
  }

  setInput(isDown) {
    this.inputDown = isDown;
  }

  rect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  modeName() {
    return MODE_KEYS[this.mode];
  }
}

export class ParticleSystem {
  constructor(capacity = 300) {
    this.particles = new Array(capacity);
    for (let i = 0; i < capacity; i += 1) {
      this.particles[i] = { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, ttl: 1, color: '#fff', size: 4 };
    }
    this.cursor = 0;
  }

  emit(x, y, color, count, spread = 120) {
    for (let i = 0; i < count; i += 1) {
      const p = this.particles[this.cursor];
      this.cursor = (this.cursor + 1) % this.particles.length;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = (Math.random() - 0.5) * spread;
      p.vy = (Math.random() - 0.7) * spread;
      p.ttl = 0.3 + Math.random() * 0.6;
      p.life = p.ttl;
      p.color = color;
      p.size = 2 + Math.random() * 4;
    }
  }

  update(dt) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += 520 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      if (!p.active) continue;
      const a = p.life / p.ttl;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}

export function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
