'use strict';

// ---------------------------------------------------------------------------
// Modelos 3D low-poly montados com peças simples. O mundo usa X para a direita,
// Z para "baixo na tela" (o y do jogo) e Y para cima. Os personagens olham para +X.
// ---------------------------------------------------------------------------
const M3 = {
  _grad: null,
  _mats: new Map(),
  _geos: new Map(),

  gradient() {
    if (!this._grad) {
      // 3 faixas de luz: sombreamento em degraus, típico de pixel art
      const data = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
      const t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
      t.minFilter = THREE.NearestFilter;
      t.magFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      t.needsUpdate = true;
      this._grad = t;
    }
    return this._grad;
  },

  // Material toon compartilhado (cache por cor).
  toon(color) {
    const k = 't' + color;
    let m = this._mats.get(k);
    if (!m) {
      m = new THREE.MeshToonMaterial({ color, gradientMap: this.gradient() });
      this._mats.set(k, m);
    }
    return m;
  },

  // Material toon exclusivo (para piscar em vermelho/branco ao tomar dano).
  toonOwn(color) {
    return new THREE.MeshToonMaterial({ color, gradientMap: this.gradient() });
  },

  glow(color) {
    const k = 'g' + color;
    let m = this._mats.get(k);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color });
      this._mats.set(k, m);
    }
    return m;
  },

  geo(key, make) {
    let g = this._geos.get(key);
    if (!g) {
      g = make();
      this._geos.set(key, g);
    }
    return g;
  },
  sphere(seg = 10) { return this.geo('s' + seg, () => new THREE.SphereGeometry(1, seg, Math.max(6, seg - 2))); },
  hemi() { return this.geo('hemi', () => new THREE.SphereGeometry(1, 10, 6, 0, TAU, 0, Math.PI / 2)); },
  box() { return this.geo('box', () => new THREE.BoxGeometry(1, 1, 1)); },
  capsule() { return this.geo('cap', () => new THREE.CapsuleGeometry(1, 1, 3, 8)); },
  cyl(seg = 10) { return this.geo('c' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg)); },
  cone(seg = 8) { return this.geo('k' + seg, () => new THREE.ConeGeometry(1, 1, seg)); },
  octa() { return this.geo('oct', () => new THREE.OctahedronGeometry(1)); },
  dodeca() { return this.geo('dod', () => new THREE.DodecahedronGeometry(1)); },
  torus() { return this.geo('tor', () => new THREE.TorusGeometry(1, 0.22, 6, 14)); },
  arc() { return this.geo('arc', () => new THREE.TorusGeometry(1, 0.07, 4, 12, Math.PI)); },

  mesh(geo, mat, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(pos[0], pos[1], pos[2]);
    m.scale.set(scale[0], scale[1], scale[2]);
    m.rotation.set(rot[0], rot[1], rot[2]);
    m.castShadow = true;
    return m;
  },
};

// ---------------------------------------------------------------------------
// Campeões: rig com pivôs (quadril, pernas, braços, cabeça) animados por código.
// ---------------------------------------------------------------------------
const CHAMP_3D = {
  garen: { skin: '#f6c9a2', hair: '#7a4e2a', body: '#3d6bd6', legs: '#2b3354', boots: '#5a3a22', accent: '#f2c14e', eyes: '#1b1b2b' },
  ashe: { skin: '#f6c9a2', hair: '#f2f2f2', body: '#6fb3ea', legs: '#2b3354', boots: '#6b4a2b', accent: '#2f5d8a', eyes: '#2a4fb8' },
  lux: { skin: '#f6c9a2', hair: '#ffd96a', body: '#f7f2e4', legs: '#f7f2e4', boots: '#f2c14e', accent: '#f2c14e', eyes: '#2a4fb8' },
  jinx: { skin: '#f7dccf', hair: '#2d7fd6', body: '#2a2533', legs: '#f7dccf', boots: '#ff4fa3', accent: '#ff4fa3', eyes: '#ff4fa3' },
};

