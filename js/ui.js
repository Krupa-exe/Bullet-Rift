'use strict';

const UI = {
  init(game) {
    this.g = game;
    this.$ = (id) => document.getElementById(id);
    this.selected = null;
    this.choices = [];

    this.buildChampionList();
    this.$('btn-start').addEventListener('click', () => {
      if (this.selected) game.start(this.selected);
    });
    this.$('btn-reroll').addEventListener('click', () => this.reroll());
    this.$('btn-chest-ok').addEventListener('click', () => this.closeChest());
    this.$('btn-resume').addEventListener('click', () => game.resume());
    this.$('btn-quit').addEventListener('click', () => {
      game.saveRecord(false);
      this.toMenu();
    });
    this.$('btn-retry').addEventListener('click', () => game.start(game.champKey));
    this.$('btn-menu').addEventListener('click', () => this.toMenu());
    this.$('btn-endless').addEventListener('click', () => game.continueEndless());
    this.$('btn-hud-shop').addEventListener('click', () => game.openOverlay('shop'));
    this.$('btn-hud-status').addEventListener('click', () => game.openOverlay('status'));
    this.$('btn-hud-pause').addEventListener('click', () => game.pause());
    for (const id of ['btn-shop-close', 'btn-status-close']) this.$(id).addEventListener('click', () => game.closeOverlay());
    this.$('btn-status-shop').addEventListener('click', () => {
      game.closeOverlay();
      game.openOverlay('shop');
    });
    this.$('shop-body').addEventListener('click', (e) => this.onShopClick(e));
    this.$('t-ult').addEventListener('touchstart', (e) => { e.preventDefault(); game.useUlt(); }, { passive: false });
    this.$('t-flash').addEventListener('touchstart', (e) => { e.preventDefault(); game.useFlash(); }, { passive: false });
    this.$('btn-mute').addEventListener('click', () => {
      Sfx.init();
      this.$('btn-mute').textContent = Sfx.toggle() ? '🔇 Som desligado' : '🔊 Som ligado';
    });
  },

  icon(emoji, cls) {
    return Icons.html(emoji, cls);
  },

  buildChampionList() {
    const list = this.$('champ-list');
    list.innerHTML = '';
    const records = this.g.loadRecords();
    this.portraits = [];
    for (const key in CHAMPIONS) {
      const c = CHAMPIONS[key];
      const w = WEAPONS[c.startWeapon];
      const rec = records[key];
      const card = document.createElement('button');
      card.className = 'champ-card';
      card.dataset.key = key;
      card.innerHTML = `
        <canvas width="120" height="136"></canvas>
        <div class="champ-name">${c.name}</div>
        <div class="champ-title">${c.title} · ${c.role}</div>
        <p class="champ-desc">${c.desc}</p>
        <ul class="champ-info">
          <li>${this.icon(w.icon)} <b>${w.name}</b>: habilidade inicial</li>
          <li><b>Passiva:</b> ${c.passive}</li>
          <li>${this.icon(c.ult.icon)} <b>${c.ult.name}:</b> ${c.ult.desc}</li>
        </ul>
        <div class="champ-record">${rec ? `Recorde: ${formatTime(rec.time)} · ${rec.kills} abates${rec.wins ? ` · ${rec.wins} vitória(s)` : ''}` : 'Sem recorde'}</div>`;
      const cv = card.querySelector('canvas');
      this.portraits.push({ cv, key });
      World3D.renderPortrait(key, 0, false, cv);
      card.addEventListener('click', () => this.selectChampion(key));
      card.addEventListener('dblclick', () => this.g.start(key));
      list.appendChild(card);
    }
  },

  // Retratos 3D animados no menu (atualizados ~15 vezes por segundo).
  animatePortraits(t) {
    if (!this.portraits || t - (this.lastPortraitT || 0) < 1 / 15) return;
    this.lastPortraitT = t;
    for (const { cv, key } of this.portraits) World3D.renderPortrait(key, t + key.length, key === this.selected, cv);
  },

  selectChampion(key) {
    Sfx.init();
    this.selected = key;
    for (const el of document.querySelectorAll('.champ-card')) el.classList.toggle('selected', el.dataset.key === key);
    const btn = this.$('btn-start');
    btn.disabled = false;
    btn.textContent = `Jogar com ${CHAMPIONS[key].name}`;
  },

  toMenu() {
    this.g.state = 'menu';
    this.g.player = null;
    this.hideScreens();
    this.showHudButtons(false);
    this.buildChampionList();
    if (this.selected) this.selectChampion(this.selected);
    this.$('menu').classList.remove('hidden');
  },

  onGameStart() {
    this.$('menu').classList.add('hidden');
    this.hideScreens();
  },

  hideScreens() {
    for (const id of ['levelup', 'chest', 'pause', 'gameover', 'shop', 'status']) this.$(id).classList.add('hidden');
    this.showHudButtons(this.g.state === 'playing');
  },

  showHudButtons(on) {
    this.$('hud-buttons').classList.toggle('hidden', !on);
    this.$('touch-buttons').classList.toggle('hidden', !(on && Input.isTouch));
  },

  open(id) {
    this.showHudButtons(false);
    this.$(id).classList.remove('hidden');
  },

  // --- Subir de nível -----------------------------------------------------
  optionInfo(opt) {
    if (opt.type === 'weapon') {
      const d = WEAPONS[opt.key];
      return {
        icon: d.icon, name: d.name, tag: `Habilidade · ${d.champ}`,
        desc: opt.level === 1 ? d.desc : d.levelDesc[opt.level - 1],
        lvl: opt.level === 1 ? 'Novo!' : `Nível ${opt.level}`, isNew: opt.level === 1, cls: 'weapon',
      };
    }
    if (opt.type === 'item') {
      const d = ITEMS[opt.key];
      return {
        icon: d.icon, name: d.name, tag: 'Item',
        desc: d.desc, lvl: opt.level === 1 ? 'Novo!' : `Nível ${opt.level}`, isNew: opt.level === 1, cls: 'item',
      };
    }
    if (opt.type === 'gold') return { icon: '🪙', name: 'Bolsa de Ouro', tag: 'Bônus', desc: '+50 de ouro.', lvl: '', cls: 'item' };
    return { icon: '🧪', name: 'Poção de Vida', tag: 'Bônus', desc: 'Recupera 50% da vida máxima.', lvl: '', cls: 'item' };
  },

  showLevelUp() {
    this.choices = this.g.rollChoices();
    this.renderChoices();
    this.$('levelup-title').textContent = `Nível ${this.g.player.level - this.g.player.pendingLevels}!`;
    this.open('levelup');
  },

  renderChoices() {
    const box = this.$('choices');
    box.innerHTML = '';
    this.choices.forEach((opt, i) => {
      const info = this.optionInfo(opt);
      const el = document.createElement('button');
      el.className = `choice ${info.cls}`;
      el.innerHTML = `
        <div class="choice-icon">${this.icon(info.icon)}</div>
        <div class="choice-body">
          <div class="choice-head"><span class="choice-name">${info.name}</span><span class="choice-lvl ${info.isNew ? 'new' : ''}">${info.lvl}</span></div>
          <div class="choice-tag">${info.tag}</div>
          <div class="choice-desc">${info.desc}</div>
        </div>
        <div class="choice-key">${i + 1}</div>`;
      el.addEventListener('click', () => this.chooseIndex(i));
      box.appendChild(el);
    });
    const rb = this.$('btn-reroll');
    rb.textContent = `Rerrolar (${this.g.rerollCost} de ouro) [R]`;
    rb.disabled = this.g.gold < this.g.rerollCost;
  },

  chooseIndex(i) {
    if (this.g.state !== 'levelup' || !this.choices[i]) return;
    this.g.applyUpgrade(this.choices[i]);
    this.g.afterModal();
  },

  reroll() {
    if (this.g.state !== 'levelup') return;
    const c = this.g.reroll();
    if (!c) return;
    this.choices = c;
    this.renderChoices();
  },

  // --- Baú ----------------------------------------------------------------
  showChest(result) {
    const box = this.$('chest-items');
    box.innerHTML = '';
    for (const opt of result.rewards) {
      const info = this.optionInfo(opt);
      const el = document.createElement('div');
      el.className = `chest-reward ${info.cls}`;
      el.innerHTML = `<span class="choice-icon">${this.icon(info.icon)}</span><span><b>${info.name}</b> <em>${info.lvl}</em></span>`;
      box.appendChild(el);
    }
    const goldEl = document.createElement('div');
    goldEl.className = 'chest-gold';
    goldEl.textContent = `+${result.gold} de ouro`;
    box.appendChild(goldEl);
    this.open('chest');
  },

  closeChest() {
    if (this.g.state !== 'chest') return;
    this.g.afterModal();
  },

  // --- Pausa e status -----------------------------------------------------
  showPause() {
    this.$('pause-build').innerHTML = this.buildSummary();
    this.open('pause');
  },

  showStatus() {
    this.$('status-body').innerHTML = this.buildSummary(true);
    this.open('status');
  },

  statRows() {
    const g = this.g;
    const p = g.player;
    const st = p.stats;
    const pct = (v) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`;
    const rows = [
      ['Vida', `${Math.ceil(p.hp)} / ${Math.round(st.maxHp)}`],
      ['Regeneração', `${st.regen.toFixed(1)}/s`],
      ['Armadura', st.armor],
      ['Dano', pct(st.dmgMult - 1)],
      ['Chance de crítico', `${Math.round(Math.min(1, st.critChance) * 100)}%`],
      ['Dano crítico', `x${st.critMult.toFixed(2)}`],
      ['Redução de recarga', `${Math.round((1 - st.cdMult) * 100)}%`],
      ['Área', pct(st.areaMult - 1)],
      ['Projéteis extras', `+${st.amount}`],
      ['Vel. de projéteis', pct(st.projSpeed - 1)],
      ['Vel. de movimento', pct(st.speedMult - 1)],
      ['Raio de coleta', Math.round(st.pickupRange)],
      ['Bônus de ouro', pct(st.goldMult - 1)],
    ];
    if (st.lifeOnKill) rows.push(['Vida por abate', st.lifeOnKill.toFixed(1)]);
    if (st.thorns) rows.push(['Dano de espinhos', st.thorns]);
    if (st.burn) rows.push(['Aura de fogo', `${st.burn}/s`]);
    if (st.mejai) rows.push(['Bônus de Mejai', pct(Math.min(0.6, g.kills / 4000))]);
    if (p.dragonStacks) rows.push(['Alma do Dragão', `x${p.dragonStacks}`]);
    if (p.baronT > 0) rows.push(['Mão do Barão', `${Math.ceil(p.baronT)}s`]);
    if (p.elderT > 0) rows.push(['Aspecto do Ancião', `${Math.ceil(p.elderT)}s`]);
    return rows;
  },

  buildSummary(full) {
    const g = this.g;
    const p = g.player;
    const weapons = p.weapons.map((w) =>
      `<li>${this.icon(WEAPONS[w.key].icon)} ${weaponName(w)} <em>${w.evolved ? 'Evoluída' : `Nv ${w.level}`}</em></li>`).join('');
    const items = p.itemOrder.map((k) =>
      `<li>${this.icon(ITEMS[k].icon)} ${ITEMS[k].name} <em>${ITEMS[k].fusion ? 'Lendário' : `Nv ${p.items[k]}`}</em></li>`).join('')
      || '<li class="muted">Nenhum item</li>';
    const stats = this.statRows().map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join('');
    let html = '';
    if (full) {
      html += `
        <div class="go-grid">
          <div><span>Tempo</span><b>${formatTime(g.time)}</b></div>
          <div><span>Nível</span><b>${p.level}</b></div>
          <div><span>Abates</span><b>${g.kills}</b></div>
          <div><span>Ouro</span><b>${g.gold}</b></div>
        </div>`;
    }
    html += `
      <div class="build-cols">
        <div><h3>Habilidades</h3><ul>${weapons}</ul><h3>Itens</h3><ul>${items}</ul></div>
        <div><h3>Atributos</h3><ul class="stats">${stats}</ul></div>
      </div>`;
    if (full) html += `<h3 class="section-h">Dano causado</h3>${this.damageList()}`;
    return html;
  },

  damageList() {
    const g = this.g;
    const p = g.player;
    const sources = p.weapons.map((w) => ({ icon: WEAPONS[w.key].icon, name: weaponName(w), lvl: w.evolved ? 'Evoluída' : `Nv ${w.level}`, dmg: w.dmgDone }));
    if (g.ultSource.dmgDone > 0) sources.push({ icon: p.champ.ult.icon, name: p.champ.ult.name, lvl: '', dmg: g.ultSource.dmgDone });
    if (g.burnSource.dmgDone > 0) sources.push({ icon: ITEMS.sunfire.icon, name: 'Aura de fogo', lvl: '', dmg: g.burnSource.dmgDone });
    sources.sort((a, b) => b.dmg - a.dmg);
    const maxDmg = Math.max(1, ...sources.map((s) => s.dmg));
    return `<ul class="dmg-list">${sources.map((s) => `
      <li><span class="dmg-name">${this.icon(s.icon)} ${s.name}${s.lvl ? ` <em>${s.lvl}</em>` : ''}</span>
        <span class="dmg-bar"><i style="width:${(100 * s.dmg) / maxDmg}%"></i></span>
        <span class="dmg-val">${formatNum(s.dmg)}</span></li>`).join('')}
    </ul>`;
  },

  // --- Loja ---------------------------------------------------------------
  showShop() {
    this.renderShop();
    this.open('shop');
  },

  btn(action, key, label, enabled, cls = '') {
    return `<button class="btn tiny ${cls}" data-action="${action}" data-key="${key}" ${enabled ? '' : 'disabled'}>${label}</button>`;
  },

  renderShop() {
    const g = this.g;
    const p = g.player;
    const gold = g.gold;
    this.$('shop-gold').textContent = `${gold} de ouro`;
    let html = '';

    // Inventário: habilidades
    html += '<h3 class="section-h">Suas habilidades</h3><ul class="shop-list">';
    for (const w of p.weapons) {
      const def = WEAPONS[w.key];
      const st = g.evolveStatus(w);
      let evo = '';
      if (st === 'done') evo = '<span class="tag gold">Evoluída</span>';
      else if (st === 'ready' || st === 'gold') evo = this.btn('evolve', w.key, `Evoluir (${SHOP.evolve})`, st === 'ready', 'gold');
      const sell = this.btn('sellWeapon', w.key, `Vender (+${SHOP.sellWeapon(w)})`, p.weapons.length > 1, 'ghost');
      html += `<li>${this.icon(def.icon)}<div class="shop-name"><b>${weaponName(w)}</b><em>${w.evolved ? def.evo.desc : `Nível ${w.level}/${def.maxLevel}`}</em></div><div class="shop-actions">${evo}${sell}</div></li>`;
    }
    html += '</ul>';

    // Inventário: itens
    html += `<h3 class="section-h">Seus itens <small>${p.itemOrder.length}/6 espaços</small></h3><ul class="shop-list">`;
    if (!p.itemOrder.length) html += '<li class="muted">Nenhum item ainda.</li>';
    for (const k of p.itemOrder) {
      const d = ITEMS[k];
      const lvl = p.items[k];
      const up = d.fusion || lvl >= d.maxLevel ? '' : this.btn('upgrade', k, `Melhorar (${SHOP.upgradeItem(lvl)})`, gold >= SHOP.upgradeItem(lvl));
      const sellPrice = d.fusion ? SHOP.sellFusion : SHOP.sellItem(lvl);
      html += `<li>${this.icon(d.icon)}<div class="shop-name"><b>${d.name}</b><em>${d.fusion ? 'Lendário' : `Nível ${lvl}/${d.maxLevel}`} · ${d.desc}</em></div><div class="shop-actions">${up}${this.btn('sellItem', k, `Vender (+${sellPrice})`, true, 'ghost')}</div></li>`;
    }
    html += '</ul>';

    // Comprar itens novos
    const slotsFree = p.itemOrder.length < 6;
    const buyable = Object.keys(ITEMS).filter((k) => !ITEMS[k].fusion && !p.items[k] && !g.lockedByFusion(k));
    html += `<h3 class="section-h">Comprar itens <small>${slotsFree ? `${SHOP.buyItem} de ouro cada` : 'inventário cheio: venda um item para liberar espaço'}</small></h3><ul class="shop-list compact">`;
    for (const k of buyable) {
      const d = ITEMS[k];
      html += `<li>${this.icon(d.icon)}<div class="shop-name"><b>${d.name}</b><em>${d.desc}</em></div><div class="shop-actions">${this.btn('buy', k, 'Comprar', slotsFree && gold >= SHOP.buyItem)}</div></li>`;
    }
    html += '</ul>';

    // Receitas
    html += `<h3 class="section-h">Fusões de itens <small>2 itens no nível máximo → 1 item lendário (${SHOP.fusion} de ouro)</small></h3><ul class="shop-list">`;
    for (const k of Object.keys(ITEMS).filter((x) => ITEMS[x].fusion)) {
      const d = ITEMS[k];
      const [a, b] = d.fusion;
      const st = g.fusionStatus(k);
      const req = (x) => `<span class="${p.items[x] >= ITEMS[x].maxLevel ? 'ok' : ''}">${this.icon(ITEMS[x].icon, 'sm')} ${ITEMS[x].name} ${p.items[x] ? `(${p.items[x]}/${ITEMS[x].maxLevel})` : ''}</span>`;
      const action = st === 'done' ? '<span class="tag gold">Forjado</span>' : this.btn('fuse', k, 'Fundir', st === 'ready', 'gold');
      html += `<li>${this.icon(d.icon)}<div class="shop-name"><b>${d.name}</b><em class="recipe">${req(a)} + ${req(b)}</em><em>${d.desc}</em></div><div class="shop-actions">${action}</div></li>`;
    }
    html += '</ul>';

    html += `<h3 class="section-h">Evoluções de habilidades <small>habilidade no nível 5 + item catalisador (${SHOP.evolve} de ouro)</small></h3><ul class="shop-list">`;
    for (const k of Object.keys(WEAPONS)) {
      const d = WEAPONS[k];
      const w = p.weapons.find((x) => x.key === k);
      const it = ITEMS[d.evo.item];
      const hasW = w && w.level >= d.maxLevel;
      const hasI = g.hasItemEffect(d.evo.item);
      const st = w ? g.evolveStatus(w) : 'none';
      const action = st === 'done' ? '<span class="tag gold">Evoluída</span>' : this.btn('evolve', k, 'Evoluir', st === 'ready', 'gold');
      html += `<li class="${w ? '' : 'dim'}">${this.icon(d.icon)}<div class="shop-name"><b>${d.evo.name}</b>
        <em class="recipe"><span class="${hasW ? 'ok' : ''}">${d.name} ${w ? `(Nv ${w.level}/5)` : '(não possui)'}</span> + <span class="${hasI ? 'ok' : ''}">${this.icon(it.icon, 'sm')} ${it.name}</span></em>
        <em>${d.evo.desc}</em></div><div class="shop-actions">${action}</div></li>`;
    }
    html += '</ul>';

    this.$('shop-body').innerHTML = html;
  },

  onShopClick(e) {
    const b = e.target.closest('button[data-action]');
    if (!b || b.disabled) return;
    const g = this.g;
    const key = b.dataset.key;
    switch (b.dataset.action) {
      case 'evolve': g.evolveWeapon(key); break;
      case 'fuse': g.fuseItems(key); break;
      case 'buy': g.buyItem(key); break;
      case 'upgrade': g.upgradeItem(key); break;
      case 'sellItem': g.sellItem(key); break;
      case 'sellWeapon': g.sellWeapon(key); break;
    }
    const scroll = this.$('shop-body').scrollTop;
    this.renderShop();
    this.$('shop-body').scrollTop = scroll;
  },

  // --- Fim de jogo --------------------------------------------------------
  showGameOver(victory) {
    const g = this.g;
    const p = g.player;
    this.$('go-title').textContent = victory ? 'VITÓRIA' : 'DERROTA';
    this.$('go-title').className = victory ? 'victory' : 'defeat';
    this.$('go-sub').textContent = victory
      ? `${p.champ.name} sobreviveu à Fenda e destruiu o Nexus inimigo!`
      : `${p.champ.name} foi abatido(a) aos ${formatTime(g.time)}.`;
    this.$('go-stats').innerHTML = `
      <div class="go-grid">
        <div><span>Tempo</span><b>${formatTime(g.time)}</b></div>
        <div><span>Nível</span><b>${p.level}</b></div>
        <div><span>Abates</span><b>${g.kills}</b></div>
        <div><span>Ouro</span><b>${g.gold}</b></div>
      </div>
      <h3 class="section-h">Dano causado</h3>${this.damageList()}`;
    this.$('btn-endless').classList.toggle('hidden', !victory);
    this.open('gameover');
  },
};
