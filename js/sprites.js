'use strict';

// World units per art pixel. Everything in the world is drawn on a grid of 2x2 world units.
const ART = 2;
const OUTLINE = '#140c1c';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Turns an antialiased drawing into crisp pixel art: hard alpha plus a 1px dark outline.
function crispen(c, outline = OUTLINE) {
  const x = c.getContext('2d');
  const w = c.width, h = c.height;
  const img = x.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 100 ? 255 : 0;
  if (outline) {
    const [or, og, ob] = hexRgb(outline);
    const solid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] ? 1 : 0;
    for (let y = 0; y < h; y++) {
      for (let xx = 0; xx < w; xx++) {
        const i = y * w + xx;
        if (solid[i]) continue;
        if ((xx > 0 && solid[i - 1]) || (xx < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w])) {
          d[i * 4] = or; d[i * 4 + 1] = og; d[i * 4 + 2] = ob; d[i * 4 + 3] = 255;
        }
      }
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}

function whiteVersion(c) {
  const w = makeCanvas(c.width, c.height);
  const x = w.getContext('2d');
  x.drawImage(c, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, w.width, w.height);
  return w;
}

function spriteFromRows(rows, pal) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const c = makeCanvas(w, h);
  const x = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let i = 0; i < row.length; i++) {
      const col = pal[row[i]];
      if (!col) continue;
      x.fillStyle = col;
      x.fillRect(i, y, 1, 1);
    }
  });
  return c;
}

// ---------------------------------------------------------------------------
// Campeões desenhados à mão (16x16, virados para a direita).
// Linhas 14 e 15 trocam no segundo quadro para animar a caminhada.
// ---------------------------------------------------------------------------
const CHAMP_SPRITES = {
  garen: {
    pal: { k: OUTLINE, h: '#6b4a2b', s: '#f1c9a5', e: '#1b1b2b', r: '#c23b3b', g: '#f2c94c', b: '#3d6bd6', B: '#284a9c', w: '#e3e9f0' },
    rows: [
      '......kkkk......',
      '.....khhhhk.....',
      '....khhhhhhk....',
      '....khssssssk...',
      '....kssssesek...',
      '....kssssssk....',
      '..rrkggkkggk....',
      '..rkgggbbgggk...',
      '..rkbbbgbbbk.ww.',
      '..rkbbbgbbskwwww',
      '..rkBBBgBBBkg...',
      '..rkbbbbbbbk....',
      '...kBBBBBBBk....',
      '....kbbkbbk.....',
      '....kBk.kBk.....',
      '....kkk.kkk.....',
    ],
    alt: { 14: '...kBk...kBk....', 15: '...kkk...kkk....' },
  },
  ashe: {
    pal: { k: OUTLINE, H: '#2f5d8a', s: '#f1c9a5', e: '#1b1b2b', W: '#e8f4ff', c: '#8fd3ff', b: '#5aa9e6', B: '#2e6da4', w: '#ffffff', i: '#bdf0ff', d: '#6b4a2b' },
    rows: [
      '......kkkk......',
      '.....kHHHHk.....',
      '....kHHHHHHk....',
      '....kHssssHk....',
      '....kHssesek....',
      '....kWssssk.....',
      '...kcckkkkck.i..',
      '..kcbbbbbbbk.ki.',
      '..kcbbwwbbbk..i.',
      '..kcbbbbbbskiiii',
      '..kcbbbbbbbk..i.',
      '..kcBBBBBBBk.ki.',
      '...kBBBBBBBk.i..',
      '....kddkddk.....',
      '....kdk.kdk.....',
      '....kkk.kkk.....',
    ],
    alt: { 14: '...kdk...kdk....', 15: '...kkk...kkk....' },
  },
  lux: {
    pal: { k: OUTLINE, Y: '#ffe27a', s: '#f1c9a5', e: '#2a3b8f', w: '#f5f1e0', g: '#ffd84d', o: '#fff4a8', O: '#ffd84d', t: '#e6d6a8', d: '#c8aa6e' },
    rows: [
      '......kkkk......',
      '.....kYYYYk.....',
      '....kYYYYYYk....',
      '...kYYssssYk....',
      '...kYsssesek....',
      '...kYssssssk....',
      '...kYkwwwwk..o..',
      '..kwwwgwwwwk.oOo',
      '..kwwgggwwwk..t.',
      '..kwwwgwwwsk.t..',
      '..kwwwgwwwkt....',
      '..kwwwgwwwwk....',
      '..kwwwwwwwwk....',
      '...kkddkddkk....',
      '....kdk.kdk.....',
      '....kkk.kkk.....',
    ],
    alt: { 14: '...kdk...kdk....', 15: '...kkk...kkk....' },
  },
  jinx: {
    pal: { k: OUTLINE, H: '#2d7fd6', s: '#f3d6c8', p: '#ff4fa3', m: '#6c7a89', P: '#ff4fa3', b: '#3a4a8a' },
    rows: [
      '......kkkk......',
      '.....kHHHHk.....',
      '....kHHHHHHk....',
      '...HkHssssHk....',
      '..HHksspspk.....',
      '..H.kssssk......',
      '.H..kpkkpk.mmmm.',
      '.H.kpppppkmmmmmP',
      'H..ksssssksmmmm.',
      'H..kbbbbbk......',
      'H..kbbbbbk......',
      '.H.ksskssk......',
      '...ksskssk......',
      '...ksskssk......',
      '...kpk.kpk......',
      '...kkk.kkk......',
    ],
    alt: { 14: '..kpk...kpk.....', 15: '..kkk...kkk.....' },
  },
};