function buildChampion3D(key) {
  const C = CHAMP_3D[key];
  const own = [];
  const mat = (c) => { const m = M3.toonOwn(c); own.push(m); return m; };
  const mSkin = mat(C.skin), mHair = mat(C.hair), mBody = mat(C.body), mLegs = mat(C.legs), mBoots = mat(C.boots), mAcc = mat(C.accent);
  const mEye = M3.toon(C.eyes), mWhite = M3.toon('#ffffff');

  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 10;
  root.add(hips);

  // Pernas (pivô no quadril; balançam no plano X-Y)
  const legs = [];
  for (const z of [-3.4, 3.4]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0, z);
    pivot.add(M3.mesh(M3.capsule(), mLegs, [0, -4.2, 0], [2.4, 3.2, 2.4]));
    pivot.add(M3.mesh(M3.box(), mBoots, [1.2, -9, 0], [6, 2.6, 4]));
    hips.add(pivot);
    legs.push(pivot);
  }

  // Tronco (escala separada para estica-e-achata)
  const torso = new THREE.Group();
  hips.add(torso);
  const body = M3.mesh(M3.capsule(), mBody, [0, 7, 0], [6.4, 4.2, 6.4]);
  torso.add(body);

  // Braços (pivô no ombro)
  const arms = [];
  for (const z of [-7.6, 7.6]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 11.5, z);
    pivot.add(M3.mesh(M3.capsule(), mBody, [0, -3.4, 0], [1.9, 2.6, 1.9]));
    pivot.add(M3.mesh(M3.sphere(8), mWhite, [0, -7.6, 0], [2.3, 2.3, 2.3]));
    torso.add(pivot);
    arms.push(pivot);
  }
  const weaponArm = arms[1];
  const freeArm = arms[0];

  // Cabeça
  const head = new THREE.Group();
  head.position.y = 21;
  torso.add(head);
  head.add(M3.mesh(M3.sphere(12), mSkin, [0, 0, 0], [8.6, 8.2, 8.6]));
  for (const z of [-3, 3]) {
    head.add(M3.mesh(M3.box(), mEye, [7.9, 0.6, z], [1.4, 3.2, 1.6]));
    head.add(M3.mesh(M3.box(), mWhite, [8.3, 1.6, z + 0.4], [0.6, 0.9, 0.6]));
  }
  head.add(M3.mesh(M3.sphere(6), M3.toon('#f0a888'), [8.4, -2.4, 0], [1.2, 1, 1.4]));
  const hairCap = M3.mesh(M3.sphere(12), mHair, [-1.6, 1.6, 0], [9.1, 8.6, 9.1]);
  hairCap.scale.multiplyScalar(1);
  head.add(hairCap);

  const rig = { key, root, hips, torso, body, legs, arms, weaponArm, freeArm, head, own, extras: {} };

  // --- Detalhes de cada campeão ---
  if (key === 'garen') {
    head.add(M3.mesh(M3.box(), mHair, [5, 6, 0], [7, 3, 10], [0, 0, -0.3]));
    torso.add(M3.mesh(M3.cyl(12), mAcc, [0, 4.2, 0], [6.6, 1.6, 6.6]));
    for (const p of arms) p.add(M3.mesh(M3.sphere(8), mAcc, [0, 0.5, 0], [3.6, 3, 3.6]));
    // capa
    const cape = new THREE.Group();
    cape.position.set(-5, 14, 0);
    cape.add(M3.mesh(M3.box(), mat('#c8352f'), [-1, -7, 0], [1.4, 15, 12]));
    torso.add(cape);
    rig.extras.cape = cape;
    // espada
    const sword = new THREE.Group();
    sword.position.set(0, -7.6, 0);
    sword.add(M3.mesh(M3.box(), M3.toon('#e3e9f0'), [0, 16, 0], [2.4, 26, 4.4]));
    sword.add(M3.mesh(M3.cone(4), M3.toon('#e3e9f0'), [0, 31.5, 0], [3, 5, 1.6], [0, Math.PI / 4, 0]));
    sword.add(M3.mesh(M3.box(), mAcc, [0, 3, 0], [3, 1.6, 9]));
    sword.add(M3.mesh(M3.box(), M3.toon('#6b4a2b'), [0, 0, 0], [1.6, 4, 1.6]));
    sword.rotation.z = -1.1;
    weaponArm.add(sword);
    rig.extras.weapon = sword;
  } else if (key === 'ashe') {
    head.remove(hairCap);
    head.add(M3.mesh(M3.sphere(12), mAcc, [-1.8, 1.8, 0], [9.3, 8.9, 9.6]));
    head.add(M3.mesh(M3.capsule(), mHair, [-6, -6, 3.5], [1.6, 4, 1.6], [0.3, 0, 0.3]));
    const cape = new THREE.Group();
    cape.position.set(-5, 15, 0);
    cape.add(M3.mesh(M3.box(), mAcc, [-1, -7.5, 0], [1.4, 16, 13]));
    torso.add(cape);
    rig.extras.cape = cape;
    torso.add(M3.mesh(M3.cyl(10), mWhite, [0, 13, 0], [7, 1.8, 7]));
    // aljava
    torso.add(M3.mesh(M3.cyl(8), M3.toon('#7a4e2a'), [-7, 9, -3], [2, 9, 2], [0.4, 0, 0.3]));
    // arco de gelo
    const bow = new THREE.Group();
    bow.position.set(0, -7.6, 0);
    const arcM = M3.mesh(M3.arc(), M3.glow('#bdf0ff'), [0, 0, 0], [13, 13, 30], [0, 0, -Math.PI / 2]);
    bow.add(arcM);
    bow.add(M3.mesh(M3.box(), M3.glow('#ffffff'), [0, 0, 0], [0.6, 26, 0.6]));
    bow.add(M3.mesh(M3.box(), M3.toon('#8a6d3b'), [6, 0, 0], [16, 1, 1]));
    bow.rotation.y = 0;
    weaponArm.add(bow);
    rig.extras.weapon = bow;
  } else if (key === 'lux') {
    torso.remove(body);
    rig.body = M3.mesh(M3.cone(12), mBody, [0, 6, 0], [11, 18, 11]);
    torso.add(rig.body);
    torso.add(M3.mesh(M3.cyl(12), mAcc, [0, 0, 0], [10.6, 1.2, 10.6]));
    torso.add(M3.mesh(M3.sphere(10), mBody, [0, 12, 0], [5.6, 5, 5.6]));
    head.add(M3.mesh(M3.capsule(), mHair, [-7, -6, 0], [3.2, 7, 3.2], [0, 0, -0.35]));
    const staff = new THREE.Group();
    staff.position.set(0, -7.6, 0);
    staff.add(M3.mesh(M3.cyl(6), M3.toon('#e6d6a8'), [0, 10, 0], [1.8, 32, 1.8]));
    const orb = M3.mesh(M3.octa(), M3.glow('#fff0a0'), [0, 28, 0], [5.5, 5.5, 5.5]);
    staff.add(orb);
    staff.rotation.z = -0.3;
    weaponArm.add(staff);
    rig.extras.weapon = staff;
    rig.extras.orb = orb;
  } else if (key === 'jinx') {
    torso.remove(body);
    rig.body = M3.mesh(M3.capsule(), mBody, [0, 9, 0], [6, 2.8, 6]);
    torso.add(rig.body);
    torso.add(M3.mesh(M3.cyl(12), mSkin, [0, 4.6, 0], [5.6, 3, 5.6]));
    torso.add(M3.mesh(M3.cyl(12), M3.toon('#4b3a8a'), [0, 1.6, 0], [6.4, 3, 6.4]));
    // tranças: cadeias de esferas que balançam
    const braids = [];
    for (const z of [-5, 5]) {
      const chain = [];
      let parent = head;
      let y = 0;
      for (let i = 0; i < 6; i++) {
        const seg = new THREE.Group();
        seg.position.set(i === 0 ? -6 : 0, i === 0 ? 0 : -4.4, i === 0 ? z : 0);
        seg.add(M3.mesh(M3.sphere(8), mHair, [0, -2.2, 0], [2.4 - i * 0.15, 3, 2.4 - i * 0.15]));
        parent.add(seg);
        chain.push(seg);
        parent = seg;
        y -= 4.4;
      }
      chain[5].add(M3.mesh(M3.sphere(6), mAcc, [0, -5, 0], [1.6, 1.6, 1.6]));
      braids.push(chain);
    }
    rig.extras.braids = braids;
    // Ossos de Peixe: lançador-tubarão
    const gun = new THREE.Group();
    gun.position.set(0, -6, 0);
    gun.add(M3.mesh(M3.capsule(), M3.toon('#7c8a99'), [0, 6, 0], [3.4, 9, 3.6]));
    gun.add(M3.mesh(M3.cone(4), mAcc, [3.5, 6, 0], [1.6, 4.5, 1], [0, 0, -Math.PI / 2]));
    for (const zz of [-1.8, 1.8]) gun.add(M3.mesh(M3.box(), M3.toon('#ffffff'), [1.6, 14, zz], [1.2, 1.6, 0.6]));
    gun.add(M3.mesh(M3.box(), M3.toon('#1b1b2b'), [2.6, 11, 3], [1, 1.2, 1]));
    gun.rotation.z = -0.9;
    weaponArm.add(gun);
    rig.extras.weapon = gun;
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  if (rig.extras.weapon) rig.extras.weaponBase = rig.extras.weapon.rotation.z;
  return rig;
}

