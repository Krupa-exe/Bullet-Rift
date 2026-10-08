'use strict';

// ---------------------------------------------------------------------------
// Campeões
// ---------------------------------------------------------------------------
const CHAMPIONS = {
  garen: {
    name: 'Garen',
    title: 'O Poder de Demacia',
    role: 'Lutador',
    color: '#3d6bd6',
    accent: '#f2c94c',
    hp: 150, speed: 160, armor: 2, regen: 0.6,
    startWeapon: 'judgment',
    desc: 'Robusto e corpo a corpo. Gira sua espada destruindo tudo ao redor.',
    passive: 'Perseverança: +1 de regeneração de vida/s e +1 de armadura.',
    applyPassive(s) { s.regen += 1; s.armor += 1; },
    ult: { name: 'Justiça Demaciana', icon: '⚖️', cd: 35, desc: 'Uma espada gigante cai sobre o inimigo mais forte por perto. Causa mais dano quanto mais vida ele já perdeu.' },
  },
  ashe: {
    name: 'Ashe',
    title: 'A Arqueira do Gelo',
    role: 'Atiradora',
    color: '#5aa9e6',
    accent: '#dff6ff',
    hp: 100, speed: 170, armor: 0, regen: 0.2,
    startWeapon: 'volley',
    desc: 'Atiradora de longo alcance. Rajadas de flechas que desaceleram.',
    passive: 'Tiro Congelante: +10% de chance de acerto crítico.',
    applyPassive(s) { s.critChance += 0.1; },
    ult: { name: 'Flecha de Cristal Encantada', icon: '❄️', cd: 30, desc: 'Dispara uma flecha de gelo gigante que atravessa tudo e atordoa os inimigos.' },
  },
  lux: {
    name: 'Lux',
    title: 'A Dama da Luz',
    role: 'Maga',
    color: '#f5f1e0',
    accent: '#ffd84d',
    hp: 95, speed: 165, armor: 0, regen: 0.2,
    startWeapon: 'lightBinding',
    desc: 'Maga de luz. Raios que perfuram e enraízam os inimigos.',
    passive: 'Iluminação: +15% de área e +10% de dano.',
    applyPassive(s) { s.areaMult += 0.15; s.dmgMult += 0.1; },
    ult: { name: 'Centelha Final', icon: '☀️', cd: 25, desc: 'Após uma breve carga, dispara um laser colossal que atravessa a tela.' },
  },
  jinx: {
    name: 'Jinx',
    title: 'O Gatilho Desenfreado',
    role: 'Atiradora',
    color: '#4fb3ff',
    accent: '#ff4fa3',
    hp: 105, speed: 175, armor: 0, regen: 0.2,
    startWeapon: 'fishbones',
    desc: 'Atiradora explosiva. Foguetes que causam dano em área.',
    passive: 'Animação!: +10% de velocidade. Abater elites e chefes dá um grande bônus de velocidade.',
    applyPassive(s) { s.speedMult += 0.1; },
    ult: { name: 'Super Mega Míssil da Morte!', icon: '💥', cd: 35, desc: 'Lança um míssil gigante que explode em uma área enorme.' },
  },
};