// ---------------------------------------------------------------------------
// Coletáveis (desenhados à mão)
// ---------------------------------------------------------------------------
const GEM_ROWS = ['..k..', '.kwk.', 'kwaak', 'kaaak', 'kaadk', '.kdk.', '..k..'];
const GEM_TIERS = [
  { a: '#4fb3ff', d: '#2a6fbf' },
  { a: '#4ee38a', d: '#24a25a' },
  { a: '#b26bff', d: '#7a3fd1' },
  { a: '#ff5470', d: '#b8243f' },
];
const PICKUP_SPRITES = {
  gold: {
    pal: { k: OUTLINE, y: '#f5d067', w: '#fff6c0', d: '#c8962e' },
    rows: ['.kkkk.', 'kwyyyk', 'kyydyk', 'kyydyk', 'kyyydk', '.kkkk.'],
  },
  heal: {
    pal: { k: OUTLINE, g: '#3d7a2a', o: '#ffb23f', O: '#d9822b', w: '#ffe6a8' },
    rows: ['....g...', '...g....', '.kkkkkk.', 'koowoook', 'koooooOk', 'koooooOk', 'kOooooOk', '.kOOOOk.', '..kkkk..'],
  },
  magnet: {
    pal: { k: OUTLINE, R: '#e04848', c: '#7ad7ff', C: '#3a9fd6', w: '#ffffff' },
    rows: ['..kkkk..', '.kRRRRk.', 'kRwcccRk', 'kRcccCRk', 'kRccCCRk', '.kRRRRk.', '..kkkkkk', '......kk'],
  },
  chest: {
    pal: { k: OUTLINE, b: '#5a3a20', G: '#c8aa6e', c: '#0ac8b9' },
    rows: [
      '.kkkkkkkkkk.',
      'kbbGbbbbGbbk',
      'kbbGbbbbGbbk',
      'kGGGGccGGGGk',
      'kbbGbccbGbbk',
      'kbbGbbbbGbbk',
      'kbbGbbbbGbbk',
      'kGGGGGGGGGGk',
      '.kkkkkkkkkk.',
    ],
  },
};