// Pose do campeão a partir do estado do jogador.
// s = { t, phase, move (0..1), cast (0..1), hurt (0..1) }
function animateChampion3D(rig, s) {
  const { t, phase, move, cast, hurt } = s;
  const sw = Math.sin(phase), cw = Math.cos(phase);
  const breathe = Math.sin(t * 3.2) * (1 - move);
  rig.hips.position.y = 10 + Math.abs(sw) * 2.4 * move + breathe * 0.3;
  rig.legs[0].rotation.z = sw * 0.85 * move;
  rig.legs[1].rotation.z = -sw * 0.85 * move;
  // estica-e-achata e inclinação para frente
  const sq = move * 0.08 * (1 - Math.abs(sw)) + breathe * 0.03 + hurt * 0.2 - (cast > 0.6 ? 0.15 : -0.1) * (cast > 0 ? 1 : 0) * Math.min(1, cast * 3);
  rig.torso.scale.set(1 + sq * 0.6, 1 - sq, 1 + sq * 0.6);
  rig.torso.rotation.z = -0.16 * move + hurt * 0.25;
  rig.torso.rotation.x = Math.sin(phase) * 0.06 * move;
  // braço livre balança ao contrário da perna
  rig.freeArm.rotation.z = -sw * 0.9 * move + Math.sin(t * 2.2) * 0.05;
  rig.freeArm.rotation.x = -0.15;
  // braço da arma: segura a arma à frente, ergue na ultimate
  const raise = cast > 0 ? Math.sin(Math.min(1, cast) * Math.PI * 0.5) : 0;
  const armAngle = lerp(0.9 + sw * 0.15 * move, 2.7, raise);
  rig.weaponArm.rotation.z = armAngle;
  rig.weaponArm.rotation.x = 0.25;
  // a arma mantém a orientação enquanto o braço se move (e aponta para cima na ultimate)
  if (rig.extras.weapon) rig.extras.weapon.rotation.z = rig.extras.weaponBase - (armAngle - 0.9) + raise * 0.9;
  // cabeça atrasa um pouco (overlap) e balança
  rig.head.position.y = 21 + Math.sin(phase * 2 - 0.8) * 0.6 * move;
  rig.head.rotation.z = Math.sin(phase * 2 - 1) * 0.06 * move + Math.sin(t * 1.3) * 0.04;
  rig.head.rotation.y = Math.sin(t * 0.7) * 0.12 * (1 - move);
  const ex = rig.extras;
  if (ex.cape) ex.cape.rotation.z = 0.15 + move * 0.55 + Math.sin(t * 9) * (0.06 + move * 0.08);
  if (ex.braids) {
    ex.braids.forEach((chain, bi) => {
      chain.forEach((seg, i) => {
        if (i === 0) { seg.rotation.z = 0.5 + move * 0.5; return; }
        seg.rotation.z = Math.sin(t * 6 - i * 0.8 + bi) * (0.12 + move * 0.12) + move * 0.12;
        seg.rotation.x = Math.sin(t * 4 - i * 0.6 + bi * 2) * 0.1;
      });
    });
  }
  if (ex.orb) ex.orb.rotation.y = t * 3;
  // brilho vermelho ao tomar dano, branco na ultimate
  const em = hurt > 0 ? 0.6 * hurt : cast > 0 ? 0.25 * cast : 0;
  for (const m of rig.own) {
    m.emissive.set(hurt > 0 ? '#ff2020' : '#ffffff');
    m.emissiveIntensity = em;
  }
}

