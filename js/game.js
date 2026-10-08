'use strict';

class Player {
  constructor(key) {
    this.key = key;
    this.champ = CHAMPIONS[key];
    this.x = 0;
    this.y = 0;
    this.r = 16;
    this.weapons = [];
    this.items = {};
    this.itemOrder = [];
    this.level = 1;
    this.xp = 0;
    this.xpNext = xpToNext(1);
    this.pendingLevels = 0;
    this.invuln = 0;
    this.flashCd = 0;
    this.ultCd = 0;
    this.exciteT = 0;
    this.baronT = 0;
    this.elderT = 0;
    this.dragonStacks = 0;
    this.hurtT = 0;
    this.facing = 0;
    this.moving = false;
    this.stats = null;
    this.recalc();
    this.hp = this.stats.maxHp;
  }

  recalc() {
    const c = this.champ;
    const s = {
      dmgMult: 1, critChance: 0.05, critMult: 1.75, cdMult: 1, areaMult: 1, speedMult: 1,
      amount: 0, pickupRange: 100, armor: c.armor, maxHp: c.hp, regen: c.regen,
      lifeOnKill: 0, goldMult: 1, thorns: 0, projSpeed: 1, burn: 0, mejai: false,
    };
    c.applyPassive(s);
    for (const k of this.itemOrder) ITEMS[k].apply(s, this.items[k]);
    s.dmgMult += this.dragonStacks * 0.08;
    s.cdMult = Math.max(0.35, s.cdMult);
    const prevMax = this.stats ? this.stats.maxHp : s.maxHp;
    this.stats = s;
    if (this.hp !== undefined) {
      if (s.maxHp > prevMax) this.hp += s.maxHp - prevMax;
      this.hp = Math.min(this.hp, s.maxHp);
    }
  }

  gainXp(v) {
    this.xp += v;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.pendingLevels++;
      this.xpNext = xpToNext(this.level);
    }
  }
}