// ---------------------------------------------------------------------------
// Cache de sprites
// ---------------------------------------------------------------------------
const Sprites = {
  cache: new Map(),

  get(key, build) {
    let s = this.cache.get(key);
    if (!s) {
      s = build();
      this.cache.set(key, s);
    }
    return s;
  },

  champ(key, frame) {
    return this.get(`c:${key}:${frame}`, () => {
      const def = CHAMP_SPRITES[key];
      const rows = def.rows.slice();
      if (frame && def.alt) for (const i in def.alt) rows[i] = def.alt[i];
      return spriteFromRows(rows, def.pal);
    });
  },

  // Inimigos: desenho vetorial convertido em pixel art (2 quadros + versão branca para dano).
  enemy(type, frame, flash) {
    if (flash) return this.get(`ef:${type}:${frame}`, () => whiteVersion(this.enemy(type, frame, false)));
    return this.get(`e:${type}:${frame}`, () => {
      const d = ENEMIES[type];
      let S = Math.ceil(d.r * 2.4) + 4;
      S += S % 2;
      const c = makeCanvas(S, S);
      const x = c.getContext('2d');
      x.translate(S / 2, S / 2);
      x.scale(1 / ART, 1 / ART);
      drawEnemyBody(x, d, frame ? 0.26 : 0);
      return crispen(c);
    });
  },

  pickup(type, value) {
    if (type === 'xp') {
      const tier = value >= 50 ? 3 : value >= 10 ? 2 : value >= 3 ? 1 : 0;
      return this.get(`p:xp:${tier}`, () => spriteFromRows(GEM_ROWS, { k: OUTLINE, w: '#ffffff', ...GEM_TIERS[tier] }));
    }
    return this.get(`p:${type}`, () => spriteFromRows(PICKUP_SPRITES[type].rows, PICKUP_SPRITES[type].pal));
  },

  decor(kind, variant) {
    return this.get(`d:${kind}:${variant}`, () => {
      const size = kind === 'bush' ? 40 : kind === 'rock' ? 26 : 12;
      const c = makeCanvas(size, size);
      const x = c.getContext('2d');
      x.translate(size / 2, size / 2);
      x.scale(1 / ART, 1 / ART);
      if (kind === 'bush') drawBush(x, 0, 0, 22 + variant * 6);
      else if (kind === 'rock') drawRock(x, 0, 0, 12 + variant * 4);
      else if (kind === 'flowers') drawFlowers(x, 0, 0, variant ? 0.29 : 0.31);
      else drawTuft(x, 0, 6);
      return crispen(c, kind === 'tuft' || kind === 'flowers' ? null : OUTLINE);
    });
  },

  // Textura de grama em pixel art (repetida como padrão).
  grass() {
    return this.get('grass', () => {
      const S = 48;
      const c = makeCanvas(S, S);
      const x = c.getContext('2d');
      x.fillStyle = '#2a4a2d';
      x.fillRect(0, 0, S, S);
      let seed = 1337;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 260; i++) {
        const r = rnd();
        x.fillStyle = r < 0.45 ? '#2f5232' : r < 0.85 ? '#26432a' : '#36603a';
        x.fillRect(Math.floor(rnd() * S), Math.floor(rnd() * S), 1, 1);
      }
      for (let i = 0; i < 10; i++) {
        const gx = Math.floor(rnd() * S), gy = Math.floor(rnd() * S);
        x.fillStyle = '#3d6b3e';
        x.fillRect(gx, gy, 1, 2);
        x.fillRect(gx + 2, gy + 1, 1, 2);
        x.fillStyle = '#4a7d47';
        x.fillRect(gx + 1, gy - 1, 1, 3);
      }
      return c;
    });
  },
};

// ---------------------------------------------------------------------------
// Ícones: emojis convertidos em pixel art (com cache e data URL para o HTML).
// ---------------------------------------------------------------------------
const Icons = {
  cache: new Map(),
  urls: new Map(),
  get(emoji) {
    let c = this.cache.get(emoji);
    if (!c) {
      c = makeCanvas(20, 20);
      const x = c.getContext('2d');
      x.font = '15px "Noto Color Emoji", "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(emoji, 10, 11);
      crispen(c);
      this.cache.set(emoji, c);
    }
    return c;
  },
  url(emoji) {
    let u = this.urls.get(emoji);
    if (!u) {
      u = this.get(emoji).toDataURL();
      this.urls.set(emoji, u);
    }
    return u;
  },
  html(emoji, cls = '') {
    return `<img class="px-icon ${cls}" src="${this.url(emoji)}" alt="${emoji}">`;
  },
};
