'use strict';

// ---------------------------------------------------------------------------
// Cenário
// ---------------------------------------------------------------------------
function drawBackground(ctx, x0, y0, x1, y1) {
  ctx.save();
  ctx.scale(ART, ART);
  ctx.fillStyle = ctx.createPattern(Sprites.grass(), 'repeat');
  ctx.fillRect(Math.floor(x0 / ART), Math.floor(y0 / ART), Math.ceil((x1 - x0) / ART) + 2, Math.ceil((y1 - y0) / ART) + 2);
  ctx.restore();
  // Decorações determinísticas por bloco
  const T = 96;
  const tx0 = Math.floor(x0 / T) - 1, tx1 = Math.floor(x1 / T) + 1;
  const ty0 = Math.floor(y0 / T) - 1, ty1 = Math.floor(y1 / T) + 1;
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) {
      const h = hash2(tx * 7 + 3, ty * 13 + 1);
      let kind = null, variant = 0;
      if (h < 0.06) { kind = 'bush'; variant = h < 0.03 ? 0 : 1; }
      else if (h < 0.1) { kind = 'rock'; variant = h < 0.08 ? 0 : 1; }
      else if (h < 0.22) kind = 'tuft';
      else if (h < 0.27) { kind = 'flowers'; variant = h < 0.245 ? 0 : 1; }
      if (!kind) continue;
      const spr = Sprites.decor(kind, variant);
      const px = Math.round((tx * T + hash2(tx, ty * 3) * T) / ART) * ART;
      const py = Math.round((ty * T + hash2(tx * 5, ty) * T) / ART) * ART;
      if (kind === 'bush' || kind === 'rock') {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px - spr.width * 0.8, py + spr.width * 0.35, spr.width * 1.6, ART * 3);
      }
      ctx.drawImage(spr, px - spr.width, py - spr.height, spr.width * ART, spr.height * ART);
    }
  }
}

function drawBush(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.5, r * 1.3, r * 0.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2d5a2e';
  ctx.beginPath();
  ctx.arc(x - r * 0.6, y, r * 0.7, 0, TAU);
  ctx.arc(x + r * 0.6, y, r * 0.7, 0, TAU);
  ctx.arc(x, y - r * 0.35, r * 0.8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#3a7338';
  ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.5, r * 0.4, 0, TAU); ctx.fill();
}

function drawRock(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.4, r * 1.1, r * 0.4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#5b5f5a';
  ctx.beginPath();
  ctx.moveTo(x - r, y + r * 0.3); ctx.lineTo(x - r * 0.6, y - r * 0.6); ctx.lineTo(x + r * 0.3, y - r * 0.8);
  ctx.lineTo(x + r, y - r * 0.1); ctx.lineTo(x + r * 0.7, y + r * 0.4);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#767b74';
  ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.5); ctx.lineTo(x + r * 0.3, y - r * 0.7); ctx.lineTo(x, y - r * 0.1); ctx.closePath(); ctx.fill();
}

function drawTuft(ctx, x, y) {
  ctx.strokeStyle = '#2f5a33';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 4, y); ctx.lineTo(x - 6, y - 7);
  ctx.moveTo(x, y); ctx.lineTo(x, y - 9);
  ctx.moveTo(x + 4, y); ctx.lineTo(x + 6, y - 7);
  ctx.stroke();
}