const Game = {
  state: 'menu',
  time: 0,
  menuT: 0,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.grid = new SpatialGrid(64);
    this.qbuf = [];
    this.ultSource = { key: 'ult', dmgDone: 0 };
    this.cam = { x: 0, y: 0 };
    window.addEventListener('resize', () => this.resize());
    this.resize();
    Input.init(this);
    UI.init(this);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  },

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    // Pixel art: o mundo é desenhado em um canvas de baixa resolução e ampliado
    // por um fator inteiro (P pixels do dispositivo por pixel de arte).
    const baseZoom = clamp(Math.min(this.w, this.h) / 760, 0.6, 1.25);
    this.pix = Math.max(2, Math.round(ART * baseZoom * this.dpr * 1.3));
    this.zoom = this.pix / (ART * this.dpr);
    if (!this.low) this.low = document.createElement('canvas');
    this.low.width = Math.ceil(this.canvas.width / this.pix);
    this.low.height = Math.ceil(this.canvas.height / this.pix);
    this.lctx = this.low.getContext('2d');
  },

  // -------------------------------------------------------------------------
  // Ciclo de partida
  // -------------------------------------------------------------------------
  start(champKey) {
    this.champKey = champKey;
    this.player = new Player(champKey);
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.pickups = [];
    this.effects = [];
    this.particles = [];
    this.texts = [];
    this.timers = [];
    this.announcements = [];
    this.pendingChests = [];
    this.time = 0;
    this.kills = 0;
    this.gold = 0;
    this.spawnAcc = 0;
    this.eventIdx = 0;
    this.shake = 0;
    this.rerollCost = 25;
    this.endless = false;
    this.nextEndlessBoss = 0;
    this.killMilestone = 0;
    this.magnetAll = false;
    this.damageTaken = 0;
    this.ultSource = { key: 'ult', dmgDone: 0 };
    this.burnSource = { key: 'burn', dmgDone: 0 };
    this.burnT = 0;
    this.notified = new Set();
    this.cam = { x: 0, y: 0 };
    this.addWeapon(this.player.champ.startWeapon);
    this.state = 'playing';
    Sfx.init();
    UI.onGameStart();
  },

  addWeapon(key) {
    const w = { key, level: 1, cd: 0, dmgDone: 0 };
    WEAPONS[key].init(w, this);
    this.player.weapons.push(w);
    return w;
  },

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    UI.showPause();
  },

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    UI.hideScreens();
  },

  gameOver(victory) {
    this.state = 'gameover';
    this.saveRecord(victory);
    UI.showGameOver(victory);
  },

  continueEndless() {
    this.endless = true;
    this.state = 'playing';
    UI.hideScreens();
    this.announce('Modo infinito: até onde você aguenta?');
  },

  // -------------------------------------------------------------------------
  // Loop principal
  // -------------------------------------------------------------------------
  frame(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    if (this.state === 'playing') this.update(dt);
    else if (this.state === 'menu') this.menuT += dt;
    this.render(dt);
    requestAnimationFrame((tt) => this.frame(tt));
  },

  update(dt) {
    const p = this.player;
    this.time += dt;

    this.processEvents();
    if (this.state !== 'playing') return;
    this.spawnUpdate(dt);

    for (const tm of this.timers) {
      tm.t -= dt;
      if (tm.t <= 0) tm.fn();
    }
    this.timers = this.timers.filter((tm) => tm.t > 0);

    this.updatePlayer(dt);

    this.grid.clear();
    for (const e of this.enemies) this.grid.insert(e);

    for (const w of p.weapons) WEAPONS[w.key].update(w, this, dt);
    if (p.stats.burn > 0) {
      this.burnT -= dt;
      if (this.burnT <= 0) {
        this.burnT = 0.5;
        const R = SUNFIRE_RADIUS * p.stats.areaMult;
        this.forEnemiesInRadius(p.x, p.y, R, (e) => this.damageEnemy(e, p.stats.burn * 0.5, { src: this.burnSource, noCrit: true }));
      }
    }

    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateEnemyProjectiles(dt);
    this.updatePickups(dt);
    this.updateFx(dt);

    this.enemies = this.enemies.filter((e) => !e.dead);

    this.cam.x = p.x;
    this.cam.y = p.y;
    this.shake = Math.max(0, this.shake - dt * 40);

    if (p.hp <= 0) {
      p.hp = 0;
      this.gameOver(false);
      return;
    }
    if (p.pendingLevels > 0) {
      p.pendingLevels--;
      Sfx.play('levelup');
      this.state = 'levelup';
      UI.showLevelUp();
    } else if (this.pendingChests.length > 0) {
      this.state = 'chest';
      UI.showChest(this.openChest(this.pendingChests.shift()));
    }
  },

  // Called by the UI after a level-up / chest screen closes.
  afterModal() {
    this.state = 'playing';
    UI.hideScreens();
  },

  updatePlayer(dt) {
    const p = this.player;
    const st = p.stats;
    const mv = Input.moveVector();
    p.moving = mv.x !== 0 || mv.y !== 0;
    let spd = this.player.champ.speed * st.speedMult;
    if (p.exciteT > 0) { spd *= 1.6; p.exciteT -= dt; }
    if (p.moving) {
      p.x += mv.x * spd * dt;
      p.y += mv.y * spd * dt;
      p.facing = Math.atan2(mv.y, mv.x);
    }
    p.hp = Math.min(st.maxHp, p.hp + st.regen * dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.flashCd = Math.max(0, p.flashCd - dt);
    p.ultCd = Math.max(0, p.ultCd - dt);
    if (p.baronT > 0) p.baronT -= dt;
    if (p.elderT > 0) p.elderT -= dt;
  },

  useUlt() {
    const p = this.player;
    if (this.state !== 'playing' || p.ultCd > 0) return;
    if (ULTS[p.key](this) === false) {
      this.floatText(p.x, p.y - 30, 'Sem alvo', '#aaa');
      return;
    }
    p.ultCd = p.champ.ult.cd * p.stats.cdMult;
    Sfx.play('ult');
  },

  useFlash() {
    const p = this.player;
    if (this.state !== 'playing' || p.flashCd > 0) return;
    const mv = Input.moveVector();
    const a = mv.x || mv.y ? Math.atan2(mv.y, mv.x) : p.facing;
    this.addEffect({ kind: 'flash', x: p.x, y: p.y, life: 0.3, max: 0.3 });
    this.burst(p.x, p.y, '#ffe66b', 10, 140);
    p.x += Math.cos(a) * 170;
    p.y += Math.sin(a) * 170;
    p.invuln = Math.max(p.invuln, 0.25);
    p.flashCd = 12;
    this.addEffect({ kind: 'flash', x: p.x, y: p.y, life: 0.3, max: 0.3 });
    Sfx.play('flash');
  },

  // -------------------------------------------------------------------------
  // Eventos e geração de inimigos
  // -------------------------------------------------------------------------
  processEvents() {
    while (this.eventIdx < EVENTS.length && this.time >= EVENTS[this.eventIdx].t) {
      const ev = EVENTS[this.eventIdx++];
      if (this.endless && ev.type === 'victory') continue;
      this.runEvent(ev);
    }
    if (this.endless) {
      if (this.time >= (this.nextEndlessBoss || VICTORY_TIME + 60)) {
        this.nextEndlessBoss = this.time + 60;
        const roll = Math.floor((this.time - VICTORY_TIME) / 60) % 3;
        if (roll === 0) this.runEvent({ type: 'boss', enemy: 'baron', text: 'Outro Barão surgiu!' });
        else if (roll === 1) this.runEvent({ type: 'boss', enemy: 'elder', text: 'O Dragão Ancião retornou!' });
        else this.runEvent({ type: 'elite', enemy: 'gromp', count: 4, text: 'Uma horda de Gromps!' });
      }
    }
  },

  runEvent(ev) {
    switch (ev.type) {
      case 'announce':
        this.announce(ev.text);
        break;
      case 'elite':
      case 'boss': {
        const n = ev.count || 1;
        for (let i = 0; i < n; i++) {
          const pos = this.spawnPos();
          const e = this.spawnEnemy(ev.enemy, pos.x, pos.y);
          if (ev.type === 'boss') {
            const scale = this.endless ? 1 + (this.time - VICTORY_TIME) / 120 : 1;
            e.hp *= scale; e.maxHp *= scale;
          }
        }
        if (ev.text) this.announce(ev.text, ev.type === 'boss' ? '#d78aff' : '#e8b04a');
        if (ev.type === 'boss') { Sfx.play('boss'); this.shake = 12; }
        break;
      }
      case 'minionWave': {
        const a = rand(0, TAU);
        const pos = this.spawnPos(a);
        const types = ev.super ? ['super', 'super', 'siege', 'siege'] : ['siege', 'siege'];
        for (let i = 0; i < 6; i++) types.push('melee', 'melee', 'caster');
        const px = -Math.sin(a), py = Math.cos(a);
        types.forEach((type, i) => {
          const row = Math.floor(i / 6), col = i % 6;
          this.spawnEnemy(type,
            pos.x + px * (col - 2.5) * 30 + Math.cos(a) * row * 30,
            pos.y + py * (col - 2.5) * 30 + Math.sin(a) * row * 30);
        });
        this.announce('Uma onda de tropas inimigas se aproxima!', '#ff8080');
        break;
      }
      case 'victory':
        this.gameOver(true);
        break;
    }
  },

  currentWave() {
    let w = WAVES[0];
    for (const wv of WAVES) if (this.time >= wv.t) w = wv;
    return w;
  },

  hpMult() { return 1 + (this.time / 60) * 0.32; },
  dmgScale() { return 1 + (this.time / 600) * 0.6; },
  speedScale() { return 1 + Math.min(0.25, (this.time / 900) * 0.25); },

  spawnUpdate(dt) {
    const wave = this.currentWave();
    let rate = wave.rate;
    let max = wave.max;
    if (this.endless) {
      const k = 1 + (this.time - VICTORY_TIME) / 120;
      rate *= k;
      max = Math.min(600, Math.floor(max * k));
    }
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.enemies.length >= max) continue;
      const pos = this.spawnPos();
      this.spawnEnemy(weightedPick(wave.mix), pos.x, pos.y);
    }
  },

  viewHalf() {
    return { w: this.w / 2 / this.zoom, h: this.h / 2 / this.zoom };
  },

  spawnPos(angle) {
    const v = this.viewHalf();
    const a = angle === undefined ? rand(0, TAU) : angle;
    const d = Math.hypot(v.w, v.h) + rand(40, 120);
    return { x: this.player.x + Math.cos(a) * d, y: this.player.y + Math.sin(a) * d };
  },

  spawnEnemy(type, x, y) {
    const d = ENEMIES[type];
    const hm = d.boss ? 1 : this.hpMult();
    const e = {
      type, def: d, x, y, r: d.r,
      hp: d.hp * hm, maxHp: d.hp * hm,
      speed: d.speed * (d.boss || d.elite ? 1 : this.speedScale()),
      dmg: d.dmg * this.dmgScale(),
      mass: d.mass || 1,
      kx: 0, ky: 0, slow: 0, slowT: 0, stun: 0, zoneSlow: 0, flash: 0,
      poisonT: 0, poisonDps: 0, poisonTick: 0, poisonSrc: null,
      shootT: rand(0.5, d.shootCd || 2), aiT: 2 + rand(0, 2), aiState: 0, dashX: 0, dashY: 0,
      life: d.lifetime || 0, face: 0, wob: Math.random() * TAU, dead: false,
    };
    this.enemies.push(e);
    return e;
  },

  // -------------------------------------------------------------------------
  // Consultas
  // -------------------------------------------------------------------------
  nearestEnemy(x, y, maxDist = Infinity, exclude = null) {
    let best = null;
    let bd = maxDist * maxDist;
    for (const e of this.enemies) {
      if (e.dead || (exclude && exclude.has(e))) continue;
      const dx = e.x - x, dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  },

  nearestEnemies(x, y, n, maxDist) {
    const md = maxDist * maxDist;
    const list = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < md) list.push({ e, d });
    }
    list.sort((a, b) => a.d - b.d);
    return list.slice(0, n).map((o) => o.e);
  },

  randomEnemyInView() {
    const v = this.viewHalf();
    const p = this.player;
    const inView = this.enemies.filter((e) => !e.dead && Math.abs(e.x - p.x) < v.w * 0.9 && Math.abs(e.y - p.y) < v.h * 0.9);
    return inView.length ? pick(inView) : null;
  },

  aimAngle(maxDist) {
    const p = this.player;
    const t = this.nearestEnemy(p.x, p.y, maxDist);
    return t ? Math.atan2(t.y - p.y, t.x - p.x) : p.facing;
  },

  forEnemiesInRadius(x, y, R, cb) {
    const list = this.grid.query(x, y, R + 64, this.qbuf).slice();
    for (const e of list) {
      if (e.dead) continue;
      const rr = R + e.r;
      if ((e.x - x) ** 2 + (e.y - y) ** 2 < rr * rr) cb(e);
    }
  },

  // -------------------------------------------------------------------------
  // Dano
  // -------------------------------------------------------------------------
  damageEnemy(e, base, opts = {}) {
    if (e.dead) return;
    const p = this.player;
    const st = p.stats;
    let dmg = base * st.dmgMult;
    if (p.baronT > 0) dmg *= 1.4;
    if (st.mejai) dmg *= 1 + Math.min(0.6, this.kills / 4000);
    let crit = false;
    if (!opts.noCrit && Math.random() < st.critChance) { dmg *= st.critMult; crit = true; }
    e.hp -= dmg;
    e.flash = 0.08;
    if (opts.src) opts.src.dmgDone += dmg;
    if (opts.knock && !e.def.boss) {
      const fx = opts.fromX !== undefined ? opts.fromX : p.x;
      const fy = opts.fromY !== undefined ? opts.fromY : p.y;
      const dx = e.x - fx, dy = e.y - fy;
      const d = Math.hypot(dx, dy) || 1;
      e.kx += (dx / d) * opts.knock / e.mass;
      e.ky += (dy / d) * opts.knock / e.mass;
    }
    if (this.texts.length < 140 || crit) {
      this.texts.push({ x: e.x + rand(-6, 6), y: e.y - e.r, text: String(Math.round(dmg)), life: 0.6, crit });
    }
    Sfx.play('hit');
    if (p.elderT > 0 && !e.def.boss && e.hp > 0 && e.hp < e.maxHp * 0.2) {
      e.hp = 0;
      this.burst(e.x, e.y, '#9ff', 6, 160);
    }
    if (e.hp <= 0) this.killEnemy(e);
  },

  explode(x, y, R, dmg, src, color, extra) {
    this.forEnemiesInRadius(x, y, R, (e) => {
      this.damageEnemy(e, dmg, { src, knock: 90, fromX: x, fromY: y });
      if (extra && !e.dead) extra(e);
    });
    this.addEffect({ kind: 'ring', x, y, r: R, life: 0.3, max: 0.3, color });
    this.burst(x, y, color, 8, 180);
    Sfx.play('boom');
  },

  killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    const p = this.player;
    const d = e.def;
    this.kills++;
    if (this.kills === 1) this.announce('Primeiro Abate!', '#ff6060');
    for (const [n, text] of KILL_MILESTONES) {
      if (this.kills === n) this.announce(text, '#ffb347');
    }
    p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.lifeOnKill);
    this.burst(e.x, e.y, d.color, d.boss ? 40 : d.elite ? 20 : 5, d.boss ? 260 : 120);

    this.dropXp(e.x, e.y, Math.round(d.xp * (1 + this.time / 500)));
    if (Math.random() < 0.08 || d.gold) {
      const n = d.gold ? Math.min(12, Math.ceil(d.gold / 3)) : 1;
      const per = (d.gold ? d.gold / n : randInt(1, 3)) * (1 + this.time / 240);
      for (let i = 0; i < n; i++) this.addPickup('gold', e.x + rand(-20, 20), e.y + rand(-20, 20), per);
    }
    if (Math.random() < 0.004) this.addPickup('heal', e.x, e.y, 30);
    if (Math.random() < 0.0015) this.addPickup('magnet', e.x, e.y, 0);
    if (d.chest) this.addPickup('chest', e.x, e.y, d.chest);
    if (d.split) {
      for (let i = 0; i < 2; i++) this.spawnEnemy(d.split, e.x + rand(-15, 15), e.y + rand(-15, 15));
    }
    if (d.elite || d.boss) {
      if (p.key === 'jinx') p.exciteT = 4;
      this.announce(`${d.name} foi abatido!`, '#e8b04a');
    }
    if (e.type === 'dragon') {
      p.dragonStacks++;
      p.recalc();
      this.announce('Alma do Dragão: +8% de dano permanente!', '#ff8a5a');
    } else if (e.type === 'baron') {
      p.baronT = 120;
      this.announce('Mão do Barão: +40% de dano por 2 minutos!', '#d78aff');
    } else if (e.type === 'elder') {
      p.elderT = 120;
      this.announce('Aspecto do Dragão Ancião: executa inimigos com pouca vida!', '#9ff');
    } else if (e.type === 'herald') {
      this.addPickup('magnet', e.x + 30, e.y, 0);
    }
  },

  dropXp(x, y, value) {
    const gems = this.pickups.filter((pk) => pk.type === 'xp');
    if (gems.length > 300) {
      // Evita milhares de gemas na tela: soma em uma gema existente.
      pick(gems).value += value;
      return;
    }
    this.addPickup('xp', x, y, value);
  },

  addPickup(type, x, y, value) {
    this.pickups.push({ type, x, y, value, mag: this.magnetAll && type === 'xp', sp: 0 });
  },

  hurtPlayer(amount, source) {
    const p = this.player;
    if (p.invuln > 0 || amount <= 0) return;
    const dmg = Math.max(1, amount - p.stats.armor);
    p.hp -= dmg;
    this.damageTaken += dmg;
    p.invuln = 0.45;
    p.hurtT = 0.2;
    this.shake = Math.max(this.shake, 6);
    this.texts.push({ x: p.x, y: p.y - 24, text: '-' + Math.round(dmg), life: 0.7, hurt: true });
    Sfx.play('hurt');
    if (source && p.stats.thorns > 0 && !source.dead && source.hp !== undefined) {
      this.damageEnemy(source, p.stats.thorns, { noCrit: true });
    }
  },

  // -------------------------------------------------------------------------
  // Atualizações
  // -------------------------------------------------------------------------
  addProjectile(o) {
    o.hit = new Set();
    o.dead = false;
    if (o.pierce === undefined) o.pierce = 0;
    this.projectiles.push(o);
  },

  updateProjectiles(dt) {
    const buf = [];
    for (const pr of this.projectiles) {
      if (pr.update) pr.update(this, pr, dt);
      if (pr.dead) continue;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      if (pr.life <= 0) {
        pr.dead = true;
        if (pr.onExpire) pr.onExpire(this, pr);
        continue;
      }
      this.grid.query(pr.x, pr.y, pr.r + 64, buf);
      for (const e of buf) {
        if (e.dead || pr.hit.has(e)) continue;
        const rr = pr.r + e.r;
        if ((e.x - pr.x) ** 2 + (e.y - pr.y) ** 2 > rr * rr) continue;
        pr.hit.add(e);
        if (pr.dmg > 0) this.damageEnemy(e, pr.dmg, { src: pr.src, knock: 40, fromX: pr.x - pr.vx, fromY: pr.y - pr.vy });
        if (pr.onHit) pr.onHit(this, pr, e);
        pr.pierce--;
        if (pr.pierce < 0) { pr.dead = true; break; }
      }
    }
    this.projectiles = this.projectiles.filter((pr) => !pr.dead);
  },

  updateEnemies(dt) {
    const p = this.player;
    const v = this.viewHalf();
    const farD = Math.hypot(v.w, v.h) * 1.6;
    const buf = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = e.def;
      e.flash -= dt;
      if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
      if (e.poisonT > 0) {
        e.poisonT -= dt;
        e.poisonTick -= dt;
        if (e.poisonTick <= 0) {
          e.poisonTick = 0.5;
          this.damageEnemy(e, e.poisonDps * 0.5 / p.stats.dmgMult, { src: e.poisonSrc, noCrit: true });
          if (e.dead) continue;
        }
      }
      const slowF = 1 - Math.max(e.slow, e.zoneSlow);
      e.zoneSlow = 0;

      let dx = p.x - e.x, dy = p.y - e.y;
      let dist = Math.hypot(dx, dy) || 1;

      // Reposiciona inimigos comuns que ficaram muito longe.
      if (dist > farD * (d.boss || d.elite ? 1.5 : 1) && d.ai !== 'flee') {
        const a = p.moving ? p.facing + rand(-1, 1) : rand(0, TAU);
        const pos = this.spawnPos(a);
        e.x = pos.x; e.y = pos.y;
        continue;
      }

      let mx = dx / dist, my = dy / dist;
      let move = true;
      let spd = e.speed * slowF;
      e.face = Math.atan2(my, mx);

      if (e.stun > 0) {
        e.stun -= dt;
        move = false;
      } else {
        switch (d.ai) {
          case 'ranged':
            if (dist < d.range) {
              move = dist > d.range * 0.65;
              e.shootT -= dt;
              if (e.shootT <= 0) {
                e.shootT = d.shootCd;
                this.enemyShoot(e.x, e.y, Math.atan2(dy, dx), d.projSpeed, d.projDmg * this.dmgScale(), d.shape === 'siege' ? 7 : 5, d.shape === 'siege' ? '#ff7043' : '#ff6ad5');
              }
            }
            break;
          case 'flee':
            mx = -mx; my = -my;
            e.face = Math.atan2(my, mx);
            e.life -= dt;
            if (e.life <= 0) {
              e.dead = true;
              this.announce('O Caranguejo do Rio fugiu...', '#7fd6cf');
              continue;
            }
            break;
          case 'gromp':
            e.shootT -= dt;
            if (e.shootT <= 0 && dist < 450) {
              e.shootT = 2.5;
              const base = Math.atan2(dy, dx);
              for (let i = -1; i <= 1; i++) this.enemyShoot(e.x, e.y, base + i * 0.25, 200, 12 * this.dmgScale(), 8, '#9bd64b');
            }
            break;
          case 'herald':
            e.aiT -= dt;
            if (e.aiState === 0 && e.aiT <= 0 && dist < 600) {
              e.aiState = 1; e.aiT = 0.8;
              e.dashX = mx; e.dashY = my;
              this.addEffect({ kind: 'telegraph', x: e.x, y: e.y, r: e.r + 10, life: 0.8, max: 0.8, color: '#ff3b3b' });
            } else if (e.aiState === 1) {
              move = false;
              if (e.aiT <= 0) { e.aiState = 2; e.aiT = 0.7; }
            } else if (e.aiState === 2) {
              mx = e.dashX; my = e.dashY;
              spd = 520;
              if (e.aiT <= 0) { e.aiState = 0; e.aiT = 3.5; }
            }
            break;
          case 'dragon':
            e.shootT -= dt;
            if (e.shootT <= 0 && dist < 650) {
              e.shootT = d.elder ? 1.8 : 2.4;
              const base = Math.atan2(dy, dx);
              const n = d.elder ? 7 : 5;
              for (let i = 0; i < n; i++) {
                this.enemyShoot(e.x, e.y, base + (i - (n - 1) / 2) * 0.18, 240, 14 * this.dmgScale(), 9, d.elder ? '#9ff' : '#ff7a2a');
              }
            }
            break;
          case 'baron':
            e.shootT -= dt;
            e.aiT -= dt;
            if (e.shootT <= 0) {
              e.shootT = 3;
              const off = rand(0, TAU);
              for (let i = 0; i < 14; i++) this.enemyShoot(e.x, e.y, off + (i * TAU) / 14, 200, 16 * this.dmgScale(), 10, '#c86bff');
            }
            if (e.aiT <= 0) {
              e.aiT = 7;
              for (let i = 0; i < 5; i++) this.spawnEnemy('voidling', e.x + rand(-60, 60), e.y + rand(-60, 60));
            }
            break;
        }
        if (move) {
          e.x += mx * spd * dt;
          e.y += my * spd * dt;
        }
      }

      // Repulsão (empurrão)
      e.x += e.kx * dt;
      e.y += e.ky * dt;
      const decay = Math.max(0, 1 - 10 * dt);
      e.kx *= decay; e.ky *= decay;

      // Separação entre inimigos
      if (!d.boss) {
        this.grid.query(e.x, e.y, e.r + 30, buf);
        let n = 0;
        for (const o of buf) {
          if (o === e || o.dead) continue;
          const ox = e.x - o.x, oy = e.y - o.y;
          const rr = e.r + o.r;
          const dd = ox * ox + oy * oy;
          if (dd >= rr * rr || dd === 0) continue;
          const dl = Math.sqrt(dd);
          const push = ((rr - dl) / dl) * (o.mass / (e.mass + o.mass)) * 0.5;
          e.x += ox * push;
          e.y += oy * push;
          if (++n > 6) break;
        }
      }

      // Dano de contato
      if (d.dmg > 0) {
        dx = p.x - e.x; dy = p.y - e.y;
        const rr = e.r + p.r - 4;
        if (dx * dx + dy * dy < rr * rr) this.hurtPlayer(e.dmg, e);
      }
    }
  },

  enemyShoot(x, y, a, speed, dmg, r, color) {
    if (this.enemyProjectiles.length > 400) return;
    this.enemyProjectiles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, dmg, color, life: 4 });
  },

  updateEnemyProjectiles(dt) {
    const p = this.player;
    for (const b of this.enemyProjectiles) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      const rr = b.r + p.r - 3;
      if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < rr * rr) {
        b.life = 0;
        this.hurtPlayer(b.dmg, null);
      }
    }
    this.enemyProjectiles = this.enemyProjectiles.filter((b) => b.life > 0);
  },

  updatePickups(dt) {
    const p = this.player;
    const range = p.stats.pickupRange;
    for (const pk of this.pickups) {
      const dx = p.x - pk.x, dy = p.y - pk.y;
      const d = Math.hypot(dx, dy) || 1;
      if (!pk.mag && d < range) pk.mag = true;
      if (pk.mag) {
        pk.sp = Math.min(1100, pk.sp + 1400 * dt);
        const s = Math.max(pk.sp, 150);
        pk.x += (dx / d) * Math.min(d, s * dt);
        pk.y += (dy / d) * Math.min(d, s * dt);
      }
      if (d < p.r + 10) {
        pk.collected = true;
        this.collect(pk);
      }
    }
    this.pickups = this.pickups.filter((pk) => !pk.collected);
    if (this.magnetAll && !this.pickups.some((pk) => pk.type === 'xp')) this.magnetAll = false;
  },

  collect(pk) {
    const p = this.player;
    switch (pk.type) {
      case 'xp':
        p.gainXp(pk.value);
        Sfx.play('pickup');
        break;
      case 'gold': {
        const v = Math.max(1, Math.round(pk.value * p.stats.goldMult));
        this.gold += v;
        Sfx.play('gold');
        break;
      }
      case 'heal':
        p.hp = Math.min(p.stats.maxHp, p.hp + pk.value);
        this.floatText(p.x, p.y - 30, '+' + pk.value, '#6dff8a');
        Sfx.play('pickup');
        break;
      case 'magnet':
        this.magnetAll = true;
        for (const g of this.pickups) if (g.type === 'xp' || g.type === 'gold') g.mag = true;
        this.announce('Lente do Oráculo: todas as gemas atraídas!', '#7ad7ff');
        break;
      case 'chest':
        this.pendingChests.push(pk.value);
        Sfx.play('chest');
        break;
    }
  },

  updateFx(dt) {
    for (const fx of this.effects) fx.life -= dt;
    this.effects = this.effects.filter((fx) => fx.life > 0);
    for (const pt of this.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 1 - 3 * dt;
      pt.vy *= 1 - 3 * dt;
      pt.life -= dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
    for (const t of this.texts) { t.y -= 40 * dt; t.life -= dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const a of this.announcements) a.life -= dt;
    this.announcements = this.announcements.filter((a) => a.life > 0);
  },

  addEffect(fx) { this.effects.push(fx); },

  later(t, fn) { this.timers.push({ t, fn }); },

  burst(x, y, color, n, speed) {
    if (this.particles.length > 500) return;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(0.3, 1) * speed;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.6), max: 0.6, color, size: rand(2, 4) });
    }
  },

  floatText(x, y, text, color) {
    this.texts.push({ x, y, text, life: 0.9, color });
  },

  announce(text, color = '#f0e6d2') {
    this.announcements.push({ text, color, life: 3, max: 3 });
    if (this.announcements.length > 3) this.announcements.shift();
  },

  // -------------------------------------------------------------------------
  // Evolução (subir de nível / baús)
  // -------------------------------------------------------------------------
  upgradeOptions() {
    const p = this.player;
    const opts = [];
    for (const w of p.weapons) {
      const def = WEAPONS[w.key];
      if (w.level < def.maxLevel) opts.push({ type: 'weapon', key: w.key, level: w.level + 1, weight: 3 });
    }
    if (p.weapons.length < 6) {
      for (const key in WEAPONS) {
        if (!p.weapons.some((w) => w.key === key)) opts.push({ type: 'weapon', key, level: 1, weight: 2 });
      }
    }
    for (const key of p.itemOrder) {
      if (p.items[key] < ITEMS[key].maxLevel) opts.push({ type: 'item', key, level: p.items[key] + 1, weight: 3 });
    }
    if (p.itemOrder.length < 6) {
      for (const key in ITEMS) {
        if (!p.items[key] && !ITEMS[key].fusion && !this.lockedByFusion(key)) opts.push({ type: 'item', key, level: 1, weight: 2 });
      }
    }
    return opts;
  },

  rollChoices(n = 3) {
    const pool = this.upgradeOptions();
    const out = [];
    while (out.length < n && pool.length) {
      let total = 0;
      for (const o of pool) total += o.weight;
      let r = Math.random() * total;
      let idx = 0;
      for (; idx < pool.length - 1; idx++) {
        r -= pool[idx].weight;
        if (r <= 0) break;
      }
      out.push(pool.splice(idx, 1)[0]);
    }
    if (out.length === 0) {
      out.push({ type: 'gold', key: 'gold', level: 0 });
      out.push({ type: 'heal', key: 'heal', level: 0 });
    }
    return out;
  },

  applyUpgrade(opt) {
    const p = this.player;
    if (opt.type === 'weapon') {
      const w = p.weapons.find((x) => x.key === opt.key);
      if (w) w.level++;
      else this.addWeapon(opt.key);
    } else if (opt.type === 'item') {
      if (!p.items[opt.key]) { p.items[opt.key] = 1; p.itemOrder.push(opt.key); }
      else p.items[opt.key]++;
      p.recalc();
    } else if (opt.type === 'gold') {
      this.gold += 50;
    } else if (opt.type === 'heal') {
      p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * 0.5);
    }
    this.checkRecipes();
  },

  reroll() {
    if (this.gold < this.rerollCost) return null;
    this.gold -= this.rerollCost;
    this.rerollCost = Math.round(this.rerollCost * 1.5);
    return this.rollChoices();
  },

  openChest(count) {
    const rewards = [];
    for (let i = 0; i < count; i++) {
      const pool = this.upgradeOptions();
      const owned = pool.filter((o) => o.weight === 3);
      const choice = owned.length && Math.random() < 0.75 ? pick(owned) : pool.length ? pick(pool) : null;
      if (choice) {
        this.applyUpgrade(choice);
        rewards.push(choice);
      } else {
        this.gold += 50;
        rewards.push({ type: 'gold', key: 'gold', level: 0 });
      }
    }
    const bonusGold = randInt(10, 30) * count;
    this.gold += bonusGold;
    return { rewards, gold: bonusGold };
  },

  // -------------------------------------------------------------------------
  // Loja: comprar, melhorar, vender, fundir itens e evoluir habilidades
  // -------------------------------------------------------------------------
  lockedByFusion(key) {
    const p = this.player;
    return p.itemOrder.some((k) => ITEMS[k].fusion && ITEMS[k].fusion.includes(key));
  },

  // O jogador tem o efeito do item, seja o item em si ou uma fusão que o contém.
  hasItemEffect(key) {
    return !!this.player.items[key] || this.lockedByFusion(key);
  },

  evolveStatus(w) {
    const def = WEAPONS[w.key];
    if (!def.evo || w.evolved) return 'done';
    if (w.level < def.maxLevel) return 'level';
    if (!this.hasItemEffect(def.evo.item)) return 'item';
    return this.gold >= SHOP.evolve ? 'ready' : 'gold';
  },

  fusionStatus(fkey) {
    const p = this.player;
    const [a, b] = ITEMS[fkey].fusion;
    if (p.items[fkey]) return 'done';
    if (!(p.items[a] >= ITEMS[a].maxLevel && p.items[b] >= ITEMS[b].maxLevel)) return 'items';
    return this.gold >= SHOP.fusion ? 'ready' : 'gold';
  },

  spend(cost) {
    if (this.gold < cost) return false;
    this.gold -= cost;
    Sfx.play('gold');
    return true;
  },

  evolveWeapon(key) {
    const w = this.player.weapons.find((x) => x.key === key);
    if (!w || this.evolveStatus(w) !== 'ready' || !this.spend(SHOP.evolve)) return false;
    w.evolved = true;
    Sfx.play('levelup');
    this.announce(`${WEAPONS[key].evo.name}!`, '#f5d067');
    return true;
  },

  fuseItems(fkey) {
    const p = this.player;
    if (this.fusionStatus(fkey) !== 'ready' || !this.spend(SHOP.fusion)) return false;
    const [a, b] = ITEMS[fkey].fusion;
    const idx = Math.min(p.itemOrder.indexOf(a), p.itemOrder.indexOf(b));
    p.itemOrder = p.itemOrder.filter((k) => k !== a && k !== b);
    delete p.items[a];
    delete p.items[b];
    p.itemOrder.splice(idx, 0, fkey);
    p.items[fkey] = 1;
    p.recalc();
    Sfx.play('chest');
    this.announce(`${ITEMS[fkey].name} forjado!`, '#f5d067');
    this.checkRecipes();
    return true;
  },

  buyItem(key) {
    const p = this.player;
    if (p.items[key] || ITEMS[key].fusion || this.lockedByFusion(key) || p.itemOrder.length >= 6) return false;
    if (!this.spend(SHOP.buyItem)) return false;
    this.applyUpgrade({ type: 'item', key, level: 1 });
    return true;
  },

  upgradeItem(key) {
    const p = this.player;
    const lvl = p.items[key];
    if (!lvl || lvl >= ITEMS[key].maxLevel || !this.spend(SHOP.upgradeItem(lvl))) return false;
    this.applyUpgrade({ type: 'item', key, level: lvl + 1 });
    return true;
  },

  sellItem(key) {
    const p = this.player;
    const lvl = p.items[key];
    if (!lvl) return false;
    this.gold += ITEMS[key].fusion ? SHOP.sellFusion : SHOP.sellItem(lvl);
    delete p.items[key];
    p.itemOrder = p.itemOrder.filter((k) => k !== key);
    p.recalc();
    Sfx.play('gold');
    return true;
  },

  sellWeapon(key) {
    const p = this.player;
    if (p.weapons.length <= 1) return false;
    const w = p.weapons.find((x) => x.key === key);
    if (!w) return false;
    this.gold += SHOP.sellWeapon(w);
    p.weapons = p.weapons.filter((x) => x !== w);
    Sfx.play('gold');
    return true;
  },

  // Avisa (uma vez) quando uma evolução ou fusão fica disponível.
  checkRecipes() {
    const p = this.player;
    for (const w of p.weapons) {
      const st = this.evolveStatus(w);
      if ((st === 'ready' || st === 'gold') && !this.notified.has('w:' + w.key)) {
        this.notified.add('w:' + w.key);
        this.announce(`Evolução disponível: ${WEAPONS[w.key].evo.name} (loja: B)`, '#f5d067');
      }
    }
    for (const k in ITEMS) {
      if (!ITEMS[k].fusion) continue;
      const st = this.fusionStatus(k);
      if ((st === 'ready' || st === 'gold') && !this.notified.has('f:' + k)) {
        this.notified.add('f:' + k);
        this.announce(`Fusão disponível: ${ITEMS[k].name} (loja: B)`, '#f5d067');
      }
    }
  },

  openOverlay(kind) {
    if (this.state !== 'playing') return;
    this.state = kind;
    if (kind === 'shop') UI.showShop();
    else UI.showStatus();
  },

  closeOverlay() {
    if (this.state !== 'shop' && this.state !== 'status' && this.state !== 'paused') return;
    this.state = 'playing';
    UI.hideScreens();
  },

  // -------------------------------------------------------------------------
  // Recordes
  // -------------------------------------------------------------------------
  loadRecords() {
    try {
      return JSON.parse(localStorage.getItem('bulletrift.records') || '{}');
    } catch (e) {
      return {};
    }
  },

  saveRecord(victory) {
    const rec = this.loadRecords();
    const r = rec[this.champKey] || { time: 0, kills: 0, wins: 0 };
    r.time = Math.max(r.time, Math.floor(this.time));
    r.kills = Math.max(r.kills, this.kills);
    if (victory) r.wins = (r.wins || 0) + 1;
    rec[this.champKey] = r;
    try {
      localStorage.setItem('bulletrift.records', JSON.stringify(rec));
    } catch (e) { /* armazenamento indisponível */ }
  },

  // -------------------------------------------------------------------------
  // Renderização
  // -------------------------------------------------------------------------
  render() {
    const ctx = this.ctx;
    const lc = this.lctx;
    const dpr = this.dpr;
    const P = this.pix;
    const lw = this.low.width, lh = this.low.height;
    const ox = Math.floor(lw / 2), oy = Math.floor(lh / 2);
    lc.imageSmoothingEnabled = false;

    let camX, camY;
    if (this.state === 'menu' || !this.player) {
      camX = Math.cos(this.menuT * 0.1) * 400;
      camY = this.menuT * 30;
    } else {
      const sx = this.shake > 0 ? rand(-this.shake, this.shake) * 0.5 : 0;
      const sy = this.shake > 0 ? rand(-this.shake, this.shake) * 0.5 : 0;
      camX = this.cam.x + sx;
      camY = this.cam.y + sy;
    }
    camX = Math.round(camX / ART) * ART;
    camY = Math.round(camY / ART) * ART;
    lc.setTransform(1 / ART, 0, 0, 1 / ART, ox - camX / ART, oy - camY / ART);
    const v = this.viewHalf();
    const x0 = camX - v.w - 60, x1 = camX + v.w + 60, y0 = camY - v.h - 60, y1 = camY + v.h + 60;

    drawBackground(lc, x0, y0, x1, y1);
    if (this.state !== 'menu' && this.player) this.renderWorld(lc, camX, camY, x0, x1, y0, y1, v);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.low, 0, 0, lw * P, lh * P);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.state === 'menu' || !this.player) {
      ctx.fillStyle = 'rgba(1,10,19,0.55)';
      ctx.fillRect(0, 0, this.w, this.h);
      return;
    }

    // Números de dano (texto nítido em fonte pixelada, sobre o mundo ampliado)
    const toSX = (wx) => ((wx - camX) / ART + ox) * P / dpr;
    const toSY = (wy) => ((wy - camY) / ART + oy) * P / dpr;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life * 2.5);
      const size = t.crit ? 24 : t.hurt ? 21 : 17;
      ctx.font = `${size}px VT323, monospace`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUTLINE;
      ctx.fillStyle = t.color || (t.hurt ? '#ff4d4d' : t.crit ? '#ffb347' : '#ffffff');
      const sx = Math.round(toSX(t.x)), sy = Math.round(toSY(t.y));
      ctx.strokeText(t.text, sx, sy);
      ctx.fillText(t.text, sx, sy);
    }
    ctx.globalAlpha = 1;
    HUD.draw(ctx, this);
  },

  renderWorld(ctx, camX, camY, x0, x1, y0, y1, v) {
    const p = this.player;
    const inView = (o, m = 40) => o.x > x0 - m && o.x < x1 + m && o.y > y0 - m && o.y < y1 + m;

    for (const w of p.weapons) if (WEAPONS[w.key].drawGround) WEAPONS[w.key].drawGround(w, this, ctx);
    if (p.stats.burn > 0) {
      const R = SUNFIRE_RADIUS * p.stats.areaMult;
      ctx.save();
      ctx.globalAlpha = 0.12 + 0.04 * (Math.floor(this.time * 6) & 1);
      ctx.fillStyle = '#ff7a2a';
      ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.fill();
      ctx.restore();
    }
    for (const pk of this.pickups) if (inView(pk)) drawPickup(ctx, pk, this.time);

    // Inimigos (chefes por cima)
    for (const e of this.enemies) if (!e.def.boss && inView(e, e.r * 2)) drawEnemy(ctx, e, this.time);
    for (const e of this.enemies) if (e.def.boss) drawEnemy(ctx, e, this.time);

    for (const w of p.weapons) if (WEAPONS[w.key].draw) WEAPONS[w.key].draw(w, this, ctx);

    // Jogador
    if (p.baronT > 0 || p.elderT > 0) {
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.1 * (Math.floor(this.time * 4) & 1);
      ctx.fillStyle = p.baronT > 0 ? '#b46bff' : '#7fe8ff';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 10, 0, TAU); ctx.fill();
      ctx.restore();
    }
    const blink = p.invuln > 0 && Math.floor(this.time * 20) % 2 === 0;
    if (!blink) drawChampion(ctx, p.key, p.x, p.y, p.r, p.facing, this.time, p.moving);
    if (p.hurtT > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(0.6, p.hurtT * 3); ctx.fillStyle = '#ff3030';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 2, 0, TAU); ctx.fill(); ctx.restore();
    }
    // Barra de vida sob o jogador
    const bx = Math.round(p.x / ART) * ART - 20, by = Math.round(p.y / ART) * ART + p.r + 8;
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(bx - ART, by - ART, 40 + ART * 2, ART * 4);
    ctx.fillStyle = '#5a1a1a';
    ctx.fillRect(bx, by, 40, ART * 2);
    ctx.fillStyle = '#4ee36a';
    ctx.fillRect(bx, by, Math.round((20 * Math.max(0, p.hp)) / p.stats.maxHp) * ART, ART * 2);

    for (const pr of this.projectiles) if (inView(pr)) drawProjectile(ctx, pr, this.time);
    for (const b of this.enemyProjectiles) if (inView(b)) drawEnemyProjectile(ctx, b);
    for (const fx of this.effects) drawEffect(ctx, fx, this);
    for (const pt of this.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.fillRect(Math.round(pt.x / ART) * ART, Math.round(pt.y / ART) * ART, ART * (pt.size > 3 ? 2 : 1), ART * (pt.size > 3 ? 2 : 1));
    }
    ctx.globalAlpha = 1;

    // Indicadores de chefes / elites fora da tela
    for (const e of this.enemies) {
      if (!(e.def.boss || e.def.elite) || inView(e, -60)) continue;
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      const ix = clamp(p.x + Math.cos(a) * 9999, camX - v.w + 24, camX + v.w - 24);
      const iy = clamp(p.y + Math.sin(a) * 9999, camY - v.h + 70, camY + v.h - 90);
      ctx.save();
      ctx.translate(ix, iy); ctx.rotate(a);
      ctx.fillStyle = e.def.boss ? '#d78aff' : '#e8b04a';
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.fill();
      ctx.restore();
    }
  },
};

window.addEventListener('DOMContentLoaded', () => Game.init());
