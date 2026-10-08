'use strict';

// Each weapon is an auto-cast ability. `stats` arrays are indexed by level - 1.
const WEAPONS = {};

function wstat(w, k) {
  const def = WEAPONS[w.key];
  const a = def.stats[k];
  let v = a[Math.min(w.level, a.length) - 1];
  if (w.evolved && def.evo) {
    if (def.evo.mult && def.evo.mult[k]) v *= def.evo.mult[k];
    if (def.evo.add && def.evo.add[k]) v += def.evo.add[k];
  }
  return v;
}

function weaponName(w) {
  return w.evolved ? WEAPONS[w.key].evo.name : WEAPONS[w.key].name;
}

function cooldownReady(w, g, dt, baseCd) {
  w.cd -= dt;
  if (w.cd > 0) return false;
  w.cd = baseCd * g.player.stats.cdMult;
  return true;
}

// --- Garen: Julgamento -----------------------------------------------------
WEAPONS.judgment = {
  evo: { name: 'Julgamento Implacável', item: 'thornmail', mult: { dmg: 1.8, radius: 1.25 }, add: { blades: 1, spin: 2 }, desc: 'Quatro lâminas maiores giram com muito mais força.' },
  name: 'Julgamento', champ: 'Garen', icon: '⚔️', color: '#f2c94c', maxLevel: 5,
  desc: 'Gira a espada ao seu redor causando dano contínuo.',
  levelDesc: ['', '+30% de dano', '+15% de área', '+30% de dano', '+1 lâmina, gira mais rápido e +20% de área'],
  stats: { dmg: [7, 9, 9, 12, 14], radius: [75, 75, 86, 86, 104], spin: [6, 6, 6, 6, 8], blades: [2, 2, 2, 2, 3] },
  init(w) { w.angle = 0; w.tick = 0; },
  update(w, g, dt) {
    const p = g.player;
    w.angle += dt * wstat(w, 'spin');
    w.tick -= dt;
    if (w.tick <= 0) {
      w.tick = 0.3;
      const R = wstat(w, 'radius') * p.stats.areaMult;
      const dmg = wstat(w, 'dmg');
      g.forEnemiesInRadius(p.x, p.y, R, (e) => g.damageEnemy(e, dmg, { src: w, knock: 70 }));
    }
  },
  draw(w, g, ctx) {
    const p = g.player;
    const R = wstat(w, 'radius') * p.stats.areaMult;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#f2c94c'; ctx.lineWidth = 2; ctx.stroke();
    const blades = wstat(w, 'blades');
    for (let i = 0; i < blades; i++) {
      ctx.save();
      ctx.rotate(w.angle + (i * TAU) / blades);
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = '#fff3b0';
      ctx.lineWidth = R * 0.5;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.62, -1.0, 0); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#e3e9f0';
      ctx.beginPath();
      ctx.moveTo(R * 0.28, -4); ctx.lineTo(R - 8, -4); ctx.lineTo(R, 0); ctx.lineTo(R - 8, 4); ctx.lineTo(R * 0.28, 4);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f2c94c';
      ctx.fillRect(R * 0.24, -8, 5, 16);
      ctx.restore();
    }
    ctx.restore();
  },
};

// --- Ashe: Rajada ----------------------------------------------------------
WEAPONS.volley = {
  evo: { name: 'Saraivada Glacial', item: 'infinityEdge', mult: { dmg: 1.5 }, add: { arrows: 4, pierce: 2 }, desc: 'Muito mais flechas, que perfuram vários inimigos.' },
  name: 'Rajada', champ: 'Ashe', icon: '🏹', color: '#9be7ff', maxLevel: 5,
  desc: 'Dispara um leque de flechas que desaceleram os inimigos.',
  levelDesc: ['', '+1 flecha', '+25% de dano', '+1 flecha e recarga menor', '+2 flechas e perfuram 1 inimigo'],
  stats: { dmg: [10, 10, 13, 13, 16], arrows: [3, 4, 4, 5, 7], cd: [1.5, 1.5, 1.4, 1.25, 1.1], pierce: [0, 0, 0, 0, 1] },
  init(w) { w.cd = 0.3; },
  update(w, g, dt) {
    const p = g.player;
    if (w.cd - dt <= 0 && !g.nearestEnemy(p.x, p.y, 650)) { w.cd = 0.15; return; }
    if (!cooldownReady(w, g, dt, wstat(w, 'cd'))) return;
    const t = g.nearestEnemy(p.x, p.y, 650);
    const base = Math.atan2(t.y - p.y, t.x - p.x);
    const n = wstat(w, 'arrows') + p.stats.amount;
    const spread = Math.min(1.4, 0.16 * (n - 1));
    const speed = 560 * p.stats.projSpeed;
    for (let i = 0; i < n; i++) {
      const a = base + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0);
      g.addProjectile({
        x: p.x, y: p.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 6,
        dmg: wstat(w, 'dmg'), pierce: wstat(w, 'pierce'), life: 0.9, kind: 'arrow', color: '#bdf0ff', src: w,
        onHit(g2, pr, e) { e.slow = Math.max(e.slow, 0.4); e.slowT = 1.5; },
      });
    }
    Sfx.play('shoot');
  },
};