function drawFlowers(ctx, x, y, h) {
  ctx.fillStyle = h < 0.3 ? '#c9a3e6' : '#f0d36b';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.arc(x + Math.cos(i * 1.7) * 8, y + Math.sin(i * 2.3) * 6, 2, 0, TAU); ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Campeões
// ---------------------------------------------------------------------------
// Linha do sprite do campeão que fica na posição do personagem (meio do tronco).
const CHAMP_ANCHOR_Y = 18;

function drawChampion(ctx, key, x, y, r, ang, t, moving) {
  const frame = moving ? Math.floor(t * 9) % CHAMP_FRAMES : 0;
  const spr = Sprites.champ(key, frame);
  const W = spr.width * ART, H = spr.height * ART;
  const px = Math.round(x / ART) * ART, py = Math.round(y / ART) * ART;
  const top = py - CHAMP_ANCHOR_Y * ART;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(px - 14, top + 30 * ART, 28, ART * 3);
  ctx.fillRect(px - 10, top + 29 * ART, 20, ART * 5);
  ctx.save();
  ctx.translate(px, top);
  if (Math.cos(ang) < -0.01) ctx.scale(-1, 1);
  ctx.drawImage(spr, -W / 2, 0, W, H);
  ctx.restore();
}

// Retrato em pixel art para as telas HTML.
function drawPortrait(canvas, key) {
  const spr = Sprites.champ(key, 0);
  const x = canvas.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.clearRect(0, 0, canvas.width, canvas.height);
  const s = Math.max(1, Math.floor(Math.min(canvas.width / spr.width, canvas.height / spr.height)));
  x.drawImage(spr, (canvas.width - spr.width * s) / 2, (canvas.height - spr.height * s) / 2, spr.width * s, spr.height * s);
}

// ---------------------------------------------------------------------------
// Inimigos
// ---------------------------------------------------------------------------
// Corpo do inimigo na origem, virado para a direita (usado para gerar os sprites).
function drawEnemyBody(ctx, d, t) {
  const r = d.r;
  const e = { flash: 0, face: 0, aiState: 0 };
  const fx = 1, fy = 0;
  const color = d.color;

  switch (d.shape) {
    case 'melee':
    case 'caster':
    case 'siege':
    case 'super': {
      // corpo
      ctx.fillStyle = color;
      if (d.shape === 'siege') {
        ctx.beginPath(); ctx.roundRect(-r, -r * 0.8, r * 2, r * 1.6, 5); ctx.fill();
        ctx.fillStyle = '#3a3a3a';
        ctx.save(); ctx.rotate(e.face); ctx.fillRect(r * 0.2, -4, r * 1.1, 8); ctx.restore();
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(-r * 0.6, r * 0.8, 5, 0, TAU); ctx.arc(r * 0.6, r * 0.8, 5, 0, TAU); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.stroke();
        // capacete
        ctx.fillStyle = d.shape === 'super' ? '#f2c94c' : '#5b2020';
        ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 0.95, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
        if (d.shape === 'super') {
          ctx.fillStyle = '#f2c94c';
          for (let i = 0; i < 5; i++) {
            const a = Math.PI * (1.1 + i * 0.2);
            ctx.beginPath();
            ctx.moveTo(Math.cos(a - 0.12) * r, Math.sin(a - 0.12) * r);
            ctx.lineTo(Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45);
            ctx.lineTo(Math.cos(a + 0.12) * r, Math.sin(a + 0.12) * r);
            ctx.fill();
          }
        }
        if (d.shape === 'caster') {
          ctx.strokeStyle = '#8a6d3b'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(fx * r * 0.6, fy * r * 0.6 + 4); ctx.lineTo(fx * r * 1.5, fy * r * 1.5 - 4); ctx.stroke();
          ctx.fillStyle = '#ff7ae0';
          ctx.beginPath(); ctx.arc(fx * r * 1.55, fy * r * 1.55 - 5, 3.5, 0, TAU); ctx.fill();
        } else if (d.shape === 'melee' || d.shape === 'super') {
          ctx.fillStyle = '#c9ccd1';
          ctx.save(); ctx.rotate(e.face); ctx.fillRect(r * 0.7, -2, r * 0.9, 4); ctx.restore();
        }
      }
      drawEyes(ctx, fx, fy, r, '#ffe6a0');
      break;
    }
    case 'raptor': {
      ctx.save(); ctx.rotate(e.face);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(r * 1.4, 0); ctx.lineTo(-r, -r * 0.9); ctx.lineTo(-r * 0.5, 0); ctx.lineTo(-r, r * 0.9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd36b';
      ctx.beginPath(); ctx.moveTo(r * 1.4, 0); ctx.lineTo(r * 0.7, -r * 0.3); ctx.lineTo(r * 0.7, r * 0.3); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.3, 2, 0, TAU); ctx.fill();
      ctx.restore();
      break;
    }
    case 'wolf': {
      ctx.save(); ctx.rotate(e.face);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(-r * 0.2, 0, r * 1.1, r * 0.75, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.8, 0, r * 0.55, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.6, -r * 0.4); ctx.lineTo(r * 0.75, -r * 0.95); ctx.lineTo(r * 1.0, -r * 0.35); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.6, r * 0.4); ctx.lineTo(r * 0.75, r * 0.95); ctx.lineTo(r * 1.0, r * 0.35); ctx.fill();
      ctx.fillStyle = '#7fe0ff';
      ctx.beginPath(); ctx.arc(r * 1.0, -r * 0.2, 2, 0, TAU); ctx.arc(r * 1.0, r * 0.2, 2, 0, TAU); ctx.fill();
      ctx.restore();
      break;
    }
    case 'krug': {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU;
        const rr = r * (0.85 + 0.15 * Math.sin(i * 2.7));
        if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = e.flash > 0 ? '#fff' : '#5f574d';
      ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffb347';
      ctx.beginPath(); ctx.arc(fx * r * 0.4 - fy * 4, fy * r * 0.4 + fx * 4, 2.5, 0, TAU); ctx.arc(fx * r * 0.4 + fy * 4, fy * r * 0.4 - fx * 4, 2.5, 0, TAU); ctx.fill();
      break;
    }
    case 'voidling': {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#d29bff'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = e.face + Math.PI + (i - 1.5) * 0.5;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a) * r * 1.7 + Math.sin(t * 12 + i) * 2, Math.sin(a) * r * 1.7); ctx.stroke();
      }
      ctx.fillStyle = '#f0d0ff';
      ctx.beginPath(); ctx.arc(fx * r * 0.4, fy * r * 0.4, r * 0.35, 0, TAU); ctx.fill();
      break;
    }
    case 'gromp': {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.1, r * 0.9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = e.flash > 0 ? '#fff' : '#7cbf5a';
      ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * 0.7, r * 0.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e6d34b';
      ctx.beginPath(); ctx.arc(-r * 0.45, -r * 0.6, r * 0.28, 0, TAU); ctx.arc(r * 0.45, -r * 0.6, r * 0.28, 0, TAU); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-r * 0.45, -r * 0.6, r * 0.12, 0, TAU); ctx.arc(r * 0.45, -r * 0.6, r * 0.12, 0, TAU); ctx.fill();
      ctx.fillStyle = '#9b5bd6';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(Math.cos(i * 1.6) * r * 0.75, Math.sin(i * 1.6) * r * 0.5, 3, 0, TAU); ctx.fill(); }
      break;
    }
    case 'scuttle': {
      ctx.strokeStyle = '#2a7d73'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        for (const s of [-1, 1]) {
          const lx = (i - 1) * r * 0.5;
          ctx.beginPath(); ctx.moveTo(lx, s * r * 0.4); ctx.lineTo(lx + Math.sin(t * 20 + i) * 3, s * r * 1.15); ctx.stroke();
        }
      }
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.1, r * 0.7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = e.flash > 0 ? '#fff' : '#d9c88a';
      ctx.beginPath(); ctx.ellipse(0, -r * 0.15, r * 0.7, r * 0.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.55, 3, 0, TAU); ctx.arc(r * 0.25, -r * 0.55, 3, 0, TAU); ctx.fill();
      break;
    }
    case 'herald': {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.fillStyle = e.flash > 0 ? '#fff' : '#4b2287';
      ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.4); ctx.lineTo(-r * 1.3, -r * 1.3); ctx.lineTo(-r * 0.3, -r * 0.9); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.9, -r * 0.4); ctx.lineTo(r * 1.3, -r * 1.3); ctx.lineTo(r * 0.3, -r * 0.9); ctx.fill();
      // olho gigante
      ctx.fillStyle = '#fff6d0';
      ctx.beginPath(); ctx.ellipse(fx * r * 0.2, fy * r * 0.2, r * 0.5, r * 0.38, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = e.aiState === 1 ? '#ff3b3b' : '#c23bff';
      ctx.beginPath(); ctx.arc(fx * r * 0.35, fy * r * 0.3, r * 0.2, 0, TAU); ctx.fill();
      break;
    }
    case 'dragon': {
      const wing = Math.sin(t * 6) * 0.3;
      ctx.save(); ctx.rotate(e.face);
      ctx.fillStyle = d.elder ? '#3f8f8a' : '#9c3418';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.2, s * r * 0.4);
        ctx.lineTo(-r * 0.9, s * r * (1.7 + wing));
        ctx.lineTo(-r * 0.1, s * r * (1.2 + wing));
        ctx.lineTo(r * 0.4, s * r * (1.6 + wing));
        ctx.lineTo(r * 0.3, s * r * 0.4);
        ctx.fill();
      }
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.1, r * 0.7, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r * 1.0, 0, r * 0.45, r * 0.35, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-r * 0.9, 0); ctx.lineTo(-r * 1.8, Math.sin(t * 4) * r * 0.3); ctx.lineTo(-r * 0.9, r * 0.2); ctx.fill();
      ctx.fillStyle = d.elder ? '#e0fffb' : '#ffd36b';
      ctx.beginPath(); ctx.arc(r * 1.15, -r * 0.15, 3.5, 0, TAU); ctx.arc(r * 1.15, r * 0.15, 3.5, 0, TAU); ctx.fill();
      ctx.restore();
      break;
    }
    case 'baron': {
      ctx.fillStyle = e.flash > 0 ? '#fff' : '#3f1a6b';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + Math.sin(t * 2 + i) * 0.1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.2) * r * 0.8, Math.sin(a - 0.2) * r * 0.8);
        ctx.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35);
        ctx.lineTo(Math.cos(a + 0.2) * r * 0.8, Math.sin(a + 0.2) * r * 0.8);
        ctx.fill();
      }
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.fillStyle = e.flash > 0 ? '#fff' : '#8d4fd6';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.65, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1a0830';
      ctx.beginPath(); ctx.ellipse(fx * r * 0.35, fy * r * 0.35 + r * 0.1, r * 0.4, r * 0.18, e.face, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d6ff4f';
      ctx.beginPath(); ctx.arc(fx * r * 0.3 - fy * r * 0.3, fy * r * 0.3 + fx * r * 0.3 - r * 0.2, 5, 0, TAU);
      ctx.arc(fx * r * 0.3 + fy * r * 0.3, fy * r * 0.3 - fx * r * 0.3 - r * 0.2, 5, 0, TAU); ctx.fill();
      break;
    }
  }

}

