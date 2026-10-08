'use strict';

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
function crispen(c, outline = OUTLINE, bevel = false) {
  const x = c.getContext('2d');
  const w = c.width, h = c.height;
  const img = x.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 100 ? 255 : 0;
  if (bevel) {
    // Realce nas bordas de cima/esquerda e sombra nas de baixo/direita.
    const a = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3] ? 1 : 0;
    for (let y = 0; y < h; y++) {
      for (let xx = 0; xx < w; xx++) {
        const i = y * w + xx;
        if (!a[i]) continue;
        const lit = (y > 0 && !a[i - w]) || (xx > 0 && !a[i - 1]);
        const dark = (y < h - 1 && !a[i + w]) || (xx < w - 1 && !a[i + 1]) || (y < h - 2 && !a[i + 2 * w]);
        const k = dark ? 0.72 : lit ? 1.25 : 1;
        if (k === 1) continue;
        for (let ch = 0; ch < 3; ch++) d[i * 4 + ch] = Math.min(255, Math.round(d[i * 4 + ch] * k + (k > 1 ? 18 : 0)));
      }
    }
  }
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

// ---------------------------------------------------------------------------
// Cache de imagens geradas por código
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

  // Textura de grama em pixel art (repetida no chão 3D).
  grass() {
    return this.get('grass', () => {
      const S = 48;
      const c = makeCanvas(S, S);
      const x = c.getContext('2d');
      x.fillStyle = '#3f6a35';
      x.fillRect(0, 0, S, S);
      let seed = 1337;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 300; i++) {
        const r = rnd();
        x.fillStyle = r < 0.45 ? '#46753a' : r < 0.85 ? '#385f30' : '#4f8242';
        x.fillRect(Math.floor(rnd() * S), Math.floor(rnd() * S), 1, 1);
      }
      for (let i = 0; i < 12; i++) {
        const gx = Math.floor(rnd() * S), gy = Math.floor(rnd() * S);
        x.fillStyle = '#5a9048';
        x.fillRect(gx, gy, 1, 2);
        x.fillRect(gx + 2, gy + 1, 1, 2);
        x.fillStyle = '#6aa352';
        x.fillRect(gx + 1, gy - 1, 1, 3);
      }
      if (rnd() < 2) {
        x.fillStyle = '#e8d36a';
        x.fillRect(Math.floor(rnd() * S), Math.floor(rnd() * S), 1, 1);
        x.fillStyle = '#e88fd0';
        x.fillRect(Math.floor(rnd() * S), Math.floor(rnd() * S), 1, 1);
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
