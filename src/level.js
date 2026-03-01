export const MODES = {
  cube: 'КУБИК-БУМАЖНИК',
  ship: 'КОРВЕТ ПАНИКИ',
  wave: 'ВОЛНА ДЕДЛАЙНА',
};

const BPM = 160;
const BEAT = 60 / BPM;
const DURATION = 76;

function b(n) {
  return Number((n * BEAT).toFixed(3));
}

const signs = [
  { x: 450, y: 120, t: 'Я НЕ ШИП, Я ПРОСТО ОСТРЫЙ' },
  { x: 990, y: 150, t: 'СЕГОДНЯ СРОЧНО ВСЁ' },
  { x: 1520, y: 210, t: 'ПРИНТЕР ДЫШИТ В СПИНУ' },
  { x: 1980, y: 140, t: 'ПЛАН: ВЫЖИТЬ' },
  { x: 2600, y: 180, t: 'КОФЕ > СОН' },
  { x: 3210, y: 130, t: 'НЕ ПАНИКУЙ. ЛАДНО, ПАНИКУЙ.' },
  { x: 4010, y: 150, t: '23:59 НЕ РЕЗИНОВЫЙ' },
  { x: 4720, y: 120, t: 'СЕКРЕТ: ВСЕ ДЕЛАЮТ В ПОСЛЕДНЮЮ МИНУТУ' },
];

export const LEVEL = {
  name: '23:59:59 (почти успел)',
  city: 'Сентябрьск',
  day: '11 сентября',
  bpm: BPM,
  duration: DURATION,
  speed: 220,
  gravity: 1900,
  jumpVelocity: 700,
  shipThrust: 1700,
  waveSpeedY: 360,
  floorY: 480,
  modePortals: [
    { t: b(20), mode: 'ship', label: 'Портал: КОРВЕТ ПАНИКИ (пристегни кринж)' },
    { t: b(64), mode: 'wave', label: 'Портал: ВОЛНА ДЕДЛАЙНА (пилить диагональ)' },
    { t: b(112), mode: 'cube', label: 'Портал: КУБИК-БУМАЖНИК (ноги обратно)' },
    { t: b(150), mode: 'ship', label: 'Портал: КОРВЕТ ПАНИКИ+' },
    { t: b(176), mode: 'wave', label: 'Портал: ВОЛНА+ (без паники невозможно)' },
    { t: b(195), mode: 'cube', label: 'Портал: ФИНИШНЫЕ НОГИ' },
  ],
  hazards: [
    { type: 'spikeWords', t: b(12), w: 90, h: 40, txt: 'потом сделаю' },
    { type: 'spikeWords', t: b(16), w: 90, h: 60, txt: 'быстренько' },
    { type: 'notify', t: b(26), w: 120, h: 75, y: 385, txt: '999 уведомлений' },
    { type: 'spikeWords', t: b(35), w: 80, h: 50, txt: 'ща-ща' },
    { type: 'notify', t: b(58), w: 140, h: 85, y: 330, txt: 'позвони срочно' },
    { type: 'spikeWords', t: b(77), w: 100, h: 55, txt: 'успею ночью' },
    { type: 'spikeWords', t: b(93), w: 85, h: 55, txt: 'потом-потом' },
    { type: 'notify', t: b(118), w: 120, h: 80, y: 340, txt: 'напомни себе' },
    { type: 'spikeWords', t: b(132), w: 90, h: 65, txt: 'без дедлайна' },
    { type: 'spikeWords', t: b(160), w: 90, h: 55, txt: 'пятиминутка' },
    { type: 'notify', t: b(181), w: 135, h: 90, y: 320, txt: 'где отчёт?' },
    { type: 'spikeWords', t: b(205), w: 95, h: 55, txt: 'ой' },
  ],
  lasers: [
    { beat: 40, y: 340, h: 14, every: 2, count: 8 },
    { beat: 92, y: 280, h: 14, every: 1, count: 10 },
    { beat: 148, y: 250, h: 12, every: 2, count: 8 },
    { beat: 172, y: 370, h: 12, every: 1, count: 12 },
  ],
  collectibles: [
    { type: 'coffee', t: b(8), y: 410 },
    { type: 'cookie', t: b(10), y: 420 },
    { type: 'coffee', t: b(14), y: 400 },
    { type: 'coffee', t: b(21), y: 310 },
    { type: 'urgent', t: b(28), y: 300 },
    { type: 'coffee', t: b(32), y: 280 },
    { type: 'coffee', t: b(42), y: 260 },
    { type: 'cookie', t: b(45), y: 350 },
    { type: 'coffee', t: b(60), y: 250 },
    { type: 'urgent', t: b(68), y: 260 },
    { type: 'coffee', t: b(74), y: 380 },
    { type: 'coffee', t: b(86), y: 220 },
    { type: 'coffee', t: b(99), y: 300 },
    { type: 'cookie', t: b(104), y: 290 },
    { type: 'urgent', t: b(116), y: 320 },
    { type: 'coffee', t: b(126), y: 400 },
    { type: 'coffee', t: b(140), y: 390 },
    { type: 'coffee', t: b(154), y: 290 },
    { type: 'cookie', t: b(170), y: 240 },
    { type: 'urgent', t: b(178), y: 360 },
    { type: 'coffee', t: b(188), y: 280 },
    { type: 'coffee', t: b(198), y: 420 },
    { type: 'coffee', t: b(208), y: 370 },
  ],
  signs,
  replay: [
    { t: b(11.3), down: true }, { t: b(12.2), down: false },
    { t: b(15.2), down: true }, { t: b(15.95), down: false },
    { t: b(20.1), down: true }, { t: b(32), down: false },
    { t: b(35.1), down: true }, { t: b(48), down: false },
    { t: b(64.1), down: true }, { t: b(74), down: false },
    { t: b(77), down: true }, { t: b(87), down: false },
    { t: b(112.3), down: true }, { t: b(113.1), down: false },
    { t: b(131.8), down: true }, { t: b(132.5), down: false },
    { t: b(150.1), down: true }, { t: b(162.5), down: false },
    { t: b(176.1), down: true }, { t: b(189), down: false },
    { t: b(195.2), down: true }, { t: b(196), down: false },
    { t: b(205), down: true }, { t: b(205.9), down: false },
  ],
};

export function expandLasers(level) {
  const out = [];
  for (const pattern of level.lasers) {
    for (let i = 0; i < pattern.count; i += 1) {
      out.push({
        type: 'laser',
        t: b(pattern.beat + i * pattern.every),
        y: pattern.y,
        h: pattern.h,
      });
    }
  }
  return out;
}