function drawEnemy(ctx, e, t) {
  const d = e.def;
  const r = e.r;
  const frame = Math.floor(t * 5 + e.wob) & 1;
  const spr = Sprites.enemy(e.type, frame, e.flash > 0);
  const W = spr.width * ART, H = spr.height * ART;
  const x = Math.round(e.x / ART) * ART, y = Math.round(e.y / ART) * ART;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x - r * 0.8, y + r * 0.7, r * 1.6, ART * 2);
  ctx.save();
  ctx.translate(x, y - (frame ? ART : 0));
  if (Math.cos(e.face) < 0) ctx.scale(-1, 1);
  ctx.drawImage(spr, -W / 2, -H / 2, W, H);
  ctx.restore();

  if (e.stun > 0) {
    ctx.fillStyle = '#fff59a';
    for (let i = 0; i < 3; i++) {
      const a = t * 6 + (i * TAU) / 3;
      ctx.fillRect(Math.round((x + Math.cos(a) * r * 0.7) / ART) * ART, y - r - 6 + Math.round(Math.sin(a) * 1.5) * ART, ART * 2, ART * 2);
    }
  }
  if (e.poisonT > 0) {
    ctx.fillStyle = '#8fdc3c';
    const k = Math.floor(t * 6 + e.wob) % 3;
    ctx.fillRect(x - r * 0.5 + k * ART * 2, y - r - 2 - k * ART, ART * 2, ART * 2);
  }
  if (e.slowT > 0) {
    ctx.fillStyle = 'rgba(190,240,255,0.9)';
    ctx.fillRect(x - r, y + r * 0.6, ART * 2, ART * 2);
    ctx.fillRect(x + r - ART * 2, y + r * 0.6, ART * 2, ART * 2);
  }
  if (d.elite && e.hp < e.maxHp) {
    const w = Math.round(r * 1.1) * ART;
    const bx = x - w / 2, by = y - H / 2 - 6;
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(bx - ART, by - ART, w + ART * 2, ART * 3);
    ctx.fillStyle = '#e8b04a';
    ctx.fillRect(bx, by, Math.max(0, Math.round((w * e.hp) / e.maxHp / ART)) * ART, ART);
  }
}

