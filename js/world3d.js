'use strict';

// ---------------------------------------------------------------------------
// Mundo 3D com visual de pixel art:
//  1. a cena 3D é renderizada numa textura de baixa resolução (~270 px de altura);
//  2. um shader desenha contornos (pela profundidade), reduz a paleta e aplica
//     dithering Bayer;
//  3. o canvas é ampliado sem suavização (cada pixel vira um bloco).
// Coordenadas: X do jogo = X, Y do jogo = Z, altura = Y.
// ---------------------------------------------------------------------------
const PITCH = 0.76;            // inclinação da câmera (rad, a partir do horizonte)
const TARGET_LOW_H = 270;      // altura aproximada da imagem em "pixels de arte"

const POST_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const POST_FRAG = `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 res;
uniform float thr;
uniform float levels;
uniform vec3 outline;
uniform float clearBg;
varying vec2 vUv;

float b2(vec2 p) {
  p = floor(mod(p, 2.0));
  return p.x < 0.5 ? (p.y < 0.5 ? 0.0 : 3.0) : (p.y < 0.5 ? 2.0 : 1.0);
}
float bayer4(vec2 p) { return (b2(p) * 4.0 + b2(floor(p / 2.0))) / 16.0; }

void main() {
  vec2 px = 1.0 / res;
  float d = texture2D(tDepth, vUv).x;
  float d1 = texture2D(tDepth, vUv + vec2(px.x, 0.0)).x;
  float d2 = texture2D(tDepth, vUv - vec2(px.x, 0.0)).x;
  float d3 = texture2D(tDepth, vUv + vec2(0.0, px.y)).x;
  float d4 = texture2D(tDepth, vUv - vec2(0.0, px.y)).x;
  float edge = max(max(d1 - d, d2 - d), max(d3 - d, d4 - d));
  vec3 c = texture2D(tColor, vUv).rgb;
  // realce suave na borda de cima dos objetos (luz de recorte)
  if (d3 - d > thr) c = mix(c, vec3(1.0), 0.18);
  if (edge > thr) c = mix(c, outline, 0.92);
  float b = bayer4(gl_FragCoord.xy) - 0.5;
  c = floor(c * levels + 0.5 + b * 0.7) / levels;
  float a = 1.0;
  if (clearBg > 0.5 && d > 0.9999 && edge <= thr) a = 0.0;
  gl_FragColor = vec4(c * a, a);
}`;

// Grupo de malhas instanciadas que desenham um "modelo" feito de várias peças.
class InstancedParts {
  // tintAll: a cor passada em add() pinta todas as peças (gemas, tiros, efeitos);
  // caso contrário ela só substitui as peças não brilhantes (piscar ao tomar dano).
  constructor(scene, parts, capacity, r, baseColor, shadows = true, matOverride = null, tintAll = false) {
    this.tintAll = tintAll;
    this.parts = parts.map((p) => {
      const geo = M3[p.g]();
      const mat = matOverride || (p.glow ? M3.glow('#ffffff') : M3.toon('#ffffff'));
      const mesh = new THREE.InstancedMesh(geo, mat, capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.castShadow = shadows;
      mesh.count = 0;
      const col = new THREE.Color(p.color === 'self' ? baseColor : p.color);
      mesh.setColorAt(0, col);
      scene.add(mesh);
      const pos = new THREE.Vector3(p.pos[0] * r, p.pos[1] * r, p.pos[2] * r);
      const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(p.rot[0], p.rot[1], p.rot[2]));
      const scl = new THREE.Vector3(p.scale[0] * r, p.scale[1] * r, p.scale[2] * r);
      const local = new THREE.Matrix4().compose(pos, quat, scl);
      return { def: p, mesh, col, local, pos, quat, scl };
    });
    this.r = r;
    this.n = 0;
    this.capacity = capacity;
  }

  begin() { this.n = 0; }

  add(base, ph, flashColor) {
    if (this.n >= this.capacity) return;
    const i = this.n++;
    const r = this.r;
    for (const p of this.parts) {
      const role = p.def.role;
      if (role === 'body') {
        _m1.multiplyMatrices(base, p.local);
      } else if (role === 'legL' || role === 'legR') {
        const o = role === 'legL' ? 0 : Math.PI;
        _v1.set(p.pos.x + Math.sin(ph + o) * r * 0.32, p.pos.y + Math.max(0, Math.cos(ph + o)) * r * 0.18, p.pos.z);
        _m2.compose(_v1, p.quat, p.scl);
        _m1.multiplyMatrices(base, _m2);
      } else if (role === 'tail') {
        _q1.setFromAxisAngle(_up, Math.sin(ph * 2) * 0.45).multiply(p.quat);
        _m2.compose(p.pos, _q1, p.scl);
        _m1.multiplyMatrices(base, _m2);
      } else if (role === 'wheel') {
        _q1.setFromAxisAngle(_zAxis, -ph * 2).multiply(p.quat);
        _m2.compose(p.pos, _q1, p.scl);
        _m1.multiplyMatrices(base, _m2);
      }
      p.mesh.setMatrixAt(i, _m1);
      p.mesh.setColorAt(i, flashColor && (this.tintAll || !p.def.glow) ? flashColor : p.col);
    }
  }

