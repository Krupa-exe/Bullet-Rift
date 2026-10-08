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
    this.$('t-ult').addEventListener('touchstart', (e) => { e.preventDefault(); game.useUlt(); }, { passive: false });
    this.$('t-flash').addEventListener('touchstart', (e) => { e.preventDefault(); game.useFlash(); }, { passive: false });
    this.$('t-pause').addEventListener('touchstart', (e) => { e.preventDefault(); game.pause(); }, { passive: false });
    this.$('btn-mute').addEventListener('click', () => {
      Sfx.init();
      this.$('btn-mute').textContent = Sfx.toggle() ? '🔇 Som desligado' : '🔊 Som ligado';
    });
  },

  buildChampionList() {
    const list = this.$('champ-list');
    list.innerHTML = '';
    const records = this.g.loadRecords();
    for (const key in CHAMPIONS) {
      const c = CHAMPIONS[key];
      const w = WEAPONS[c.startWeapon];
      const rec = records[key];
      const card = document.createElement('button');
      card.className = 'champ-card';
      card.dataset.key = key;
      card.innerHTML = `
        <canvas width="96" height="96"></canvas>
        <div class="champ-name">${c.name}</div>
        <div class="champ-title">${c.title} · ${c.role}</div>
        <p class="champ-desc">${c.desc}</p>
        <ul class="champ-info">
          <li><b>${w.icon} ${w.name}</b> — habilidade inicial</li>
          <li><b>Passiva:</b> ${c.passive}</li>
          <li><b>${c.ult.icon} ${c.ult.name}</b> — ${c.ult.desc}</li>
        </ul>
        <div class="champ-record">${rec ? `Recorde: ${formatTime(rec.time)} · ${rec.kills} abates${rec.wins ? ` · ${rec.wins}🏆` : ''}` : 'Sem recorde'}</div>`;
      const cv = card.querySelector('canvas');
      const cctx = cv.getContext('2d');
      cctx.scale(2, 2);
      drawChampion(cctx, key, 24, 22, 13, 0.3, 0, false);
      card.addEventListener('click', () => this.selectChampion(key));
      card.addEventListener('dblclick', () => this.g.start(key));
      list.appendChild(card);
    }
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
    this.showTouch(false);
    this.buildChampionList();
    if (this.selected) this.selectChampion(this.selected);
    this.$('menu').classList.remove('hidden');
  },

  onGameStart() {
    this.$('menu').classList.add('hidden');
    this.hideScreens();
    this.showTouch(Input.isTouch);
  },

  hideScreens() {
    for (const id of ['levelup', 'chest', 'pause', 'gameover']) this.$(id).classList.add('hidden');
    if (this.g.state === 'playing') this.showTouch(Input.isTouch);
  },

  showTouch(on) {
    this.$('touch-buttons').classList.toggle('hidden', !(on && Input.isTouch));
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
    this.showTouch(false);
    this.$('levelup').classList.remove('hidden');
  },

  renderChoices() {
    const box = this.$('choices');
    box.innerHTML = '';
    this.choices.forEach((opt, i) => {
      const info = this.optionInfo(opt);
      const el = document.createElement('button');
      el.className = `choice ${info.cls}`;
      el.innerHTML = `
        <div class="choice-icon">${info.icon}</div>
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
    rb.textContent = `🎲 Rerrolar (${this.g.rerollCost} 🪙) [R]`;
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
      el.innerHTML = `<span class="choice-icon">${info.icon}</span><span><b>${info.name}</b> <em>${info.lvl}</em></span>`;
      box.appendChild(el);
    }
    const goldEl = document.createElement('div');
    goldEl.className = 'chest-gold';
    goldEl.textContent = `+${result.gold} 🪙`;
    box.appendChild(goldEl);
    this.showTouch(false);
    this.$('chest').classList.remove('hidden');
  },

  closeChest() {
    if (this.g.state !== 'chest') return;
    this.g.afterModal();
  },

  // --- Pausa --------------------------------------------------------------
  showPause() {
    this.showTouch(false);
    this.$('pause-build').innerHTML = this.buildSummary();
    this.$('pause').classList.remove('hidden');
  },

  buildSummary() {
    const p = this.g.player;
    const st = p.stats;
    const weapons = p.weapons.map((w) => `<li>${WEAPONS[w.key].icon} ${WEAPONS[w.key].name} <em>Nv ${w.level}</em></li>`).join('');
    const items = p.itemOrder.map((k) => `<li>${ITEMS[k].icon} ${ITEMS[k].name} <em>Nv ${p.items[k]}</em></li>`).join('') || '<li class="muted">Nenhum item</li>';
    return `
      <div class="build-cols">
        <div><h3>Habilidades</h3><ul>${weapons}</ul></div>
        <div><h3>Itens</h3><ul>${items}</ul></div>
        <div><h3>Atributos</h3><ul class="stats">
          <li>Vida: ${Math.ceil(p.hp)}/${Math.round(st.maxHp)}</li>
          <li>Dano: +${Math.round((st.dmgMult - 1) * 100)}%</li>
          <li>Crítico: ${Math.round(st.critChance * 100)}% (x${st.critMult.toFixed(2)})</li>
          <li>Recarga: -${Math.round((1 - st.cdMult) * 100)}%</li>
          <li>Área: +${Math.round((st.areaMult - 1) * 100)}%</li>
          <li>Velocidade: +${Math.round((st.speedMult - 1) * 100)}%</li>
          <li>Armadura: ${st.armor}</li>
          <li>Regeneração: ${st.regen.toFixed(1)}/s</li>
        </ul></div>
      </div>`;
  },

  // --- Fim de jogo --------------------------------------------------------
  showGameOver(victory) {
    const g = this.g;
    const p = g.player;
    this.showTouch(false);
    this.$('go-title').textContent = victory ? 'VITÓRIA' : 'DERROTA';
    this.$('go-title').className = victory ? 'victory' : 'defeat';
    this.$('go-sub').textContent = victory
      ? `${p.champ.name} sobreviveu à Fenda e destruiu o Nexus inimigo!`
      : `${p.champ.name} foi abatido(a) aos ${formatTime(g.time)}.`;
    const sources = p.weapons.map((w) => ({ icon: WEAPONS[w.key].icon, name: WEAPONS[w.key].name, lvl: w.level, dmg: w.dmgDone }));
    if (g.ultSource.dmgDone > 0) sources.push({ icon: p.champ.ult.icon, name: p.champ.ult.name, lvl: '', dmg: g.ultSource.dmgDone });
    sources.sort((a, b) => b.dmg - a.dmg);
    const maxDmg = Math.max(1, ...sources.map((s) => s.dmg));
    this.$('go-stats').innerHTML = `
      <div class="go-grid">
        <div><span>Tempo</span><b>${formatTime(g.time)}</b></div>
        <div><span>Nível</span><b>${p.level}</b></div>
        <div><span>Abates</span><b>${g.kills}</b></div>
        <div><span>Ouro</span><b>${g.gold}</b></div>
      </div>
      <h3>Dano causado</h3>
      <ul class="dmg-list">${sources.map((s) => `
        <li><span class="dmg-name">${s.icon} ${s.name}${s.lvl ? ` <em>Nv ${s.lvl}</em>` : ''}</span>
          <span class="dmg-bar"><i style="width:${(100 * s.dmg) / maxDmg}%"></i></span>
          <span class="dmg-val">${formatNum(s.dmg)}</span></li>`).join('')}
      </ul>`;
    this.$('btn-endless').classList.toggle('hidden', !victory);
    this.$('gameover').classList.remove('hidden');
  },
};