// ---------------------------------------------------------------------------
// Itens (passivos). Assim como no LoL, o inventário tem 6 espaços.
// ---------------------------------------------------------------------------
const ITEMS = {
  infinityEdge: {
    name: 'Gume do Infinito', icon: '🗡️', maxLevel: 5,
    desc: '+8% de chance de crítico e +15% de dano crítico.',
    apply(s, l) { s.critChance += 0.08 * l; s.critMult += 0.15 * l; },
  },
  rabadon: {
    name: 'Capuz da Morte de Rabadon', icon: '🎩', maxLevel: 5,
    desc: '+12% de dano.',
    apply(s, l) { s.dmgMult += 0.12 * l; },
  },
  warmog: {
    name: 'Armadura de Warmog', icon: '💚', maxLevel: 5,
    desc: '+25 de vida máxima e +0,5 de regeneração de vida/s.',
    apply(s, l) { s.maxHp += 25 * l; s.regen += 0.5 * l; },
  },
  swiftness: {
    name: 'Botas da Rapidez', icon: '👢', maxLevel: 5,
    desc: '+8% de velocidade de movimento.',
    apply(s, l) { s.speedMult += 0.08 * l; },
  },
  ionian: {
    name: 'Botas Jônicas da Lucidez', icon: '⏳', maxLevel: 5,
    desc: '-7% de tempo de recarga (inclui a ultimate).',
    apply(s, l) { s.cdMult -= 0.07 * l; },
  },
  riftmaker: {
    name: 'Criafendas', icon: '🌀', maxLevel: 5,
    desc: '+10% de área de efeito.',
    apply(s, l) { s.areaMult += 0.1 * l; },
  },
  thornmail: {
    name: 'Armadura de Espinhos', icon: '🌵', maxLevel: 5,
    desc: '+2 de armadura. Inimigos que te tocam recebem dano.',
    apply(s, l) { s.armor += 2 * l; s.thorns += 8 * l; },
  },
  runaan: {
    name: 'Furacão de Runaan', icon: '🌪️', maxLevel: 2,
    desc: '+1 projétil em todas as habilidades.',
    apply(s, l) { s.amount += l; },
  },
  ancientCoin: {
    name: 'Moeda Antiga', icon: '🪙', maxLevel: 5,
    desc: '+30% de raio de coleta e +20% de ouro.',
    apply(s, l) { s.pickupRange *= 1 + 0.3 * l; s.goldMult += 0.2 * l; },
  },
  bloodthirster: {
    name: 'Sedenta por Sangue', icon: '🩸', maxLevel: 5,
    desc: 'Cura 0,4 de vida a cada abate.',
    apply(s, l) { s.lifeOnKill += 0.4 * l; },
  },
  nashor: {
    name: 'Dente de Nashor', icon: '🦷', maxLevel: 5,
    desc: '+10% de velocidade dos projéteis e +5% de dano.',
    apply(s, l) { s.projSpeed += 0.1 * l; s.dmgMult += 0.05 * l; },
  },
};

// ---------------------------------------------------------------------------
// Fusões: dois itens no nível máximo viram um item lendário que ocupa só 1 espaço
// e mantém os efeitos dos dois, com um bônus extra. Feitas na loja com ouro.
// ---------------------------------------------------------------------------
const SUNFIRE_RADIUS = 110;

function applyFull(s, key) {
  ITEMS[key].apply(s, ITEMS[key].maxLevel);
}

Object.assign(ITEMS, {
  krakenSlayer: {
    name: 'Mata-Cráquens', icon: '🦑', maxLevel: 1, fusion: ['infinityEdge', 'runaan'],
    desc: 'Efeitos de Gume do Infinito e Furacão de Runaan. Bônus: +15% de dano e +25% de dano crítico.',
    apply(s) { applyFull(s, 'infinityEdge'); applyFull(s, 'runaan'); s.dmgMult += 0.15; s.critMult += 0.25; },
  },
  liandry: {
    name: 'Tormento de Liandry', icon: '🔥', maxLevel: 1, fusion: ['rabadon', 'nashor'],
    desc: 'Efeitos de Rabadon e Dente de Nashor. Bônus: +20% de dano.',
    apply(s) { applyFull(s, 'rabadon'); applyFull(s, 'nashor'); s.dmgMult += 0.2; },
  },
  sunfire: {
    name: 'Égide de Fogo Solar', icon: '☀️', maxLevel: 1, fusion: ['warmog', 'thornmail'],
    desc: 'Efeitos de Warmog e Armadura de Espinhos. Bônus: +50 de vida e uma aura que queima inimigos próximos.',
    apply(s) { applyFull(s, 'warmog'); applyFull(s, 'thornmail'); s.maxHp += 50; s.burn += 30; },
  },
  archangel: {
    name: 'Cajado do Arcanjo', icon: '📘', maxLevel: 1, fusion: ['ionian', 'riftmaker'],
    desc: 'Efeitos de Botas Jônicas e Criafendas. Bônus: +15% de área e -5% de recarga.',
    apply(s) { applyFull(s, 'ionian'); applyFull(s, 'riftmaker'); s.areaMult += 0.15; s.cdMult -= 0.05; },
  },
  mejai: {
    name: 'Ladrão de Almas de Mejai', icon: '📕', maxLevel: 1, fusion: ['ancientCoin', 'bloodthirster'],
    desc: 'Efeitos de Moeda Antiga e Sedenta por Sangue. Bônus: ganha dano a cada abate (até +60%).',
    apply(s) { applyFull(s, 'ancientCoin'); applyFull(s, 'bloodthirster'); s.mejai = true; },
  },
});