// --- Lux: Prisão da Luz ----------------------------------------------------
WEAPONS.lightBinding = {
  evo: { name: 'Prisão Prismática', item: 'rabadon', mult: { dmg: 1.6 }, add: { count: 2, pierce: 5 }, desc: 'Vários raios prismáticos que atravessam fileiras de inimigos.' },
  name: 'Prisão da Luz', champ: 'Lux', icon: '✨', color: '#ffe680', maxLevel: 5,
  desc: 'Dispara um raio de luz que perfura e enraíza os primeiros inimigos atingidos.',
  levelDesc: ['', '+25% de dano', '+1 perfuração', '+1 raio extra', '+30% de dano e +2 perfurações'],
  stats: { dmg: [16, 20, 20, 20, 26], pierce: [2, 2, 3, 3, 5], count: [1, 1, 1, 2, 2], cd: [1.25, 1.15, 1.1, 1.0, 0.9] },
  init(w) { w.cd = 0.3; },
  update(w, g, dt) {
    const p = g.player;
    if (w.cd - dt <= 0 && !g.nearestEnemy(p.x, p.y, 750)) { w.cd = 0.15; return; }
    if (!cooldownReady(w, g, dt, wstat(w, 'cd'))) return;
    const n = wstat(w, 'count') + p.stats.amount;
    const targets = g.nearestEnemies(p.x, p.y, n, 750);
    const speed = 640 * p.stats.projSpeed;
    for (let i = 0; i < n; i++) {
      const t = targets[i % targets.length];
      const a = Math.atan2(t.y - p.y, t.x - p.x) + (i >= targets.length ? rand(-0.3, 0.3) : 0);
      g.addProjectile({
        x: p.x, y: p.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 9,
        dmg: wstat(w, 'dmg'), pierce: wstat(w, 'pierce'), life: 1.1, kind: 'bolt', color: '#fff2a8', src: w, roots: 2,
        onHit(g2, pr, e) { if (pr.roots > 0) { e.stun = Math.max(e.stun, 0.9); pr.roots--; } },
      });
    }
    Sfx.play('zap');
  },
};

// --- Jinx: Foguetes do Ossos de Peixe --------------------------------------
WEAPONS.fishbones = {
  evo: { name: 'Barragem de Ossos de Peixe', item: 'riftmaker', mult: { dmg: 1.5, radius: 1.3, cd: 0.8 }, add: { count: 2 }, desc: 'Uma chuva de foguetes com explosões maiores.' },
  name: 'Ossos de Peixe', champ: 'Jinx', icon: '🚀', color: '#ff4fa3', maxLevel: 5,
  desc: 'Dispara foguetes que explodem causando dano em área.',
  levelDesc: ['', '+25% de dano', '+15% de raio de explosão', '+1 foguete', '+30% de dano e recarga menor'],
  stats: { dmg: [14, 18, 18, 18, 24], radius: [48, 48, 56, 56, 64], count: [1, 1, 1, 2, 2], cd: [1.35, 1.3, 1.25, 1.2, 1.0] },
  init(w) { w.cd = 0.3; },
  update(w, g, dt) {
    const p = g.player;
    if (w.cd - dt <= 0 && !g.nearestEnemy(p.x, p.y, 600)) { w.cd = 0.15; return; }
    if (!cooldownReady(w, g, dt, wstat(w, 'cd'))) return;
    const n = wstat(w, 'count') + p.stats.amount;
    const pool = g.nearestEnemies(p.x, p.y, 8, 600);
    const speed = 430 * p.stats.projSpeed;
    for (let i = 0; i < n; i++) {
      const t = i === 0 ? pool[0] : pick(pool);
      const a = Math.atan2(t.y - p.y, t.x - p.x) + rand(-0.08, 0.08);
      const R = wstat(w, 'radius');
      const dmg = wstat(w, 'dmg');
      g.addProjectile({
        x: p.x, y: p.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 7,
        dmg: 0, pierce: 0, life: 1.4, kind: 'rocket', color: '#ff4fa3', src: w,
        onHit(g2, pr) { g2.explode(pr.x, pr.y, R * g2.player.stats.areaMult, dmg, w, '#ff7ac0'); },
        onExpire(g2, pr) { g2.explode(pr.x, pr.y, R * g2.player.stats.areaMult, dmg, w, '#ff7ac0'); },
      });
    }
    Sfx.play('shoot');
  },
};