// ---------------------------------------------------------------------------
// Inimigos comuns: lista de peças (desenhadas com instancing). Posições e
// tamanhos são relativos ao raio do inimigo (r). role: corpo inteiro balança;
// 'legL'/'legR' alternam passos; 'tail' abana; 'wheel' gira.
// ---------------------------------------------------------------------------
function P(g, color, pos, scale, rot = [0, 0, 0], role = 'body', glow = false) {
  return { g, color, pos, scale, rot, role, glow };
}

const ENEMY_PARTS = {
  melee: [
    P('capsule', '#3a2a2a', [0, 0.25, -0.38], [0.2, 0.2, 0.2], [0, 0, 0], 'legL'),
    P('capsule', '#3a2a2a', [0, 0.25, 0.38], [0.2, 0.2, 0.2], [0, 0, 0], 'legR'),
    P('sphere', 'self', [0, 0.95, 0], [0.82, 0.8, 0.82]),
    P('hemi', '#7a2020', [0, 1.15, 0], [0.88, 0.75, 0.88]),
    P('box', '#ffe066', [0.72, 1.0, -0.28], [0.12, 0.2, 0.16], [0, 0, 0], 'body', true),
    P('box', '#ffe066', [0.72, 1.0, 0.28], [0.12, 0.2, 0.16], [0, 0, 0], 'body', true),
    P('box', '#d9dee6', [0.95, 0.95, 0.75], [0.12, 1.1, 0.12], [0, 0, -0.9]),
  ],
  caster: [
    P('cone', 'self', [0, 0.75, 0], [0.85, 1.5, 0.85]),
    P('sphere', '#f1c9a5', [0.05, 1.45, 0], [0.5, 0.5, 0.5]),
    P('cone', '#5a1e5a', [-0.05, 1.85, 0], [0.62, 0.9, 0.62], [0, 0, 0.25]),
    P('box', '#ffe066', [0.5, 1.5, -0.18], [0.1, 0.16, 0.12], [0, 0, 0], 'body', true),
    P('box', '#ffe066', [0.5, 1.5, 0.18], [0.1, 0.16, 0.12], [0, 0, 0], 'body', true),
    P('cyl', '#8a6d3b', [0.85, 1.1, 0.6], [0.08, 2.0, 0.08]),
    P('sphere', '#ff7ae0', [0.85, 2.15, 0.6], [0.28, 0.28, 0.28], [0, 0, 0], 'body', true),
  ],
  super: [
    P('capsule', '#3a2a2a', [0, 0.25, -0.38], [0.22, 0.2, 0.22], [0, 0, 0], 'legL'),
    P('capsule', '#3a2a2a', [0, 0.25, 0.38], [0.22, 0.2, 0.22], [0, 0, 0], 'legR'),
    P('sphere', 'self', [0, 0.95, 0], [0.88, 0.85, 0.88]),
    P('hemi', '#f2c14e', [0, 1.15, 0], [0.92, 0.78, 0.92]),
    P('cone', '#f2c14e', [0, 1.95, 0], [0.18, 0.55, 0.18]),
    P('cone', '#f2c14e', [0, 1.8, -0.5], [0.15, 0.45, 0.15], [-0.5, 0, 0]),
    P('cone', '#f2c14e', [0, 1.8, 0.5], [0.15, 0.45, 0.15], [0.5, 0, 0]),
    P('box', '#ff6040', [0.78, 1.0, -0.28], [0.12, 0.2, 0.16], [0, 0, 0], 'body', true),
    P('box', '#ff6040', [0.78, 1.0, 0.28], [0.12, 0.2, 0.16], [0, 0, 0], 'body', true),
    P('box', '#9aa3ad', [1.0, 1.0, 0.85], [0.3, 1.6, 0.3], [0, 0, -0.7]),
  ],
  siege: [
    P('cyl', '#5a3a22', [-0.6, 0.38, -0.7], [0.38, 0.16, 0.38], [Math.PI / 2, 0, 0], 'wheel'),
    P('cyl', '#5a3a22', [0.6, 0.38, -0.7], [0.38, 0.16, 0.38], [Math.PI / 2, 0, 0], 'wheel'),
    P('cyl', '#5a3a22', [-0.6, 0.38, 0.7], [0.38, 0.16, 0.38], [Math.PI / 2, 0, 0], 'wheel'),
    P('cyl', '#5a3a22', [0.6, 0.38, 0.7], [0.38, 0.16, 0.38], [Math.PI / 2, 0, 0], 'wheel'),
    P('box', 'self', [0, 0.85, 0], [1.8, 0.75, 1.3]),
    P('box', '#f2c14e', [0, 0.85, 0], [1.84, 0.14, 1.34]),
    P('cyl', '#3a3a42', [0.9, 1.35, 0], [0.24, 1.2, 0.24], [0, 0, -1.35]),
    P('sphere', '#c94040', [-0.35, 1.55, 0], [0.38, 0.36, 0.38]),
    P('hemi', '#7a2020', [-0.35, 1.65, 0], [0.42, 0.3, 0.42]),
  ],
  raptor: [
    P('cyl', '#ffd36b', [0, 0.3, -0.25], [0.07, 0.6, 0.07], [0, 0, 0], 'legL'),
    P('cyl', '#ffd36b', [0, 0.3, 0.25], [0.07, 0.6, 0.07], [0, 0, 0], 'legR'),
    P('sphere', 'self', [0, 0.95, 0], [0.9, 0.7, 0.75]),
    P('cone', '#a8401f', [-0.95, 1.1, 0], [0.3, 0.7, 0.3], [0, 0, 1.8], 'tail'),
    P('cone', '#ffd36b', [1.05, 1.1, 0], [0.22, 0.6, 0.22], [0, 0, -Math.PI / 2]),
    P('sphere', '#ffffff', [0.6, 1.35, -0.3], [0.2, 0.22, 0.12]),
    P('sphere', '#ffffff', [0.6, 1.35, 0.3], [0.2, 0.22, 0.12]),
    P('box', '#1b1b2b', [0.72, 1.35, -0.32], [0.08, 0.14, 0.08]),
    P('box', '#1b1b2b', [0.72, 1.35, 0.32], [0.08, 0.14, 0.08]),
  ],
  wolf: [
    P('capsule', '#4a4d5c', [-0.6, 0.3, -0.35], [0.16, 0.25, 0.16], [0, 0, 0], 'legR'),
    P('capsule', '#4a4d5c', [0.55, 0.3, -0.35], [0.16, 0.25, 0.16], [0, 0, 0], 'legL'),
    P('capsule', 'self', [-0.6, 0.3, 0.35], [0.16, 0.25, 0.16], [0, 0, 0], 'legL'),
    P('capsule', 'self', [0.55, 0.3, 0.35], [0.16, 0.25, 0.16], [0, 0, 0], 'legR'),
    P('capsule', 'self', [0, 0.85, 0], [0.5, 0.8, 0.5], [0, 0, Math.PI / 2]),
    P('sphere', 'self', [1.0, 1.15, 0], [0.48, 0.45, 0.45]),
    P('box', '#9ca0b0', [1.45, 1.05, 0], [0.45, 0.28, 0.3]),
    P('cone', '#4a4d5c', [0.9, 1.6, -0.22], [0.14, 0.4, 0.12]),
    P('cone', '#4a4d5c', [0.9, 1.6, 0.22], [0.14, 0.4, 0.12]),
    P('box', '#7fe0ff', [1.35, 1.25, -0.2], [0.1, 0.1, 0.1], [0, 0, 0], 'body', true),
    P('box', '#7fe0ff', [1.35, 1.25, 0.2], [0.1, 0.1, 0.1], [0, 0, 0], 'body', true),
    P('capsule', '#8a8ea0', [-1.1, 1.2, 0], [0.14, 0.4, 0.14], [0, 0, 0.9], 'tail'),
  ],
  krug: [
    P('capsule', '#4a4238', [0, 0.25, -0.45], [0.22, 0.2, 0.22], [0, 0, 0], 'legL'),
    P('capsule', '#4a4238', [0, 0.25, 0.45], [0.22, 0.2, 0.22], [0, 0, 0], 'legR'),
    P('dodeca', 'self', [0, 0.95, 0], [0.95, 0.85, 0.95]),
    P('dodeca', '#6d8f3a', [-0.15, 1.65, 0], [0.45, 0.2, 0.45]),
    P('box', '#ffb347', [0.82, 1.05, -0.25], [0.12, 0.12, 0.16], [0, 0, 0], 'body', true),
    P('box', '#ffb347', [0.82, 1.05, 0.25], [0.12, 0.12, 0.16], [0, 0, 0], 'body', true),
  ],
  voidling: [
    P('cone', '#6b2fa8', [-0.5, 0.45, -0.4], [0.18, 0.8, 0.18], [0.4, 0, 1.2], 'tail'),
    P('cone', '#6b2fa8', [-0.5, 0.45, 0.4], [0.18, 0.8, 0.18], [-0.4, 0, 1.2], 'tail'),
    P('cone', '#6b2fa8', [-0.7, 0.6, 0], [0.18, 0.9, 0.18], [0, 0, 1.4], 'tail'),
    P('sphere', 'self', [0, 0.9, 0], [0.95, 0.85, 0.95]),
    P('sphere', '#ffffff', [0.62, 1.0, 0], [0.42, 0.45, 0.45]),
    P('box', '#1b1b2b', [0.98, 1.0, 0], [0.12, 0.3, 0.16]),
  ],
  gromp: [
    P('sphere', '#3d6e2c', [0.1, 0.25, -0.75], [0.4, 0.25, 0.35], [0, 0, 0], 'legL'),
    P('sphere', '#3d6e2c', [0.1, 0.25, 0.75], [0.4, 0.25, 0.35], [0, 0, 0], 'legR'),
    P('sphere', 'self', [0, 0.8, 0], [1.15, 0.8, 1.05]),
    P('sphere', '#b9d98a', [0.55, 0.6, 0], [0.6, 0.45, 0.8]),
    P('sphere', '#ffffff', [0.35, 1.55, -0.42], [0.32, 0.34, 0.32]),
    P('sphere', '#ffffff', [0.35, 1.55, 0.42], [0.32, 0.34, 0.32]),
    P('box', '#1b1b2b', [0.62, 1.58, -0.42], [0.1, 0.24, 0.18]),
    P('box', '#1b1b2b', [0.62, 1.58, 0.42], [0.1, 0.24, 0.18]),
    P('sphere', '#9b5bd6', [-0.3, 1.25, 0.5], [0.14, 0.14, 0.14]),
    P('sphere', '#9b5bd6', [-0.6, 1.0, -0.4], [0.12, 0.12, 0.12]),
  ],
  scuttle: [
    P('cyl', '#2a7d73', [-0.5, 0.3, -0.7], [0.07, 0.6, 0.07], [0.6, 0, 0], 'legL'),
    P('cyl', '#2a7d73', [0.5, 0.3, -0.7], [0.07, 0.6, 0.07], [0.6, 0, 0], 'legR'),
    P('cyl', '#2a7d73', [-0.5, 0.3, 0.7], [0.07, 0.6, 0.07], [-0.6, 0, 0], 'legR'),
    P('cyl', '#2a7d73', [0.5, 0.3, 0.7], [0.07, 0.6, 0.07], [-0.6, 0, 0], 'legL'),
    P('sphere', 'self', [0, 0.65, 0], [1.1, 0.45, 0.95]),
    P('sphere', '#e6d39a', [0, 0.85, 0], [0.8, 0.35, 0.65]),
    P('cyl', '#2a7d73', [0.4, 1.2, -0.3], [0.05, 0.6, 0.05]),
    P('cyl', '#2a7d73', [0.4, 1.2, 0.3], [0.05, 0.6, 0.05]),
    P('sphere', '#ffffff', [0.4, 1.55, -0.3], [0.17, 0.17, 0.17]),
    P('sphere', '#ffffff', [0.4, 1.55, 0.3], [0.17, 0.17, 0.17]),
    P('box', '#1b1b2b', [0.55, 1.55, -0.3], [0.06, 0.12, 0.1]),
    P('box', '#1b1b2b', [0.55, 1.55, 0.3], [0.06, 0.12, 0.1]),
  ],
};
ENEMY_PARTS.krugling = ENEMY_PARTS.krug;

