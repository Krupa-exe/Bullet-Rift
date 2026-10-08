'use strict';

// ---------------------------------------------------------------------------
// Sprites detalhados dos campeões (24x34), pintados pixel a pixel por código.
// Cada parte do corpo ganha seu próprio contorno escuro e sombreamento em 3 tons
// (luz vinda de cima à esquerda), no estilo de pixel art de personagens de RPG.
// ---------------------------------------------------------------------------
const CHAMP_W = 24;
const CHAMP_H = 34;
const CHAMP_FRAMES = 4; // 0/2 parado, 1/3 passada (pernas alternadas)

// Rampas de cor: [luz, meio, sombra]
const RAMP = {
  skin: ['#ffe0c2', '#f1c09a', '#c98a68'],
  paleSkin: ['#fff0e6', '#f3d6c8', '#cfa294'],
  steel: ['#ffffff', '#c3ccd8', '#7a8698'],
  gold: ['#fff0a0', '#f2c94c', '#a87c22'],
  blue: ['#8db4ff', '#3d6bd6', '#243f8a'],
  navy: ['#4b5578', '#2c3352', '#181c30'],
  red: ['#ff6b6b', '#c23b3b', '#7a1f2a'],
  brown: ['#a8754a', '#6b4a2b', '#3f2a18'],
  leather: ['#8a5a36', '#5a3a22', '#38220f'],
  ice: ['#ffffff', '#bdf0ff', '#6fb8e0'],
  iceBlue: ['#a8dcff', '#5aa9e6', '#2e6da4'],
  hood: ['#4f86bf', '#2f5d8a', '#1b3a5c'],
  fur: ['#ffffff', '#e2e8f0', '#a9b4c4'],
  white: ['#ffffff', '#f2eee2', '#c9c0a8'],
  blonde: ['#fff3b0', '#ffd96a', '#c9982e'],
  hairBlue: ['#5fb0ff', '#2d7fd6', '#1a4c8f'],
  pink: ['#ff9ccf', '#ff4fa3', '#b02a6e'],
  metal: ['#a3b0bf', '#6c7a89', '#3d4652'],
  black: ['#4a4458', '#2a2533', '#16121c'],
  denim: ['#5a6aa8', '#3a4a8a', '#222c5c'],
};

class PixelLayer {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.c = makeCanvas(w, h);
    this.x = this.c.getContext('2d');
  }
  px(x, y, col) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.x.fillStyle = col;
    this.x.fillRect(x, y, 1, 1);
  }
  rect(x, y, w, h, col) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, col);
  }
  // Retângulo sombreado: topo/esquerda claros, direita/base escuros.
  shadedRect(x, y, w, h, ramp) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        let c = ramp[1];
        if (i === w - 1 || j === h - 1) c = ramp[2];
        else if (i === 0 || j === 0) c = ramp[0];
        this.px(x + i, y + j, c);
      }
    }
  }
  // Elipse sombreada; `keep(x, y)` opcional limita quais pixels são pintados.
  ellipse(cx, cy, rx, ry, ramp, keep, dir = [0.7, 0.7], cut = [-0.45, 0.35]) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny > 1) continue;
        if (keep && !keep(x, y)) continue;
        const n = nx * dir[0] + ny * dir[1];
        this.px(x, y, n < cut[0] ? ramp[0] : n > cut[1] ? ramp[2] : ramp[1]);
      }
    }
  }
  // Membro grosso entre dois pontos (braços, pernas, tranças).
  limb(x0, y0, x1, y1, w, ramp) {
    const steps = Math.max(Math.abs(y1 - y0), Math.abs(x1 - x0), 1);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t);
      for (let i = 0; i < w; i++) this.px(x + i, y, i === 0 ? ramp[0] : i === w - 1 ? ramp[2] : ramp[1]);
    }
  }
  line(x0, y0, x1, y1, col) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      this.px(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, col);
    }
  }
  // Polígono preenchido testando o centro de cada pixel.
  poly(pts, ramp) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const minX = Math.floor(Math.min(...xs)), maxX = Math.ceil(Math.max(...xs));
    const minY = Math.floor(Math.min(...ys)), maxY = Math.ceil(Math.max(...ys));
    const cx = (minX + maxX) / 2;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        let inside = false;
        const px = x + 0.5, py = y + 0.5;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (!inside) continue;
        const c = typeof ramp === 'string' ? ramp : (x < cx - (maxX - minX) * 0.25 ? ramp[0] : x > cx + (maxX - minX) * 0.2 ? ramp[2] : ramp[1]);
        this.px(x, y, c);
      }
    }
  }
}