function drawEyes(ctx, fx, fy, r, color) {
  ctx.fillStyle = color;
  const ex = fx * r * 0.45, ey = fy * r * 0.45;
  ctx.beginPath();
  ctx.arc(ex - fy * r * 0.3, ey + fx * r * 0.3, Math.max(1.5, r * 0.14), 0, TAU);
  ctx.arc(ex + fy * r * 0.3, ey - fx * r * 0.3, Math.max(1.5, r * 0.14), 0, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Coletáveis, projéteis e efeitos
// ---------------------------------------------------------------------------
function drawPickup(ctx, pk, t) {
  const spr = Sprites.pickup(pk.type, pk.value);
  const W = spr.width * ART, H = spr.height * ART;
  const bob = (pk.type === 'xp' || pk.type === 'gold') ? 0 : (Math.floor(t * 3 + pk.x) & 1) * ART;
  const x = Math.round(pk.x / ART) * ART, y = Math.round(pk.y / ART) * ART;
  if (pk.type === 'chest') {
    ctx.fillStyle = (Math.floor(t * 4) & 1) ? 'rgba(10,200,185,0.35)' : 'rgba(10,200,185,0.2)';
    ctx.fillRect(x - W / 2 - ART * 2, y - H / 2 - ART * 2, W + ART * 4, H + ART * 4);
  }
  ctx.drawImage(spr, Math.round((x - W / 2) / ART) * ART, Math.round((y - H / 2) / ART) * ART - bob, W, H);
}

function drawProjectile(ctx, pr, t) {
  ctx.save();
  ctx.translate(pr.x, pr.y);
  const a = Math.atan2(pr.vy, pr.vx);
  switch (pr.kind) {
    case 'arrow':
      ctx.rotate(a);
      ctx.strokeStyle = pr.color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(6, -4); ctx.lineTo(6, 4); ctx.fill();
      break;
    case 'bolt':
      ctx.rotate(a);
      ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 0 * 14;
      ctx.fillStyle = pr.color;
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(4, 0, 7, 3, 0, 0, TAU); ctx.fill();
      break;
    case 'rocket':
      ctx.rotate(a);
      ctx.fillStyle = '#ffb347';
      ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-16 - Math.random() * 6, 0); ctx.lineTo(-8, 3); ctx.fill();
      ctx.fillStyle = '#5d6b7a';
      ctx.fillRect(-8, -3.5, 14, 7);
      ctx.fillStyle = pr.color;
      ctx.beginPath(); ctx.moveTo(6, -3.5); ctx.lineTo(11, 0); ctx.lineTo(6, 3.5); ctx.fill();
      break;
    case 'megaRocket':
      ctx.rotate(a);
      ctx.fillStyle = '#ffb347';
      ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(-40 - Math.random() * 15, 0); ctx.lineTo(-18, 8); ctx.fill();
      ctx.fillStyle = '#4a5a6a';
      ctx.fillRect(-20, -9, 36, 18);
      ctx.fillStyle = '#ff4fa3';
      ctx.beginPath(); ctx.moveTo(16, -9); ctx.lineTo(30, 0); ctx.lineTo(16, 9); ctx.fill();
      ctx.fillStyle = '#ff4fa3';
      ctx.beginPath(); ctx.moveTo(-20, -9); ctx.lineTo(-26, -16); ctx.lineTo(-12, -9); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-20, 9); ctx.lineTo(-26, 16); ctx.lineTo(-12, 9); ctx.fill();
      break;
    case 'orb':
      ctx.shadowColor = '#7ad7ff'; ctx.shadowBlur = 0 * 16;
      ctx.fillStyle = pr.returning ? '#ffffff' : '#7ad7ff';
      ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c7f0ff';
      ctx.beginPath(); ctx.arc(-3, -3, pr.r * 0.4, 0, TAU); ctx.fill();
      break;
    case 'crystal':
      ctx.rotate(a);
      ctx.shadowColor = '#9be7ff'; ctx.shadowBlur = 0 * 24;
      ctx.fillStyle = 'rgba(190,240,255,0.5)';
      ctx.beginPath(); ctx.moveTo(-60, -10); ctx.lineTo(0, 0); ctx.lineTo(-60, 10); ctx.fill();
      ctx.fillStyle = '#dff6ff';
      ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(0, -16); ctx.lineTo(-30, 0); ctx.lineTo(0, 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8fd3ff';
      ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(0, -6); ctx.lineTo(-20, 0); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
      break;
    default:
      ctx.fillStyle = pr.color || '#fff';
      ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawEnemyProjectile(ctx, b) {
  const x = Math.round(b.x / ART) * ART, y = Math.round(b.y / ART) * ART;
  const r = Math.max(2, Math.round(b.r / ART)) * ART;
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - r, y - r + ART, r * 2, r * 2 - ART * 2);
  ctx.fillRect(x - r + ART, y - r, r * 2 - ART * 2, r * 2);
  ctx.fillStyle = b.color;
  ctx.fillRect(x - r + ART, y - r + ART, r * 2 - ART * 2, r * 2 - ART * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(x - ART, y - ART, ART, ART);
}

function drawEffect(ctx, fx, g) {
  const k = 1 - fx.life / fx.max; // progress 0..1
  ctx.save();
  switch (fx.kind) {
    case 'ring': {
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.fillStyle = fx.color;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (0.4 + 0.6 * k), 0, TAU); ctx.fill();
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (0.5 + 0.5 * k), 0, TAU); ctx.stroke();
      break;
    }
    case 'cloud': {
      ctx.globalAlpha = 0.35 * (1 - k);
      ctx.fillStyle = fx.color;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.arc(fx.x + Math.cos(i * 1.3) * fx.r * 0.4, fx.y + Math.sin(i * 1.9) * fx.r * 0.4, fx.r * 0.6, 0, TAU); ctx.fill();
      }
      break;
    }
    case 'lightning': {
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = fx.color; ctx.lineWidth = 3;
      ctx.shadowColor = fx.color; ctx.shadowBlur = 0 * 10;
      ctx.beginPath();
      for (let i = 0; i < fx.pts.length; i++) {
        const p = fx.pts[i];
        if (i === 0) { ctx.moveTo(p.x, p.y); continue; }
        const q = fx.pts[i - 1];
        const mx = (p.x + q.x) / 2 + rand(-10, 10), my = (p.y + q.y) / 2 + rand(-10, 10);
        ctx.lineTo(mx, my); ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      break;
    }
    case 'sword': {
      const drop = Math.min(1, k * 2.2);
      const y = fx.y - 260 * (1 - drop);
      ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
      ctx.shadowColor = '#f2c94c'; ctx.shadowBlur = 0 * 25;
      ctx.fillStyle = '#eef3f8';
      ctx.beginPath(); ctx.moveTo(fx.x - 14, y - 150); ctx.lineTo(fx.x + 14, y - 150); ctx.lineTo(fx.x + 10, y - 10); ctx.lineTo(fx.x, y + 10); ctx.lineTo(fx.x - 10, y - 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f2c94c';
      ctx.fillRect(fx.x - 36, y - 160, 72, 12);
      ctx.fillRect(fx.x - 6, y - 200, 12, 42);
      break;
    }
    case 'laserCharge': {
      const p = g.player;
      ctx.translate(p.x, p.y); ctx.rotate(fx.a);
      ctx.globalAlpha = 0.25 + 0.4 * k;
      ctx.strokeStyle = '#fff7c2'; ctx.lineWidth = 2;
      ctx.setLineDash([12, 10]);
      ctx.strokeRect(0, -fx.width / 2, fx.length, fx.width);
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffe680';
      ctx.beginPath(); ctx.arc(0, 0, 10 + 20 * k, 0, TAU); ctx.fill();
      break;
    }
    case 'laser': {
      ctx.translate(fx.x, fx.y); ctx.rotate(fx.a);
      const w = fx.width * (1 - k * 0.6);
      ctx.globalAlpha = 1 - k;
      ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 0 * 30;
      const grad = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
      grad.addColorStop(0, 'rgba(255,120,220,0)');
      grad.addColorStop(0.25, '#ff9de6');
      grad.addColorStop(0.5, '#ffffff');
      grad.addColorStop(0.75, '#ffe680');
      grad.addColorStop(1, 'rgba(255,230,128,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, -w / 2, fx.length, w);
      break;
    }
    case 'flash': {
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#ffe66b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, 10 + 30 * k, 0, TAU); ctx.stroke();
      break;
    }
    case 'telegraph': {
      ctx.globalAlpha = 0.25 + 0.25 * Math.sin(g.time * 20);
      ctx.fillStyle = fx.color;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r, 0, TAU); ctx.fill();
      break;
    }
  }
  ctx.restore();
}