// --- Lux: Singularidade Lucente --------------------------------------------
WEAPONS.singularity = {
  evo: { name: 'Supernova Lucente', item: 'ionian', mult: { dmg: 1.7, radius: 1.3 }, add: { count: 1 }, desc: 'Zonas maiores e mais numerosas, com explosões devastadoras.' },
  name: 'Singularidade Lucente', champ: 'Lux', icon: '🌟', color: '#fff7c2', maxLevel: 5,
  desc: 'Cria uma zona de luz que desacelera inimigos e depois detona.',
  levelDesc: ['', '+30% de dano', '+15% de área', '+12% de área e recarga menor', '+1 zona e +30% de dano'],
  stats: { dmg: [20, 26, 26, 26, 34], radius: [70, 70, 80, 90, 90], count: [1, 1, 1, 1, 2], cd: [3.6, 3.4, 3.2, 3.0, 2.8] },
  init(w) { w.cd = 1; w.zones = []; },
  update(w, g, dt) {
    const p = g.player;
    if (cooldownReady(w, g, dt, wstat(w, 'cd'))) {
      const n = wstat(w, 'count') + p.stats.amount;
      for (let i = 0; i < n; i++) {
        const t = g.randomEnemyInView();
        const x = t ? t.x : p.x + rand(-200, 200);
        const y = t ? t.y : p.y + rand(-200, 200);
        w.zones.push({ x, y, t: 1.2, max: 1.2 });
      }
    }
    const R = wstat(w, 'radius') * p.stats.areaMult;
    for (const z of w.zones) {
      z.t -= dt;
      g.forEnemiesInRadius(z.x, z.y, R, (e) => { e.zoneSlow = Math.max(e.zoneSlow, 0.5); });
      if (z.t <= 0) g.explode(z.x, z.y, R, wstat(w, 'dmg'), w, '#fff7c2');
    }
    w.zones = w.zones.filter((z) => z.t > 0);
  },
  drawGround(w, g, ctx) {
    const R = wstat(w, 'radius') * g.player.stats.areaMult;
    for (const z of w.zones) {
      const k = 1 - z.t / z.max;
      ctx.save();
      ctx.globalAlpha = 0.18 + 0.15 * k;
      ctx.fillStyle = '#fff3a0';
      ctx.beginPath(); ctx.arc(z.x, z.y, R, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(z.x, z.y, R * (1 - k * 0.85), 0, TAU); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(z.x, z.y, 6 + 4 * Math.sin(g.time * 20), 0, TAU); ctx.fill();
      ctx.restore();
    }
  },
};

// --- Ahri: Orbe da Ilusão --------------------------------------------------
WEAPONS.orb = {
  evo: { name: 'Orbe Espiritual', item: 'nashor', mult: { dmg: 1.6, range: 1.2 }, add: { count: 2 }, desc: 'Mais orbes, com mais alcance e dano.' },
  name: 'Orbe da Ilusão', champ: 'Ahri', icon: '🔮', color: '#7ad7ff', maxLevel: 5,
  desc: 'Lança orbes que vão e voltam, atingindo os inimigos duas vezes.',
  levelDesc: ['', '+1 orbe', '+25% de dano', '+20% de alcance', '+1 orbe e +30% de dano'],
  stats: { dmg: [12, 12, 15, 15, 20], count: [1, 2, 2, 2, 3], range: [260, 260, 260, 310, 310], cd: [2.0, 1.9, 1.8, 1.7, 1.5] },
  init(w) { w.cd = 0.5; },
  update(w, g, dt) {
    const p = g.player;
    if (!cooldownReady(w, g, dt, wstat(w, 'cd'))) return;
    const n = wstat(w, 'count') + p.stats.amount;
    const base = g.aimAngle(700);
    const range = wstat(w, 'range') * p.stats.areaMult;
    const speed = 460 * p.stats.projSpeed;
    for (let i = 0; i < n; i++) {
      const a = n >= 3 ? base + (i * TAU) / n : base + (n > 1 ? (i - 0.5) * 0.5 : 0);
      g.addProjectile({
        x: p.x, y: p.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 12,
        dmg: wstat(w, 'dmg'), pierce: Infinity, life: 6, kind: 'orb', color: '#7ad7ff', src: w,
        dist: 0, range, speed, returning: false,
        update(g2, pr, dt2) {
          if (!pr.returning) {
            pr.dist += pr.speed * dt2;
            if (pr.dist >= pr.range) { pr.returning = true; pr.hit.clear(); }
          } else {
            const pl = g2.player;
            const dx = pl.x - pr.x, dy = pl.y - pr.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d < 18) { pr.dead = true; return; }
            const s = pr.speed * 1.25;
            pr.vx = (dx / d) * s; pr.vy = (dy / d) * s;
          }
        },
      });
    }
  },
};