// Preços da loja (em ouro)
const SHOP = {
  buyItem: 150,                       // comprar item novo (nível 1)
  upgradeItem: (lvl) => 60 + 40 * lvl, // melhorar item do nível lvl para lvl+1
  sellItem: (lvl) => 20 * lvl,
  sellFusion: 300,
  sellWeapon: (w) => 25 * w.level + (w.evolved ? 200 : 0),
  evolve: 500,
  fusion: 600,
};

// ---------------------------------------------------------------------------
// Inimigos
// ---------------------------------------------------------------------------
const ENEMIES = {
  melee:    { name: 'Tropa Corpo a Corpo', hp: 14, speed: 72, dmg: 6, r: 12, xp: 1, shape: 'melee', color: '#c94040', mass: 1 },
  caster:   { name: 'Tropa Mágica', hp: 10, speed: 68, dmg: 5, r: 11, xp: 1, shape: 'caster', color: '#b5408f', mass: 1,
              ai: 'ranged', range: 240, shootCd: 2.6, projSpeed: 180, projDmg: 5 },
  siege:    { name: 'Tropa de Cerco', hp: 70, speed: 52, dmg: 12, r: 18, xp: 4, shape: 'siege', color: '#a83232', mass: 3,
              ai: 'ranged', range: 300, shootCd: 3.2, projSpeed: 220, projDmg: 10, gold: 1 },
  super:    { name: 'Supertropa', hp: 320, speed: 64, dmg: 20, r: 22, xp: 12, shape: 'super', color: '#d83a3a', mass: 6, gold: 3 },
  raptor:   { name: 'Grasnador', hp: 16, speed: 125, dmg: 6, r: 10, xp: 1, shape: 'raptor', color: '#e2683c', mass: 0.7 },
  wolf:     { name: 'Lobo Sombrio', hp: 32, speed: 108, dmg: 9, r: 14, xp: 2, shape: 'wolf', color: '#6b6f80', mass: 1.4 },
  krug:     { name: 'Krug Ancião', hp: 130, speed: 44, dmg: 15, r: 22, xp: 5, shape: 'krug', color: '#7d7468', mass: 5, split: 'krugling' },
  krugling: { name: 'Krug', hp: 28, speed: 62, dmg: 7, r: 12, xp: 1, shape: 'krug', color: '#8d857a', mass: 1.5 },
  voidling: { name: 'Larva do Vazio', hp: 22, speed: 140, dmg: 8, r: 10, xp: 2, shape: 'voidling', color: '#8b3fd1', mass: 0.7 },

  // Elites
  gromp:    { name: 'Gromp', hp: 600, speed: 55, dmg: 18, r: 30, xp: 25, shape: 'gromp', color: '#4f8f3a', mass: 20,
              elite: true, ai: 'gromp', gold: 15, chest: 1 },
  scuttle:  { name: 'Caranguejo do Rio', hp: 450, speed: 135, dmg: 0, r: 22, xp: 30, shape: 'scuttle', color: '#3fb8a8', mass: 10,
              elite: true, ai: 'flee', gold: 25, chest: 1, lifetime: 30 },

  // Chefes
  herald:   { name: 'Arauto da Fenda', hp: 2200, speed: 75, dmg: 25, r: 40, xp: 80, shape: 'herald', color: '#7a3fd1', mass: 100,
              boss: true, ai: 'herald', gold: 60, chest: 3 },
  dragon:   { name: 'Dragão Infernal', hp: 5500, speed: 85, dmg: 28, r: 46, xp: 150, shape: 'dragon', color: '#e2552a', mass: 100,
              boss: true, ai: 'dragon', gold: 100, chest: 3 },
  baron:    { name: 'Barão Na\'Shor', hp: 13000, speed: 55, dmg: 35, r: 62, xp: 300, shape: 'baron', color: '#6b2fa8', mass: 200,
              boss: true, ai: 'baron', gold: 200, chest: 5 },
  elder:    { name: 'Dragão Ancião', hp: 18000, speed: 95, dmg: 40, r: 52, xp: 400, shape: 'dragon', color: '#7fd6cf', mass: 200,
              boss: true, ai: 'dragon', gold: 250, chest: 5, elder: true },
};

