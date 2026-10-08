'use strict';

const Input = {
  keys: new Set(),
  joy: { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 },
  isTouch: false,

  init(game) {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
      const fresh = !this.keys.has(k);
      this.keys.add(k);
      if (fresh) this.onPress(game, k);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    const c = game.canvas;
    c.addEventListener('touchstart', (e) => {
      this.isTouch = true;
      UI.showTouch(game.state === 'playing');
      for (const t of e.changedTouches) {
        if (!this.joy.active) {
          this.joy = { active: true, id: t.identifier, ox: t.clientX, oy: t.clientY, x: t.clientX, y: t.clientY };
        }
      }
      e.preventDefault();
    }, { passive: false });
    c.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joy.id) { this.joy.x = t.clientX; this.joy.y = t.clientY; }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) if (t.identifier === this.joy.id) this.joy.active = false;
    };
    c.addEventListener('touchend', end);
    c.addEventListener('touchcancel', end);
  },

  onPress(game, k) {
    Sfx.init();
    if (k === 'm') { Sfx.toggle(); return; }
    switch (game.state) {
      case 'playing':
        if (k === ' ' || k === 'r') game.useUlt();
        else if (k === 'f' || k === 'shift') game.useFlash();
        else if (k === 'escape' || k === 'p') game.pause();
        break;
      case 'paused':
        if (k === 'escape' || k === 'p') game.resume();
        break;
      case 'levelup':
        if (['1', '2', '3', '4'].includes(k)) UI.chooseIndex(Number(k) - 1);
        else if (k === 'r') UI.reroll();
        break;
      case 'chest':
        if (k === 'enter' || k === ' ') UI.closeChest();
        break;
    }
  },

  moveVector() {
    let x = 0, y = 0;
    const k = this.keys;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('w') || k.has('arrowup')) y -= 1;
    if (k.has('s') || k.has('arrowdown')) y += 1;
    if (this.joy.active) {
      const dx = this.joy.x - this.joy.ox, dy = this.joy.y - this.joy.oy;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        const m = Math.min(1, d / 50);
        return { x: (dx / d) * m, y: (dy / d) * m };
      }
    }
    const l = Math.hypot(x, y);
    return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  },
};