// --- Lâmina Estática de Statikk --------------------------------------------
WEAPONS.statikk = {
  evo: { name: 'Tempestade Estática', item: 'swiftness', mult: { dmg: 1.5, cd: 0.7 }, add: { chains: 6 }, desc: 'Relâmpagos constantes que saltam por toda a tela.' },
  name: 'Lâmina Estática de Statikk', champ: 'Item', icon: '⚡', color: '#8fd3ff', maxLevel: 5,
  desc: 'Um relâmpago que salta entre vários inimigos.',
  levelDesc: ['', '+2 saltos', '+25% de dano', '+2 saltos e recarga menor', '+30% de dano e +3 saltos'],
  stats: { dmg: [12, 12, 15, 15, 20], chains: [3, 5, 5, 7, 10], cd: [1.8, 1.7, 1.6, 1.4, 1.2] },
  init(w) { w.cd = 0.8; },
  update(w, g, dt) {
    const p = g.player;
    if (w.cd - dt <= 0 && !g.nearestEnemy(p.x, p.y, 400)) { w.cd = 0.15; return; }
    if (!cooldownReady(w, g, dt, wstat(w, 'cd'))) return;
    const chains = wstat(w, 'chains') + p.stats.amount * 2;
    const hit = new Set();
    const pts = [{ x: p.x, y: p.y }];
    let cx = p.x, cy = p.y, range = 400;
    for (let i = 0; i < chains; i++) {
      const e = g.nearestEnemy(cx, cy, range, hit);
      if (!e) break;
      hit.add(e);
      pts.push({ x: e.x, y: e.y });
      g.damageEnemy(e, wstat(w, 'dmg'), { src: w });
      e.stun = Math.max(e.stun, 0.12);
      cx = e.x; cy = e.y; range = 170 * p.stats.areaMult;
    }
    g.addEffect({ kind: 'lightning', pts, life: 0.18, max: 0.18, color: '#bfe9ff' });
    Sfx.play('zap');
  },
};