// Monta o sprite parte por parte: cada parte é desenhada numa camada própria,
// recebe contorno e é empilhada sobre as anteriores.
class Figure {
  constructor(w = CHAMP_W, h = CHAMP_H) {
    this.w = w;
    this.h = h;
    this.out = makeCanvas(w, h);
    this.ctx = this.out.getContext('2d');
  }
  part(fn, outline = OUTLINE) {
    const l = new PixelLayer(this.w, this.h);
    fn(l);
    if (outline) crispen(l.c, outline);
    this.ctx.drawImage(l.c, 0, 0);
    return this;
  }
}

// Rosto virado para a direita: pele iluminada de frente, sombra só no queixo.
function drawFace(l, d, skin, eye, extra) {
  l.ellipse(12.5, 8 + d, 4.6, 5, skin, null, [-0.25, 0.9], [-0.75, 0.62]);
  l.px(15, 7 + d, eye); l.px(15, 8 + d, eye);
  l.px(14, 7 + d, '#ffffff');
  l.px(16, 9 + d, skin[2]);
  l.px(15, 11 + d, skin[2]);
  if (extra) extra(l);
}

// Pose base compartilhada: posições das pernas e do braço de trás conforme o quadro.
function champPose(frame) {
  const stride = frame === 1 || frame === 3;
  const swap = frame === 3;
  return {
    dy: stride ? 1 : 0,
    // [xQuadril, xPé] da perna de trás e da frente
    backLeg: stride ? (swap ? [10, 13] : [10, 7]) : [10, 9],
    frontLeg: stride ? (swap ? [13, 10] : [13, 16]) : [13, 14],
    armSwing: stride ? (swap ? -2 : 2) : 0,
  };
}

function drawLegs(f, pose, legRamp, legBackRamp, bootRamp, bootBackRamp, top = 23) {
  const [bh, bf] = pose.backLeg, [fh, ff] = pose.frontLeg;
  f.part((l) => {
    l.limb(bh, top, bf, 29, 3, legBackRamp);
    l.shadedRect(bf - 1, 29, 4, 3, bootBackRamp);
    l.px(bf + 3, 31, bootBackRamp[2]);
  });
  f.part((l) => {
    l.limb(fh, top, ff, 29, 3, legRamp);
    l.shadedRect(ff - 1, 29, 4, 3, bootRamp);
    l.px(ff + 3, 31, bootRamp[1]);
    l.px(ff + 3, 30, bootRamp[1]);
  });
}

