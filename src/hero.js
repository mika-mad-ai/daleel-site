// Scroll-driven 3D hero: a white clay model of Downtown Dubai (real OpenStreetMap
// footprints). The camera orbits the turning map, dives toward a tower across the
// fountain lake and ends inside an apartment facing the Burj Khalifa.
import * as THREE from 'three';

const PAPER = 0xfbfaf8;
const CLAY = 0xf6f5f2;
const GROUND = 0xe9e6e0;
const ROAD = 0xffffff;
const WATER = 0xa9c8ea;
const EMBER = 0xdf3f00;
const DISC_R = 1400;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const range = (v, a, b) => clamp01((v - a) / (b - a));

// Everything flat (ground, water, roads) is cut to a round plinth in the shader.
function discClip(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vDiscXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDiscXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vDiscXZ;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\nif (length(vDiscXZ) > ${DISC_R.toFixed(1)}) discard;`);
  };
  return material;
}

// Extrude [h, minH, x0, n0, x1, n1, ...] footprints (metres, CCW, n = north) into one geometry.
function extrude(items) {
  const pos = [];
  const col = [];
  const push = (x, y, z, c) => { pos.push(x, y, z); col.push(c, c, c); };
  for (const it of items) {
    const h = it[0];
    const mh = it[1];
    const n = (it.length - 2) / 2;
    const contour = [];
    for (let i = 0; i < n; i++) contour.push(new THREE.Vector2(it[2 + i * 2], it[3 + i * 2]));
    // Soft contact shading: walls get darker toward the street, like a clay model.
    const base = mh > 0 ? 0.92 : 0.84;
    for (let i = 0; i < n; i++) {
      const a = contour[i];
      const b = contour[(i + 1) % n];
      push(a.x, mh, -a.y, base); push(b.x, mh, -b.y, base); push(b.x, h, -b.y, 1);
      push(a.x, mh, -a.y, base); push(b.x, h, -b.y, 1); push(a.x, h, -a.y, 1);
    }
    const faces = THREE.ShapeUtils.triangulateShape(contour, []);
    for (const f of faces) {
      const [a, b, c] = [contour[f[0]], contour[f[1]], contour[f[2]]];
      push(a.x, h, -a.y, 1); push(b.x, h, -b.y, 1); push(c.x, h, -c.y, 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function flatPolys(polys, y) {
  const pos = [];
  for (const p of polys) {
    const n = p.length / 2;
    const contour = [];
    for (let i = 0; i < n; i++) contour.push(new THREE.Vector2(p[i * 2], p[i * 2 + 1]));
    for (const f of THREE.ShapeUtils.triangulateShape(contour, [])) {
      const [a, b, c] = [contour[f[0]], contour[f[1]], contour[f[2]]];
      pos.push(a.x, y, -a.y, b.x, y, -b.y, c.x, y, -c.y);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function roadRibbons(roads, y) {
  const pos = [];
  for (const r of roads) {
    const w = r[0] / 2;
    const n = (r.length - 1) / 2;
    for (let i = 0; i < n - 1; i++) {
      const ax = r[1 + i * 2], an = r[2 + i * 2], bx = r[3 + i * 2], bn = r[4 + i * 2];
      let dx = bx - ax, dn = bn - an;
      const l = Math.hypot(dx, dn);
      if (l < 0.01) continue;
      dx /= l; dn /= l;
      const px = -dn * w, pn = dx * w;
      // slight overlap at joints hides the gaps between segments
      const ex = dx * w * 0.6, en = dn * w * 0.6;
      const A = [ax - ex + px, an - en + pn], B = [ax - ex - px, an - en - pn];
      const C = [bx + ex + px, bn + en + pn], D = [bx + ex - px, bn + en - pn];
      pos.push(A[0], y, -A[1], B[0], y, -B[1], C[0], y, -C[1]);
      pos.push(B[0], y, -B[1], D[0], y, -D[1], C[0], y, -C[1]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function buildRoom(clayMat) {
  const room = new THREE.Group();
  const W = 13, H = 6.2, D = 15;
  const wall = new THREE.MeshStandardMaterial({ color: 0xf7f6f3, roughness: 1 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xefede8, roughness: 0.9 });
  const ember = new THREE.MeshStandardMaterial({ color: EMBER, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a2d, roughness: 0.7 });
  const box = (w, h, d, x, y, z, m = wall, cast = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    room.add(mesh);
    return mesh;
  };
  // shell: window plane at z = 0, room runs back to z = +D, open at the back
  box(W, 0.3, D, 0, -0.15, D / 2, floorMat);
  box(W, 0.3, D, 0, H + 0.15, D / 2);
  box(0.3, H, D, -W / 2, H / 2, D / 2);
  box(0.3, H, D, W / 2, H / 2, D / 2);
  // glazing: slim dark mullions and one transom
  for (const x of [-W / 2 + 0.2, -2.6, 2.6, W / 2 - 0.2]) box(0.07, H, 0.12, x, H / 2, 0, dark);
  box(W, 0.08, 0.12, 0, H - 0.04, 0, dark);
  box(W, 0.1, 0.16, 0, 0.05, 0, dark);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshBasicMaterial({ color: 0xdfeaf5, transparent: true, opacity: 0.07, depthWrite: false }),
  );
  glass.position.set(0, H / 2, 0.02);
  room.add(glass);
  // rug
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), new THREE.MeshStandardMaterial({ color: 0xe6e3dc, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(2.7, 0.012, 2.6);
  rug.receiveShadow = true;
  room.add(rug);
  // lounge chair, right of the camera path
  const chair = new THREE.Group();
  const cb = (w, h, d, x, y, z, m = clayMat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    chair.add(mesh);
  };
  cb(1.0, 0.32, 0.95, 0, 0.36, 0);
  cb(1.0, 0.62, 0.16, 0, 0.72, 0.42);
  cb(0.12, 0.3, 0.95, -0.52, 0.56, 0);
  cb(0.12, 0.3, 0.95, 0.52, 0.56, 0);
  cb(0.5, 0.2, 0.45, 0.05, 0.6, 0.12, ember);
  chair.position.set(3.3, 0, 2.5);
  chair.rotation.y = 0.5;
  room.add(chair);
  // side table and lamp
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.5, 32), wall);
  table.position.set(1.9, 0.25, 1.9);
  table.castShadow = table.receiveShadow = true;
  room.add(table);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.9, 12), dark);
  stem.position.set(4.7, 0.95, 1.2);
  stem.castShadow = true;
  room.add(stem);
  const shade = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), wall);
  shade.position.set(4.7, 1.95, 1.2);
  shade.castShadow = true;
  room.add(shade);
  // low bench along the glass, left
  box(3.4, 0.38, 0.85, -3.6, 0.19, 1.3, clayMat);
  box(0.9, 0.14, 0.6, -4.4, 0.45, 1.3, ember);
  return room;
}

export async function initHero({ canvas, track, onProgress, onReady }) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 760px)').matches;
  const data = await fetch(`${import.meta.env.BASE_URL}data/dubai.json`).then((r) => r.json());

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAPER);
  scene.fog = new THREE.Fog(PAPER, 2600, 6200);

  const camera = new THREE.PerspectiveCamera(38, 1, 2, 9000);

  // light: a soft sky plus one sun coming from the south-west, so the Burj face we end on is lit
  const hemi = new THREE.HemisphereLight(0xffffff, 0xe9e6e0, 2.0);
  scene.add(hemi);
  const sunDir = new THREE.Vector3();
  const sun = new THREE.DirectionalLight(0xfff6ec, 1.7);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(small ? 2048 : 4096);
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 2.5;
  sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);

  // model
  const clay = new THREE.MeshStandardMaterial({ color: CLAY, roughness: 0.96, vertexColors: true });
  const city = new THREE.Mesh(extrude(data.b), clay);
  city.castShadow = city.receiveShadow = true;
  scene.add(city);

  const targetMat = new THREE.MeshStandardMaterial({ color: CLAY, roughness: 0.96, vertexColors: true, transparent: true });
  const tower = new THREE.Mesh(extrude(data.t), targetMat);
  tower.castShadow = tower.receiveShadow = true;
  scene.add(tower);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(DISC_R, 96), new THREE.MeshStandardMaterial({ color: GROUND, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const water = new THREE.Mesh(flatPolys(data.w, 0.35), discClip(new THREE.MeshStandardMaterial({ color: WATER, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 })));
  water.receiveShadow = true;
  scene.add(water);
  const roads = new THREE.Mesh(roadRibbons(data.r, 0.2), discClip(new THREE.MeshStandardMaterial({ color: ROAD, roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })));
  roads.receiveShadow = true;
  scene.add(roads);

  // the apartment: on the facade of the target tower that faces the Burj (which sits at the origin)
  const T = data.T;
  const tPos = new THREE.Vector3(T.c[0], 0, -T.c[1]);
  const toBurj = tPos.clone().multiplyScalar(-1).setY(0).normalize();
  const FLOOR_Y = 270;
  // the sun sits 50 degrees off the window axis and fairly low, so it rakes across the apartment floor
  sunDir.copy(toBurj).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.87).multiplyScalar(Math.cos(0.66)).setY(Math.sin(0.66)).normalize();
  const windowPt = tPos.clone().addScaledVector(toBurj, T.f - 0.4).setY(FLOOR_Y);
  const room = buildRoom(new THREE.MeshStandardMaterial({ color: CLAY, roughness: 0.96 }));
  room.position.copy(windowPt);
  room.rotation.y = Math.atan2(-toBurj.x, -toBurj.z);
  scene.add(room);

  // the highlighted floor, like the coral floors on the Daleel map
  const band = new THREE.Mesh(
    extrude(data.t.map((it) => [FLOOR_Y + 9, FLOOR_Y - 3, ...it.slice(2)])),
    new THREE.MeshBasicMaterial({ color: 0xff5a1f, transparent: true, opacity: 0.92 }),
  );
  band.scale.set(1.05, 1, 1.05);
  band.position.set(-tPos.x * 0.05, 0, -tPos.z * 0.05);
  scene.add(band);

  // camera path
  const endEye = windowPt.clone().addScaledVector(toBurj, -8.6).setY(FLOOR_Y + 1.62);
  const endLook = new THREE.Vector3(0, 395, 0);
  const approachAz = Math.atan2(-toBurj.z, -toBurj.x); // angle of the camera as seen from the Burj
  const back = T.dist + 300; // radius of the orbit when the dive begins
  const diveFrom = new THREE.Vector3(Math.cos(approachAz) * back, 330, Math.sin(approachAz) * back);
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  let width = 1, height = 1;

  function pose(p, time) {
    const a = range(p, 0, 0.5);
    const b = range(p, 0.5, 0.88);
    const c = range(p, 0.88, 1);
    if (b <= 0) {
      const e = easeInOut(a);
      // the map turns on its own while it waits, then the scroll takes over
      const idle = reduce ? 0 : Math.sin(time * 0.05) * 0.5 * (1 - smooth(range(p, 0, 0.12)));
      const az = approachAz - lerp(3.6, 0, e) + idle;
      const r = lerp(small ? 3900 : 3900, back, e);
      const y = lerp(small ? 2400 : 2150, 330, e);
      pos.set(Math.cos(az) * r, y, Math.sin(az) * r);
      look.set(0, lerp(120, 300, e), 0);
    } else {
      const e = easeInOut(b);
      pos.lerpVectors(diveFrom, endEye, e);
      // sink to eye level a little ahead of the forward motion so we arrive flat through the room
      pos.y = lerp(diveFrom.y, endEye.y, smooth(clamp01(e * 1.25)));
      tmp.set(0, 300, 0);
      look.lerpVectors(tmp, endLook, smooth(b));
      // last beat: a slow push toward the glass
      pos.addScaledVector(toBurj, smooth(c) * 0.9);
    }
    camera.position.copy(pos);
    camera.lookAt(look);
    camera.fov = lerp(small ? 44 : 36, small ? 84 : 68, smooth(range(p, 0.55, 0.9)));
    camera.near = p < 0.56 ? 25 : 0.25;
    // keep the model on the right of the headline at the start, centre it as we dive
    const shift = small ? 0 : lerp(-0.21, 0, smooth(range(p, 0.08, 0.42)));
    const lift = small ? lerp(0.2, 0, smooth(range(p, 0.08, 0.42))) : 0;
    camera.setViewOffset(width, height, shift * width, lift * height, width, height);
    camera.updateProjectionMatrix();

    // the tower dissolves as we reach it and the apartment is revealed in cutaway
    const fade = 1 - smooth(range(p, 0.6, 0.71));
    targetMat.opacity = fade;
    tower.visible = fade > 0.01;
    tower.castShadow = fade > 0.5;
    band.material.opacity = 0.92 * (1 - smooth(range(p, 0.62, 0.72)));
    band.visible = band.material.opacity > 0.01;
    room.visible = p > 0.45;

    // shadow frustum follows the action so mullion shadows stay crisp indoors
    const k = smooth(range(p, 0.45, 0.8));
    const size = lerp(1750, 34, Math.pow(k, 0.6));
    tmp.set(0, 0, 0).lerp(windowPt, k);
    sun.target.position.copy(tmp);
    sun.position.copy(tmp).addScaledVector(sunDir, 2600);
    const sc = sun.shadow.camera;
    sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size;
    sc.near = 10; sc.far = 5200;
    sc.updateProjectionMatrix();
    sun.shadow.normalBias = lerp(0.6, 0.02, k);
    scene.fog.near = lerp(2600, 1200, k);
    scene.fog.far = lerp(6200, 4200, k);
  }

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    width = Math.max(1, r.width);
    height = Math.max(1, r.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
  }
  new ResizeObserver(() => { resize(); dirty = true; }).observe(canvas.parentElement);
  resize();

  // scroll progress is read inside the render loop (no scroll listener) and eased for a filmic feel
  let p = 0;
  let visible = true;
  let dirty = true;
  let lastP = -1;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { rootMargin: '10% 0px' }).observe(track);
  const target = () => {
    const r = track.getBoundingClientRect();
    const span = r.height - innerHeight;
    return span <= 0 ? 0 : clamp01(-r.top / span);
  };
  const t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = target();
    p = reduce ? t : p + (t - p) * 0.085;
    if (Math.abs(t - p) < 0.0002) p = t;
    const idleMoving = !reduce && p < 0.12;
    if (!dirty && !idleMoving && Math.abs(p - lastP) < 1e-5) return;
    dirty = false;
    lastP = p;
    pose(p, (now - t0) / 1000);
    renderer.render(scene, camera);
    onProgress?.(p);
  }
  pose(target(), 0);
  renderer.render(scene, camera);
  onReady?.();
  requestAnimationFrame(frame);

  return { setProgressForDebug: (v) => { pose(v, 0); renderer.render(scene, camera); onProgress?.(v); } };
}