// ---------------------------------------------------------------------------
// Chefes: modelos com várias partes animadas
// ---------------------------------------------------------------------------
function buildBoss3D(d) {
  const r = d.r;
  const own = [];
  const mat = (c) => { const m = M3.toonOwn(c); own.push(m); return m; };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const B = { root, body, own, parts: {}, shape: d.shape, r, elder: d.elder };
  if (d.shape === 'herald') {
    for (const z of [-0.45, 0.45]) {
      const leg = new THREE.Group();
      leg.position.set(0, r * 0.5, z * r);
      leg.add(M3.mesh(M3.capsule(), mat('#4b2287'), [0, -r * 0.25, 0], [r * 0.22, r * 0.25, r * 0.22]));
      body.add(leg);
      (B.parts.legs = B.parts.legs || []).push(leg);
    }
    body.add(M3.mesh(M3.sphere(14), mat(d.color), [0, r * 1.05, 0], [r * 0.95, r * 0.9, r * 0.95]));
    body.add(M3.mesh(M3.sphere(12), mat('#fff6d0'), [r * 0.55, r * 1.1, 0], [r * 0.45, r * 0.42, r * 0.5]));
    const pupil = M3.mesh(M3.sphere(8), M3.glow('#c23bff'), [r * 0.92, r * 1.1, 0], [r * 0.12, r * 0.24, r * 0.2]);
    body.add(pupil);
    B.parts.pupil = pupil;
    for (const z of [-1, 1]) body.add(M3.mesh(M3.cone(6), mat('#f0e0ff'), [-r * 0.1, r * 1.85, z * r * 0.45], [r * 0.18, r * 0.8, r * 0.18], [z * 0.5, 0, 0.3]));
  } else if (d.shape === 'dragon') {
    const col = d.color, dark = d.elder ? '#3f8f8a' : '#9c3418', belly = d.elder ? '#e0fffb' : '#ffcf7a';
    for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
      const leg = new THREE.Group();
      leg.position.set(x * r, r * 0.45, z * r);
      leg.add(M3.mesh(M3.capsule(), mat(dark), [0, -r * 0.2, 0], [r * 0.2, r * 0.2, r * 0.2]));
      body.add(leg);
      (B.parts.legs = B.parts.legs || []).push(leg);
    }
    body.add(M3.mesh(M3.sphere(14), mat(col), [0, r * 0.85, 0], [r * 1.1, r * 0.65, r * 0.75]));
    body.add(M3.mesh(M3.sphere(10), mat(belly), [r * 0.15, r * 0.65, 0], [r * 0.75, r * 0.4, r * 0.55]));
    const neck = new THREE.Group();
    neck.position.set(r * 0.8, r * 1.1, 0);
    neck.add(M3.mesh(M3.capsule(), mat(col), [r * 0.2, r * 0.3, 0], [r * 0.22, r * 0.45, r * 0.22], [0, 0, -0.6]));
    const head = new THREE.Group();
    head.position.set(r * 0.5, r * 0.65, 0);
    head.add(M3.mesh(M3.sphere(10), mat(col), [0, 0, 0], [r * 0.42, r * 0.32, r * 0.35]));
    head.add(M3.mesh(M3.box(), mat(col), [r * 0.4, -r * 0.05, 0], [r * 0.5, r * 0.25, r * 0.4]));
    for (const z of [-1, 1]) {
      head.add(M3.mesh(M3.cone(5), mat(belly), [-r * 0.15, r * 0.35, z * r * 0.18], [r * 0.08, r * 0.35, r * 0.08], [0, 0, 0.6]));
      head.add(M3.mesh(M3.box(), M3.glow(d.elder ? '#e0fffb' : '#ffd36b'), [r * 0.2, r * 0.1, z * r * 0.24], [r * 0.08, r * 0.1, r * 0.06]));
    }
    neck.add(head);
    body.add(neck);
    B.parts.neck = neck;
    B.parts.wings = [];
    for (const z of [-1, 1]) {
      const wing = new THREE.Group();
      wing.position.set(0, r * 1.2, z * r * 0.4);
      wing.add(M3.mesh(M3.box(), mat(dark), [0, 0, z * r * 0.75], [r * 0.9, r * 0.06, r * 1.5]));
      wing.add(M3.mesh(M3.box(), mat(dark), [-r * 0.2, 0, z * r * 1.45], [r * 0.5, r * 0.06, r * 0.4]));
      body.add(wing);
      B.parts.wings.push({ wing, side: z });
    }
    const tail = new THREE.Group();
    tail.position.set(-r * 0.9, r * 0.8, 0);
    tail.add(M3.mesh(M3.cone(6), mat(col), [-r * 0.6, 0, 0], [r * 0.28, r * 1.3, r * 0.28], [0, 0, Math.PI / 2]));
    body.add(tail);
    B.parts.tail = tail;
  } else if (d.shape === 'baron') {
    body.add(M3.mesh(M3.cyl(16), mat('#4a3020'), [0, r * 0.05, 0], [r * 1.2, r * 0.1, r * 1.2]));
    B.parts.segs = [];
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, r * 0.3 + i * r * 0.36, 0);
      seg.add(M3.mesh(M3.sphere(12), mat(i % 2 ? '#5a2390' : d.color), [0, 0, 0], [r * (0.72 - i * 0.04), r * 0.32, r * (0.72 - i * 0.04)]));
      for (const z of [-1, 1]) seg.add(M3.mesh(M3.cone(5), mat('#d6ff4f'), [0, 0, z * r * 0.7], [r * 0.1, r * 0.4, r * 0.1], [z * 1.3, 0, 0]));
      body.add(seg);
      B.parts.segs.push(seg);
    }
    const head = new THREE.Group();
    head.position.set(r * 0.1, r * 2.3, 0);
    head.add(M3.mesh(M3.sphere(14), mat(d.color), [0, 0, 0], [r * 0.8, r * 0.55, r * 0.75]));
    const jaw = M3.mesh(M3.box(), mat('#2a0a1a'), [r * 0.6, -r * 0.2, 0], [r * 0.4, r * 0.18, r * 0.6]);
    head.add(jaw);
    for (const z of [-1, 1]) {
      head.add(M3.mesh(M3.sphere(8), M3.toon('#ffffff'), [r * 0.55, r * 0.2, z * r * 0.3], [r * 0.16, r * 0.2, r * 0.16]));
      head.add(M3.mesh(M3.box(), M3.glow('#d6ff4f'), [r * 0.7, r * 0.2, z * r * 0.3], [r * 0.06, r * 0.14, r * 0.1]));
      head.add(M3.mesh(M3.cone(6), mat('#d6ff4f'), [-r * 0.1, r * 0.55, z * r * 0.45], [r * 0.12, r * 0.7, r * 0.12], [z * 0.4, 0, 0.5]));
    }
    body.add(head);
    B.parts.head = head;
    B.parts.jaw = jaw;
  }
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return B;
}