// --- Annie: Tibbers --------------------------------------------------------
WEAPONS.tibbers = {
  evo: { name: 'Tibbers Enfurecido', item: 'warmog', mult: { dmg: 2, radius: 1.4, atk: 0.7, speed: 1.2 }, add: {}, desc: 'Um Tibbers gigante e furioso que esmaga multidões.' },
  name: 'Tibbers', champ: 'Annie', icon: '🧸', color: '#ff8a3d', maxLevel: 5,
  desc: 'Invoca o Tibbers, um urso flamejante que esmaga inimigos próximos.',
  levelDesc: ['', '+30% de dano', '+20% de área de golpe', 'Ataca mais rápido', '+40% de dano e anda mais rápido'],
  stats: { dmg: [20, 26, 26, 26, 36], radius: [55, 55, 66, 66, 72], atk: [0.9, 0.9, 0.85, 0.65, 0.6], speed: [200, 200, 210, 220, 270] },
  init(w, g) { w.bear = { x: g.player.x + 40, y: g.player.y, atk: 0, face: 0, anim: 0 }; },
  update(w, g, dt) {
    const p = g.player;
    const b = w.bear;
    b.atk -= dt;
    b.anim = Math.max(0, b.anim - dt);
    if (Math.hypot(b.x - p.x, b.y - p.y) > 500) { b.x = p.x + 30; b.y = p.y; }
    const t = g.nearestEnemy(b.x, b.y, 320);
    let tx, ty, reach = false;
    if (t && Math.hypot(t.x - p.x, t.y - p.y) < 420) {
      tx = t.x; ty = t.y;
      reach = Math.hypot(tx - b.x, ty - b.y) < t.r + 24;
    } else {
      tx = p.x - Math.cos(p.facing) * 40; ty = p.y - Math.sin(p.facing) * 40;
    }
    const dx = tx - b.x, dy = ty - b.y;
    const d = Math.hypot(dx, dy);
    if (!reach && d > 6) {
      const s = wstat(w, 'speed') * p.stats.speedMult;
      b.x += (dx / d) * Math.min(d, s * dt);
      b.y += (dy / d) * Math.min(d, s * dt);
      b.face = Math.atan2(dy, dx);
    }
    if (reach && b.atk <= 0) {
      b.atk = wstat(w, 'atk') * p.stats.cdMult;
      b.anim = 0.2;
      const R = wstat(w, 'radius') * p.stats.areaMult;
      const cx = b.x + Math.cos(b.face) * 14, cy = b.y + Math.sin(b.face) * 14;
      g.forEnemiesInRadius(cx, cy, R, (e) => g.damageEnemy(e, wstat(w, 'dmg'), { src: w, knock: 160, fromX: b.x, fromY: b.y }));
      g.addEffect({ kind: 'ring', x: cx, y: cy, r: R, life: 0.25, max: 0.25, color: '#ff8a3d' });
      g.burst(cx, cy, '#ffb347', 6, 120);
    }
  },
  draw(w, g, ctx) {
    const b = w.bear;
    const s = (1 + (b.anim > 0 ? 0.15 : 0)) * (w.evolved ? 1.5 : 1);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 16, 18, 6, 0, 0, TAU); ctx.fill();
    ctx.scale(s, s);
    // flame aura
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(g.time * 15);
    ctx.fillStyle = '#ff8a3d';
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#5a3a2a';
    ctx.beginPath(); ctx.arc(-11, -13, 6, 0, TAU); ctx.arc(11, -13, 6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8a6248';
    ctx.beginPath(); ctx.ellipse(0, 5, 8, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffcc33';
    ctx.beginPath(); ctx.arc(-6, -4, 2.6, 0, TAU); ctx.arc(6, -4, 2.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2b1a12'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-3, 6); ctx.lineTo(3, 6); ctx.stroke();
    ctx.restore();
  },
};

// --- Teemo: Armadilha Venenosa ---------------------------------------------
WEAPONS.noxiousTrap = {
  evo: { name: 'Campo Minado de Bandópolis', item: 'ancientCoin', mult: { dmg: 1.6, radius: 1.25, cd: 0.7 }, add: { max: 6 }, desc: 'Um campo inteiro de cogumelos explosivos.' },
  name: 'Armadilha Venenosa', champ: 'Teemo', icon: '🍄', color: '#9bd64b', maxLevel: 5,
  desc: 'Planta cogumelos invisíveis que explodem e envenenam inimigos.',
  levelDesc: ['', '+1 cogumelo ativo', '+30% de dano', '+15% de área e +1 cogumelo', '+40% de dano e +2 cogumelos'],
  stats: { dmg: [28, 28, 36, 36, 50], radius: [65, 65, 65, 75, 80], max: [3, 4, 4, 5, 7], cd: [2.2, 2.0, 1.9, 1.7, 1.5] },
  init(w) { w.cd = 0.5; w.shrooms = []; },
  update(w, g, dt) {
    const p = g.player;
    if (cooldownReady(w, g, dt, wstat(w, 'cd'))) {
      const max = wstat(w, 'max') + p.stats.amount;
      w.shrooms.push({ x: p.x + rand(-30, 30), y: p.y + rand(-30, 30), arm: 0.6, life: 40 });
      while (w.shrooms.length > max) w.shrooms.shift();
    }
    const R = wstat(w, 'radius') * p.stats.areaMult;
    const dmg = wstat(w, 'dmg');
    for (const s of w.shrooms) {
      s.arm -= dt; s.life -= dt;
      if (s.arm > 0 || s.life <= 0) continue;
      let triggered = false;
      g.forEnemiesInRadius(s.x, s.y, 18, () => { triggered = true; });
      if (triggered) {
        s.life = 0;
        g.explode(s.x, s.y, R, dmg, w, '#9bd64b', (e) => {
          e.poisonT = 3; e.poisonDps = dmg * 0.35 * g.player.stats.dmgMult; e.poisonSrc = w;
        });
        g.addEffect({ kind: 'cloud', x: s.x, y: s.y, r: R, life: 1.2, max: 1.2, color: '#7dbb32' });
      }
    }
    w.shrooms = w.shrooms.filter((s) => s.life > 0);
  },
  drawGround(w, g, ctx) {
    for (const s of w.shrooms) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.globalAlpha = s.arm > 0 ? 1 : 0.55;
      ctx.fillStyle = '#e8dcc0';
      ctx.fillRect(-2.5, -1, 5, 7);
      ctx.fillStyle = '#5aa02c';
      ctx.beginPath(); ctx.arc(0, -1, 8, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#c8f08a';
      ctx.beginPath(); ctx.arc(-3, -4, 1.6, 0, TAU); ctx.arc(3, -3, 1.3, 0, TAU); ctx.fill();
      ctx.restore();
    }
  },
};

// ---------------------------------------------------------------------------
// Ultimates (ativadas pelo jogador). Retornam false se não houve alvo.
// ---------------------------------------------------------------------------
const ULTS = {
  garen(g) {
    const p = g.player;
    let best = null, bestScore = -1;
    for (const e of g.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d > 520) continue;
      const score = e.maxHp + (e.def.boss ? 1e6 : e.def.elite ? 1e5 : 0) - d;
      if (score > bestScore) { bestScore = score; best = e; }
    }
    if (!best) return false;
    const target = best;
    g.addEffect({ kind: 'sword', x: target.x, y: target.y, life: 0.45, max: 0.45 });
    g.later(0.25, () => {
      const lvl = 1 + p.level * 0.03;
      if (!target.dead) {
        const missing = target.maxHp - target.hp;
        const dmg = (200 + Math.min(missing * 0.2, 2500)) * lvl;
        g.damageEnemy(target, dmg, { src: g.ultSource, noCrit: true });
      }
      g.explode(target.x, target.y, 130 * p.stats.areaMult, 60 * lvl, g.ultSource, '#f2c94c');
      g.shake = Math.max(g.shake, 14);
    });
    return true;
  },
  ashe(g) {
    const p = g.player;
    const a = g.aimAngle(1000);
    const lvl = 1 + p.level * 0.03;
    g.addProjectile({
      x: p.x, y: p.y, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, r: 24,
      dmg: 150 * lvl, pierce: Infinity, life: 2.2, kind: 'crystal', color: '#bdf0ff', src: g.ultSource,
      onHit(g2, pr, e) { e.stun = Math.max(e.stun, 2.5); g2.burst(e.x, e.y, '#dff6ff', 4, 150); },
    });
    return true;
  },
  lux(g) {
    const p = g.player;
    const a = g.aimAngle(1000);
    const width = 70 * p.stats.areaMult;
    const length = 1500;
    const lvl = 1 + p.level * 0.03;
    g.addEffect({ kind: 'laserCharge', a, width, length, life: 0.6, max: 0.6, follow: true });
    g.later(0.6, () => {
      const ox = p.x, oy = p.y;
      const cx = Math.cos(a), cy = Math.sin(a);
      for (const e of g.enemies) {
        if (e.dead) continue;
        const rx = e.x - ox, ry = e.y - oy;
        const along = rx * cx + ry * cy;
        if (along < -e.r || along > length) continue;
        const perp = Math.abs(rx * -cy + ry * cx);
        if (perp < width / 2 + e.r) g.damageEnemy(e, 260 * lvl, { src: g.ultSource, knock: 120, fromX: ox, fromY: oy });
      }
      g.addEffect({ kind: 'laser', x: ox, y: oy, a, width, length, life: 0.45, max: 0.45 });
      g.shake = Math.max(g.shake, 16);
      Sfx.play('boom');
    });
    return true;
  },
  jinx(g) {
    const p = g.player;
    const a = g.aimAngle(1200);
    const lvl = 1 + p.level * 0.03;
    const boom = (g2, pr) => {
      g2.explode(pr.x, pr.y, 230 * g2.player.stats.areaMult, 320 * lvl, g2.ultSource, '#ff4fa3');
      g2.shake = Math.max(g2.shake, 20);
    };
    g.addProjectile({
      x: p.x, y: p.y, vx: Math.cos(a) * 750, vy: Math.sin(a) * 750, r: 18,
      dmg: 0, pierce: 0, life: 1.6, kind: 'megaRocket', color: '#ff4fa3', src: g.ultSource,
      onHit: boom, onExpire: boom,
    });
    return true;
  },
};