const CHAMP_ART = {
  garen(frame) {
    const p = champPose(frame);
    const d = p.dy;
    const f = new Figure();
    // Capa
    f.part((l) => l.poly([[8, 13 + d], [12, 13 + d], [10, 27 + d], [6, 29 + d], [4, 27 + d]], RAMP.red));
    // Braço de trás
    f.part((l) => {
      l.limb(8, 14 + d, 8 - p.armSwing, 21 + d, 3, RAMP.navy);
      l.shadedRect(8 - p.armSwing, 21 + d, 3, 2, RAMP.skin);
    });
    drawLegs(f, p, RAMP.navy, ['#2c3352', '#1d2238', '#12152a'], RAMP.leather, ['#5a3a22', '#38220f', '#24140a']);
    // Tronco (armadura)
    f.part((l) => {
      l.shadedRect(8, 13 + d, 8, 10, RAMP.blue);
      l.rect(11, 14 + d, 2, 7, RAMP.gold[1]);
      l.px(11, 14 + d, RAMP.gold[0]);
      l.rect(8, 21 + d, 8, 2, RAMP.leather[1]);
      l.px(12, 21 + d, RAMP.gold[0]); l.px(13, 21 + d, RAMP.gold[1]);
    });
    // Espada (atrás da mão)
    f.part((l) => {
      l.rect(18, 1 + d, 2, 15, RAMP.steel[1]);
      l.line(18, 1 + d, 18, 15 + d, RAMP.steel[0]);
      l.line(19, 3 + d, 19, 15 + d, RAMP.steel[2]);
      l.px(18, 0 + d, RAMP.steel[0]);
    });
    f.part((l) => {
      l.shadedRect(15, 16 + d, 8, 2, RAMP.gold);
      l.rect(18, 18 + d, 2, 3, RAMP.leather[1]);
      l.px(18, 21 + d, RAMP.gold[1]); l.px(19, 21 + d, RAMP.gold[2]);
    });
    // Ombreira de trás
    f.part((l) => l.ellipse(9, 15 + d, 2.6, 1.8, ['#d9b04a', '#a87c22', '#6b4e12']));
    // Cabeça
    f.part((l) => {
      drawFace(l, d, RAMP.skin, '#1b1b2b');
      l.ellipse(12.5, 7.5 + d, 5.1, 5.2, RAMP.brown, (x, y) => y < 5 + d || x < 11 || (y < 7 + d && x < 13));
      l.px(14, 6 + d, RAMP.brown[2]); l.px(15, 6 + d, RAMP.brown[2]);
      l.px(11, 9 + d, RAMP.skin[2]);
    });
    // Ombreira da frente e braço da frente
    f.part((l) => {
      l.limb(14, 15 + d, 17, 18 + d, 3, RAMP.blue);
      l.shadedRect(17, 18 + d, 3, 3, RAMP.skin);
    });
    f.part((l) => {
      l.ellipse(14.5, 15 + d, 2.8, 2, RAMP.gold);
      l.px(13, 14 + d, '#ffffff');
    });
    return f.out;
  },

  ashe(frame) {
    const p = champPose(frame);
    const d = p.dy;
    const f = new Figure();
    // Manto do capuz
    f.part((l) => l.poly([[7, 9 + d], [12, 12 + d], [11, 26 + d], [7, 28 + d], [4, 25 + d]], RAMP.hood));
    // Aljava
    f.part((l) => {
      l.limb(5, 12 + d, 8, 20 + d, 3, RAMP.leather);
      l.px(5, 11 + d, '#ffffff'); l.px(6, 10 + d, '#ffffff'); l.px(4, 11 + d, RAMP.ice[2]);
    });
    f.part((l) => {
      l.limb(9, 14 + d, 9 - p.armSwing, 21 + d, 2, RAMP.iceBlue);
      l.shadedRect(9 - p.armSwing, 21 + d, 2, 2, RAMP.skin);
    });
    drawLegs(f, p, RAMP.navy, ['#2c3352', '#1d2238', '#12152a'], RAMP.leather, ['#5a3a22', '#38220f', '#24140a']);
    // Túnica e saia
    f.part((l) => {
      l.shadedRect(9, 13 + d, 7, 9, RAMP.iceBlue);
      l.poly([[8, 20 + d], [16, 20 + d], [17, 25 + d], [7, 25 + d]], RAMP.iceBlue);
      l.rect(9, 20 + d, 7, 1, RAMP.leather[1]);
      l.px(12, 20 + d, RAMP.gold[1]);
    });
    // Gola de pele
    f.part((l) => l.ellipse(12, 13 + d, 4, 1.8, RAMP.fur));
    // Cabeça com capuz
    f.part((l) => {
      drawFace(l, d, RAMP.skin, '#2a3b8f');
      l.ellipse(12.2, 7.8 + d, 5.4, 5.6, RAMP.hood, (x, y) => y < 5 + d || x < 11);
      l.limb(11, 5 + d, 12, 10 + d, 2, RAMP.fur);
    });
    // Arco
    f.part((l) => {
      for (let y = 5; y <= 27; y++) {
        const x = 18 + Math.round(4 * Math.sin((Math.PI * (y - 5)) / 22));
        l.px(x, y + d, y < 16 ? RAMP.ice[0] : RAMP.ice[1]);
        l.px(x + 1, y + d, RAMP.ice[2]);
      }
    });
    f.part((l) => l.line(18, 6 + d, 18, 26 + d, '#e8f4ff'), null);
    // Braço da frente segurando o arco
    f.part((l) => {
      l.limb(14, 14 + d, 18, 16 + d, 2, RAMP.iceBlue);
      l.shadedRect(18, 15 + d, 2, 3, RAMP.skin);
    });
    return f.out;
  },

  lux(frame) {
    const p = champPose(frame);
    const d = p.dy;
    const f = new Figure();
    // Cabelo longo atrás
    f.part((l) => l.poly([[8, 6 + d], [12, 8 + d], [11, 20 + d], [8, 22 + d], [6, 16 + d]], RAMP.blonde));
    f.part((l) => {
      l.limb(9, 14 + d, 9 - p.armSwing, 21 + d, 2, RAMP.white);
      l.shadedRect(9 - p.armSwing, 21 + d, 2, 2, RAMP.skin);
    });
    drawLegs(f, p, RAMP.white, ['#d9d2bd', '#b8ae94', '#8c836b'], RAMP.gold, ['#d9b04a', '#a87c22', '#6b4e12'], 24);
    // Vestido
    f.part((l) => {
      l.shadedRect(9, 13 + d, 7, 8, RAMP.white);
      l.poly([[9, 20 + d], [16, 20 + d], [18, 27 + d], [7, 27 + d]], RAMP.white);
      l.rect(9, 20 + d, 7, 1, RAMP.gold[1]);
      l.line(12, 14 + d, 12, 19 + d, RAMP.gold[1]);
      l.px(11, 16 + d, RAMP.gold[1]); l.px(13, 16 + d, RAMP.gold[1]);
      l.line(8, 26 + d, 17, 26 + d, RAMP.gold[2]);
    });
    // Cabeça
    f.part((l) => {
      drawFace(l, d, RAMP.skin, '#2a4fb8', (q) => q.px(14, 9 + d, '#f0a0a8'));
      l.ellipse(12.4, 7.6 + d, 5.2, 5.3, RAMP.blonde, (x, y) => y < 5 + d || x < 11 || (y < 6 + d && x < 15));
      l.px(14, 4 + d, '#ffffff');
    });
    // Cajado com orbe
    f.part((l) => {
      l.line(19, 6 + d, 19, 31 + d, '#e6d6a8');
      l.line(20, 7 + d, 20, 31 + d, '#a8956a');
    });
    f.part((l) => {
      l.ellipse(19.5, 4 + d, 2.6, 2.6, ['#ffffff', '#fff4a8', '#ffc94d']);
      l.px(18, 3 + d, '#ffffff');
    }, '#c98a1f');
    f.part((l) => {
      l.limb(14, 14 + d, 18, 17 + d, 2, RAMP.white);
      l.shadedRect(18, 16 + d, 3, 2, RAMP.skin);
    });
    return f.out;
  },

  jinx(frame) {
    const p = champPose(frame);
    const d = p.dy;
    const f = new Figure();
    // Tranças compridas
    const sway = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    f.part((l) => {
      l.limb(9, 6 + d, 6, 14 + d, 2, RAMP.hairBlue);
      l.limb(6, 14 + d, 4 + sway, 22 + d, 2, RAMP.hairBlue);
      l.limb(4 + sway, 22 + d, 3, 30 + d, 2, RAMP.hairBlue);
      l.px(3, 31 + d, RAMP.pink[1]);
    });
    f.part((l) => {
      l.limb(10, 7 + d, 9, 15 + d, 2, RAMP.hairBlue);
      l.limb(9, 15 + d, 8 - sway, 24 + d, 2, RAMP.hairBlue);
    });
    f.part((l) => {
      l.limb(9, 14 + d, 9 - p.armSwing, 21 + d, 2, RAMP.paleSkin);
    });
    drawLegs(f, p, RAMP.paleSkin, ['#e3c2b4', '#cfa294', '#a6786a'], RAMP.pink, ['#d9407f', '#9e2a5c', '#6b1a3d']);
    f.part((l) => {
      // listras das meias
      const [, bf] = p.backLeg, [, ff] = p.frontLeg;
      l.rect(ff, 27, 3, 1, RAMP.pink[1]);
      l.rect(bf, 27, 3, 1, RAMP.pink[2]);
    }, null);
    // Tronco: top, barriga e short
    f.part((l) => {
      l.shadedRect(9, 13 + d, 7, 4, RAMP.black);
      l.shadedRect(9, 17 + d, 7, 3, RAMP.paleSkin);
      l.shadedRect(9, 20 + d, 7, 4, RAMP.denim);
      l.px(12, 14 + d, RAMP.pink[1]); l.px(13, 15 + d, RAMP.pink[1]);
      l.rect(9, 20 + d, 7, 1, RAMP.pink[2]);
    });
    // Cabeça
    f.part((l) => {
      drawFace(l, d, RAMP.paleSkin, RAMP.pink[2], (q) => q.px(15, 10 + d, '#c0587e'));
      l.ellipse(12.4, 7.6 + d, 5.1, 5.2, RAMP.hairBlue, (x, y) => y < 5 + d || x < 11 || (y < 6 + d && x < 16));
    });
    // Ossos de Peixe (lançador de foguetes em forma de tubarão)
    f.part((l) => {
      l.poly([[10, 14 + d], [20, 13 + d], [23, 16 + d], [20, 20 + d], [10, 19 + d]], RAMP.metal);
      l.rect(11, 18 + d, 9, 1, RAMP.metal[2]);
      for (let i = 0; i < 4; i++) l.px(18 + i % 2, 15 + d + i, '#ffffff');
      l.px(21, 15 + d, RAMP.pink[1]);
      l.line(13, 13 + d, 15, 11 + d, RAMP.pink[1]);
      l.px(14, 12 + d, RAMP.pink[0]);
    });
    f.part((l) => {
      l.limb(14, 14 + d, 15, 18 + d, 2, RAMP.paleSkin);
      l.shadedRect(14, 18 + d, 3, 2, RAMP.paleSkin);
    });
    return f.out;
  },
};
