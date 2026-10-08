'use strict';

const HUD = {
  draw(ctx, g) {
    const p = g.player;
    const W = g.w, H = g.h;
    const small = W < 600;

    // Barra de experiência
    ctx.fillStyle = 'rgba(1,10,19,0.85)';
    ctx.fillRect(0, 0, W, 16);
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#0a7cbf');
    grad.addColorStop(1, '#0ac8b9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, (W * p.xp) / p.xpNext, 16);
    ctx.strokeStyle = '#785a28';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, 14);
    ctx.font = '14px VT323, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f0e6d2';
    ctx.fillText(`NV ${p.level}`, 8, 12);

    // Inventário: em telas estreitas, o tempo e a barra de chefe ficam abaixo dele.
    const S = small ? 28 : 34;
    const gap = 4;
    const topY = small ? 26 + 2 * (S + gap) + 4 : 0;

    // Tempo
    ctx.textAlign = 'center';
    ctx.font = `${small ? 16 : 22}px "Press Start 2P", monospace`;
    ctx.fillStyle = '#f0e6d2';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 4;
    const timeText = formatTime(g.time);
    ctx.strokeText(timeText, W / 2, topY + (small ? 22 : 48));
    ctx.fillText(timeText, W / 2, topY + (small ? 22 : 48));
    if (!g.endless) {
      ctx.font = '14px VT323, monospace';
      ctx.fillStyle = '#a09b8c';
      ctx.fillText(`Sobreviva até ${formatTime(VICTORY_TIME)}`, W / 2, topY + (small ? 36 : 63));
    }

    // Abates e ouro
    ctx.textAlign = 'right';
    ctx.font = '20px VT323, monospace';
    ctx.lineWidth = 3;
    const killText = `☠ ${g.kills}`;
    const goldText = `🪙 ${g.gold}`;
    ctx.strokeText(killText, W - 12, 40); ctx.fillStyle = '#f0e6d2'; ctx.fillText(killText, W - 12, 40);
    ctx.strokeText(goldText, W - 12, 60); ctx.fillStyle = '#f5d067'; ctx.fillText(goldText, W - 12, 60);

    // Inventário: habilidades e itens
    let y = 26;
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 6; i++) {
        const x = 8 + i * (S + gap);
        ctx.fillStyle = 'rgba(1,10,19,0.75)';
        ctx.fillRect(x, y, S, S);
        ctx.strokeStyle = row === 0 ? '#0ac8b9' : '#c8aa6e';
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, S - 2, S - 2);
        ctx.globalAlpha = 1;
        let icon = null, lvl = 0, max = 0, special = false;
        if (row === 0 && p.weapons[i]) {
          const w = p.weapons[i];
          icon = WEAPONS[w.key].icon; lvl = w.level; max = WEAPONS[w.key].maxLevel; special = w.evolved;
        } else if (row === 1 && p.itemOrder[i]) {
          const k = p.itemOrder[i];
          icon = ITEMS[k].icon; lvl = p.items[k]; max = ITEMS[k].maxLevel; special = !!ITEMS[k].fusion;
        }
        if (icon) {
          if (special) {
            ctx.fillStyle = 'rgba(245,208,103,0.25)';
            ctx.fillRect(x, y, S, S);
            ctx.strokeStyle = '#f5d067';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, S - 2, S - 2);
          }
          ctx.imageSmoothingEnabled = false;
          const isz = S - 6;
          ctx.drawImage(Icons.get(icon), x + 3, y + 1, isz, isz);
          for (let k = 0; k < max; k++) {
            ctx.fillStyle = k < lvl ? '#f5d067' : 'rgba(255,255,255,0.2)';
            ctx.fillRect(x + 3 + k * ((S - 6) / max), y + S - 5, (S - 6) / max - 1.5, 3);
          }
        }
      }
      y += S + gap;
    }

    // Buffs ativos
    let by = small ? topY + 76 : y + 6;
    ctx.textAlign = 'left';
    ctx.font = '16px VT323, monospace';
    const buffs = [];
    if (p.baronT > 0) buffs.push([`Mão do Barão ${Math.ceil(p.baronT)}s`, '#d78aff']);
    if (p.elderT > 0) buffs.push([`Ancião ${Math.ceil(p.elderT)}s`, '#9ff']);
    if (p.dragonStacks > 0) buffs.push([`Alma do Dragão x${p.dragonStacks}`, '#ff8a5a']);
    if (p.exciteT > 0) buffs.push(['Animação!', '#ff4fa3']);
    for (const [text, color] of buffs) {
      ctx.strokeText(text, 10, by + 10);
      ctx.fillStyle = color;
      ctx.fillText(text, 10, by + 10);
      by += 16;
    }

    // Barra de chefe
    const boss = g.enemies.find((e) => e.def.boss && !e.dead);
    if (boss) {
      const bw = Math.min(520, W * 0.6);
      const bx = (W - bw) / 2;
      const byy = topY + (small ? 44 : 74);
      ctx.fillStyle = 'rgba(1,10,19,0.85)';
      ctx.fillRect(bx - 2, byy - 2, bw + 4, 16);
      ctx.fillStyle = '#7a1f3d';
      ctx.fillRect(bx, byy, bw, 12);
      ctx.fillStyle = boss.def.elder ? '#3fc8bf' : '#b43bff';
      ctx.fillRect(bx, byy, (bw * Math.max(0, boss.hp)) / boss.maxHp, 12);
      ctx.strokeStyle = '#c8aa6e';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx - 2, byy - 2, bw + 4, 16);
      ctx.textAlign = 'center';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000';
      ctx.strokeText(boss.def.name, W / 2, byy + 27);
      ctx.fillStyle = '#f0e6d2';
      ctx.fillText(boss.def.name, W / 2, byy + 27);
    }

    // Anúncios
    ctx.textAlign = 'center';
    let ay = Math.max(H * 0.26, topY + 110);
    for (const a of g.announcements) {
      const alpha = Math.min(1, a.life * 1.5, (a.max - a.life) * 6);
      ctx.globalAlpha = alpha;
      ctx.font = `${small ? 21 : 31}px VT323, monospace`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(a.text, W / 2, ay);
      ctx.fillStyle = a.color;
      ctx.fillText(a.text, W / 2, ay);
      ay += small ? 26 : 34;
    }
    ctx.globalAlpha = 1;

    // Vida e habilidades ativas (rodapé)
    const hw = Math.min(360, W - 150);
    const hx = (W - hw) / 2;
    const hy = H - 34;
    ctx.fillStyle = 'rgba(1,10,19,0.85)';
    ctx.fillRect(hx - 3, hy - 3, hw + 6, 22);
    ctx.fillStyle = '#3a1414';
    ctx.fillRect(hx, hy, hw, 16);
    const hpG = ctx.createLinearGradient(0, hy, 0, hy + 16);
    hpG.addColorStop(0, '#5fe37a');
    hpG.addColorStop(1, '#1f9a3c');
    ctx.fillStyle = hpG;
    ctx.fillRect(hx, hy, (hw * Math.max(0, p.hp)) / p.stats.maxHp, 16);
    ctx.strokeStyle = '#c8aa6e';
    ctx.lineWidth = 2;
    ctx.strokeRect(hx - 3, hy - 3, hw + 6, 22);
    ctx.font = '16px VT323, monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${Math.ceil(p.hp)} / ${Math.round(p.stats.maxHp)}`, W / 2, hy + 12.5);

    // Ícones de Flash e Ultimate
    const touch = Input.isTouch;
    this.ability(ctx, hx - 52, hy - 22, 40, '⚡', touch ? '' : 'F', p.flashCd, 12, '#ffe66b');
    this.ability(ctx, hx + hw + 12, hy - 22, 40, p.champ.ult.icon, touch ? '' : 'Espaço', p.ultCd, p.champ.ult.cd * p.stats.cdMult, '#ff4fa3');

    // Joystick virtual
    const j = Input.joy;
    if (j.active) {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#f0e6d2';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(j.ox, j.oy, 50, 0, TAU); ctx.stroke();
      const dx = j.x - j.ox, dy = j.y - j.oy;
      const d = Math.hypot(dx, dy);
      const k = d > 50 ? 50 / d : 1;
      ctx.fillStyle = '#f0e6d2';
      ctx.beginPath(); ctx.arc(j.ox + dx * k, j.oy + dy * k, 20, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (Sfx.muted) {
      ctx.textAlign = 'right';
      ctx.font = '16px VT323, monospace';
      ctx.fillStyle = '#a09b8c';
      ctx.fillText('🔇 mudo (M)', W - 12, 124);
    }
  },

  ability(ctx, x, y, s, icon, key, cd, maxCd, color) {
    ctx.fillStyle = 'rgba(1,10,19,0.85)';
    ctx.fillRect(x, y, s, s);
    ctx.textAlign = 'center';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(Icons.get(icon), x + 4, y + 4, s - 8, s - 8);
    if (cd > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.beginPath();
      ctx.moveTo(x + s / 2, y + s / 2);
      ctx.arc(x + s / 2, y + s / 2, s * 0.72, -Math.PI / 2, -Math.PI / 2 + TAU * (cd / maxCd));
      ctx.closePath();
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, s, s); ctx.clip();
      ctx.fill();
      ctx.restore();
      ctx.font = '18px VT323, monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText(Math.ceil(cd), x + s / 2, y + s / 2 + 5);
    }
    ctx.strokeStyle = cd > 0 ? '#555' : color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, s, s);
    if (key) {
      ctx.font = '13px VT323, monospace';
      ctx.fillStyle = '#c8aa6e';
      ctx.fillText(key, x + s / 2, y + s + 11);
    }
  },
};