function animateBoss3D(B, t, ph, hit, e) {
  const r = B.r;
  for (const m of B.own) {
    m.emissive.set('#ffffff');
    m.emissiveIntensity = hit ? 0.3 : 0;
  }
  if (B.shape === 'herald') {
    const charging = e.aiState === 1;
    B.body.position.y = Math.abs(Math.sin(ph)) * r * 0.12;
    B.parts.legs.forEach((l, i) => { l.rotation.z = Math.sin(ph + i * Math.PI) * 0.6; });
    B.body.scale.set(1, charging ? 0.85 + Math.sin(t * 40) * 0.04 : 1, 1);
    B.parts.pupil.material = M3.glow(charging ? '#ff3b3b' : '#c23bff');
  } else if (B.shape === 'dragon') {
    B.body.position.y = r * 0.4 + Math.sin(ph) * r * 0.15;
    B.parts.legs.forEach((l, i) => { l.rotation.z = Math.sin(ph + (i % 2) * Math.PI) * 0.5; });
    for (const { wing, side } of B.parts.wings) wing.rotation.x = side * (0.2 + Math.sin(t * 7) * 0.65);
    B.parts.neck.rotation.z = Math.sin(t * 2) * 0.12;
    B.parts.tail.rotation.y = Math.sin(t * 3) * 0.4;
  } else if (B.shape === 'baron') {
    B.parts.segs.forEach((s, i) => {
      s.position.x = Math.sin(t * 1.6 - i * 0.6) * r * 0.08 * i;
    });
    B.parts.head.position.x = r * 0.1 + Math.sin(t * 1.6 - 3) * r * 0.35;
    B.parts.head.rotation.z = Math.sin(t * 1.6) * 0.1;
    B.parts.jaw.position.y = -r * 0.2 - Math.max(0, Math.sin(t * 3)) * r * 0.15;
  }
}

