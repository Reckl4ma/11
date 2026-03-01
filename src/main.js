import { AudioSystem } from './audio.js';
import { GameEngine } from './engine.js';
import { LEVEL } from './level.js';
import { UI } from './ui.js';

const canvas = document.getElementById('game');
const ui = new UI(document.getElementById('ui-root'));
const audio = new AudioSystem(LEVEL);
const game = new GameEngine(canvas, audio, ui);

const settings = {
  volume: 75,
  offset: 0,
  sarcasm: 65,
};

let last = performance.now();
let fpsAcc = 0;
let fpsCount = 0;

function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  game.update(dt);

  fpsAcc += dt;
  fpsCount += 1;
  if (fpsAcc >= 0.5) {
    ui.fps = fpsCount / fpsAcc;
    fpsAcc = 0;
    fpsCount = 0;
  }

  requestAnimationFrame(loop);
}

function bindMenu() {
  const panel = ui.showPanel(`
    <h1>ДЕДЛАЙН-ДРИФТ: 11 СЕНТЯБРЯТ В СЕНТЯБРЬСКЕ</h1>
    <p>Сегодня <b>11 сентября</b> в вымышленном городе, где принтеры шипят, документы кусаются, а "срочно" материализуется в шипы.</p>
    <p class="small">Рассказчик: не бойся проигрывать, бойся писать "сделаю завтра".</p>
    <div class="btn-row">
      <button data-act="play">Play (войти в Фестиваль Дедлайна)</button>
      <button data-act="practice">Practice (тренировочная паника)</button>
      <button data-act="settings">Settings (настроить сарказмометр)</button>
      <button data-act="replay">Watch Replay (доказательства проходимости)</button>
    </div>
    <p class="small">Достижения: ПЕРВЫЙ ПЛЮХ • ПЕРЕЖИЛ УВЕДОМЛЕНИЯ • ДЕДЛАЙН ОТМЕНЁН (нет) • КОФЕИН 9000 • Я ТОЛЬКО ПОСМОТРЮ РЕПЛЕЙ</p>
  `);

  panel.querySelector('[data-act="play"]').onclick = () => {
    ui.clearPanels();
    game.start('normal');
  };
  panel.querySelector('[data-act="practice"]').onclick = () => {
    ui.clearPanels();
    game.start('practice');
  };
  panel.querySelector('[data-act="settings"]').onclick = () => bindSettings();
  panel.querySelector('[data-act="replay"]').onclick = () => {
    ui.clearPanels();
    game.start('replay');
    game.toastMessage('Реплей запущен. Можно сделать вид, что это ты так идеально играешь.');
  };
}

function bindSettings() {
  const panel = ui.showPanel(`
    <h2>Настройки "Лаборатория Рофлов"</h2>
    <div class="settings-row"><span>Громкость бипов</span><input id="vol" type="range" min="0" max="100" value="${settings.volume}" /><span id="volv">${settings.volume}</span></div>
    <div class="settings-row"><span>Offset (сек)</span><input id="off" type="range" min="-150" max="150" value="0" /><span id="offv">0.000</span></div>
    <div class="settings-row"><span>Показ hitboxes</span><input id="hit" type="checkbox" /><span>H</span></div>
    <div class="settings-row"><span>Сарказм рассказчика</span><input id="sar" type="range" min="0" max="100" value="${settings.sarcasm}" /><span id="sarv">${settings.sarcasm}</span></div>
    <p class="small">Подсказка: если включить 100 сарказма, рассказчик станет вашей внутренней совестью.</p>
    <div class="btn-row">
      <button data-back>Назад (в мемню)</button>
    </div>
  `);
  panel.querySelector('[data-back]').onclick = bindMenu;

  panel.querySelector('#vol').oninput = (e) => {
    settings.volume = Number(e.target.value);
    panel.querySelector('#volv').textContent = settings.volume;
    audio.setVolume(settings.volume / 100);
  };

  panel.querySelector('#off').oninput = (e) => {
    settings.offset = Number(e.target.value) / 1000;
    game.offset = settings.offset;
    panel.querySelector('#offv').textContent = settings.offset.toFixed(3);
  };

  panel.querySelector('#hit').onchange = (e) => {
    game.showHitboxes = e.target.checked;
  };

  panel.querySelector('#sar').oninput = (e) => {
    settings.sarcasm = Number(e.target.value);
    game.sarcasm = settings.sarcasm;
    panel.querySelector('#sarv').textContent = settings.sarcasm;
  };
}

function onKey(e, down) {
  if (e.code === 'Space' || e.code === 'Mouse0') {
    game.input(down);
  }
  if (!down) return;
  if (e.key === 'r' || e.key === 'R') game.restartFromCheckpoint();
  if (e.key === 'p' || e.key === 'P') game.togglePause();
  if (e.key === 'c' || e.key === 'C') game.setCheckpoint();
  if (e.key === 'h' || e.key === 'H') game.toggleHitboxes();
  if (e.key === '`') ui.devOverlay = !ui.devOverlay;

  const map = {
    ArrowUp: 'U',
    ArrowDown: 'D',
    ArrowLeft: 'L',
    ArrowRight: 'R',
    b: 'B',
    a: 'A',
    B: 'B',
    A: 'A',
  };
  const k = map[e.key] || map[e.code];
  if (k) {
    game.konami = (game.konami + k).slice(-10);
    if (game.konami === 'UUDDLRLRBA') {
      game.applyKonami();
      console.log('[КОНСОЛЬ-ПАСХАЛКА] Капибара говорит: "бип-буп, дедлайн не пройдёт!"');
    }
  }
}

window.addEventListener('resize', () => game.resize());
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') e.preventDefault();
  onKey(e, true);
});
window.addEventListener('keyup', (e) => onKey(e, false));
window.addEventListener('mousedown', () => game.input(true));
window.addEventListener('mouseup', () => game.input(false));

console.log('[DevMsg] Добро пожаловать в Сентябрьск. Если всё сломалось — это фича фестиваля.');
console.log('[DevMsg] Нажми ` для dev overlay, Konami code для капибары.');

bindMenu();
requestAnimationFrame(loop);