  end() {
    for (const p of this.parts) {
      p.mesh.count = this.n;
      p.mesh.instanceMatrix.needsUpdate = true;
      if (p.mesh.instanceColor) p.mesh.instanceColor.needsUpdate = true;
    }
  }
}

const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _m3 = new THREE.Matrix4();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _s1 = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0), _zAxis = new THREE.Vector3(0, 0, 1);
const _white = new THREE.Color('#ffffff');
const _tmpColor = new THREE.Color();

// Matriz base: posição no chão, virado para o ângulo `face`, com escala/inclinação.
function baseMatrix(out, x, y, z, face, sx = 1, sy = 1, sz = 1, tilt = 0) {
  _q1.setFromAxisAngle(_up, -face);
  if (tilt) _q1.multiply(_q2.setFromAxisAngle(_zAxis, tilt));
  _v1.set(x, y, z);
  _s1.set(sx, sy, sz);
  return out.compose(_v1, _q1, _s1);
}

const World3D = {
  ready: false,

  init(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.setClearColor('#2a4a2d');

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2400);

    // Luzes: céu quente + sol com sombras
    this.scene.add(new THREE.HemisphereLight('#fff2d6', '#3d5a34', 0.75));
    this.sun = new THREE.DirectionalLight('#fff1d0', 0.85);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = -700; sc.right = 700; sc.top = 700; sc.bottom = -700; sc.near = 1; sc.far = 2000;
    this.sun.shadow.bias = -0.0015;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    // Chão infinito em pixel art
    const tex = new THREE.CanvasTexture(Sprites.grass());
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    this.tileWorld = Sprites.grass().width * 2;
    const G = 4800;
    tex.repeat.set(G / this.tileWorld, G / this.tileWorld);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(G, G), new THREE.MeshLambertMaterial({ map: tex }));
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Pós-processamento
    this.post = new THREE.ShaderMaterial({
      vertexShader: POST_VERT,
      fragmentShader: POST_FRAG,
      uniforms: {
        tColor: { value: null }, tDepth: { value: null },
        res: { value: new THREE.Vector2(1, 1) }, thr: { value: 0.002 },
        levels: { value: 14 }, outline: { value: new THREE.Color('#140c1c') }, clearBg: { value: 0 },
      },
      depthTest: false, depthWrite: false,
    });
    this.postScene = new THREE.Scene();
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post));

    this.buildDecor();
    this.buildPools();
    this.bossModels = new Map();
    this.champ = null;
    this.ready = true;
  },

  makeTarget(w, h) {
    const rt = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    rt.depthTexture = new THREE.DepthTexture(w, h);
    rt.depthTexture.type = THREE.UnsignedIntType;
    return rt;
  },

  resize(wCss, hCss, dpr, zoom) {
    const devW = Math.round(wCss * dpr), devH = Math.round(hCss * dpr);
    this.pix = Math.max(2, Math.round(devH / TARGET_LOW_H));
    this.lowW = Math.ceil(devW / this.pix);
    this.lowH = Math.ceil(devH / this.pix);
    this.renderer.setSize(this.lowW, this.lowH, false);
    this.canvas.style.width = (this.lowW * this.pix) / dpr + 'px';
    this.canvas.style.height = (this.lowH * this.pix) / dpr + 'px';
    if (this.rt) this.rt.dispose();
    this.rt = this.makeTarget(this.lowW, this.lowH);
    // Tamanho visível do mundo (em unidades do jogo)
    this.viewW = ((this.lowW * this.pix) / dpr) / zoom;
    this.viewH = ((this.lowH * this.pix) / dpr) / zoom;
    this.upp = this.viewH / this.lowH; // unidades do mundo por pixel de arte
    const c = this.camera;
    c.left = -this.viewW / 2; c.right = this.viewW / 2;
    c.top = this.viewH / 2; c.bottom = -this.viewH / 2;
    c.updateProjectionMatrix();
    this.cssPerWorld = zoom;
    this.dpr = dpr;
  },

  // Metade do campo de visão no chão (para gerar inimigos fora da tela).
  viewHalf() {
    return { w: this.viewW / 2, h: this.viewH / Math.sin(PITCH) / 2 };
  },

  setCamera(tx, tz) {
    // alinha a câmera à grade de pixels para o cenário não "tremer"
    const u = this.upp;
    tx = Math.round(tx / u) * u;
    tz = Math.round(tz / (u / Math.sin(PITCH))) * (u / Math.sin(PITCH));
    this.camX = tx; this.camZ = tz;
    const D = 1000;
    this.camera.position.set(tx, Math.sin(PITCH) * D, tz + Math.cos(PITCH) * D);
    this.camera.lookAt(tx, 0, tz);
    this.camera.updateMatrixWorld();
    this.sun.position.set(tx - 300, 700, tz + 250);
    this.sun.target.position.set(tx, 0, tz);
    const T = this.tileWorld;
    this.ground.position.set(Math.round(tx / T) * T, 0, Math.round(tz / T) * T);
  },

  // Converte posição do mundo em pixels CSS da tela (para números de dano).
  toScreen(x, z, h = 0) {
    _v1.set(x, h, z).project(this.camera);
    return {
      x: ((_v1.x + 1) / 2) * this.lowW * this.pix / this.dpr,
      y: ((1 - _v1.y) / 2) * this.lowH * this.pix / this.dpr,
    };
  },

  // -------------------------------------------------------------------------
  // Cenário: árvores, arbustos, pedras e flores distribuídos por blocos
  // -------------------------------------------------------------------------
  buildDecor() {
    const S = this.scene;
    this.decor = {
      tree: new InstancedParts(S, [
        P('cyl', '#7a5532', [0, 0.6, 0], [0.18, 1.2, 0.18]),
        P('dodeca', '#4f7a31', [0, 1.6, 0], [0.75, 0.6, 0.75]),
        P('dodeca', '#66923c', [0.1, 2.05, 0.05], [0.55, 0.5, 0.55]),
      ], 120, 40, '#ffffff'),
      bush: new InstancedParts(S, [
        P('sphere', '#5e8a3a', [-0.35, 0.35, 0], [0.5, 0.42, 0.5]),
        P('sphere', '#6b9440', [0.3, 0.38, 0.1], [0.48, 0.45, 0.48]),
        P('sphere', '#78a24a', [0, 0.55, -0.1], [0.55, 0.5, 0.55]),
      ], 160, 30, '#ffffff'),
      rock: new InstancedParts(S, [
        P('dodeca', '#9a9384', [0, 0.35, 0], [0.8, 0.55, 0.65]),
      ], 160, 20, '#ffffff'),
      flowers: new InstancedParts(S, [
        P('sphere', '#e88fd0', [-0.4, 0.15, 0], [0.18, 0.18, 0.18]),
        P('sphere', '#f2c14e', [0.3, 0.15, 0.3], [0.18, 0.18, 0.18]),
        P('sphere', '#ffffff', [0.1, 0.15, -0.4], [0.16, 0.16, 0.16]),
      ], 200, 14, '#ffffff', false),
    };
  },

  updateDecor() {
    for (const k in this.decor) this.decor[k].begin();
    const T = 120;
    const v = this.viewHalf();
    const x0 = this.camX - v.w - 120, x1 = this.camX + v.w + 120;
    const z0 = this.camZ - v.h - 160, z1 = this.camZ + v.h + 160;
    for (let tz = Math.floor(z0 / T); tz <= Math.floor(z1 / T); tz++) {
      for (let tx = Math.floor(x0 / T); tx <= Math.floor(x1 / T); tx++) {
        const h = hash2(tx * 7 + 3, tz * 13 + 1);
        let kind = null;
        if (h < 0.035) kind = 'tree';
        else if (h < 0.08) kind = 'bush';
        else if (h < 0.11) kind = 'rock';
        else if (h < 0.17) kind = 'flowers';
        if (!kind) continue;
        const px = tx * T + hash2(tx, tz * 3) * T;
        const pz = tz * T + hash2(tx * 5, tz) * T;
        const s = 0.8 + hash2(tx * 3, tz * 7) * 0.5;
        baseMatrix(_m3, px, 0, pz, hash2(tx, tz) * TAU, s, s, s);
        this.decor[kind].add(_m3, 0, null);
      }
    }
    for (const k in this.decor) this.decor[k].end();
  },

  // -------------------------------------------------------------------------
  // Pools instanciados: inimigos, projéteis, coletáveis, efeitos
  // -------------------------------------------------------------------------
  buildPools() {
    const S = this.scene;
    this.enemyPools = {};
    for (const type in ENEMIES) {
      const d = ENEMIES[type];
      if (d.boss) continue;
      const parts = ENEMY_PARTS[d.shape] || ENEMY_PARTS[type];
      if (!parts) continue;
      const cap = d.elite ? 8 : 420;
      this.enemyPools[type] = new InstancedParts(S, parts, cap, d.r, d.color);
    }
    const proj = (parts, cap = 300) => new InstancedParts(S, parts, cap, 1, '#ffffff', false);
    this.projPools = {
      arrow: proj([P('box', '#8a6d3b', [0, 0, 0], [16, 1.4, 1.4]), P('cone', '#bdf0ff', [9, 0, 0], [2.4, 5, 2.4], [0, 0, -Math.PI / 2], 'body', true), P('box', '#ffffff', [-8, 0, 0], [3, 0.6, 3.4])]),
      bolt: proj([P('sphere', '#fff2a8', [0, 0, 0], [9, 5, 5], [0, 0, 0], 'body', true), P('sphere', '#ffffff', [3, 0, 0], [4, 3, 3], [0, 0, 0], 'body', true)]),
      rocket: proj([P('cyl', '#7c8a99', [0, 0, 0], [3.2, 12, 3.2], [0, 0, Math.PI / 2]), P('cone', '#ff4fa3', [8, 0, 0], [3.2, 5, 3.2], [0, 0, -Math.PI / 2]), P('sphere', '#ffb347', [-8, 0, 0], [3.4, 2.6, 2.6], [0, 0, 0], 'body', true)]),
      megaRocket: proj([P('cyl', '#7c8a99', [0, 0, 0], [9, 34, 9], [0, 0, Math.PI / 2]), P('cone', '#ff4fa3', [22, 0, 0], [9, 12, 9], [0, 0, -Math.PI / 2]), P('sphere', '#ffb347', [-22, 0, 0], [10, 7, 7], [0, 0, 0], 'body', true)], 8),
      orb: proj([P('sphere', '#7ad7ff', [0, 0, 0], [1, 1, 1], [0, 0, 0], 'body', true), P('sphere', '#ffffff', [0.3, 0.3, 0], [0.45, 0.45, 0.45], [0, 0, 0], 'body', true)]),
      crystal: proj([P('octa', '#dff6ff', [0, 0, 0], [30, 12, 12], [0, 0, 0], 'body', true), P('octa', '#8fd3ff', [4, 0, 0], [20, 6, 6], [0, 0, 0], 'body', true)], 8),
    };
    this.enemyShots = new InstancedParts(S, [P('sphere', '#ffffff', [0, 0, 0], [1, 1, 1], [0, 0, 0], 'body', true)], 450, 1, '#ffffff', false, null, true);
    this.pickPools = {
      xp: new InstancedParts(S, [P('octa', '#ffffff', [0, 0, 0], [4.5, 6.5, 4.5], [0, 0, 0], 'body', true)], 420, 1, '#ffffff', false, null, true),
      gold: new InstancedParts(S, [P('cyl', '#f5c542', [0, 0, 0], [5.5, 1.6, 5.5], [Math.PI / 2, 0, 0])], 300, 1, '#f5c542', false),
      heal: new InstancedParts(S, [P('sphere', '#ffb23f', [0, 0, 0], [8, 7.5, 8]), P('cyl', '#3d7a2a', [0, 8, 0], [0.8, 4, 0.8])], 20, 1, '#ffffff'),
      magnet: new InstancedParts(S, [P('torus', '#e04848', [0, 0, 0], [7, 7, 7], [0, 0, 0]), P('sphere', '#bdf0ff', [0, 0, 0], [5, 5, 1.4], [0, 0, 0], 'body', true)], 10, 1, '#ffffff'),
      chest: new InstancedParts(S, [P('box', '#7a4e2a', [0, 6, 0], [24, 12, 15]), P('box', '#8e5c33', [0, 14, 0], [25, 5, 16]), P('box', '#f2c14e', [0, 9, 0], [5, 15, 16.5]), P('box', '#0ac8b9', [8, 10, 0], [1, 4, 4], [0, 0, 0], 'body', true)], 12, 1, '#ffffff'),
    };
    this.fxPool = new InstancedParts(S, [P('sphere', '#ffffff', [0, 0, 0], [1, 1, 1], [0, 0, 0], 'body', true)], 260, 1, '#ffffff', false, null, true);
    this.partPool = new InstancedParts(S, [P('box', '#ffffff', [0, 0, 0], [1, 1, 1], [0, 0, 0], 'body', true)], 520, 1, '#ffffff', false, null, true);
    // discos no chão (zonas, auras, ondas de impacto): translúcidos e sem contorno
    this.groundFx = new InstancedParts(S, [P('cyl', '#ffffff', [0, 0, 0], [1, 1, 1], [0, 0, 0], 'body', true)], 60, 1, '#ffffff', false,
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.38, depthWrite: false }), true);
    this.shroomPool = new InstancedParts(S, [P('cyl', '#f3e6c8', [0, 3, 0], [2.2, 6, 2.2]), P('hemi', '#6bb33a', [0, 5.5, 0], [6.5, 5, 6.5]), P('sphere', '#e6ffb0', [2.5, 9, 2], [1.4, 1.4, 1.4])], 40, 1, '#ffffff');
    this.bladePool = new InstancedParts(S, [P('box', '#e8eef5', [0, 0, 0], [1, 1, 1]), P('box', '#f2c14e', [-0.5, 0, 0], [0.08, 0.6, 3])], 8, 1, '#ffffff');

    // Linhas (raios) e malhas especiais
    this.lineGeo = new THREE.BufferGeometry();
    this.lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(600 * 3), 3));
    this.lines = new THREE.LineSegments(this.lineGeo, new THREE.LineBasicMaterial({ color: '#ffe066' }));
    this.lines.frustumCulled = false;
    S.add(this.lines);
    this.laser = M3.mesh(M3.box(), M3.glow('#fff4c0'), [0, 0, 0], [1, 1, 1]);
    this.laser.castShadow = false;
    this.laser.visible = false;
    S.add(this.laser);
    this.bigSword = new THREE.Group();
    this.bigSword.add(M3.mesh(M3.box(), M3.toon('#eef3f8'), [0, 90, 0], [10, 170, 30]));
    this.bigSword.add(M3.mesh(M3.box(), M3.toon('#f2c14e'), [0, 180, 0], [14, 14, 80]));
    this.bigSword.add(M3.mesh(M3.box(), M3.toon('#6b4a2b'), [0, 210, 0], [10, 48, 10]));
    this.bigSword.visible = false;
    S.add(this.bigSword);
    this.bear = null;
  },

  // -------------------------------------------------------------------------
  // Quadro
  // -------------------------------------------------------------------------
  render(g, now) {
    const menu = g.state === 'menu' || !g.player;
    if (menu) {
      this.setCamera(Math.cos(g.menuT * 0.1) * 400, g.menuT * 30);
      this.hideDynamic();
    } else {
      const sx = g.shake > 0 ? rand(-g.shake, g.shake) * 0.5 : 0;
      const sz = g.shake > 0 ? rand(-g.shake, g.shake) * 0.5 : 0;
      this.setCamera(g.cam.x + sx, g.cam.y + sz);
      this.syncWorld(g, now);
    }
    this.updateDecor();
    const r = this.renderer;
    r.setRenderTarget(this.rt);
    r.render(this.scene, this.camera);
    r.setRenderTarget(null);
    const u = this.post.uniforms;
    u.tColor.value = this.rt.texture;
    u.tDepth.value = this.rt.depthTexture;
    u.res.value.set(this.lowW, this.lowH);
    // o chão inclinado muda de profundidade a cada pixel; o limiar do contorno
    // precisa ser maior que essa variação para só marcar bordas de objetos
    u.thr.value = (this.upp / Math.tan(PITCH) + 3) / (this.camera.far - this.camera.near);
    r.render(this.postScene, this.postCam);
  },

  hideDynamic() {
    if (this.champ) this.champ.root.visible = false;
    for (const k in this.enemyPools) { this.enemyPools[k].begin(); this.enemyPools[k].end(); }
    for (const k in this.projPools) { this.projPools[k].begin(); this.projPools[k].end(); }
    for (const k in this.pickPools) { this.pickPools[k].begin(); this.pickPools[k].end(); }
    for (const p of [this.enemyShots, this.fxPool, this.partPool, this.groundFx, this.shroomPool, this.bladePool]) { p.begin(); p.end(); }
    for (const [, B] of this.bossModels) this.scene.remove(B.root);
    this.bossModels.clear();
    if (this.bear) this.bear.root.visible = false;
    this.laser.visible = false;
    this.bigSword.visible = false;
    this.lineGeo.setDrawRange(0, 0);
  },

  syncWorld(g, now) {
    const t = g.time;
    const p = g.player;
    const v = this.viewHalf();
    const inView = (o, m = 80) => Math.abs(o.x - this.camX) < v.w + m && Math.abs(o.y - this.camZ) < v.h + m;

    // --- Campeão ---
    if (!this.champ || this.champ.key !== p.key) {
      if (this.champ) this.scene.remove(this.champ.root);
      this.champ = buildChampion3D(p.key);
      this.champ.root.scale.setScalar(1.5);
      this.scene.add(this.champ.root);
      this.champYaw = 0;
    }
    const rig = this.champ;
    rig.root.visible = !(p.invuln > 0 && p.hurtT <= 0 && Math.floor(t * 20) % 2 === 0);
    // gira suavemente na direção do movimento (360°)
    let diff = -p.facing - this.champYaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.champYaw += diff * Math.min(1, (g.frameDt || 0.016) * 14);
    rig.root.rotation.y = this.champYaw;
    rig.root.position.set(p.x, 0, p.y);
    animateChampion3D(rig, { t: now, phase: p.animPhase, move: p.moveBlend, cast: p.castT, hurt: Math.min(1, p.hurtT * 3) });

    // --- Inimigos ---
    for (const k in this.enemyPools) this.enemyPools[k].begin();
    const seenBoss = new Set();
    for (const e of g.enemies) {
      if (e.dead) continue;
      const d = e.def;
      const rate = Math.max(0.8, e.speed / 45);
      const ph = (t * rate + e.wob) * TAU;
      const hit = e.flash > 0;
      if (d.boss) {
        seenBoss.add(e);
        let B = this.bossModels.get(e);
        if (!B) {
          B = buildBoss3D(d);
          this.bossModels.set(e, B);
          this.scene.add(B.root);
        }
        B.root.position.set(e.x, 0, e.y);
        B.root.rotation.y = -e.face;
        const sq = hit ? 0.12 : 0;
        B.root.scale.set(1 + sq, 1 - sq, 1 + sq);
        animateBoss3D(B, t, ph * 0.5, hit, e);
        continue;
      }
      if (!inView(e, e.r * 3)) continue;
      const pool = this.enemyPools[e.type];
      if (!pool) continue;
      const bob = Math.abs(Math.sin(ph)) * e.r * 0.14;
      const sq = 0.07 * (1 - Math.abs(Math.sin(ph))) + (hit ? 0.18 : 0);
      const tilt = Math.sin(ph) * 0.08 + (e.stun > 0 ? Math.sin(t * 20) * 0.15 : 0);
      baseMatrix(_m3, e.x, bob, e.y, e.face, 1 + sq * 0.6, 1 - sq, 1 + sq * 0.6, tilt);
      pool.add(_m3, ph, hit ? _white : null);
    }
    for (const k in this.enemyPools) this.enemyPools[k].end();
    for (const [e, B] of this.bossModels) {
      if (!seenBoss.has(e)) { this.scene.remove(B.root); this.bossModels.delete(e); }
    }

    // --- Projéteis do jogador ---
    for (const k in this.projPools) this.projPools[k].begin();
    for (const pr of g.projectiles) {
      if (!inView(pr)) continue;
      const pool = this.projPools[pr.kind];
      if (!pool) continue;
      const ang = Math.atan2(pr.vy, pr.vx);
      if (pr.kind === 'orb') baseMatrix(_m3, pr.x, 14, pr.y, t * 6, pr.r, pr.r, pr.r);
      else baseMatrix(_m3, pr.x, 14, pr.y, ang);
      pool.add(_m3, 0, null);
    }
    for (const k in this.projPools) this.projPools[k].end();

    // --- Projéteis inimigos ---
    const es = this.enemyShots;
    es.begin();
    for (const b of g.enemyProjectiles) {
      if (!inView(b)) continue;
      const pulse = 1 + Math.sin(t * 20 + b.x) * 0.15;
      baseMatrix(_m3, b.x, 12, b.y, 0, b.r * pulse, b.r * pulse, b.r * pulse);
      es.add(_m3, 0, _tmpColor.set(b.color));
    }
    es.end();

    // --- Coletáveis ---
    for (const k in this.pickPools) this.pickPools[k].begin();
    for (const pk of g.pickups) {
      if (!inView(pk)) continue;
      const pool = this.pickPools[pk.type];
      const hover = 6 + Math.sin(t * 4 + pk.x * 0.1) * 2;
      if (pk.type === 'xp') {
        const v2 = pk.value;
        const tier = v2 >= 50 ? 3 : v2 >= 10 ? 2 : v2 >= 3 ? 1 : 0;
        const s = 1 + tier * 0.25;
        baseMatrix(_m3, pk.x, hover, pk.y, t * 3 + pk.x, s, s, s);
        pool.add(_m3, 0, _tmpColor.set(['#4fb3ff', '#4ee38a', '#b26bff', '#ff5470'][tier]));
      } else {
        baseMatrix(_m3, pk.x, pk.type === 'chest' ? 0 : hover, pk.y, pk.type === 'chest' ? 0.3 : t * 3 + pk.y);
        pool.add(_m3, 0, null);
      }
    }
    for (const k in this.pickPools) this.pickPools[k].end();

    // --- Efeitos ---
    this.syncEffects(g, t, inView);
    this.syncWeapons(g, t);
  },

  syncEffects(g, t, inView) {
    const fx = this.fxPool, gp = this.groundFx, pp = this.partPool;
    fx.begin(); gp.begin(); pp.begin();
    let nLines = 0;
    const pos = this.lineGeo.attributes.position.array;
    this.laser.visible = false;
    this.bigSword.visible = false;
    for (const e of g.effects) {
      const k = 1 - e.life / e.max;
      switch (e.kind) {
        case 'ring': {
          // explosão: esfera que cresce e some, com anel no chão
          const s = e.r * (k < 0.3 ? 0.4 + k * 2 : 1 - (k - 0.3) * 1.3);
          if (s > 0) {
            baseMatrix(_m3, e.x, 10, e.y, 0, s, s * 0.7, s);
            fx.add(_m3, 0, _tmpColor.set(k < 0.15 ? '#ffffff' : e.color));
          }
          baseMatrix(_m3, e.x, 0.6, e.y, 0, e.r * (0.5 + k * 0.6), 0.4, e.r * (0.5 + k * 0.6));
          gp.add(_m3, 0, _tmpColor.set(e.color));
          break;
        }
        case 'cloud': {
          for (let i = 0; i < 4; i++) {
            const a = i * 1.7;
            const s = e.r * 0.45 * (1 - k * 0.6);
            baseMatrix(_m3, e.x + Math.cos(a) * e.r * 0.4, 10 + k * 10, e.y + Math.sin(a) * e.r * 0.4, 0, s, s * 0.6, s);
            fx.add(_m3, 0, _tmpColor.set('#8fdc3c'));
          }
          break;
        }
        case 'lightning': {
          for (let i = 1; i < e.pts.length && nLines < 190; i++) {
            const a = e.pts[i - 1], b = e.pts[i];
            const mx = (a.x + b.x) / 2 + rand(-10, 10), mz = (a.y + b.y) / 2 + rand(-10, 10);
            for (const [p0, p1] of [[[a.x, a.y], [mx, mz]], [[mx, mz], [b.x, b.y]]]) {
              pos.set([p0[0], 14, p0[1], p1[0], 14, p1[1]], nLines * 6);
              nLines++;
            }
          }
          break;
        }
        case 'sword': {
          const drop = Math.min(1, k * 2.4);
          this.bigSword.visible = true;
          this.bigSword.position.set(e.x, 260 * (1 - drop * drop), e.y);
          this.bigSword.rotation.set(0, Math.PI / 2, Math.PI);
          if (drop >= 1) {
            baseMatrix(_m3, e.x, 2, e.y, 0, 70 * (0.5 + k), 0.6, 70 * (0.5 + k));
            gp.add(_m3, 0, _tmpColor.set('#f2c14e'));
          }
          break;
        }
        case 'laserCharge':
        case 'laser': {
          const p = g.player;
          const ox = e.kind === 'laser' ? e.x : p.x, oz = e.kind === 'laser' ? e.y : p.y;
          const w = e.kind === 'laser' ? e.width * (1 - k * 0.6) : 4 + k * 6;
          this.laser.visible = true;
          this.laser.material = M3.glow(e.kind === 'laser' ? '#fff4c0' : '#ffe066');
          this.laser.position.set(ox + Math.cos(e.a) * e.length / 2, 16, oz + Math.sin(e.a) * e.length / 2);
          this.laser.rotation.set(0, -e.a, 0);
          this.laser.scale.set(e.length, e.kind === 'laser' ? w * 0.6 : 2, w);
          break;
        }
        case 'flash': {
          const s = 10 + k * 30;
          baseMatrix(_m3, e.x, 1, e.y, 0, s, 0.5, s);
          gp.add(_m3, 0, _tmpColor.set('#ffe066'));
          break;
        }
        case 'telegraph': {
          const s = e.r * (0.8 + 0.2 * Math.sin(t * 20));
          baseMatrix(_m3, e.x, 0.8, e.y, 0, s, 0.4, s);
          gp.add(_m3, 0, _tmpColor.set('#d9273e'));
          break;
        }
      }
    }
    this.lineGeo.attributes.position.needsUpdate = true;
    this.lineGeo.setDrawRange(0, nLines * 2);
    // Partículas: cubinhos que saltam em arco
    for (const pt of g.particles) {
      if (!inView(pt)) continue;
      const k = 1 - pt.life / pt.max;
      const h = 8 + Math.sin(Math.min(1, k) * Math.PI) * 16;
      const s = pt.size * (1 - k * 0.5);
      baseMatrix(_m3, pt.x, h, pt.y, pt.x, s, s, s);
      pp.add(_m3, 0, _tmpColor.set(pt.color));
    }
    // Aura de fogo solar
    const p = g.player;
    if (p.stats.burn > 0) {
      const R = SUNFIRE_RADIUS * p.stats.areaMult;
      baseMatrix(_m3, p.x, 0.3, p.y, 0, R, 0.2, R);
      gp.add(_m3, 0, _tmpColor.set('#ff8a3d'));
    }
    fx.end(); gp.end(); pp.end();
  },

  // Visual das habilidades que ficam no mundo (lâminas, zonas, urso, cogumelos).
  syncWeapons(g, t) {
    const p = g.player;
    const gp = this.groundFx;
    const bp = this.bladePool, sp = this.shroomPool;
    bp.begin(); sp.begin();
    let bearW = null;
    // groundFx já foi finalizado em syncEffects; reabre para acrescentar zonas
    const extra = [];
    for (const w of p.weapons) {
      if (w.key === 'judgment') {
        const R = wstat(w, 'radius') * p.stats.areaMult;
        const n = wstat(w, 'blades');
        for (let i = 0; i < n; i++) {
          const a = w.angle + (i * TAU) / n;
          const len = R * 0.7;
          baseMatrix(_m3, p.x + Math.cos(a) * (R * 0.3 + len / 2), 14, p.y + Math.sin(a) * (R * 0.3 + len / 2), a, len, 2.5, 6);
          bp.add(_m3, 0, w.evolved ? _tmpColor.set('#fff3b0') : null);
        }
        extra.push([p.x, p.y, R, '#f2c14e']);
      } else if (w.key === 'singularity') {
        const R = wstat(w, 'radius') * p.stats.areaMult;
        for (const z of w.zones) extra.push([z.x, z.y, R * (1 - (1 - z.t / z.max) * 0.3), '#fff3a0']);
      } else if (w.key === 'tibbers') {
        bearW = w;
      } else if (w.key === 'noxiousTrap') {
        for (const s of w.shrooms) {
          const wob = Math.sin(t * 5 + s.x) * 0.08;
          baseMatrix(_m3, s.x, 0, s.y, 0, 1 + wob, 1 - wob, 1 + wob);
          sp.add(_m3, 0, null);
        }
      }
    }
    bp.end(); sp.end();
    if (extra.length) {
      // acrescenta discos de zona ao pool do chão
      const n0 = gp.n;
      for (const [x, z, R, c] of extra) {
        baseMatrix(_m3, x, 0.4, z, 0, R, 0.2, R);
        gp.add(_m3, 0, _tmpColor.set(c));
      }
      if (gp.n !== n0) gp.end();
    }
    // Tibbers
    if (bearW) {
      if (!this.bear) {
        this.bear = buildBear3D();
        this.scene.add(this.bear.root);
      }
      const b = bearW.bear, B = this.bear;
      B.root.visible = true;
      B.root.position.set(b.x, 0, b.y);
      B.root.rotation.y = -b.face;
      const big = bearW.evolved ? 1.5 : 1;
      const swing = b.anim > 0 ? b.anim / 0.2 : 0;
      B.root.scale.set(big * (1 + swing * 0.12), big * (1 - swing * 0.12), big);
      B.arm.rotation.z = 0.4 + swing * 2.2;
      B.legs[0].rotation.z = Math.sin(t * 12) * 0.5;
      B.legs[1].rotation.z = -Math.sin(t * 12) * 0.5;
      B.flames.forEach((f, i) => { f.scale.y = 8 + Math.sin(t * 16 + i * 2) * 3; });
    } else if (this.bear) {
      this.bear.root.visible = false;
    }
  },

  // -------------------------------------------------------------------------
  // Retratos animados para o menu (renderizados com o mesmo visual pixelado)
  // -------------------------------------------------------------------------
  renderPortrait(key, t, selected, out) {
    if (!this.portrait) {
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight('#fff2d6', '#6b5a3a', 0.85));
      const sun = new THREE.DirectionalLight('#fff1d0', 0.8);
      sun.position.set(-40, 80, 60);
      scene.add(sun);
      const cam = new THREE.OrthographicCamera(-24, 24, 32, -24, 1, 400);
      cam.position.set(60, 40, 120);
      cam.lookAt(0, 22, 0);
      const W = 52, H = 60;
      this.portrait = {
        scene, cam, W, H, rigs: {},
        rt: this.makeTarget(W, H),
        outRt: new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }),
        buf: new Uint8Array(W * H * 4),
        img: new ImageData(W, H),
        tmp: makeCanvas(W, H),
      };
    }
    const P0 = this.portrait;
    let rig = P0.rigs[key];
    if (!rig) {
      rig = buildChampion3D(key);
      P0.rigs[key] = rig;
    }
    for (const k in P0.rigs) P0.rigs[k].root.visible = false;
    if (!rig.root.parent) P0.scene.add(rig.root);
    rig.root.visible = true;
    rig.root.rotation.y = selected ? t * 1.2 : -1.1 + Math.sin(t * 0.8) * 0.35;
    const cyc = t % 4;
    animateChampion3D(rig, {
      t, phase: t * 9, move: selected && cyc < 3 ? 1 : 0,
      cast: selected && cyc >= 3 ? Math.sin((cyc - 3) * Math.PI) : 0, hurt: 0,
    });
    const r = this.renderer;
    r.setClearColor('#ead8b0', 0);
    r.setRenderTarget(P0.rt);
    r.clear();
    r.render(P0.scene, P0.cam);
    const u = this.post.uniforms;
    u.tColor.value = P0.rt.texture;
    u.tDepth.value = P0.rt.depthTexture;
    u.res.value.set(P0.W, P0.H);
    u.thr.value = 2 / (P0.cam.far - P0.cam.near);
    u.clearBg.value = 1;
    r.setRenderTarget(P0.outRt);
    r.render(this.postScene, this.postCam);
    u.clearBg.value = 0;
    r.readRenderTargetPixels(P0.outRt, 0, 0, P0.W, P0.H, P0.buf);
    r.setRenderTarget(null);
    r.setClearColor('#2a4a2d', 1);
    // WebGL lê de baixo para cima
    const d = P0.img.data;
    for (let y = 0; y < P0.H; y++) {
      d.set(P0.buf.subarray((P0.H - 1 - y) * P0.W * 4, (P0.H - y) * P0.W * 4), y * P0.W * 4);
    }
    P0.tmp.getContext('2d').putImageData(P0.img, 0, 0);
    const x = out.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.clearRect(0, 0, out.width, out.height);
    const s = Math.floor(Math.min(out.width / P0.W, out.height / P0.H));
    x.drawImage(P0.tmp, (out.width - P0.W * s) / 2, (out.height - P0.H * s) / 2, P0.W * s, P0.H * s);
  },
};