// Ondas: a partir do tempo `t` (segundos), gera `rate` inimigos/s até `max` na tela.
const WAVES = [
  { t: 0,   rate: 1.0, max: 35,  mix: { melee: 7, caster: 3 } },
  { t: 40,  rate: 1.7, max: 60,  mix: { melee: 6, caster: 3, raptor: 3 } },
  { t: 100, rate: 2.4, max: 90,  mix: { melee: 5, caster: 3, raptor: 3, wolf: 2 } },
  { t: 180, rate: 3.0, max: 120, mix: { melee: 4, caster: 3, wolf: 3, siege: 1, raptor: 2 } },
  { t: 270, rate: 3.6, max: 150, mix: { melee: 4, caster: 3, wolf: 3, krug: 1, siege: 1 } },
  { t: 360, rate: 4.4, max: 180, mix: { raptor: 5, wolf: 4, krug: 2, siege: 2 } },
  { t: 480, rate: 5.2, max: 220, mix: { melee: 4, caster: 3, siege: 2, super: 1, krug: 2 } },
  { t: 600, rate: 6.0, max: 260, mix: { voidling: 6, wolf: 3, super: 1, krug: 2 } },
  { t: 720, rate: 7.0, max: 300, mix: { voidling: 5, raptor: 4, super: 2, siege: 2, krug: 2 } },
  { t: 840, rate: 8.0, max: 340, mix: { voidling: 6, super: 3, wolf: 4, krug: 3 } },
];

const VICTORY_TIME = 900; // 15 minutos

// Eventos com horário fixo.
const EVENTS = [
  { t: 1,   type: 'announce', text: 'Bem-vindo ao Bullet Rift!' },
  { t: 6,   type: 'announce', text: 'As tropas foram geradas.' },
  { t: 60,  type: 'elite', enemy: 'scuttle', text: 'O Caranguejo do Rio apareceu!' },
  { t: 90,  type: 'minionWave' },
  { t: 150, type: 'elite', enemy: 'gromp', text: 'Um Gromp despertou!' },
  { t: 180, type: 'boss', enemy: 'herald', text: 'O Arauto da Fenda despertou!' },
  { t: 240, type: 'minionWave' },
  { t: 270, type: 'elite', enemy: 'scuttle', text: 'O Caranguejo do Rio apareceu!' },
  { t: 330, type: 'elite', enemy: 'gromp', text: 'Um Gromp despertou!' },
  { t: 390, type: 'minionWave' },
  { t: 420, type: 'boss', enemy: 'dragon', text: 'O Dragão Infernal surgiu!' },
  { t: 480, type: 'elite', enemy: 'gromp', count: 2, text: 'Gromps despertaram!' },
  { t: 540, type: 'minionWave', super: true },
  { t: 570, type: 'elite', enemy: 'scuttle', text: 'O Caranguejo do Rio apareceu!' },
  { t: 630, type: 'elite', enemy: 'gromp', count: 2, text: 'Gromps despertaram!' },
  { t: 660, type: 'boss', enemy: 'baron', text: 'O Barão Na\'Shor emergiu do fosso!' },
  { t: 720, type: 'minionWave', super: true },
  { t: 750, type: 'elite', enemy: 'gromp', count: 3, text: 'Gromps despertaram!' },
  { t: 780, type: 'elite', enemy: 'scuttle', text: 'O Caranguejo do Rio apareceu!' },
  { t: 810, type: 'boss', enemy: 'elder', text: 'O Dragão Ancião despertou!' },
  { t: 870, type: 'minionWave', super: true },
  { t: VICTORY_TIME, type: 'victory' },
];

const KILL_MILESTONES = [
  [25, 'Série de abates!'],
  [100, 'Dominando!'],
  [250, 'Imparável!'],
  [500, 'Dominante!'],
  [1000, 'Divino!'],
  [2000, 'LENDÁRIO!'],
];

function xpToNext(level) {
  if (level <= 1) return 5;
  return Math.floor(5 + (level - 1) * 7 + Math.pow(level - 1, 1.5) * 1.2);
}