// ---------------------------------------------------------------------------
// Tibbers (pet da Annie)
// ---------------------------------------------------------------------------
function buildBear3D() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const brown = M3.toon('#6b4430');
  body.add(M3.mesh(M3.sphere(12), brown, [0, 13, 0], [11, 11, 10]));
  body.add(M3.mesh(M3.sphere(10), M3.toon('#b88a64'), [6, 11, 0], [6, 6, 6]));
  body.add(M3.mesh(M3.sphere(12), brown, [3, 27, 0], [8, 7.5, 8]));
  for (const z of [-5, 5]) body.add(M3.mesh(M3.sphere(8), brown, [1, 34, z], [3, 3, 3]));
  body.add(M3.mesh(M3.box(), M3.glow('#ffcc33'), [10.5, 28, 3], [1, 2.4, 2.4]));
  body.add(M3.mesh(M3.box(), M3.toon('#1b1b2b'), [10.5, 28, -3], [1, 1, 2.4]));
  const flames = [];
  for (let i = 0; i < 3; i++) {
    const f = M3.mesh(M3.cone(5), M3.glow(i === 1 ? '#ffd166' : '#ff8a3d'), [-7, 22 + i * 3, (i - 1) * 4], [2.5, 8, 2.5]);
    body.add(f);
    flames.push(f);
  }
  const arm = new THREE.Group();
  arm.position.set(2, 20, 9);
  arm.add(M3.mesh(M3.capsule(), brown, [0, -5, 0], [3, 4, 3]));
  body.add(arm);
  const legs = [];
  for (const z of [-5, 5]) {
    const l = new THREE.Group();
    l.position.set(0, 6, z);
    l.add(M3.mesh(M3.capsule(), brown, [0, -3, 0], [3, 2.5, 3]));
    body.add(l);
    legs.push(l);
  }
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root, body, flames, arm, legs };
}
