const stage = document.querySelector('three-d-stage');
const { THREE: T } = await stage.ready;

/* ---------- materials ---------- */
const std = (name, color, roughness, metalness = 0, extra = {}) =>
  new T.MeshStandardMaterial({ name, color, roughness, metalness, ...extra });
const M = {
  steel:      std('steel',            0x6f93b8, 0.45, 0.35),
  steelDark:  std('steel_dark',       0x34475a, 0.55, 0.30),
  steelLight: std('steel_polished',   0xb4c4d4, 0.28, 0.40),
  paper:      std('paper_raw',        0xefe9dd, 0.85),
  printed:    std('paper_printed',    0xc4a077, 0.80),
  impreg:     std('paper_impregnated',0xb3895a, 0.30),
  resin:      std('melamine_resin',   0xd8c38e, 0.15, 0, { transparent: true, opacity: 0.82 }),
  ink:        std('gravure_ink',      0x5b3d29, 0.30),
  rubber:     std('rubber',           0x2c2f31, 0.90),
  decor:      std('decor_surface',    0xa87a4c, 0.40),
  mdf:        std('board_core_mdf',   0xbb9d77, 0.85),
  concrete:   std('concrete',         0xd9d7d2, 0.95),
  glass:      std('glass',            0xa8c0d2, 0.08, 0.1, { transparent: true, opacity: 0.45 }),
  marking:    std('floor_marking',    0x8fa9c2, 0.70),
  paint:      std('truck_paint',      0x5980a6, 0.32, 0.30, { side: T.DoubleSide }),
};

const W = 2.0;              // web / board width (z)
const WEB_Y = 1.35;         // web centre height
const FZ = W / 2 + 0.35;    // machine side-frame plane
const OFF = 12;             // part 2 (04–05) sits OFF metres downstream of part 1 (01–03)
const model = new T.Group(); model.name = 'decor_paper_production_line';

/* ---------- primitives ---------- */
function grp(p, name, x = 0, y = 0, z = 0) { const g = new T.Group(); g.name = name; g.position.set(x, y, z); p.add(g); return g; }
function mesh(p, name, geo, mat, x, y, z) { const m = new T.Mesh(geo, mat); m.name = name; m.position.set(x, y, z); p.add(m); return m; }
function box(p, n, w, h, d, mat, x, y, z, rz = 0, ry = 0) { const m = mesh(p, n, new T.BoxGeometry(w, h, d), mat, x, y, z); m.rotation.set(0, ry, rz); return m; }
function cylY(p, n, r, h, mat, x, y, z, seg = 24) { return mesh(p, n, new T.CylinderGeometry(r, r, h, seg), mat, x, y, z); }
function cylZ(p, n, r, len, mat, x, y, z, seg = 40) { const m = cylY(p, n, r, len, mat, x, y, z, seg); m.rotation.x = Math.PI / 2; return m; }
function cylX(p, n, r, len, mat, x, y, z, seg = 24) { const m = cylY(p, n, r, len, mat, x, y, z, seg); m.rotation.z = Math.PI / 2; return m; }
const UP = new T.Vector3(0, 1, 0);
function cylBetween(p, n, r, a, b, mat, seg = 16) {
  const A = new T.Vector3(...a), B = new T.Vector3(...b), d = B.clone().sub(A);
  const m = mesh(p, n, new T.CylinderGeometry(r, r, d.length(), seg), mat, 0, 0, 0);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}
function roundedRect(w, h, r) {
  const s = new T.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// box with every edge rounded (radius r)
function rbox(p, n, w, h, d, r, mat, x, y, z, rz = 0) {
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const b = r * 0.5, rc = Math.max(1e-4, Math.min(r * 0.5, (w - 2 * b) / 2 - 1e-4, (h - 2 * b) / 2 - 1e-4));
  const g = new T.ExtrudeGeometry(roundedRect(w - 2 * b, h - 2 * b, rc), { depth: Math.max(1e-4, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -(d - 2 * b) / 2);
  const m = mesh(p, n, g, mat, x, y, z); m.rotation.z = rz; return m;
}
function pipeRun(p, n, r, pts, mat = M.steel) {
  const g = grp(p, n);
  for (let i = 0; i < pts.length - 1; i++) cylBetween(g, `${n}_seg_${i + 1}`, r, pts[i], pts[i + 1], mat);
  for (let i = 1; i < pts.length - 1; i++) mesh(g, `${n}_elbow_${i}`, new T.SphereGeometry(r * 1.15, 16, 10), mat, ...pts[i]);
  return g;
}
// web strip between two points in the XY plane
function strip(p, n, x0, y0, x1, y1, mat, th = 0.02) {
  return box(p, n, Math.hypot(x1 - x0, y1 - y0), th, W, mat, (x0 + x1) / 2, (y0 + y1) / 2, 0, Math.atan2(y1 - y0, x1 - x0));
}

// forklift heading from path direction: z legs 0/π, x legs ±π/2 — nearest to current heading, forks-first on a tie; stationary keeps heading
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
function steer(f, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  let y = f.userData.yaw ?? 0, tgt = y;
  if (Math.hypot(dx, dz) > 1e-5) {
    const o = Math.abs(dz) >= Math.abs(dx) ? [0, Math.PI] : [Math.PI / 2, -Math.PI / 2], ff = Math.atan2(-dx, -dz);
    const d0 = Math.abs(wrapA(o[0] - y)), d1 = Math.abs(wrapA(o[1] - y));
    tgt = Math.abs(d0 - d1) < 0.3 ? (Math.abs(wrapA(o[0] - ff)) < Math.abs(wrapA(o[1] - ff)) ? o[0] : o[1]) : d0 < d1 ? o[0] : o[1];
  }
  y += wrapA(tgt - y) * 0.2; f.userData.yaw = y; f.rotation.y = y; return y;
}
// walking gait: hip + shoulder pivots, legs and arms swing in opposition
function gait(w) {
  const n = w.name, P = [];
  for (const [s, sd] of [['r', 1], ['l', -1]]) {
    const hip = new T.Group(); hip.name = n + '_hip_' + s; hip.position.set(sd * 0.1, 0.88, 0); w.add(hip);
    [n + '_leg_' + s, n + '_boot_' + s].forEach(k => { const o = w.getObjectByName(k); if (o) hip.attach(o); });
    const sh = new T.Group(); sh.name = n + '_shoulder_' + s; sh.position.set(sd * 0.24, 1.44, 0); w.add(sh);
    [n + '_arm_' + s, n + '_hand_' + s].forEach(k => { const o = w.getObjectByName(k); if (o && o.parent === w) sh.attach(o); });
    P.push({ hip, sh, sd });
  }
  let amp = 0;
  return (wt, walking) => {
    amp += ((walking ? 1 : 0) - amp) * 0.12;
    const a = Math.sin(wt * Math.PI * 2) * 0.42 * amp;
    P.forEach(p => { p.hip.rotation.x = p.sd * a; p.sh.rotation.x = -p.sd * a * 0.8; });
  };
}

/* ---------- machine parts ---------- */
const boltGeo = new T.CylinderGeometry(0.028, 0.028, 0.024, 6);
function sidePlates(p, n, w, h, x, y0, t = 0.12) {
  const g = grp(p, n);
  for (const s of [1, -1]) {
    const side = s > 0 ? 'operator' : 'drive';
    box(g, `${n}_plate_${side}`, w, h, t, M.steelDark, x, y0 + h / 2, s * FZ);
    const cnt = Math.max(2, Math.round(w / 0.3));
    for (const [row, by] of [['top', y0 + h - 0.1], ['bottom', y0 + 0.1]])
      for (let i = 0; i < cnt; i++) {
        const b = mesh(g, `${n}_bolt_${side}_${row}_${i + 1}`, boltGeo, M.steelLight, x - w / 2 + 0.12 + i * (w - 0.24) / (cnt - 1), by, s * (FZ + t / 2 + 0.012));
        b.rotation.x = Math.PI / 2;
      }
  }
  return g;
}
function roller(p, n, r, x, y, { mat = M.steelLight, len = W + 0.2, bearings = true, bz = FZ + 0.1 } = {}) {
  const g = grp(p, n);
  cylZ(g, `${n}_shell`, r, len, mat, x, y, 0, r > 0.2 ? 64 : 40);
  cylZ(g, `${n}_journal`, Math.max(0.03, r * 0.32), 2 * bz + 0.1, M.steelDark, x, y, 0, 20);
  if (bearings) for (const s of [1, -1])
    box(g, `${n}_bearing_${s > 0 ? 'operator' : 'drive'}`, Math.max(0.16, r * 1.1), Math.max(0.16, r * 1.1), 0.12, M.steelDark, x, y, s * bz);
  return g;
}
const idlerY = r => WEB_Y - r - 0.011;
function guideStand(p, n, x, r = 0.1) {
  const g = grp(p, n), y = idlerY(r);
  for (const s of [1, -1]) {
    const side = s > 0 ? 'operator' : 'drive';
    box(g, `${n}_pedestal_${side}`, 0.16, y - 0.08, 0.16, M.steel, x, (y - 0.08) / 2, s * FZ);
    box(g, `${n}_baseplate_${side}`, 0.36, 0.02, 0.36, M.steelDark, x, 0.01, s * FZ);
  }
  roller(g, `${n}_idler`, r, x, y, { bz: FZ });
  return g;
}
function paperRoll(p, n, x, y, z, r = 0.62, len = 2.0) {
  const g = grp(p, n);
  cylZ(g, `${n}_paper`, r, len, M.paper, x, y, z, 64);
  cylZ(g, `${n}_core`, 0.076, len + 0.012, M.steelDark, x, y, z, 24);
  return g;
}
function motor(p, n, x, y, z, { r = 0.2, len = 0.55, dir = -1 } = {}) {
  const g = grp(p, n), cz = z + dir * len / 2;
  cylZ(g, `${n}_body`, r, len, M.steel, x, y, cz, 32);
  for (let i = 0; i < 5; i++) cylZ(g, `${n}_fin_${i + 1}`, r + 0.018, 0.022, M.steel, x, y, z + dir * (0.08 + i * (len - 0.2) / 4), 32);
  cylZ(g, `${n}_fan_cowl`, r + 0.02, 0.12, M.steelDark, x, y, z + dir * (len + 0.06), 32);
  box(g, `${n}_terminal_box`, 0.2, 0.14, 0.2, M.steelDark, x, y + r + 0.07, cz);
  box(g, `${n}_feet`, r * 2.2, 0.05, len * 0.7, M.steelDark, x, y - r - 0.025, cz);
  return g;
}
function cabinet(p, n, x, z, { w = 0.9, h = 1.9, d = 0.5 } = {}) {
  const g = grp(p, n), fz = z + d / 2;
  box(g, `${n}_plinth`, w, 0.1, d, M.steelDark, x, 0.05, z);
  box(g, `${n}_body`, w, h, d, M.steel, x, 0.1 + h / 2, z);
  box(g, `${n}_door_seam`, 0.01, h - 0.12, 0.006, M.steelDark, x, 0.1 + h / 2, fz + 0.003);
  box(g, `${n}_handle`, 0.03, 0.2, 0.03, M.steelLight, x + 0.06, 1.05, fz + 0.02);
  box(g, `${n}_hmi_bezel`, 0.34, 0.26, 0.02, M.steelDark, x - w / 4, 1.5, fz + 0.01);
  box(g, `${n}_hmi_screen`, 0.29, 0.2, 0.006, M.glass, x - w / 4, 1.5, fz + 0.023);
  for (let i = 0; i < 3; i++) cylZ(g, `${n}_button_${i + 1}`, 0.022, 0.03, M.steelLight, x - w / 4 - 0.1 + i * 0.1, 1.24, fz + 0.015, 16);
  cylZ(g, `${n}_estop_collar`, 0.05, 0.02, M.steelLight, x + w / 4, 1.5, fz + 0.01, 24);
  cylZ(g, `${n}_estop`, 0.035, 0.05, M.rubber, x + w / 4, 1.5, fz + 0.03, 24);
  cylY(g, `${n}_stacklight_base`, 0.04, 0.08, M.steelDark, x + w / 3, 0.1 + h + 0.04, z, 16);
  for (let i = 0; i < 3; i++) cylY(g, `${n}_stacklight_${i + 1}`, 0.045, 0.09, M.glass, x + w / 3, 0.1 + h + 0.125 + i * 0.095, z, 16);
  return g;
}
function railing(p, n, a, b, y, h = 1.1) {
  const g = grp(p, n), L = Math.hypot(b[0] - a[0], b[1] - a[1]), cnt = Math.ceil(L / 1.2) + 1;
  for (let i = 0; i < cnt; i++) {
    const t = i / (cnt - 1), x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    cylBetween(g, `${n}_post_${i + 1}`, 0.022, [x, y, z], [x, y + h, z], M.steelLight, 12);
  }
  cylBetween(g, `${n}_top_rail`, 0.025, [a[0], y + h, a[1]], [b[0], y + h, b[1]], M.steelLight, 12);
  cylBetween(g, `${n}_knee_rail`, 0.02, [a[0], y + h / 2, a[1]], [b[0], y + h / 2, b[1]], M.steelLight, 12);
  box(g, `${n}_toe_board`, L, 0.1, 0.01, M.steel, (a[0] + b[0]) / 2, y + 0.05, (a[1] + b[1]) / 2, 0, -Math.atan2(b[1] - a[1], b[0] - a[0]));
  return g;
}
function platform(p, n, x0, x1, z0, z1, y, sides) {
  const g = grp(p, n);
  box(g, `${n}_grating`, x1 - x0, 0.05, z1 - z0, M.steel, (x0 + x1) / 2, y - 0.025, (z0 + z1) / 2);
  const legsX = Math.max(2, Math.ceil((x1 - x0) / 2) + 1);
  for (let i = 0; i < legsX; i++) for (const z of [z0 + 0.06, z1 - 0.06]) {
    const x = x0 + 0.06 + i * (x1 - x0 - 0.12) / (legsX - 1);
    box(g, `${n}_leg_${i + 1}_${z === z0 + 0.06 ? 'a' : 'b'}`, 0.08, y - 0.05, 0.08, M.steelDark, x, (y - 0.05) / 2, z);
  }
  const edges = { x0: [[x0, z0], [x0, z1]], x1: [[x1, z0], [x1, z1]], z0: [[x0, z0], [x1, z0]], z1: [[x0, z1], [x1, z1]] };
  for (const s of sides) railing(g, `${n}_railing_${s}`, ...edges[s], y);
  return g;
}
function stairs(p, n, xTop, z0, z1, h, dir = -1) {
  const g = grp(p, n), steps = Math.ceil(h / 0.19), rise = h / steps, go = 0.26, xBot = xTop + dir * steps * go;
  for (let k = 1; k < steps; k++)
    box(g, `${n}_tread_${k}`, go, 0.04, z1 - z0, M.steel, xTop + dir * ((steps - k) * go - go / 2), k * rise - 0.02, (z0 + z1) / 2);
  for (const z of [z0, z1]) {
    cylBetween(g, `${n}_stringer_${z === z0 ? 'a' : 'b'}`, 0.03, [xBot, 0, z], [xTop, h, z], M.steelDark, 12);
    cylBetween(g, `${n}_handrail_${z === z0 ? 'a' : 'b'}`, 0.022, [xBot, 0.95, z], [xTop, h + 0.95, z], M.steelLight, 12);
    cylBetween(g, `${n}_handrail_post_${z === z0 ? 'a' : 'b'}`, 0.022, [xBot, 0, z], [xBot, 0.95, z], M.steelLight, 12);
  }
  return g;
}
function ladder(p, n, x, z, h) {
  const g = grp(p, n);
  for (const s of [1, -1]) cylY(g, `${n}_rail_${s > 0 ? 'a' : 'b'}`, 0.022, h + 1.0, M.steelLight, x, (h + 1.0) / 2, z + s * 0.22, 12);
  for (let y = 0.3, i = 1; y < h; y += 0.3, i++) cylBetween(g, `${n}_rung_${i}`, 0.016, [x, y, z - 0.22], [x, y, z + 0.22], M.steelLight, 10);
  return g;
}
// seven-segment station numbers
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc' };
function digit(p, n, d, cx, cy, z, dw = 0.12, dh = 0.22, t = 0.025) {
  const pos = { a: [0, dh / 2, 1], d: [0, -dh / 2, 1], g: [0, 0, 1], f: [-dw / 2, dh / 4, 0], b: [dw / 2, dh / 4, 0], e: [-dw / 2, -dh / 4, 0], c: [dw / 2, -dh / 4, 0] };
  for (const s of SEG[d]) { const [x, y, hor] = pos[s]; box(p, `${n}_seg_${s}`, hor ? dw : t, hor ? t : dh / 2, 0.01, M.paper, cx + x, cy + y, z); }
}
const SIGN_NAMES = { 1: 'RAW MATERIAL ARRIVAL', 2: 'GRAVURE PRINTING', 3: 'IMPREGNATION', 4: 'QUALITY CONTROL', 5: 'PRESSING', 6: 'QUALITY CONTROL' };
function signTex(num) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 640; const g = c.getContext('2d');
  g.fillStyle = '#1d1f20'; g.fillRect(0, 0, 1024, 640);
  g.fillStyle = '#b3342b'; g.fillRect(0, 0, 1024, 70);
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = '700 360px "Barlow Condensed","Arial Narrow",Arial,sans-serif'; g.fillText(String(num).padStart(2, '0'), 512, 440);
  g.font = '600 92px "Barlow Condensed","Arial Narrow",Arial,sans-serif'; g.fillText(SIGN_NAMES[num], 512, 575, 960);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
}
function sign(p, n, num, x, z) {
  const g = grp(p, n), tex = signTex(num);
  const face = new T.MeshStandardMaterial({ name: `sign_face_${num}`, map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.5 });
  cylY(g, `${n}_post`, 0.07, 3.4, M.rubber, x, 1.7, z - 0.06, 16);
  box(g, `${n}_plate`, 2.4, 1.54, 0.05, M.rubber, x, 3.4, z);
  mesh(g, `${n}_face`, new T.PlaneGeometry(2.32, 1.46), face, x, 3.4, z + 0.026);
  const back = mesh(g, `${n}_face_back`, new T.PlaneGeometry(2.32, 1.46), face, x, 3.4, z - 0.026); back.rotation.y = Math.PI;
  box(g, `${n}_base`, 0.55, 0.04, 0.55, M.rubber, x, 0.02, z - 0.06);
  return g;
}

function partSign(p, n, title, sub, x, z) {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#1d1f20'; g.fillRect(0, 0, 2048, 512);
  g.fillStyle = '#b3342b'; g.fillRect(0, 0, 2048, 56);
  g.fillStyle = '#ffffff'; g.textBaseline = 'alphabetic'; g.textAlign = 'center';
  g.font = '700 230px "Barlow Condensed","Arial Narrow",Arial,sans-serif'; g.fillText(title, 1024, 270, 1900);
  g.font = '600 150px "Barlow Condensed","Arial Narrow",Arial,sans-serif'; g.fillText(sub, 1024, 460, 1900);
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
  const face = new T.MeshStandardMaterial({ name: `${n}_face`, map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.5 });
  const gr = grp(p, n);
  for (const dx of [-3.0, 3.0]) cylY(gr, `${n}_post_${dx < 0 ? 'a' : 'b'}`, 0.08, 6.2, M.rubber, x + dx, 3.1, z - 0.06, 16);
  box(gr, `${n}_plate`, 7.2, 1.87, 0.05, M.rubber, x, 5.3, z);
  mesh(gr, `${n}_face`, new T.PlaneGeometry(7.06, 1.76), face, x, 5.3, z + 0.026);
  const back = mesh(gr, `${n}_face_back`, new T.PlaneGeometry(7.06, 1.76), face, x, 5.3, z - 0.026); back.rotation.y = Math.PI;
  return gr;
}

/* =======================================================
   FLOOR, MARKINGS, SERVICES
   ======================================================= */
const site = grp(model, 'site');
box(site, 'yard_asphalt', 134, 0.15, 56, std('yard_asphalt', 0xb4b5b3, 0.95), -7, -0.085, 14);
box(site, 'aisle_line_operator', 50, 0.004, 0.1, M.marking, -10.2, 0.002, 3.4);
box(site, 'aisle_line_drive', 36, 0.004, 0.1, M.marking, -3.2, 0.002, -3.4);
for (const [i, x] of [-15.2, -4.6, 15.2, 20.6, 19.6 + OFF].entries())
  box(site, `zone_line_${i + 1}`, 0.1, 0.004, 6.8, M.marking, x, 0.002, 0);
{ // pallet buffer bay between the parts + press feed pallet spot
  const bay = (n, x, z, w, d) => { for (const s of [1, -1]) { box(site, `${n}_edge_x_${s > 0 ? 'a' : 'b'}`, 0.08, 0.004, d, M.marking, x + s * w / 2, 0.003, z); box(site, `${n}_edge_z_${s > 0 ? 'a' : 'b'}`, w, 0.004, 0.08, M.marking, x, 0.003, z + s * d / 2); } };
  bay('buffer_bay', 20.0, 11.5, 3.0, 2.5); bay('press_feed_bay', 15.5 - 5.2 + OFF, 3.0, 3.0, 2.5); bay('board_feed_bay', 25.6, 3.0, 3.0, 2.5);
}
partSign(site, 'hangar_sign_1', 'HANGAR-1', '01 · 02 · 03 · 04', -6, -5.6);
partSign(site, 'hangar_sign_2', 'HANGAR-2', '05 · 06', 20 + OFF, -5.6);
const tray = grp(site, 'cable_tray'), TX0 = -18, TX1 = 15, TL = TX1 - TX0, TC = (TX0 + TX1) / 2;
box(tray, 'tray_base', TL, 0.02, 0.4, M.steel, TC, 3.3, -3.8);
box(tray, 'tray_lip_inner', TL, 0.1, 0.02, M.steel, TC, 3.35, -3.6);
box(tray, 'tray_lip_outer', TL, 0.1, 0.02, M.steel, TC, 3.35, -4.0);
for (let i = 0; i < 3; i++) cylX(tray, `tray_cable_${i + 1}`, 0.025, TL, M.rubber, TC, 3.335, -3.72 - i * 0.08, 10);
for (let i = 0; i <= 8; i++) {
  const x = TX0 + 0.2 + i * (TL - 0.4) / 8;
  box(tray, `tray_support_post_${i + 1}`, 0.1, 3.29, 0.1, M.steelDark, x, 1.645, -4.1);
  box(tray, `tray_support_arm_${i + 1}`, 0.1, 0.06, 0.5, M.steelDark, x, 3.26, -3.85);
}

/* =======================================================
   01 — RAW MATERIAL ARRIVAL
   ======================================================= */
const s1 = grp(model, 'station_01_raw_material_arrival');
sign(s1, 'sign_01', 1, -21.3, 3.0);

const tk = grp(s1, 'delivery_truck', -30, 0, -4.6);
// --- wheels: lathed tyres with rounded shoulders, dual rear axles
function tyreGeo(wd) {
  const h = wd / 2, pts = [[0.29, -h + 0.01], [0.44, -h], [0.495, -h + 0.02], [0.52, -h + 0.07], [0.52, h - 0.07], [0.495, h - 0.02], [0.44, h], [0.29, h - 0.01]];
  const g = new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), 56); g.rotateX(Math.PI / 2); return g;
}
const tyreSingle = tyreGeo(0.32), tyreDual = tyreGeo(0.27), nutG = new T.CylinderGeometry(0.018, 0.018, 0.03, 6);
function wheel(n, x, z, geo, wd, outer) {
  const wg = grp(tk, n);
  mesh(wg, n + '_tyre', geo, M.rubber, x, 0.52, z);
  cylZ(wg, n + '_rim', 0.3, wd - 0.03, M.steelLight, x, 0.52, z, 40);
  if (outer) {
    const fz = z + outer * (wd / 2 - 0.01);
    cylZ(wg, n + '_hub_cap', 0.11, 0.06, M.steelDark, x, 0.52, fz, 24);
    for (let k = 0; k < 8; k++) {
      const an = k * Math.PI / 4, m = mesh(wg, n + '_nut_' + (k + 1), nutG, M.steelLight, x + Math.cos(an) * 0.17, 0.52 + Math.sin(an) * 0.17, fz);
      m.rotation.x = Math.PI / 2;
    }
  }
}
cylZ(tk, 'front_axle', 0.06, 1.8, M.steelDark, 3.4, 0.52, 0, 16);
for (const sd of [1, -1]) wheel('wheel_front_' + (sd > 0 ? 'right' : 'left'), 3.4, sd * 1.03, tyreSingle, 0.32, sd);
for (const [i, wx] of [-1.6, -2.7].entries()) {
  cylZ(tk, 'rear_axle_' + (i + 1), 0.07, 2.2, M.steelDark, wx, 0.52, 0, 16);
  cylZ(tk, 'rear_diff_' + (i + 1), 0.2, 0.35, M.steelDark, wx, 0.52, 0, 24);
  for (const sd of [1, -1]) {
    const side = sd > 0 ? 'right' : 'left';
    wheel('wheel_rear_' + (i + 1) + '_' + side + '_inner', wx, sd * 0.81, tyreDual, 0.27, 0);
    wheel('wheel_rear_' + (i + 1) + '_' + side + '_outer', wx, sd * 1.1, tyreDual, 0.27, sd);
  }
}
for (const sd of [1, -1]) rbox(tk, 'chassis_rail_' + (sd > 0 ? 'right' : 'left'), 8.3, 0.28, 0.1, 0.02, M.steelDark, -0.05, 0.92, sd * 0.45);
// --- cab: side profile with raked windscreen, extruded across the width with rounded edges
const CB = 0.07, CX = 2.3, CY = 1.1, CW = 2.45;
const cabShape = new T.Shape();
cabShape.moveTo(CB + 0.05, CB);
cabShape.lineTo(2.2 - CB - 0.08, CB);
cabShape.quadraticCurveTo(2.2 - CB, CB, 2.2 - CB, CB + 0.08);
cabShape.lineTo(2.2 - CB, 1.0);
cabShape.lineTo(2.1 - CB, 1.9);
cabShape.quadraticCurveTo(2.07 - CB, 2.15 - CB, 1.75, 2.15 - CB);
cabShape.lineTo(0.2, 2.15 - CB);
cabShape.quadraticCurveTo(CB, 2.15 - CB, CB, 1.95);
cabShape.lineTo(CB, CB + 0.05);
cabShape.quadraticCurveTo(CB, CB, CB + 0.05, CB);
const cabGeo = new T.ExtrudeGeometry(cabShape, { depth: CW - 2 * CB, bevelEnabled: true, bevelThickness: CB, bevelSize: CB, bevelSegments: 5, curveSegments: 16 });
cabGeo.translate(0, 0, -(CW - 2 * CB) / 2);
rbox(tk, 'cab_shell_lower', 2.2, 1.0, CW, 0.08, M.paint, CX + 1.1, CY + 0.5, 0);
rbox(tk, 'cab_shell_upper', 2.12, 1.1, CW, 0.16, M.paint, CX + 1.06, CY + 1.5, 0);
// windscreen follows the rake (outer surface line ≈ (2.2,1.007) → (2.1,1.957))
const rake = Math.atan2(0.1, 0.95), nx = Math.cos(rake), ny = Math.sin(rake);
rbox(tk, 'cab_windscreen', 0.02, 0.74, 2.1, 0.008, M.glass, CX + 2.145 + 0.012 * nx, CY + 1.525 + 0.012 * ny, 0, rake);
rbox(tk, 'cab_windscreen_seal', 0.012, 0.8, 2.18, 0.006, M.rubber, CX + 2.145 + 0.004 * nx, CY + 1.525 + 0.004 * ny, 0, rake);
for (const sd of [1, -1]) { const w = box(tk, 'wiper_' + (sd > 0 ? 'right' : 'left'), 0.02, 0.55, 0.02, M.steelDark, CX + 2.2, CY + 1.25, sd * 0.45, rake); w.rotation.x = sd * 1.1; }
const winShape = new T.Shape();
winShape.moveTo(1.08, 1.22); winShape.lineTo(2.02, 1.22); winShape.lineTo(1.95, 1.84);
winShape.quadraticCurveTo(1.93, 1.9, 1.86, 1.9); winShape.lineTo(1.14, 1.9); winShape.quadraticCurveTo(1.08, 1.9, 1.08, 1.84); winShape.lineTo(1.08, 1.22);
const winGeo = new T.ExtrudeGeometry(winShape, { depth: 0.012, bevelEnabled: false, curveSegments: 8 });
for (const sd of [1, -1]) {
  const side = sd > 0 ? 'right' : 'left', fz = sd * (CW / 2 + 0.001);
  mesh(tk, 'cab_side_window_' + side, winGeo, M.glass, CX, CY, sd > 0 ? fz : fz - 0.012);
  box(tk, 'cab_door_seam_front_' + side, 0.012, 1.7, 0.006, M.steelDark, CX + 2.06, CY + 1.0, sd * (CW / 2 + 0.002));
  box(tk, 'cab_door_seam_rear_' + side, 0.012, 1.85, 0.006, M.steelDark, CX + 0.98, CY + 1.05, sd * (CW / 2 + 0.002));
  rbox(tk, 'cab_door_handle_' + side, 0.18, 0.04, 0.03, 0.012, M.steelLight, CX + 1.2, CY + 1.08, sd * (CW / 2 + 0.012));
  rbox(tk, 'cab_step_box_' + side, 0.46, 0.4, 0.22, 0.04, M.steelDark, CX + 0.3, 0.92, sd * 1.12);
  rbox(tk, 'cab_step_tread_upper_' + side, 0.44, 0.03, 0.2, 0.01, M.steelLight, CX + 0.3, 1.13, sd * 1.14);
  rbox(tk, 'cab_step_tread_lower_' + side, 0.44, 0.03, 0.2, 0.01, M.steelLight, CX + 0.3, 0.74, sd * 1.14);
  cylBetween(tk, 'cab_grab_handle_' + side, 0.018, [CX + 0.9, CY + 0.4, sd * (CW / 2 + 0.05)], [CX + 0.9, CY + 1.5, sd * (CW / 2 + 0.05)], M.steelLight, 10);
  // front fender: open half-shell over the steer wheel
  const fend = mesh(tk, 'front_fender_' + side, new T.CylinderGeometry(0.6, 0.6, 0.4, 40, 1, true, Math.PI / 2, Math.PI), M.paint, 3.4, 0.52, sd * 1.03);
  fend.rotation.x = Math.PI / 2;
  cylBetween(tk, 'mirror_arm_upper_' + side, 0.015, [CX + 2.0, CY + 1.8, sd * CW / 2], [CX + 2.3, CY + 1.75, sd * 1.52], M.steelDark, 10);
  cylBetween(tk, 'mirror_arm_lower_' + side, 0.015, [CX + 2.05, CY + 1.15, sd * CW / 2], [CX + 2.3, CY + 1.3, sd * 1.52], M.steelDark, 10);
  rbox(tk, 'mirror_' + side, 0.07, 0.45, 0.2, 0.03, M.steelDark, CX + 2.3, CY + 1.52, sd * 1.55);
  rbox(tk, 'mirror_glass_' + side, 0.005, 0.4, 0.16, 0.002, M.glass, CX + 2.264, CY + 1.52, sd * 1.55);
  rbox(tk, 'headlight_housing_' + side, 0.05, 0.22, 0.46, 0.04, M.steelDark, CX + 2.2 + 0.01, CY + 0.28, sd * 0.84);
  rbox(tk, 'headlight_lens_' + side, 0.02, 0.17, 0.4, 0.03, M.glass, CX + 2.2 + 0.035, CY + 0.28, sd * 0.84);
  cylX(tk, 'fog_light_' + side, 0.05, 0.04, M.glass, 4.6, 0.88, sd * 0.95, 20);
}
rbox(tk, 'cab_grille', 0.03, 0.62, 1.4, 0.03, M.steelDark, CX + 2.21, CY + 0.66, 0);
for (let i = 0; i < 5; i++) rbox(tk, 'cab_grille_bar_' + (i + 1), 0.02, 0.04, 1.34, 0.01, M.steelLight, CX + 2.23, CY + 0.42 + i * 0.12, 0);
rbox(tk, 'cab_badge', 0.02, 0.07, 0.36, 0.02, M.steelLight, CX + 2.235, CY + 1.0, 0);
rbox(tk, 'cab_bumper', 0.3, 0.38, 2.5, 0.08, M.steelDark, 4.46, 0.95, 0);
rbox(tk, 'cab_bumper_step', 0.2, 0.03, 0.6, 0.01, M.steelLight, 4.52, 1.155, 0);
// roof deflector and visor
const defShape = new T.Shape();
defShape.moveTo(0, 0); defShape.lineTo(1.7, 0); defShape.quadraticCurveTo(1.55, 0.35, 0.6, 0.55); defShape.lineTo(0, 0.58); defShape.lineTo(0, 0);
const defGeo = new T.ExtrudeGeometry(defShape, { depth: 2.2, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 16 });
defGeo.translate(0, 0, -1.1);
mesh(tk, 'roof_deflector', defGeo, M.paint, CX + 0.1, CY + 2.15, 0);
rbox(tk, 'sun_visor', 0.34, 0.05, 2.3, 0.02, M.steelDark, CX + 2.12, CY + 2.12, 0, -0.15);
for (let i = 0; i < 5; i++) rbox(tk, 'roof_marker_light_' + (i + 1), 0.04, 0.04, 0.1, 0.015, M.glass, CX + 2.25, CY + 2.07, -0.6 + i * 0.3);
// under-cab and chassis equipment
const tank = mesh(tk, 'fuel_tank', new T.CapsuleGeometry(0.3, 0.7, 8, 32), M.steelLight, 1.3, 0.78, 0.85); tank.rotation.z = Math.PI / 2;
for (const dx of [-0.25, 0.25]) { const st = mesh(tk, 'fuel_tank_strap_' + (dx < 0 ? 'rear' : 'front'), new T.TorusGeometry(0.305, 0.012, 6, 40), M.steelDark, 1.3 + dx, 0.78, 0.85); st.rotation.y = Math.PI / 2; }
cylY(tk, 'fuel_filler_cap', 0.06, 0.04, M.steelDark, 1.3, 1.1, 0.85, 16);
const air = mesh(tk, 'air_tank', new T.CapsuleGeometry(0.14, 0.6, 6, 24), M.steel, 1.3, 0.8, -0.85); air.rotation.z = Math.PI / 2;
rbox(tk, 'battery_box', 0.6, 0.35, 0.4, 0.04, M.steelDark, 0.4, 0.78, -0.85);
cylY(tk, 'exhaust_stack', 0.075, 2.0, M.steelLight, CX - 0.12, 2.35, 1.0, 24);
pipeRun(tk, 'exhaust_downpipe', 0.075, [[CX - 0.12, 1.35, 1.0], [CX - 0.12, 0.85, 1.0], [CX - 0.12, 0.85, 0.5]], M.steelLight);
rbox(tk, 'exhaust_heat_shield', 0.04, 0.9, 0.2, 0.02, M.steelDark, CX - 0.2, 2.2, 1.0);
for (const sd of [1, -1]) {
  const side = sd > 0 ? 'right' : 'left';
  for (const [k, y] of [0.72, 0.95].entries()) rbox(tk, 'side_guard_' + side + '_' + (k + 1), 1.9, 0.07, 0.035, 0.015, M.steelLight, 0.55, y, sd * 1.2);
  rbox(tk, 'rear_fender_' + side, 2.4, 0.05, 0.62, 0.02, M.steelDark, -2.15, 1.13, sd * 0.95);
  rbox(tk, 'mud_flap_' + side, 0.012, 0.45, 0.55, 0.01, M.rubber, -3.3, 0.72, sd * 0.95);
  rbox(tk, 'rear_light_' + side, 0.05, 0.14, 0.4, 0.03, M.glass, -4.4, 1.05, sd * 0.92);
}
rbox(tk, 'underrun_bar', 0.14, 0.14, 2.3, 0.04, M.steelDark, -4.2, 0.52, 0);
for (const sd of [1, -1]) rbox(tk, 'underrun_hanger_' + (sd > 0 ? 'r' : 'l'), 0.08, 0.48, 0.08, 0.02, M.steelDark, -4.2, 0.82, sd * 0.45);
rbox(tk, 'licence_plate', 0.01, 0.12, 0.52, 0.01, M.paper, -4.39, 0.82, 0);
// --- flatbed body with dropsides
rbox(tk, 'bed_deck', 6.4, 0.14, 2.5, 0.03, M.steelDark, -1.15, 1.28, 0);
rbox(tk, 'bed_headboard', 0.1, 1.1, 2.5, 0.03, M.paint, 2.1, 1.9, 0);
for (let i = 0; i < 4; i++) rbox(tk, 'headboard_rib_' + (i + 1), 0.03, 1.05, 0.06, 0.01, M.steelLight, 2.03, 1.9, -0.9 + i * 0.6);
for (const sd of [1, -1]) {
  const side = sd > 0 ? 'right' : 'left';
  rbox(tk, 'dropside_' + side, 6.3, 0.4, 0.04, 0.015, M.steelLight, -1.15, 1.55, sd * 1.23);
  for (let i = 0; i < 8; i++) rbox(tk, 'dropside_rib_' + side + '_' + (i + 1), 0.05, 0.4, 0.02, 0.008, M.steel, -4.1 + i * 0.84, 1.55, sd * 1.255);
  rbox(tk, 'dropside_top_rail_' + side, 6.3, 0.04, 0.06, 0.015, M.steel, -1.15, 1.77, sd * 1.23);
}
rbox(tk, 'tailboard', 0.04, 0.4, 2.5, 0.015, M.steelLight, -4.33, 1.55, 0);
for (let i = 0; i < 8; i++) rbox(tk, 'bed_crossmember_' + (i + 1), 0.08, 0.12, 2.3, 0.015, M.steelDark, -4.1 + i * 0.85, 1.15, 0);
for (const [i, rx] of [-3.7, -2.44, -1.18, 0.08, 1.34].entries()) {
  const ry = 1.35 + 0.62 + 0.001;
  paperRoll(tk, 'truck_roll_' + (i + 1), rx, ry, 0);
  for (const dx of [-0.47, 0.47]) rbox(tk, 'truck_roll_' + (i + 1) + '_chock_' + (dx < 0 ? 'rear' : 'front'), 0.14, 0.12, 1.9, 0.03, M.rubber, rx + dx, 1.41, 0);
  for (const sz of [0.6, -0.6]) {
    const st = mesh(tk, 'truck_roll_' + (i + 1) + '_strap_' + (sz > 0 ? 'r' : 'l'), new T.TorusGeometry(0.632, 0.01, 6, 48, Math.PI), M.steelDark, rx, ry, sz);
    for (const dx of [-0.632, 0.632]) box(tk, st.name + '_' + (dx < 0 ? 'rear' : 'front') + '_leg', 0.02, 0.62, 0.04, M.steelDark, rx + dx, 1.66, sz);
  }
}

// unloaded roll pyramid (3 + 2)
const stack = grp(s1, 'roll_stack');
[-25.2, -23.95, -22.7].forEach((x, i) => paperRoll(stack, `roll_bottom_${i + 1}`, x, 0.621, 0));
[-24.575, -23.325].forEach((x, i) => paperRoll(stack, `roll_top_${i + 1}`, x, 1.692, 0));
box(stack, 'stack_chock_rear', 0.16, 0.14, 1.9, M.rubber, -25.67, 0.07, 0);
box(stack, 'stack_chock_front', 0.16, 0.14, 1.9, M.rubber, -22.23, 0.07, 0);

// roll-handling forklift with core ram (origin = mast base, forks face -z)
const fl = grp(s1, 'forklift_roll_handler', -28.5, 0, 3.7);
rbox(fl, 'fl_chassis', 1.2, 0.6, 2.1, 0.08, M.paint, 0, 0.6, 1.3);
rbox(fl, 'fl_counterweight', 1.22, 0.75, 0.5, 0.12, M.steelDark, 0, 0.78, 2.3);
rbox(fl, 'fl_seat', 0.5, 0.12, 0.5, 0.05, M.rubber, 0, 1.0, 1.55);
rbox(fl, 'fl_seat_back', 0.5, 0.5, 0.1, 0.04, M.rubber, 0, 1.3, 1.82);
cylBetween(fl, 'fl_steering_column', 0.035, [0, 0.9, 0.75], [0, 1.35, 1.05], M.steelDark, 12);
{ const sw = mesh(fl, 'fl_steering_wheel', new T.TorusGeometry(0.17, 0.02, 8, 32), M.rubber, 0, 1.37, 1.07); sw.rotation.x = -1.0; }
for (const [px, pz] of [[0.52, 0.72], [-0.52, 0.72], [0.52, 2.0], [-0.52, 2.0]]) cylY(fl, 'fl_guard_post_' + (px > 0 ? 'r' : 'l') + (pz < 1 ? 'f' : 'b'), 0.035, 1.35, M.steelDark, px, 1.575, pz, 12);
rbox(fl, 'fl_overhead_guard', 1.14, 0.05, 1.4, 0.02, M.steelDark, 0, 2.27, 1.36);
for (const [wx, wz, r] of [[0.52, 0.45, 0.32], [-0.52, 0.45, 0.32], [0.52, 2.05, 0.26], [-0.52, 2.05, 0.26]]) cylX(fl, 'fl_wheel_' + (wx > 0 ? 'r' : 'l') + (wz < 1 ? 'f' : 'b'), r, 0.26, M.rubber, wx, r, wz, 32);
for (const sd of [1, -1]) box(fl, 'fl_mast_' + (sd > 0 ? 'r' : 'l'), 0.1, 2.9, 0.14, M.steelDark, sd * 0.38, 1.5, 0.12);
// seated operator
const op = grp(fl, 'fl_operator');
const skin = std('operator_skin', 0xd6b497, 0.7), cloth = std('operator_workwear', 0x34475a, 0.85);
rbox(op, 'op_pelvis', 0.36, 0.18, 0.36, 0.07, cloth, 0, 1.15, 1.58);
rbox(op, 'op_torso', 0.4, 0.52, 0.24, 0.09, M.paint, 0, 1.49, 1.66);
cylY(op, 'op_neck', 0.05, 0.1, skin, 0, 1.79, 1.64, 12);
mesh(op, 'op_head', new T.SphereGeometry(0.105, 24, 16), skin, 0, 1.92, 1.63);
mesh(op, 'op_hard_hat', new T.SphereGeometry(0.12, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.paper, 0, 1.95, 1.63);
cylY(op, 'op_hard_hat_brim', 0.15, 0.015, M.paper, 0, 1.955, 1.61, 24);
for (const sd of [1, -1]) {
  const s = sd > 0 ? 'r' : 'l', x = sd * 0.1;
  cylBetween(op, 'op_thigh_' + s, 0.07, [x, 1.15, 1.58], [x, 1.14, 1.18], cloth, 12);
  cylBetween(op, 'op_shin_' + s, 0.055, [x, 1.14, 1.18], [x, 0.96, 1.0], cloth, 12);
  rbox(op, 'op_boot_' + s, 0.11, 0.08, 0.24, 0.03, M.rubber, x, 0.94, 0.94);
  cylBetween(op, 'op_upper_arm_' + s, 0.05, [sd * 0.23, 1.7, 1.66], [sd * 0.25, 1.46, 1.42], M.paint, 12);
  cylBetween(op, 'op_forearm_' + s, 0.042, [sd * 0.25, 1.46, 1.42], [sd * 0.15, 1.42, 1.12], M.paint, 12);
  mesh(op, 'op_hand_' + s, new T.SphereGeometry(0.045, 12, 8), skin, sd * 0.15, 1.42, 1.1);
}
box(fl, 'fl_mast_cross', 0.86, 0.1, 0.1, M.steelDark, 0, 2.9, 0.12);
const car = grp(fl, 'fl_carriage');
box(car, 'fl_carriage_plate', 0.8, 0.5, 0.06, M.steel, 0, 0, 0.02);
cylZ(car, 'fl_core_ram', 0.06, 2.3, M.steelLight, 0, 0, -1.3, 20);
cylZ(car, 'fl_ram_collar', 0.12, 0.08, M.steelDark, 0, 0, -0.06, 24);
for (const sd of [1, -1]) cylBetween(fl, 'fl_lift_cylinder_' + (sd > 0 ? 'r' : 'l'), 0.04, [sd * 0.25, 0.4, 0.2], [sd * 0.25, 2.8, 0.2], M.steelLight, 12);

// unwind stand
const UX = -18, UY = WEB_Y + 0.75 + 0.011;
const uw = grp(s1, 'unwind_stand');
for (const s of [1, -1]) {
  const side = s > 0 ? 'operator' : 'drive', z = s * FZ, lh = Math.hypot(0.7, UY), la = Math.atan(0.7 / UY);
  box(uw, `a_frame_leg_in_${side}`, 0.14, lh, 0.14, M.steel, UX - 0.35, UY / 2, z, -la);
  box(uw, `a_frame_leg_out_${side}`, 0.14, lh, 0.14, M.steel, UX + 0.35, UY / 2, z, la);
  box(uw, `a_frame_foot_${side}`, 1.8, 0.12, 0.3, M.steelDark, UX, 0.06, z);
  box(uw, `a_frame_bearing_${side}`, 0.32, 0.32, 0.2, M.steelDark, UX, UY, z);
  cylZ(uw, `chuck_${side}`, 0.15, 0.12, M.steelLight, UX, UY, s * 1.08, 32);
}
for (const dx of [-0.6, 0.6]) box(uw, `a_frame_floor_tie_${dx < 0 ? 'in' : 'out'}`, 0.12, 0.1, 2 * FZ, M.steelDark, UX + dx, 0.05, 0);
paperRoll(uw, 'unwind_roll', UX, UY, 0, 0.75);
cylZ(uw, 'unwind_shaft', 0.07, 2 * FZ + 0.5, M.steelLight, UX, UY, 0, 20);
cylZ(uw, 'brake_disc', 0.38, 0.03, M.steelLight, UX, UY, -(FZ + 0.3), 48);
box(uw, 'brake_caliper', 0.15, 0.2, 0.12, M.steelDark, UX + 0.36, UY, -(FZ + 0.3));
guideStand(uw, 'unwind_lead_stand', UX + 1.1);
const eg = grp(s1, 'web_edge_guide'), EX = -16.3;
for (const s of [1, -1]) {
  const side = s > 0 ? 'operator' : 'drive';
  cylY(eg, `edge_sensor_post_${side}`, 0.03, 1.26, M.steelDark, EX, 0.63, s * 1.12, 12);
  box(eg, `edge_sensor_jaw_top_${side}`, 0.14, 0.04, 0.22, M.steelDark, EX, WEB_Y + 0.07, s * 1.0);
  box(eg, `edge_sensor_jaw_bottom_${side}`, 0.14, 0.04, 0.22, M.steelDark, EX, WEB_Y - 0.07, s * 1.0);
  box(eg, `edge_sensor_back_${side}`, 0.14, 0.18, 0.04, M.steelDark, EX, WEB_Y, s * 1.12);
}
guideStand(model, 'guide_stand_01_02', -14.0);

/* =======================================================
   02 — PRINTING (rotogravure)
   ======================================================= */
const s2 = grp(model, 'station_02_printing'), PX = -10, GR = 0.4, GY = WEB_Y - GR - 0.011, IR = 0.28, IY = WEB_Y + IR + 0.011;
sign(s2, 'sign_02', 2, PX, 3.1);
box(s2, 'press_base', 3.6, 0.45, 3.0, M.steelDark, PX, 0.225, 0);
sidePlates(s2, 'print_frame', 3.2, 2.7, PX, 0.45);
for (const dx of [-1.4, 1.4]) cylZ(s2, `frame_tie_bar_${dx < 0 ? 'in' : 'out'}`, 0.06, 2 * FZ, M.steelLight, PX + dx, 3.0, 0, 20);
roller(s2, 'gravure_cylinder', GR, PX, GY, { len: W + 0.3 });
for (let i = 0; i < 11; i++) cylZ(s2, `gravure_engraving_band_${i + 1}`, GR + 0.002, 0.07, M.steelDark, PX, GY, -1.0 + i * 0.2, 64);
roller(s2, 'impression_roller', IR, PX, IY, { mat: M.rubber, len: W + 0.1, bearings: false, bz: 1.2 });
for (const s of [1, -1]) {
  const side = s > 0 ? 'operator' : 'drive', z = s * 1.2;
  cylBetween(s2, `impression_arm_${side}`, 0.06, [PX - 0.9, 2.2, z], [PX, IY, z], M.steelDark, 16);
  cylZ(s2, `impression_pivot_${side}`, 0.07, 0.2, M.steelLight, PX - 0.9, 2.2, z, 20);
  cylBetween(s2, `impression_pneumatic_barrel_${side}`, 0.065, [PX + 0.35, 2.95, z], [PX + 0.18, 2.3, z], M.steel, 20);
  cylBetween(s2, `impression_pneumatic_rod_${side}`, 0.025, [PX + 0.18, 2.3, z], [PX + 0.05, IY + 0.1, z], M.steelLight, 12);
}
const pan = grp(s2, 'ink_pan');
box(pan, 'ink_pan_floor', 1.3, 0.03, W + 0.4, M.steel, PX, 0.465, 0);
for (const s of [1, -1]) {
  box(pan, `ink_pan_wall_x_${s > 0 ? 'out' : 'in'}`, 0.03, 0.27, W + 0.4, M.steel, PX + s * 0.65, 0.585, 0);
  box(pan, `ink_pan_wall_z_${s > 0 ? 'operator' : 'drive'}`, 1.3, 0.27, 0.03, M.steel, PX, 0.585, s * (W / 2 + 0.2));
}
box(pan, 'ink_level', 1.26, 0.14, W + 0.34, M.ink, PX, 0.55, 0);
box(s2, 'doctor_blade', 0.35, 0.012, W + 0.2, M.steelLight, PX + 0.52, 0.9, 0, 0.6);
box(s2, 'doctor_blade_holder', 0.14, 0.1, W + 0.3, M.steelDark, PX + 0.68, 1.01, 0, 0.6);
for (const s of [1, -1]) box(s2, `doctor_blade_mount_${s > 0 ? 'operator' : 'drive'}`, 0.08, 0.08, 0.1, M.steelDark, PX + 0.72, 1.05, s * 1.25);
cylY(s2, 'ink_drum', 0.3, 0.9, M.steel, PX - 1.6, 0.45, 2.1, 32);
cylY(s2, 'ink_drum_lid', 0.31, 0.03, M.steelDark, PX - 1.6, 0.915, 2.1, 32);
box(s2, 'ink_pump', 0.4, 0.3, 0.3, M.steelDark, PX - 0.9, 0.15, 2.1);
pipeRun(s2, 'ink_supply_line', 0.03, [[PX - 1.3, 0.2, 2.1], [PX - 1.1, 0.2, 2.1]]);
pipeRun(s2, 'ink_feed_line', 0.03, [[PX - 0.9, 0.3, 2.1], [PX - 0.9, 0.8, 2.1], [PX - 0.5, 0.8, 2.1], [PX - 0.5, 0.8, 1.1], [PX - 0.5, 0.66, 1.1]]);
box(s2, 'drive_gearbox', 0.5, 0.5, 0.35, M.steel, PX, GY, -(FZ + 0.35));
box(s2, 'drive_pedestal', 0.55, GY - 0.25, 0.9, M.steelDark, PX, (GY - 0.25) / 2, -(FZ + 0.62));
motor(s2, 'drive_motor', PX, GY, -(FZ + 0.525), { r: 0.22, len: 0.6 });
roller(s2, 'print_infeed_idler', 0.1, PX - 1.4, idlerY(0.1));
roller(s2, 'print_outfeed_idler', 0.1, PX + 1.4, idlerY(0.1));
// drying hood
const hood = grp(s2, 'drying_hood'), HX = PX + 3.3;
box(hood, 'hood_upper', 2.0, 0.5, W + 0.6, M.steel, HX, WEB_Y + 0.45, 0);
box(hood, 'hood_lower', 2.0, 0.45, W + 0.6, M.steel, HX, WEB_Y - 0.425, 0);
for (let i = 0; i < 5; i++) box(hood, `hood_air_nozzle_${i + 1}`, 0.06, 0.04, W, M.steelDark, HX - 0.8 + i * 0.4, WEB_Y + 0.18, 0);
for (const dx of [-0.9, 0.9]) for (const s of [1, -1]) {
  const tag = `${dx < 0 ? 'in' : 'out'}_${s > 0 ? 'operator' : 'drive'}`;
  box(hood, `hood_leg_${tag}`, 0.1, 0.7, 0.1, M.steelDark, HX + dx, 0.35, s * 1.25);
  box(hood, `hood_post_${tag}`, 0.08, 0.4, 0.08, M.steelDark, HX + dx, WEB_Y, s * 1.25);
}
cylY(hood, 'hood_exhaust_riser', 0.18, 1.3, M.steel, HX, WEB_Y + 1.35, -0.6, 32);
pipeRun(hood, 'hood_exhaust_duct', 0.18, [[HX, WEB_Y + 2.0, -0.6], [HX, WEB_Y + 2.0, -3.0]]);
box(hood, 'hood_fan_housing', 0.6, 0.45, 0.6, M.steelDark, HX + 0.5, WEB_Y + 0.925, 0.5);
cylY(hood, 'hood_fan_motor', 0.15, 0.3, M.steel, HX + 0.5, WEB_Y + 1.3, 0.5, 24);
platform(s2, 'print_operator_platform', PX - 1.5, PX + 1.5, 1.7, 2.7, 0.6, ['z1', 'x1']);
stairs(s2, 'print_platform_stairs', PX - 1.5, 1.72, 2.68, 0.6, -1);
cabinet(s2, 'print_control_cabinet', HX - 0.4, 2.55);
guideStand(model, 'guide_stand_02_03', -3.65);

/* =======================================================
   03 — IMPREGNATION (melamine bath, dosing, drying)
   ======================================================= */
const s3 = grp(model, 'station_03_impregnation');
sign(s3, 'sign_03', 3, 0, 3.0);
const bath = grp(s3, 'resin_bath');
box(bath, 'bath_floor', 3.0, 0.04, 2.6, M.steel, 0, 0.4, 0);
for (const s of [1, -1]) {
  box(bath, `bath_wall_x_${s > 0 ? 'out' : 'in'}`, 0.08, 0.82, 2.6, M.steel, s * 1.46, 0.79, 0);
  box(bath, `bath_wall_z_${s > 0 ? 'operator' : 'drive'}`, 3.0, 0.82, 0.08, M.steel, 0, 0.79, s * 1.26);
  box(bath, `bath_rim_z_${s > 0 ? 'operator' : 'drive'}`, 3.08, 0.03, 0.12, M.steelDark, 0, 1.215, s * 1.28);
  box(bath, `bath_rim_x_${s > 0 ? 'out' : 'in'}`, 0.1, 0.03, 2.64, M.steelDark, s * 1.49, 1.215, 0);
}
for (const lx of [-1.3, 1.3]) for (const lz of [-1.1, 1.1])
  box(bath, `bath_leg_${lx < 0 ? 'in' : 'out'}_${lz < 0 ? 'drive' : 'operator'}`, 0.12, 0.38, 0.12, M.steelDark, lx, 0.19, lz);
box(bath, 'resin_level', 2.84, 0.63, 2.44, M.resin, 0, 0.735, 0);
roller(bath, 'immersion_roller', 0.25, 0, 0.721, { mat: M.steelLight, bz: 1.45 });
for (const s of [1, -1]) {
  const side = s > 0 ? 'exit' : 'entry', ry = WEB_Y - 0.01 - 0.12 - 0.001;
  roller(bath, `bath_${side}_roller`, 0.12, s * 1.6, ry, { bz: FZ + 0.1 });
  for (const z of [1, -1]) box(bath, `bath_${side}_bracket_${z > 0 ? 'operator' : 'drive'}`, 0.1, ry - 0.08, 0.1, M.steel, s * 1.6, (ry - 0.08) / 2, z * (FZ + 0.1));
}
// resin supply
const RT = [-1.0, -2.7];
const rt = grp(s3, 'resin_supply_tank');
cylY(rt, 'tank_shell', 0.55, 1.6, M.steelLight, RT[0], 1.3, RT[1], 48);
mesh(rt, 'tank_dome', new T.SphereGeometry(0.55, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.steelLight, RT[0], 2.1, RT[1]);
const cone = mesh(rt, 'tank_cone', new T.ConeGeometry(0.55, 0.3, 48), M.steelLight, RT[0], 0.35, RT[1]); cone.rotation.x = Math.PI;
cylY(rt, 'tank_manway', 0.15, 0.1, M.steelDark, RT[0], 2.68, RT[1], 24);
cylY(rt, 'tank_level_gauge', 0.02, 1.3, M.glass, RT[0] + 0.58, 1.3, RT[1], 12);
for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3 + 0.4; cylY(rt, `tank_leg_${i + 1}`, 0.04, 0.8, M.steelDark, RT[0] + Math.cos(a) * 0.48, 0.4, RT[1] + Math.sin(a) * 0.48, 12); }
box(s3, 'resin_pump', 0.4, 0.3, 0.3, M.steelDark, -0.2, 0.15, -1.9);
pipeRun(s3, 'resin_suction_line', 0.045, [[RT[0], 0.2, RT[1]], [RT[0], 0.15, -1.9], [-0.4, 0.15, -1.9]]);
pipeRun(s3, 'resin_feed_line', 0.045, [[-0.2, 0.3, -1.9], [-0.2, 1.4, -1.9], [-0.2, 1.4, -1.1], [-0.2, 1.1, -1.1]]);
// dosing nip + spray bar
const DX = 2.5;
const dose = grp(s3, 'dosing_unit');
sidePlates(dose, 'dosing_frame', 0.9, 1.9, DX, 0);
roller(dose, 'dosing_nip_lower', 0.18, DX, WEB_Y - 0.191);
roller(dose, 'dosing_nip_upper', 0.18, DX, WEB_Y + 0.191, { mat: M.rubber });
for (const s of [1, -1]) {
  const side = s > 0 ? 'operator' : 'drive';
  cylY(dose, `nip_pneumatic_${side}`, 0.07, 0.4, M.steel, DX, 2.1, s * FZ, 20);
  cylY(dose, `spray_bar_support_${side}`, 0.03, 1.8, M.steelDark, DX - 0.55, 0.9, s * 1.2, 12);
}
box(dose, 'nip_top_beam', 0.2, 0.12, 2 * FZ + 0.12, M.steelDark, DX, 2.36, 0);
cylZ(dose, 'spray_bar', 0.05, 2.5, M.steelLight, DX - 0.55, WEB_Y + 0.45, 0, 20);
for (let i = 0; i < 6; i++) {
  const z = -0.9 + i * 0.36;
  cylY(dose, `spray_nozzle_${i + 1}`, 0.02, 0.08, M.steelDark, DX - 0.55, WEB_Y + 0.38, z, 12);
  mesh(dose, `resin_drip_${i + 1}`, new T.SphereGeometry(0.03, 12, 8), M.resin, DX - 0.55, WEB_Y + (i % 2 ? 0.2 : 0.28), z);
}
box(dose, 'drip_tray', 1.4, 0.04, W + 0.4, M.steel, DX - 0.2, 0.5, 0);
for (const s of [1, -1]) box(dose, `drip_tray_lip_${s > 0 ? 'operator' : 'drive'}`, 1.4, 0.1, 0.03, M.steel, DX - 0.2, 0.55, s * (W / 2 + 0.2));
// drying tunnel
const dry = grp(s3, 'drying_tunnel'), DRX = 7.2, DL = 6.0, DZ = W / 2 + 0.4;
box(dry, 'tunnel_upper_plenum', DL, 0.8, 2 * DZ, M.steel, DRX, WEB_Y + 0.58, 0);
box(dry, 'tunnel_lower_plenum', DL, 0.7, 2 * DZ, M.steel, DRX, WEB_Y - 0.53, 0);
for (const s of [1, -1]) box(dry, `tunnel_side_skirt_${s > 0 ? 'operator' : 'drive'}`, DL, 0.36, 0.04, M.steelDark, DRX, WEB_Y, s * DZ);
for (let i = 0; i < 4; i++) box(dry, `tunnel_window_${i + 1}`, 0.7, 0.35, 0.02, M.glass, DRX - 2.25 + i * 1.5, WEB_Y + 0.58, DZ + 0.011);
for (let i = 1; i < 4; i++) for (const [lvl, y, h] of [['upper', WEB_Y + 0.58, 0.8], ['lower', WEB_Y - 0.53, 0.7]])
  box(dry, `tunnel_panel_seam_${lvl}_${i}`, 0.015, h, 0.01, M.steelDark, DRX - DL / 2 + i * 1.5, y, DZ + 0.006);
for (let i = 0; i < 5; i++) for (const s of [1, -1])
  box(dry, `tunnel_leg_${i + 1}_${s > 0 ? 'operator' : 'drive'}`, 0.12, WEB_Y - 0.88, 0.12, M.steelDark, DRX - DL / 2 + 0.2 + i * (DL - 0.4) / 4, (WEB_Y - 0.88) / 2, s * (DZ - 0.1));
for (const [i, x] of [DRX - 2.0, DRX + 2.0].entries()) {
  cylY(dry, `tunnel_exhaust_stack_${i + 1}`, 0.2, 1.2, M.steel, x, WEB_Y + 1.58, -0.4, 32);
  const cap = mesh(dry, `tunnel_rain_cap_${i + 1}`, new T.ConeGeometry(0.32, 0.2, 32), M.steelDark, x, WEB_Y + 2.3, -0.4);
}
for (const [i, x] of [DRX - 1.0, DRX + 1.0].entries()) {
  box(dry, `tunnel_circulation_fan_${i + 1}`, 0.9, 0.5, 0.9, M.steelDark, x, WEB_Y + 1.23, 0.3);
  cylY(dry, `tunnel_fan_motor_${i + 1}`, 0.15, 0.3, M.steel, x, WEB_Y + 1.63, 0.3, 24);
}
box(dry, 'tunnel_burner_box', 1.4, 1.0, 0.6, M.steelDark, DRX, WEB_Y - 0.05, -(DZ + 0.3));
pipeRun(dry, 'tunnel_gas_line', 0.04, [[DRX + 0.5, WEB_Y - 0.2, -(DZ + 0.6)], [DRX + 0.5, WEB_Y - 0.2, -3.2], [DRX + 0.5, 3.3, -3.2]]);
for (const [tag, x] of [['entry', DRX - DL / 2], ['exit', DRX + DL / 2]]) {
  box(dry, `tunnel_${tag}_lip_upper`, 0.06, 0.06, 2 * DZ, M.steelDark, x, WEB_Y + 0.19, 0);
  box(dry, `tunnel_${tag}_lip_lower`, 0.06, 0.06, 2 * DZ, M.steelDark, x, WEB_Y - 0.19, 0);
}
// end of part 1: cross-cutter, outfeed belt, sheet stacking lift table
const CTX = 10.75, LX = 13.4;
const cut = grp(s3, 'cross_cutter');
sidePlates(cut, 'cross_cutter_frame', 0.6, 2.0, CTX, 0);
roller(cut, 'cross_cutter_knife_drum', 0.16, CTX, WEB_Y + 0.171);
roller(cut, 'cross_cutter_anvil', 0.12, CTX, WEB_Y - 0.131);
box(cut, 'cross_cutter_guard', 0.7, 0.05, 2 * FZ + 0.12, M.steelDark, CTX, 2.05, 0);
motor(cut, 'cross_cutter_motor', CTX, WEB_Y + 0.171, -(FZ + 0.2), { r: 0.16, len: 0.45 });
box(s3, 'sheet_outfeed_belt', 1.3, 0.06, W + 0.1, M.rubber, 11.5, WEB_Y - 0.042, 0);
for (const s of [1, -1]) box(s3, `sheet_outfeed_belt_leg_${s > 0 ? 'operator' : 'drive'}`, 0.08, WEB_Y - 0.07, 0.08, M.steelDark, 11.9, (WEB_Y - 0.07) / 2, s * (W / 2));
const lt = grp(s3, 'sheet_stacking_lift_table');
box(lt, 'lift_table_base', 2.4, 0.12, 1.6, M.steelDark, LX, 0.06, 0);
const ltCol = cylY(lt, 'lift_table_column', 0.12, 1, M.steelLight, LX, 0.5, 0, 24);
const ltPlat = box(lt, 'lift_table_platform', 2.5, 0.06, 1.8, M.steel, LX, 1.0, 0);
for (const s of [1, -1]) cylY(lt, `sheet_backstop_post_${s > 0 ? 'operator' : 'drive'}`, 0.04, 1.6, M.steelDark, 14.85, 0.8, s * 1.0, 12);
box(lt, 'sheet_backstop_plate', 0.04, 0.55, 1.9, M.steelDark, 14.8, 1.25, 0);

/* =======================================================
   04 — PRESSING (short-cycle platen press)
   ======================================================= */
const s4 = grp(model, 'station_04_pressing', OFF), PRX = 15.5;
sign(s4, 'sign_05', 5, PRX, 3.5);
box(s4, 'press_foundation', 5.0, 0.6, 3.8, M.steelDark, PRX, 0.3, 0);
const nutGeo = new T.CylinderGeometry(0.3, 0.3, 0.2, 6);
for (const cx of [-1.9, 1.9]) for (const cz of [-1.55, 1.55]) {
  const tag = `${cx < 0 ? 'in' : 'out'}_${cz < 0 ? 'drive' : 'operator'}`;
  cylY(s4, `press_column_${tag}`, 0.2, 4.2, M.steelLight, PRX + cx, 2.7, cz, 32);
  mesh(s4, `press_column_nut_lower_${tag}`, nutGeo, M.steelDark, PRX + cx, 0.7, cz);
  mesh(s4, `press_column_nut_upper_${tag}`, nutGeo, M.steelDark, PRX + cx, 4.7, cz);
  cylY(s4, `press_column_collar_${tag}`, 0.3, 0.6, M.steel, PRX + cx, 1.95, cz, 32);
}
box(s4, 'press_crown', 4.4, 0.7, 3.5, M.steel, PRX, 4.25, 0);
for (let i = 0; i < 4; i++) for (const s of [1, -1])
  box(s4, `press_crown_rib_${i + 1}_${s > 0 ? 'operator' : 'drive'}`, 0.08, 0.7, 0.15, M.steelDark, PRX - 1.2 + i * 0.8, 4.25, s * 1.825);
box(s4, 'press_lower_platen', 3.3, 0.6, W + 0.8, M.steel, PRX, 0.9, 0);
box(s4, 'press_lower_heat_plate', 3.2, 0.1, W + 0.6, M.steelDark, PRX, 1.25, 0);
box(s4, 'press_upper_heat_plate', 3.2, 0.1, W + 0.6, M.steelDark, PRX, 1.6, 0);
box(s4, 'press_upper_platen', 3.3, 0.6, W + 0.8, M.steel, PRX, 1.95, 0);
for (const [i, dx] of [-0.9, 0.9].entries()) {
  cylY(s4, `hydraulic_cylinder_barrel_${i + 1}`, 0.32, 1.1, M.steel, PRX + dx, 5.15, 0, 40);
  cylY(s4, `hydraulic_cylinder_cap_${i + 1}`, 0.36, 0.08, M.steelDark, PRX + dx, 5.74, 0, 40);
  cylY(s4, `hydraulic_ram_${i + 1}`, 0.14, 1.65, M.steelLight, PRX + dx, 3.075, 0, 32);
}
const heat = grp(s4, 'thermal_oil_circuit'), HDX = PRX + 2.9;
cylY(heat, 'oil_header', 0.07, 2.6, M.steel, HDX, 1.3, 1.2, 20);
for (const [tag, y] of [['lower', 0.9], ['upper', 1.95]]) {
  pipeRun(heat, `oil_branch_${tag}`, 0.045, [[HDX, y, 1.2], [PRX + 1.65, y, 1.2]]);
  box(heat, `oil_valve_body_${tag}`, 0.12, 0.12, 0.12, M.steelDark, HDX - 0.4, y, 1.2);
  const hw = mesh(heat, `oil_valve_handwheel_${tag}`, new T.TorusGeometry(0.08, 0.012, 8, 24), M.steelLight, HDX - 0.4, y + 0.14, 1.2);
  hw.rotation.x = Math.PI / 2;
}
for (const [tag, x] of [['infeed', PRX - 2.25], ['outfeed', PRX + 2.25]]) for (const s of [1, -1]) {
  box(s4, `light_curtain_${tag}_${s > 0 ? 'operator' : 'drive'}`, 0.05, 1.6, 0.05, M.steelDark, x, 1.4, s * 1.3);
  box(s4, `light_curtain_${tag}_lens_${s > 0 ? 'operator' : 'drive'}`, 0.02, 1.5, 0.02, M.glass, x, 1.4, s * 1.27);
}
platform(s4, 'press_service_platform', PRX - 1.9, PRX + 1.9, -3.2, -2.1, 2.3, ['z0', 'x1']);
ladder(s4, 'press_platform_ladder', PRX - 2.2, -2.65, 2.3);
const hpu = grp(s4, 'hydraulic_power_unit'), HPX = 19.6, HPZ = -2.6;
box(hpu, 'hpu_tank', 1.6, 0.8, 1.0, M.steel, HPX, 0.4, HPZ);
box(hpu, 'hpu_tank_lid', 1.64, 0.04, 1.04, M.steelDark, HPX, 0.82, HPZ);
const hm = motor(hpu, 'hpu_motor', HPX - 0.3, 1.06, HPZ + 0.3, { r: 0.2, len: 0.6 });
for (let i = 0; i < 2; i++) cylY(hpu, `hpu_filter_${i + 1}`, 0.08, 0.35, M.steelDark, HPX + 0.4 + i * 0.25, 1.015, HPZ + 0.3, 20);
cylY(hpu, 'hpu_accumulator', 0.15, 0.9, M.steelLight, HPX + 0.6, 1.29, HPZ - 0.3, 24);
mesh(hpu, 'hpu_accumulator_dome', new T.SphereGeometry(0.15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.steelLight, HPX + 0.6, 1.74, HPZ - 0.3);
pipeRun(hpu, 'hydraulic_pressure_line', 0.04, [[HPX - 0.5, 0.84, HPZ + 0.4], [HPX - 0.5, 5.3, HPZ + 0.4], [PRX - 0.9, 5.3, HPZ + 0.4], [PRX - 0.9, 5.3, -0.33]]);
cylBetween(hpu, 'hydraulic_branch_line', 0.04, [PRX + 0.9, 5.3, HPZ + 0.4], [PRX + 0.9, 5.3, -0.33], M.steel);
cabinet(s4, 'press_control_cabinet', 19.3, 2.55);

// continuous roller conveyor: press outfeed through QC
const conv = grp(model, 'roller_conveyor', OFF), CX0 = 18.1, CX1 = 28.8, CL = CX1 - CX0, CR = 0.06, BOARD_BOT = WEB_Y - 0.049;
for (const s of [1, -1]) box(conv, `conveyor_rail_${s > 0 ? 'operator' : 'drive'}`, CL, 0.14, 0.08, M.steel, (CX0 + CX1) / 2, 1.2, s * (W / 2 + 0.12));
for (let i = 0, n = Math.floor(CL / 0.5); i <= n; i++) {
  const x = CX0 + 0.1 + i * (CL - 0.2) / n;
  cylZ(conv, `conveyor_roller_${i + 1}`, CR, W + 0.1, M.steelLight, x, BOARD_BOT - CR - 0.001, 0, 24);
  cylZ(conv, `conveyor_roller_axle_${i + 1}`, 0.018, W + 0.3, M.steelDark, x, BOARD_BOT - CR - 0.001, 0, 10);
}
for (let i = 0; i < 6; i++) {
  const x = CX0 + 0.2 + i * (CL - 0.4) / 5;
  for (const s of [1, -1]) box(conv, `conveyor_leg_${i + 1}_${s > 0 ? 'operator' : 'drive'}`, 0.1, 1.13, 0.1, M.steelDark, x, 0.565, s * (W / 2 + 0.12));
  box(conv, `conveyor_cross_brace_${i + 1}`, 0.06, 0.06, W + 0.24, M.steelDark, x, 0.3, 0);
}
motor(conv, 'conveyor_drive_motor', CX1 - 0.3, 0.95, -(W / 2 + 0.16), { r: 0.13, len: 0.35 });
// press infeed lay-up table: board + impregnated sheet laid here, then indexed into the press
const inf = grp(s4, 'press_infeed_table'), IX0 = PRX - 4.1, IX1 = PRX - 1.7;
for (const s of [1, -1]) box(inf, `infeed_rail_${s > 0 ? 'operator' : 'drive'}`, IX1 - IX0, 0.14, 0.08, M.steel, (IX0 + IX1) / 2, 1.2, s * (W / 2 + 0.12));
for (let i = 0; i <= 6; i++) {
  const x = IX0 + 0.1 + i * (IX1 - IX0 - 0.2) / 6;
  cylZ(inf, `conveyor_roller_infeed_${i + 1}`, CR, W + 0.1, M.steelLight, x, BOARD_BOT - CR - 0.001, 0, 24);
}
for (const x of [IX0 + 0.2, IX1 - 0.2]) for (const s of [1, -1]) box(inf, `infeed_leg_${x < PRX - 3 ? 'in' : 'out'}_${s > 0 ? 'operator' : 'drive'}`, 0.1, 1.13, 0.1, M.steelDark, x, 0.565, s * (W / 2 + 0.12));

/* =======================================================
   05 — QUALITY CONTROL + STACKING
   ======================================================= */
const s5 = grp(model, 'station_05_quality_control', OFF), GX = 23.2;
sign(s5, 'sign_06', 6, 26.6, 3.0);
const gan = grp(s5, 'scanner_gantry');
for (const s of [1, -1]) {
  const side = s > 0 ? 'operator' : 'drive';
  box(gan, `gantry_post_${side}`, 0.25, 3.0, 0.25, M.steel, GX, 1.5, s * 1.75);
  box(gan, `gantry_baseplate_${side}`, 0.45, 0.03, 0.45, M.steelDark, GX, 0.015, s * 1.75);
  box(gan, `light_bar_arm_${side}`, 0.5, 0.06, 0.06, M.steelDark, GX + 0.25, 1.9, s * 1.62);
  box(gan, `camera_bar_hanger_${side}`, 0.06, 0.3, 0.06, M.steelDark, GX, 2.85, s * 0.8);
}
box(gan, 'gantry_beam', 0.35, 0.4, 3.75, M.steelDark, GX, 3.2, 0);
box(gan, 'gantry_cable_chain', 0.15, 0.1, 3.2, M.rubber, GX, 3.45, 0);
box(gan, 'line_scan_camera_bar', 0.3, 0.2, W + 0.3, M.steelDark, GX, 2.7, 0);
box(gan, 'line_scan_lens_strip', 0.12, 0.02, W + 0.1, M.glass, GX, 2.59, 0);
box(gan, 'inspection_light_bar', 0.12, 0.12, 3.24, M.steel, GX + 0.5, 1.9, 0, 0.5);
box(gan, 'inspection_light_diffuser', 0.1, 0.01, 3.2, M.glass, GX + 0.47, 1.84, 0, 0.5);
cylY(gan, 'gantry_beacon_base', 0.06, 0.08, M.steelDark, GX, 3.44, 1.7, 16);
cylY(gan, 'gantry_beacon', 0.06, 0.25, M.glass, GX, 3.605, 1.7, 16);
const gloss = grp(s5, 'gloss_meter_bridge'), GLX = 25.6;
for (const s of [1, -1]) box(gloss, `gloss_bridge_post_${s > 0 ? 'operator' : 'drive'}`, 0.12, 1.9, 0.12, M.steel, GLX, 0.95, s * 1.5);
box(gloss, 'gloss_bridge_beam', 0.15, 0.15, 3.12, M.steelDark, GLX, 1.9, 0);
for (const [i, z] of [-0.6, 0, 0.6].entries()) {
  box(gloss, `gloss_head_${i + 1}`, 0.16, 0.22, 0.16, M.steelDark, GLX, 1.715, z);
  cylY(gloss, `gloss_head_lens_${i + 1}`, 0.04, 0.02, M.glass, GLX, 1.595, z, 16);
}
const desk = grp(s5, 'qc_workstation'), QX = 24.4, QZ = 2.6;
box(desk, 'desk_top', 1.2, 0.05, 0.6, M.steel, QX, 1.1, QZ);
for (const dx of [-0.55, 0.55]) for (const dz of [-0.25, 0.25]) box(desk, `desk_leg_${dx < 0 ? 'l' : 'r'}_${dz < 0 ? 'b' : 'f'}`, 0.04, 1.075, 0.04, M.steelDark, QX + dx, 0.5375, QZ + dz);
box(desk, 'monitor_stand', 0.06, 0.2, 0.06, M.steelDark, QX, 1.225, QZ - 0.18);
box(desk, 'monitor', 0.9, 0.55, 0.04, std('monitor_black', 0x111213, 0.5), QX, 1.6, QZ - 0.2);
box(desk, 'monitor_screen', 0.84, 0.49, 0.005, std('monitor_screen_black', 0x050506, 0.15, 0.1), QX, 1.6, QZ - 0.177);
box(desk, 'keyboard', 0.45, 0.02, 0.15, std('keyboard_black', 0x111213, 0.6), QX, 1.135, QZ + 0.05);
// stacker + pallet
const PLX = 30.6;
const stk = grp(s5, 'vacuum_stacker');
for (const dx of [-1.6, 1.6]) for (const s of [1, -1]) box(stk, `stacker_post_${dx < 0 ? 'in' : 'out'}_${s > 0 ? 'operator' : 'drive'}`, 0.15, 3.0, 0.15, M.steel, PLX + dx, 1.5, s * 1.5);
for (const s of [1, -1]) box(stk, `stacker_runway_${s > 0 ? 'operator' : 'drive'}`, 3.35, 0.2, 0.15, M.steelDark, PLX, 3.1, s * 1.5);
box(stk, 'stacker_carriage', 0.25, 0.2, 3.15, M.steelDark, PLX, 3.1, 0);
cylY(stk, 'stacker_lift_column', 0.07, 1.3, M.steelLight, PLX, 2.35, 0, 20);
box(stk, 'stacker_suction_frame', 2.2, 0.08, 1.6, M.steel, PLX, 1.66, 0);
for (const dx of [-0.8, 0.8]) for (const dz of [-0.6, 0.6])
  cylY(stk, `suction_cup_${dx < 0 ? 'in' : 'out'}_${dz < 0 ? 'drive' : 'operator'}`, 0.08, 0.06, M.rubber, PLX + dx, 1.59, dz, 20);
const pal = grp(s5, 'finished_pallet');
for (const [i, z] of [-0.95, 0, 0.95].entries()) box(pal, `pallet_skid_${i + 1}`, 2.7, 0.1, 0.15, M.mdf, PLX, 0.05, z);
for (let i = 0; i < 6; i++) box(pal, `pallet_deck_board_${i + 1}`, 0.12, 0.025, 2.1, M.mdf, PLX - 1.25 + i * 0.5, 0.1125, 0);
const PB = 0.125;
for (let i = 0; i < 12; i++) {
  const y = PB + i * 0.041;
  box(pal, `stacked_board_${i + 1}_core`, 2.6, 0.036, 2.0, M.mdf, PLX, y + 0.018, 0);
  box(pal, `stacked_board_${i + 1}_decor`, 2.6, 0.004, 2.0, M.decor, PLX, y + 0.038, 0);
}
const TOP = PB + 12 * 0.041;
for (const dx of [-0.8, 0.8]) {
  const t = dx < 0 ? 'in' : 'out';
  box(pal, `strap_${t}_top`, 0.05, 0.004, 2.02, M.steelDark, PLX + dx, TOP + 0.002, 0);
  for (const s of [1, -1]) box(pal, `strap_${t}_side_${s > 0 ? 'operator' : 'drive'}`, 0.05, TOP - PB, 0.004, M.steelDark, PLX + dx, (TOP + PB) / 2, s * 1.002);
}

/* =======================================================
   MATERIAL FLOW — web and board
   ======================================================= */
const flow = grp(model, 'material_flow');
strip(flow, 'web_raw', UX, WEB_Y, PX, WEB_Y, M.paper);
strip(flow, 'web_printed', PX, WEB_Y, -1.6, WEB_Y, M.printed);
strip(flow, 'web_bath_descent', -1.6, WEB_Y, -0.18, 0.46, M.printed);
strip(flow, 'web_bath_immersion', -0.18, 0.46, 0.18, 0.46, M.impreg);
strip(flow, 'web_bath_ascent', 0.18, 0.46, 1.6, WEB_Y, M.impreg);
strip(flow, 'web_impregnated', 1.6, WEB_Y, CTX, WEB_Y, M.impreg);
strip(flow, 'web_cut_sheets', CTX, WEB_Y, 12.1, WEB_Y, M.impreg);
const BX0 = PRX - 1.8, BX1 = CX1 - 0.2;
// pressed board, cut to final panels: one in the press, the rest indexing along the conveyor to the stacker
const PANEL_L = 2.6, PANEL_S = [12.74, 15.5, 18.26, 21.02, 23.78, 26.54, 29.3].map(x => x + OFF), PANEL_P = 2.76;
const panels = PANEL_S.map((x, i) => {
  const g = grp(flow, `finished_panel_${i + 1}`, x, 0, 0);
  rbox(g, `finished_panel_${i + 1}_core`, PANEL_L, 0.044, W, 0.004, M.mdf, 0, BOARD_BOT + 0.022, 0);
  box(g, `finished_panel_${i + 1}_decor`, PANEL_L - 0.004, 0.006, W - 0.004, M.decor, 0, WEB_Y + 0.002, 0);
  return g;
});

/* ---------- livery: cream line, white DECOSTAR truck, red forklift ---------- */
{
  const keep = { [M.steel.uuid]: M.steel.clone(), [M.steelDark.uuid]: M.steelDark.clone(), [M.steelLight.uuid]: M.steelLight.clone(), [M.glass.uuid]: M.glass.clone(), [M.paint.uuid]: null };
  const truckPaint = std('truck_paint_white', 0xf4f3ef, 0.3, 0.2, { side: T.DoubleSide });
  const forkPaint = std('forklift_paint_red', 0xb3342b, 0.35, 0.2, { side: T.DoubleSide });
  for (const k in keep) if (keep[k]) keep[k].name = 'vehicle_' + keep[k].name;
  const vg = keep[M.glass.uuid]; vg.transparent = false; vg.opacity = 1; vg.color.set(0x2b3034); vg.roughness = 0.1; vg.metalness = 0.3;
  // closed box body: far wall, front wall, roof, rear doors; line side open under a logo fascia
  const BL = 6.4, BXc = -1.15, BY0 = 1.35, BY1 = 3.4, BH = BY1 - BY0;
  rbox(tk, 'body_far_wall', BL, BH, 0.04, 0.015, truckPaint, BXc, BY0 + BH / 2, -1.25);
  rbox(tk, 'body_front_wall', 0.05, BH, 2.5, 0.015, truckPaint, 2.08, BY0 + BH / 2, 0);
  rbox(tk, 'body_roof', BL + 0.06, 0.06, 2.56, 0.02, truckPaint, BXc, BY1 + 0.03, 0);
  for (const sd of [1, -1]) rbox(tk, 'body_rear_door_' + (sd > 0 ? 'right' : 'left'), 0.04, BH, 1.24, 0.015, truckPaint, -4.37, BY0 + BH / 2, sd * 0.625);
  for (const sd of [1, -1]) cylY(tk, 'body_rear_door_bar_' + (sd > 0 ? 'right' : 'left'), 0.02, BH - 0.1, M.steelLight, -4.4, BY0 + BH / 2, sd * 0.3, 10);
  rbox(tk, 'body_near_fascia', BL, 0.45, 0.05, 0.015, truckPaint, BXc, BY1 - 0.225, 1.25);
  for (const [i, x] of [-4.3, 2.03].entries()) rbox(tk, 'body_near_corner_post_' + (i + 1), 0.08, BH, 0.08, 0.02, truckPaint, x, BY0 + BH / 2, 1.23);
  for (let i = 0; i < 9; i++) rbox(tk, 'body_far_rib_' + (i + 1), 0.05, BH, 0.03, 0.01, M.steelLight, -4.2 + i * 0.8, BY0 + BH / 2, -1.285);
  // DECOSTAR logo artwork: key out white ground, crop; 'light' variant turns dark wordmark white for dark surfaces
  const logoImg = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = new URL('decostar-logo.png', document.baseURI).href; });
  const logoTex = (light) => {
    const c = document.createElement('canvas');
    if (!logoImg) { c.width = c.height = 4; }
    else {
      const s = document.createElement('canvas'); s.width = logoImg.width; s.height = logoImg.height;
      const sg = s.getContext('2d'); sg.drawImage(logoImg, 0, 0);
      const d = sg.getImageData(0, 0, s.width, s.height), p = d.data;
      let x0 = s.width, y0 = s.height, x1 = 0, y1 = 0;
      for (let i = 0; i < p.length; i += 4) {
        const r = p[i], g = p[i + 1], b = p[i + 2], mn = Math.min(r, g, b), a = Math.min(255, (255 - mn) * 1.6);
        if (a < 8) { p[i + 3] = 0; continue; }
        const k = a / 255; // un-premultiply against white
        let R = 255 - (255 - r) / k, G = 255 - (255 - g) / k, B = 255 - (255 - b) / k;
        if (light && Math.max(R, G, B) - Math.min(R, G, B) < 40) R = G = B = 255;
        p[i] = R; p[i + 1] = G; p[i + 2] = B; p[i + 3] = a;
        const px = (i / 4) % s.width, py = (i / 4 / s.width) | 0;
        if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      }
      sg.putImageData(d, 0, 0);
      const pad = 6; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
      c.width = 1024; c.height = Math.round(1024 * (y1 - y0) / (x1 - x0));
      c.getContext('2d').drawImage(s, x0, y0, x1 - x0, y1 - y0, 0, 0, c.width, c.height);
    }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
  };
  const logoMat = new T.MeshStandardMaterial({ name: 'decostar_logo', map: logoTex(false), transparent: true, alphaTest: 0.02, roughness: 0.4 });
  const LA = logoMat.map.image.width / logoMat.map.image.height || 2.3;
  const LP = h => new T.PlaneGeometry(h * LA, h);
  const far = mesh(tk, 'logo_far_side', LP(1.7), logoMat, BXc, BY0 + BH * 0.52, -1.325); far.rotation.y = Math.PI;
  mesh(tk, 'logo_near_fascia', LP(0.38), logoMat, BXc, BY1 - 0.225, 1.277);
  const rear = mesh(tk, 'logo_rear_doors', LP(0.6), logoMat, -4.395, BY1 - 0.55, 0); rear.rotation.y = -Math.PI / 2;
  const remap = (root, paint) =>
    root.traverse(o => { if (o.isMesh && o.material.uuid in keep) o.material = keep[o.material.uuid] || paint; });
  // roof + cab doors
  const roofLogo = mesh(tk, 'logo_roof', LP(1.7), logoMat, BXc, BY1 + 0.062, 0); roofLogo.rotation.x = -Math.PI / 2;
  for (const sd of [1, -1]) {
    const d = mesh(tk, 'logo_cab_door_' + (sd > 0 ? 'right' : 'left'), LP(0.28), logoMat, CX + 1.52, CY + 0.72, sd * (CW / 2 + 0.006));
    if (sd < 0) d.rotation.y = Math.PI;
  }
  // operators in DECOSTAR workwear, one per station
  const wLogo = new T.MeshStandardMaterial({ name: 'uniform_logo', map: logoTex(true), transparent: true, alphaTest: 0.02, roughness: 0.8 });
  const jacket = std('uniform_jacket', 0x2b3034, 0.85), trousers = std('uniform_trousers', 0x1d1f20, 0.9), band = std('uniform_band', 0xb3342b, 0.6);
  const wSkin = std('worker_skin', 0xd6b497, 0.7), hat = std('hard_hat_white', 0xf4f3ef, 0.4);
  const worker = (p, n, x, y, z, ry = 0) => {
    const g = grp(p, n, x, y, z); g.rotation.y = ry;
    for (const sd of [1, -1]) {
      const s = sd > 0 ? 'r' : 'l';
      cylY(g, `${n}_leg_${s}`, 0.07, 0.84, trousers, sd * 0.1, 0.46, 0, 12);
      rbox(g, `${n}_boot_${s}`, 0.12, 0.09, 0.26, 0.03, M.rubber, sd * 0.1, 0.045, -0.04);
      cylBetween(g, `${n}_arm_${s}`, 0.05, [sd * 0.24, 1.44, 0], [sd * 0.27, 0.9, -0.04], jacket, 12);
      mesh(g, `${n}_hand_${s}`, new T.SphereGeometry(0.045, 12, 8), wSkin, sd * 0.27, 0.86, -0.05);
    }
    rbox(g, `${n}_torso`, 0.42, 0.62, 0.24, 0.08, jacket, 0, 1.18, 0);
    rbox(g, `${n}_hivis_band`, 0.43, 0.05, 0.25, 0.02, band, 0, 1.0, 0);
    cylY(g, `${n}_neck`, 0.05, 0.1, wSkin, 0, 1.53, 0, 12);
    mesh(g, `${n}_head`, new T.SphereGeometry(0.105, 24, 16), wSkin, 0, 1.67, 0);
    mesh(g, `${n}_hard_hat`, new T.SphereGeometry(0.12, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hat, 0, 1.7, 0);
    cylY(g, `${n}_hard_hat_brim`, 0.15, 0.015, hat, 0, 1.705, -0.02, 24);
    const back = mesh(g, `${n}_logo_back`, LP(0.13), wLogo, 0, 1.3, 0.122);
    const chest = mesh(g, `${n}_logo_chest`, LP(0.045), wLogo, 0.09, 1.36, -0.122); chest.rotation.y = Math.PI;
    return g;
  };
  worker(s1, 'worker_01_unwind', -19.6, 0, 3.5);
  worker(s2, 'worker_02_printing', PX - 1.1, 0.6, 2.2);
  worker(s3, 'worker_03_impregnation', 1.1, 0, 3.5);
  worker(s4, 'worker_04_pressing', 16.0, 0, 4.3, 0.5);
  worker(s5, 'worker_05_quality', QX + 0.1, 0, QZ + 0.55);
  // cab roof deflector logo (front face) + top
  {
    const n = new T.Vector3(0.55, 1.1, 0).normalize(), xa = new T.Vector3(0, 0, -1), ya = new T.Vector3().crossVectors(n, xa);
    const m = mesh(tk, 'logo_cab_roof_front', LP(0.5), logoMat, CX + 0.1 + 1.35 + n.x * 0.05, CY + 2.15 + 0.3125 + n.y * 0.05, 0);
    m.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(xa, ya, n));
  }
  // forklift: counterweight rear, chassis sides, overhead guard
  mesh(fl, 'fl_logo_rear', LP(0.3), wLogo, 0, 0.8, 2.557);
  for (const sd of [1, -1]) { const m = mesh(fl, 'fl_logo_side_' + (sd > 0 ? 'r' : 'l'), LP(0.32), wLogo, sd * 0.607, 0.62, 1.2); m.rotation.y = sd * Math.PI / 2; }
  { const m = mesh(fl, 'fl_logo_guard', LP(0.3), wLogo, 0, 2.298, 1.36); m.rotation.x = -Math.PI / 2; }
  remap(tk, truckPaint); remap(fl, forkPaint);
  M.steel.color.set(0xf4eddc); M.steelDark.color.set(0x5e5446); M.steelLight.color.set(0xa99c84);
  M.glass.color.set(0xd9d1bf); M.marking.color.set(0xd2c29c);
}

/* ---------- outbound: identical truck loads finished laminate pallets and drives away ---------- */
{
  const prefix = (root, p) => root.traverse(o => { if (o.name) o.name = p + o.name; });
  const tk2 = tk.clone(true); tk2.position.set(37, 0, -4.6);
  [...tk2.children].filter(o => /^truck_roll_/.test(o.name)).forEach(o => tk2.remove(o));
  const wheels2 = tk2.children.filter(o => o.name.startsWith('wheel_')).map(wg => {
    const tyre = wg.children.find(m => m.name.endsWith('_tyre'));
    const pv = new T.Group(); pv.name = wg.name + '_hub'; pv.position.copy(tyre.position); wg.add(pv);
    [...wg.children].filter(c => c !== pv).forEach(c => pv.attach(c));
    return pv;
  });
  const hinge2 = new T.Group(); hinge2.name = 'hinge_dropside_right'; hinge2.position.set(0, 1.35, 1.21); tk2.add(hinge2);
  tk2.children.filter(o => o.isMesh && /^dropside_(rib_|top_rail_)?right/.test(o.name)).forEach(m => hinge2.attach(m));
  prefix(tk2, 'out_'); tk2.name = 'outbound_truck'; s5.add(tk2); tk2.scale.setScalar(0.85);

  const fl2 = fl.clone(true); fl2.position.set(35.35, 0, 7.0);
  fl2.traverse(o => { if (o.name === 'fl_core_ram' || o.name === 'fl_ram_collar') o.visible = false; });
  const car2 = fl2.getObjectByName('fl_carriage');
  for (const sd of [1, -1]) box(car2, 'fl_fork_' + (sd > 0 ? 'r' : 'l'), 0.12, 0.05, 1.9, M.steelDark, sd * 0.6, -0.245, -1.0);
  prefix(fl2, 'out_'); fl2.name = 'outbound_forklift'; s5.add(fl2);

  const outPallet = n => {
    const g = grp(s5, n);
    for (const [i, x] of [-1.2, 0, 1.2].entries()) box(g, `${n}_skid_${i + 1}`, 0.15, 0.1, 2.1, M.mdf, x, 0.05, 0);
    for (let i = 0; i < 6; i++) box(g, `${n}_deck_board_${i + 1}`, 2.6, 0.025, 0.12, M.mdf, 0, 0.1125, -0.95 + i * 0.38);
    for (let i = 0; i < 14; i++) {
      const y = 0.125 + i * 0.041;
      box(g, `${n}_laminate_${i + 1}_core`, 2.6, 0.036, 2.0, M.mdf, 0, y + 0.018, 0);
      box(g, `${n}_laminate_${i + 1}_decor`, 2.6, 0.004, 2.0, M.decor, 0, y + 0.038, 0);
    }
    const top = 0.125 + 14 * 0.041;
    for (const dx of [-0.8, 0.8]) {
      box(g, `${n}_strap_${dx < 0 ? 'a' : 'b'}_top`, 0.05, 0.004, 2.02, M.steelDark, dx, top + 0.002, 0);
      for (const sd of [1, -1]) box(g, `${n}_strap_${dx < 0 ? 'a' : 'b'}_side_${sd > 0 ? 'o' : 'd'}`, 0.05, top - 0.125, 0.004, M.steelDark, dx, (top + 0.125) / 2, sd * 1.002);
    }
    return g;
  };
  const SX = [36.7, 34.0], SZ = 3.8, TKX = 50, SLOT = [50.34, 47.7], BED = 1.35 * 0.85;
  const pals = SX.map((x, i) => {
    const g = outPallet('dispatch_pallet_' + (i + 1)); g.position.set(x, 0, SZ);
    const up = outPallet('dispatch_pallet_' + (i + 1) + '_upper'); g.add(up); up.position.set(0, 0.125 + 14 * 0.041, 0);
    return g;
  });

  const ease = u => u * u * (3 - 2 * u);
  const key = (K, t) => {
    if (t <= K[0][0]) return K[0].slice(1);
    for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const a = K[i - 1], b = K[i], u = ease((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * u); }
    return K[K.length - 1].slice(1);
  };
  const TK = [[0, 70], [6, TKX], [33, TKX], [39, 70], [40, 70]];
  const DS = [[0, 0], [6, 0], [8, 0.94], [31.5, 0.94], [33, 0]];
  const FX = [[0, 35.35, 6.1], [8, 35.35, 6.1], [9.2, 36.7, 6.1], [10.4, 36.7, 4.9], [11, 36.7, 4.9], [12, 36.7, 6.1], [15, 50.34, 6.1], [16.8, 50.34, -3.5], [17.6, 50.34, -3.5], [19.4, 50.34, 6.1],
    [22.4, 34.0, 6.1], [23.4, 34.0, 4.9], [24, 34.0, 4.9], [25, 34.0, 6.1], [27.8, 47.7, 6.1], [29.6, 47.7, -3.5], [30.4, 47.7, -3.5], [32.2, 47.7, 6.1], [35, 35.35, 6.1], [40, 35.35, 6.1]];
  const LF = [[0, 0.08], [10.4, 0.08], [11, 0.25], [12, 0.25], [15, 1.3], [16.8, 1.3], [17.4, BED + 0.1], [17.6, BED + 0.05], [19.4, 0.08], [23.4, 0.08], [24, 0.25], [25, 0.25], [27.8, 1.3], [29.6, 1.3], [30.2, BED + 0.1], [30.4, BED + 0.05], [32.2, 0.08], [40, 0.08]];
  const PICK = [11, 24], DROP = [17.4, 30.2], LOOP = 40;
  const w2 = model.getObjectByName('worker_02_printing'), W2X = w2.position.x;
  const WK = [[0, 0], [3, 2.1], [8, 2.1], [11, 0], [16, 0]];
  const w3 = model.getObjectByName('worker_03_impregnation'), W3Z = w3.position.z, WK3 = [[0, 0], [2, -1.4], [5, -1.4], [7, 0], [10, 0]];
  const w4 = model.getObjectByName('worker_04_pressing'), W4X = w4.position.x, WK4 = [[0, 0], [4, 2.8], [8, 2.8], [12, 0], [16, 0]];
  const w1 = model.getObjectByName('worker_01_unwind'), sh1 = new T.Group(); sh1.name = 'worker_01_unwind_shoulder_r';
  sh1.position.set(0.24, 1.44, 0); w1.add(sh1);
  ['worker_01_unwind_arm_r', 'worker_01_unwind_hand_r'].forEach(n => sh1.attach(w1.getObjectByName(n)));
  const WT1 = [[0, 0], [1, Math.PI / 2], [4.6, Math.PI / 2], [5.6, 0], [10, 0]], WA1 = [[0, 0], [1, 0], [1.8, 0.9], [3.8, 0.9], [4.6, 0], [10, 0]];
  const stroll = (w, wt, a0, a1, b0, b1, fwd, back, idle, base) => {
    const walking = (wt > a0 && wt < a1) || (wt > b0 && wt < b1);
    w.position.y = base + (walking ? Math.abs(Math.sin(wt * Math.PI * 2)) * 0.03 : 0);
    const face = wt > a0 && wt < a1 ? fwd : wt > b0 && wt < b1 ? back : idle;
    w.rotation.y += (face - w.rotation.y) * 0.15;
  };
  const g2 = gait(w2), g3 = gait(w3), g4 = gait(w4);
  let prevX = null; const t0 = performance.now();
  const tick = now => {
    const t = ((now - t0) / 1000) % LOOP;
    const [tx] = key(TK, t); tk2.position.x = tx;
    if (prevX !== null) wheels2.forEach(w => w.rotation.z -= (tx - prevX) / (0.52 * 0.85));
    prevX = tx;
    hinge2.rotation.x = key(DS, t)[0] * Math.PI;
    const [fx, fz] = key(FX, t), L = key(LF, t)[0];
    fl2.position.set(fx, 0, fz); car2.position.y = L + 0.22;
    const y2 = steer(fl2, key(FX, t), key(FX, t + 0.05));
    pals.forEach((p, i) => {
      p.rotation.y = 0;
      if (t < PICK[i]) p.position.set(SX[i], 0, SZ);
      else if (t < DROP[i]) { p.position.set(fx - 1.1 * Math.sin(y2), L - 0.1, fz - 1.1 * Math.cos(y2)); p.rotation.y = y2; }
      else p.position.set(SLOT[i] + tx - TKX, BED, -4.6);
    });
    const wt = ((now - t0) / 1000) % 16, wx = key(WK, wt)[0], walking = (wt < 3 || (wt > 8 && wt < 11));
    w2.position.x = W2X + wx;
    w2.position.y = 0.6 + (walking ? Math.abs(Math.sin(wt * Math.PI * 2)) * 0.03 : 0);
    const face = wt < 3 ? -Math.PI / 2 : (wt > 8 && wt < 11) ? Math.PI / 2 : 0;
    w2.rotation.y += (face - w2.rotation.y) * 0.15; g2(wt, walking);
    const t1 = ((now - t0) / 1000) % 10; w1.rotation.y = key(WT1, t1)[0]; sh1.rotation.z = key(WA1, t1)[0] * Math.PI;
    const t3 = ((now - t0) / 1000) % 10; w3.position.z = W3Z + key(WK3, t3)[0];
    stroll(w3, t3, 0, 2, 5, 7, 0, Math.PI, 0, 0); g3(t3, (t3 > 0 && t3 < 2) || (t3 > 5 && t3 < 7));
    const t4 = ((now - t0) / 1000) % 16; w4.position.x = W4X + key(WK4, t4)[0];
    stroll(w4, t4, 0, 4, 8, 12, -Math.PI / 2, Math.PI / 2, 0.5, 0); g4(t4, (t4 > 0 && t4 < 4) || (t4 > 8 && t4 < 12));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- delivery + unload loop ---------- */
{
  const find = (root, test) => { const out = []; root.traverse(o => { if (test(o.name)) out.push(o); }); return out; };
  const wheels = tk.children.filter(o => o.name.startsWith('wheel_')).map(wg => {
    const tyre = wg.children.find(m => m.name.endsWith('_tyre'));
    const pv = new T.Group(); pv.name = wg.name + '_hub'; pv.position.copy(tyre.position); wg.add(pv);
    [...wg.children].filter(c => c !== pv).forEach(c => pv.attach(c));
    return pv;
  });
  const hinge = new T.Group(); hinge.name = 'hinge_dropside_right'; hinge.position.set(0, 1.35, 1.21); tk.add(hinge);
  find(tk, n => /^dropside_(rib_|top_rail_)?right/.test(n)).filter(o => o.isMesh).forEach(m => hinge.attach(m));
  const straps = find(tk, n => /^truck_roll_\d_strap_/.test(n));
  const rolls = [1, 2, 3, 4, 5].map(i => tk.getObjectByName('truck_roll_' + i));
  const RX = [-3.7, -2.44, -1.18, 0.08, 1.34], RY = 1.35 + 0.62 + 0.001;
  // stack slots filled in order (bottom row, then top row); roll i comes off the truck front-first
  const SLOTS = [['roll_bottom_1', -25.2, 0.621], ['roll_bottom_2', -23.95, 0.621], ['roll_bottom_3', -22.7, 0.621], ['roll_top_1', -24.575, 1.692], ['roll_top_2', -23.325, 1.692]];
  const tops = [];
  const TKX = -42, FX = [[0, -28.5, 3.7], [8, -28.5, 3.7]], LF = [[0, 0.3], [8, 0.3]], PICK = [], DROP = [];
  let tc = 8;
  SLOTS.forEach(([name, xd, ld], k) => {
    const i = 4 - k, xr = TKX + RX[i], from = FX[FX.length - 1][1];
    tops[i] = stack.getObjectByName(name);
    tc += Math.max(2, Math.abs(xr - from) / 6); FX.push([tc, xr, 3.7]); LF.push([tc, RY]);
    tc += 2; FX.push([tc, xr, -3.25]); LF.push([tc, RY]); PICK[i] = tc;
    tc += 0.6; FX.push([tc, xr, -3.25]); LF.push([tc, 2.08]);
    tc += 2; FX.push([tc, xr, 3.7]);
    tc += Math.max(2, Math.abs(xd - xr) / 6); FX.push([tc, xd, 3.7]);
    tc += 1.5; FX.push([tc, xd, 1.35]); LF.push([tc, 2.08]);
    tc += 0.8; FX.push([tc, xd, 1.35]); LF.push([tc, ld]); DROP[i] = tc;
    tc += 1.2; FX.push([tc, xd, 3.7]);
  });
  tc += 2.5; FX.push([tc, -28.5, 3.7]); LF.push([tc, 0.3]);
  const LOOP = Math.ceil(tc + 2);
  // stack is used up one roll at a time: top rolls early in the loop, each bottom roll just as its replacement is picked off the truck
  const GONE = []; SLOTS.forEach((_, k) => { const i = 4 - k; GONE[i] = k >= 3 ? 2.5 + (k - 3) * 3 : PICK[i]; });
  FX.push([LOOP, -28.5, 3.7]); LF.push([LOOP, 0.3]);
  const TK = [[0, -66], [6, TKX], [LOOP - 6, TKX], [LOOP, -66]];
  const DS = [[0, 0], [6, 0], [8, 0.94], [LOOP - 8, 0.94], [LOOP - 6, 0]];
  const ease = u => u * u * (3 - 2 * u);
  const key = (K, t) => {
    if (t <= K[0][0]) return K[0].slice(1);
    for (let i = 1; i < K.length; i++) if (t <= K[i][0]) {
      const a = K[i - 1], b = K[i], u = ease((t - a[0]) / (b[0] - a[0]));
      return a.slice(1).map((v, j) => v + (b[j + 1] - v) * u);
    }
    return K[K.length - 1].slice(1);
  };
  let prevX = null;
  const apply = t => {
    const [tx] = key(TK, t); tk.position.x = tx;
    if (prevX !== null) wheels.forEach(w => w.rotation.z -= (tx - prevX) / 0.52);
    prevX = tx;
    hinge.rotation.x = key(DS, t)[0] * Math.PI;
    straps.forEach(m => m.visible = t < 6);
    const [fx, fz] = key(FX, t), lift = key(LF, t)[0];
    fl.position.set(fx, 0, fz); car.position.y = lift;
    const yw = steer(fl, key(FX, t), key(FX, t + 0.05)), sn = Math.sin(yw), cs = Math.cos(yw);
    rolls.forEach((r, i) => {
      const carried = t >= PICK[i] && t < DROP[i];
      r.visible = t < DROP[i]; tops[i].visible = t < GONE[i] || t >= DROP[i];
      if (carried) { r.position.set(fx - 1.35 * sn - tk.position.x - RX[i] * cs, lift - RY, fz - 1.35 * cs - tk.position.z + RX[i] * sn); r.rotation.y = yw; }
      else { r.position.set(0, 0, 0); r.rotation.y = 0; }
    });
  };
  const t0 = performance.now();
  const tick = () => { apply(((performance.now() - t0) / 1000) % LOOP); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

/* ---------- line running: web travel, rollers, press cycle, stacker ---------- */
{
  const V = 0.6, TILE = 0.5, CYC = 8;
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 4;
  const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, 64, 4); cx.fillStyle = '#b9c2cb'; cx.fillRect(0, 0, 3, 4);
  const scroll = (names, cont) => names.map(n => {
    const m = flow.getObjectByName(n), L = m.geometry.parameters.width;
    const tex = new T.CanvasTexture(cv); tex.wrapS = T.RepeatWrapping; tex.repeat.set(L / TILE, 1); tex.colorSpace = T.SRGBColorSpace;
    m.material = m.material.clone(); m.material.name += '_running'; m.material.map = tex;
    return { tex, cont };
  });
  const belts = [...scroll(['web_raw', 'web_printed', 'web_bath_descent', 'web_bath_immersion', 'web_bath_ascent', 'web_impregnated', 'web_cut_sheets'], true)];
  const spinners = [];
  model.traverse(o => { if (o.isMesh && (/_shell$/.test(o.name) || /^conveyor_roller_(infeed_)?\d+$/.test(o.name) || /^unwind_roll_/.test(o.name))) spinners.push({ m: o, r: o.geometry.parameters.radiusTop, cont: !o.name.startsWith('conveyor') }); });
  const press = ['press_upper_platen', 'press_upper_heat_plate', 'hydraulic_ram_1', 'hydraulic_ram_2'].map(n => { const m = s4.getObjectByName(n); return { m, y: m.position.y }; });
  model.updateMatrixWorld(true);
  const sx = new T.Group(); sx.name = 'stacker_travel'; stk.add(sx);
  sx.attach(stk.getObjectByName('stacker_carriage'));
  const sy = new T.Group(); sy.name = 'stacker_lift'; sx.add(sy);
  stk.children.filter(o => o.name === 'stacker_suction_frame' || o.name.startsWith('suction_cup_')).forEach(o => sy.attach(o));
  const col = stk.getObjectByName('stacker_lift_column'); sx.attach(col);
  const sheet = grp(sy, 'transfer_sheet');
  box(sheet, 'transfer_sheet_core', 2.6, 0.036, 2.0, M.mdf, PLX, 1.522, 0);
  box(sheet, 'transfer_sheet_decor', 2.6, 0.004, 2.0, M.decor, PLX, 1.542, 0);
  sheet.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  const boards = Array.from({ length: 12 }, (_, i) => [pal.getObjectByName(`stacked_board_${i + 1}_core`), pal.getObjectByName(`stacked_board_${i + 1}_decor`)]);
  pal.children.filter(o => o.name.startsWith('strap_')).forEach(o => o.visible = false);
  const ease = u => u * u * (3 - 2 * u);
  const seg = (p, K) => { for (let i = 1; i < K.length; i++) if (p <= K[i][0]) { const a = K[i - 1], b = K[i]; return a[1] + (b[1] - a[1]) * ease((p - a[0]) / (b[0] - a[0])); } return K[K.length - 1][1]; };
  const t0 = performance.now(); let last = t0;
  const tick = now => {
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    const t = (now - t0) / 1000, p = t % CYC, k = Math.floor(t / CYC) % 5;
    const indexing = p > 5 && p < 8, bv = indexing ? V * Math.sin(Math.PI * (p - 5) / 3) * 1.6 : 0;
    belts.forEach(b => b.tex.offset.x -= (b.cont ? V : bv) * dt / TILE);
    spinners.forEach(s => s.m.rotation.y -= (s.cont ? V : bv) * dt / s.r);
    const dp = -0.19 * seg(p, [[0, 0], [1, 1], [4, 1], [5, 0], [8, 0]]);
    press.forEach(o => o.m.position.y = o.y + dp);
    const pu = p < 5 ? 0 : ease(Math.min(1, (p - 5) / 3));
    panels.forEach((g, i) => { g.position.x = PANEL_S[i] + PANEL_P * pu; g.visible = i < panels.length - 1 || p < 2; });
    const n = 7 + k, released = p >= 5.2;
    boards.forEach((b, i) => b.forEach(m => m.visible = i < n + (released ? 1 : 0)));
    const up = 0.3, pick = -0.2, place = PB + n * 0.041 - 1.52;
    sx.position.x = seg(p, [[0, 0], [1.2, -1.3], [2.8, -1.3], [4.2, 0], [8, 0]]);
    const dy = seg(p, [[0, up], [1.2, up], [1.8, pick], [2.2, pick], [2.8, up], [4.2, up], [5.2, place], [6, up], [8, up]]);
    sy.position.y = dy;
    const bot = 1.7 + dy; col.scale.y = (3.0 - bot) / 1.3; col.position.y = (3.0 + bot) / 2;
    sheet.visible = p >= 2 && p < 5.2;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- part 1 → part 2 logistics · visible cross-cutting · board supply forklift · decor changeover ---------- */
{
  const ease = u => u * u * (3 - 2 * u);
  const key = (K, t) => {
    if (t <= K[0][0]) return K[0].slice(1);
    for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const a = K[i - 1], b = K[i], u = ease((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * u); }
    return K[K.length - 1].slice(1);
  };
  const lg = grp(model, 'sheet_transfer_logistics');
  const prefix = (root, p) => root.traverse(o => { if (o.name) o.name = p + o.name; });
  const truck = (pre, name, x, z) => {
    const f = fl.clone(true); f.position.set(x, 0, z);
    f.traverse(o => { if (o.name === 'fl_core_ram' || o.name === 'fl_ram_collar') o.visible = false; });
    const c = f.getObjectByName('fl_carriage');
    for (const sd of [1, -1]) box(c, 'fl_fork_' + (sd > 0 ? 'r' : 'l'), 0.12, 0.05, 1.9, M.steelDark, sd * 0.6, -0.245, -1.0);
    prefix(f, pre); f.name = name; lg.add(f); return [f, c];
  };
  const N = 20, SH = 0.02, NB = 16, BH = 0.04;
  const palletBase = (g, n) => {
    for (const [i, x] of [-1.2, 0, 1.2].entries()) box(g, n + '_skid_' + (i + 1), 0.15, 0.1, 2.1, M.mdf, x, 0.05, 0);
    for (let i = 0; i < 6; i++) box(g, n + '_deck_board_' + (i + 1), 2.6, 0.025, 0.12, M.mdf, 0, 0.1125, -0.95 + i * 0.38);
  };
  const sheetPallet = n => {
    const g = grp(lg, n), sheets = [], mat = M.impreg.clone(); mat.name = n + '_sheet_stack';
    palletBase(g, n);
    for (let i = 0; i < N; i++) sheets.push(box(g, n + '_impregnated_sheet_' + (i + 1), 2.5, SH * 0.9, 1.95, mat, 0, 0.125 + i * SH + SH * 0.45, 0));
    return { g, mat, fill: k => sheets.forEach((s, i) => s.visible = i < k) };
  };
  const PBM = std('particleboard', 0xcbb089, 0.95);
  const boardPallet = n => {
    const g = grp(lg, n), boards = [];
    palletBase(g, n);
    for (let i = 0; i < NB; i++) boards.push(box(g, n + '_particleboard_' + (i + 1), 2.6, BH - 0.003, 2.0, PBM, 0, 0.125 + i * BH + (BH - 0.003) / 2, 0));
    return { g, fill: k => boards.forEach((b, i) => b.visible = i < k) };
  };

  // decor programme: gravure changes design every JOBS_PER_DECOR pallets (2 × 40 s loop = 80 s)
  const DEC = [
    { name: 'walnut',        ink: 0x5b3d29, printed: 0xc4a077, impreg: 0xb3895a, decor: 0xa87a4c },
    { name: 'light_oak',     ink: 0x9a7448, printed: 0xe2cba3, impreg: 0xd2b07c, decor: 0xd6b88c },
    { name: 'concrete_grey', ink: 0x5d6164, printed: 0xbfc1c0, impreg: 0xa3a6a6, decor: 0x9a9ea0 },
    { name: 'wenge',         ink: 0x2f221b, printed: 0x7a604d, impreg: 0x684c3a, decor: 0x5a4232 },
  ];
  const JOBS_PER_DECOR = 2;
  const decOf = job => DEC[job < 0 ? 0 : Math.floor((job + 1) / JOBS_PER_DECOR) % DEC.length];
  const LL = 60, DROP_T = 50.6;   // logistics loop: one sheet pallet per 60 s
  const piJob = T => { const L = Math.floor(T / LL), t = T - LL * L; return t >= DROP_T ? L - 1 : L - 2; };
  const d2 = T => decOf(piJob(T)).decor;

  // visible cross-cut: knife on the drum, sheet growing out of the cutter, cut sheet sliding onto the stack
  const web = model.getObjectByName('web_cut_sheets'); if (web) web.visible = false;
  const CTXW = CTX - 4;   // cutter position after the hangar-1 line shift
  const knife = grp(lg, 'cross_cutter_knife_pivot', CTXW, WEB_Y + 0.171, 0);
  box(knife, 'cross_cutter_knife_blade', 0.025, 0.05, W + 0.1, M.steelLight, 0, -0.17, 0);
  const cutMat = M.impreg.clone(); cutMat.name = 'cut_sheet_impregnated';
  // continuous sheet flow: a new sheet every CUT_P s, grows out of the cutter, rides the inspection belt under QC, lands on the stack
  const CUT_P = 3.0, BELT_T = 2.7, PAL0 = 14, RAKE_T = 21.5;   // 20 sheets / 60 s; pallet cycle starts at t = 14; rake holds sheets during the swap
  const sheetPool = [0, 1, 2].map(i => { const m = M.impreg.clone(); m.name = 'cut_sheet_' + (i + 1); return box(lg, 'cut_sheet_' + (i + 1), 2.5, 0.018, 1.95, m, CTXW + 1.25, WEB_Y, 0); });
  const rake = grp(lg, 'stacker_sheet_rake', LX, 0, 0), rakeMat = M.impreg.clone(); rakeMat.name = 'rake_sheet_stack';
  for (let i = 0; i < 5; i++) box(rake, 'rake_tine_' + (i + 1), 0.06, 0.012, 2.1, M.steelLight, -1.0 + i * 0.5, 1.26 + 0.004, -0.1);
  box(rake, 'rake_bar', 2.3, 0.08, 0.1, M.steelDark, 0, 1.26 + 0.03, -1.2);
  const rakeSheets = [0, 1, 2, 3, 4, 5, 6, 7].map(i => box(rake, 'rake_sheet_' + (i + 1), 2.5, 0.018, 1.95, rakeMat, 0, 1.27 + i * 0.02 + 0.009, 0));
  box(lg, 'sheet_inspection_belt', 4.0, 0.06, W + 0.1, M.rubber, 10.15, WEB_Y - 0.042, 0);
  for (const x of [8.6, 11.7]) for (const sd of [1, -1]) box(lg, 'sheet_inspection_belt_leg_' + (x < 10 ? 'in' : 'out') + '_' + (sd > 0 ? 'operator' : 'drive'), 0.08, WEB_Y - 0.07, 0.08, M.steelDark, x, (WEB_Y - 0.07) / 2, sd * W / 2);

  // hangar 2 is turned 180° and set beside hangar 1: its local (x, z) → world (TX - x, TZ - z)
  const TX = 35.9, TZ = 28, LX2 = PRX - 5.2 + OFF;
  const ISX = TX - LX2, ISZ = TZ - 3.0, BBX = TX - 25.6, BBZ = TZ - 3.0;
  const LN = TZ - 6.1, AP = TZ - 4.1, RT = TZ - 4.9, PK = ISX;      // lane, bay approach, retract, park
  const BUF = 20.0, BZ = 11.5, SX0 = 24.2, PX0 = 28.8, SZ0 = 15.0;   // paper store bay, board + pallet stores   // yard buffer bay, yard aisle, stores
  const clad = std('store_cladding', 0xf2f1ec, 0.5, 0.2, { side: T.DoubleSide }), shutMat = std('store_shutter', 0xd6d3cc, 0.5, 0.3);
  const store = (n, label, x) => {
    const st = grp(lg, n), Z0 = 8.1, Z1 = 17.6, ZC = (Z0 + Z1) / 2, D = Z1 - Z0;
    for (const sd of [-1, 1]) box(st, n + '_side_wall_' + (sd < 0 ? 'west' : 'east'), 0.1, 3.6, D, clad, x + sd * 2.1, 1.8, ZC);
    box(st, n + '_back_wall', 4.3, 3.6, 0.1, clad, x, 1.8, Z0);
    box(st, n + '_roof', 4.6, 0.12, D + 0.4, clad, x, 3.66, ZC);
    box(st, n + '_header', 4.3, 0.9, 0.12, M.steelDark, x, 3.15, Z1);
    const c = document.createElement('canvas'); c.width = 1024; c.height = 200; const g = c.getContext('2d');
    g.fillStyle = '#1d1f20'; g.fillRect(0, 0, 1024, 200); g.fillStyle = '#fff'; g.textAlign = 'center';
    g.font = '700 128px "Barlow Condensed","Arial Narrow",Arial,sans-serif'; g.fillText(label, 512, 145, 980);
    const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 8;
    mesh(st, n + '_sign', new T.PlaneGeometry(4.1, 0.8), new T.MeshStandardMaterial({ name: n + '_sign_face', map: tx, emissiveMap: tx, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.6 }), x, 3.15, Z1 + 0.065);
    const sh = grp(lg, n + '_roller_shutter', x, 3.1, Z1 + 0.02);
    box(sh, n + '_shutter_curtain', 4.1, 3.1, 0.05, shutMat, 0, -1.55, 0);
    cylX(st, n + '_shutter_coil', 0.2, 4.2, M.steelDark, x, 3.05, Z1 - 0.17, 24);
    st.traverse(o => { if (o.isMesh) o.userData.noCast = true; });
    return { st, sh, back: Z0 + 0.1 + 1.05 };
  };
  const bStore = store('particleboard_store', 'PARTICLEBOARD STORE', SX0), pStore = store('empty_pallet_store', 'EMPTY PALLET STORE', PX0);
  { const g = grp(bStore.st, 'board_store_stock', SX0, 0, bStore.back); palletBase(g, 'board_store_stock');
    for (let i = 0; i < NB; i++) box(g, 'board_store_stock_board_' + (i + 1), 2.6, BH - 0.003, 2.0, PBM, 0, 0.125 + i * BH + (BH - 0.003) / 2, 0); }
  for (let k = 0; k < 6; k++) { const g = grp(pStore.st, 'empty_pallet_stock_' + (k + 1), PX0, k * 0.125, pStore.back); palletBase(g, 'empty_pallet_stock_' + (k + 1)); }
  // impregnated paper store: drive-through along z in the corridor between the hangar ends and the other stores —
  // collector drops from the south (hangar 1 side), press feeder picks from the north (hangar 2 side, facing the camera)
  {
    const ps = grp(lg, 'impregnated_paper_store'), X0 = BUF - 1.6, X1 = BUF + 1.6, Z0 = BZ - 2.0, Z1 = BZ + 2.0;
    for (const [sd, x] of [['west', X0], ['east', X1]]) box(ps, 'paper_store_wall_' + sd, 0.1, 3.6, Z1 - Z0, clad, x, 1.8, BZ);
    box(ps, 'paper_store_roof', X1 - X0 + 0.4, 0.12, Z1 - Z0 + 0.3, clad, BUF, 3.66, BZ);
    for (const [end, z] of [['north', Z1], ['south', Z0]]) box(ps, 'paper_store_header_' + end, X1 - X0 + 0.1, 0.9, 0.12, M.steelDark, BUF, 3.15, z);
    const c = document.createElement('canvas'); c.width = 1024; c.height = 260; const g = c.getContext('2d');
    g.fillStyle = '#1d1f20'; g.fillRect(0, 0, 1024, 260); g.fillStyle = '#fff'; g.textAlign = 'center';
    g.font = '700 116px "Barlow Condensed","Arial Narrow",Arial,sans-serif'; g.fillText('IMPREGNATED', 512, 118, 980); g.fillText('PAPER STORE', 512, 236, 980);
    const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 8;
    mesh(ps, 'paper_store_sign', new T.PlaneGeometry(3.1, 0.8), new T.MeshStandardMaterial({ name: 'paper_store_sign_face', map: tx, emissiveMap: tx, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.6 }), BUF, 3.15, Z1 + 0.065);
    ps.traverse(o => { if (o.isMesh) o.userData.noCast = true; });
  }
  // empty-pallet dispenser beside the stacker (hangar 1): stack hidden in the cabinet, one pallet at the pick slot
  const DPX = 10.0, DPZ = 5.8, emptyPallet = n => { const g = grp(lg, n); palletBase(g, n); return { g }; };
  {
    const dp = grp(lg, 'empty_pallet_dispenser');
    for (const dx of [-1.2, 1.2]) for (const dz of [-1.45, 1.45]) box(dp, 'dispenser_post_' + (dx < 0 ? 'w' : 'e') + (dz < 0 ? 's' : 'n'), 0.1, 2.2, 0.1, M.steelDark, DPX + dx, 1.1, DPZ + dz);
    box(dp, 'dispenser_panel_west', 0.04, 1.75, 2.9, clad, DPX - 1.2, 1.325, DPZ);
    for (const dz of [-1.45, 1.45]) box(dp, 'dispenser_panel_' + (dz < 0 ? 'south' : 'north'), 2.4, 1.75, 0.04, clad, DPX, 1.325, DPZ + dz);
    box(dp, 'dispenser_roof', 2.25, 0.06, 3.0, M.steelDark, DPX - 0.125, 2.23, DPZ);
    for (let k = 0; k < 4; k++) { const g = grp(dp, 'dispenser_stock_' + (k + 1), DPX, 0.5 + k * 0.125, DPZ); g.rotation.y = Math.PI / 2; palletBase(g, 'dispenser_stock_' + (k + 1)); }
    dp.traverse(o => { if (o.isMesh) o.userData.noCast = true; });
  }
  const pd = emptyPallet('dispenser_pick_pallet'), pm = emptyPallet('new_stacking_pallet');
  pd.g.position.set(DPX, 0, DPZ); pd.g.rotation.y = Math.PI / 2;
  const shut = (t, t0) => Math.max(0.02, t < t0 || t >= t0 + 1.1 ? 0 : t < t0 + 0.4 ? ease((t - t0) / 0.4) : t < t0 + 0.7 ? 1 : 1 - ease((t - t0 - 0.7) / 0.4));
  const [f3, c3] = truck('collect_', 'forklift_sheet_collector', LX, 5.6);
  const [f4, c4] = truck('feed_', 'forklift_press_feeder', PK, LN); f4.userData.yaw = Math.PI;
  const pt = sheetPallet('stacking_pallet'), pc = sheetPallet('transfer_pallet'), pi = sheetPallet('press_feed_pallet');
  const pe = sheetPallet('empty_return_pallet'), pb = boardPallet('particleboard_pallet');
  pc.fill(N); pe.fill(0); pi.g.position.set(ISX, 0, ISZ);

  // decor changeover starts at the printer (02): a new-decor front runs down the web at line speed and reaches the cutter
  // exactly at the pallet change, so every pallet, panel and laminate keeps the decor it was printed with
  const ovMat = { printed: M.printed.clone(), impreg: M.impreg.clone() }; ovMat.printed.name = 'new_decor_printed'; ovMat.impreg.name = 'new_decor_impregnated';
  let acc = 0;
  const fronts = [['web_printed', PX, WEB_Y, -1.6, WEB_Y, 'printed'], ['web_bath_descent', -1.6, WEB_Y, -0.18, 0.46, 'printed'], ['web_bath_immersion', -0.18, 0.46, 0.18, 0.46, 'impreg'],
    ['web_bath_ascent', 0.18, 0.46, 1.6, WEB_Y, 'impreg'], ['web_impregnated', 1.6, WEB_Y, CTX, WEB_Y, 'impreg']].map(([n, x0, y0, x1, y1, kind]) => {
    const L = Math.hypot(x1 - x0, y1 - y0), piv = grp(flow, n + '_new_decor', x0, y0, 0); piv.rotation.z = Math.atan2(y1 - y0, x1 - x0);
    box(piv, n + '_new_decor_strip', L, 0.024, W + 0.004, ovMat[kind], L / 2, 0, 0); piv.visible = false;
    const o = { piv, start: acc, L }; acc += L; return o;
  });
  const WEB_LEN = acc, WEB_V = 0.6, WEB_T = WEB_LEN / WEB_V;
  // colour targets
  const P1 = { ink: new Set(), printed: new Set(), impreg: new Set() };
  model.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) {
    if (m.name.startsWith('gravure_ink')) P1.ink.add(m); else if (m.name.startsWith('paper_printed')) P1.printed.add(m); else if (m.name.startsWith('paper_impregnated')) P1.impreg.add(m);
  } });
  const own = (m, nm) => { m.material = M.decor.clone(); m.material.name = nm; return m.material; };
  const panelMats = panels.map((g, i) => own(g.getObjectByName('finished_panel_' + (i + 1) + '_decor'), 'decor_surface_panel_' + (i + 1)));
  const sheetMat = own(model.getObjectByName('transfer_sheet_decor'), 'decor_surface_transfer');
  const boardMats = Array.from({ length: 12 }, (_, i) => own(pal.getObjectByName('stacked_board_' + (i + 1) + '_decor'), 'decor_surface_stack_' + (i + 1)));
  const dispMat = M.decor.clone(); dispMat.name = 'decor_surface_dispatch';
  model.traverse(o => { if (o.isMesh && /^dispatch_pallet_\d+(_upper)?_laminate_\d+_decor$/.test(o.name)) o.material = dispMat; });

  // collector: full pallet off the lowered table → hangar 1 east door → paper store (from the south) → back →
  // empty pallet from the dispenser → onto the lift table
  const F3 = [[0, LX, 5.6], [14.6, LX, 5.6], [16.6, LX, 1.1], [17.2, LX, 1.1], [19.2, LX, 5.8], [21.9, BUF, 5.8], [23.6, BUF, BZ - 1.1], [24.2, BUF, BZ - 1.1], [25.9, BUF, 5.8], [28.6, LX, 5.8],
    [29.6, DPX + 1.1, DPZ], [30.1, DPX + 1.1, DPZ], [31.1, LX, 5.8], [33.1, LX, 1.1], [33.5, LX, 1.1], [35.5, LX, 5.8], [36, LX, 5.6], [LL, LX, 5.6]];
  const L3 = [[0, 0.35], [16.6, 0.35], [17.2, 0.5], [23.6, 0.5], [24.2, 0.1], [29.6, 0.1], [30.1, 0.35], [33.1, 0.35], [33.5, 0.3], [35.5, 0.3], [36.5, 0.35], [LL, 0.35]];
  // press feeder (hangar 2): empty sheet pallet → onto the empty board pallet → both to the pallet store → fresh particleboard
  // from the board store → board bay → full sheet pallet from the paper store (north side) → press feed bay (05)
  const F4 = [[0, ISX, LN], [1, ISX, LN], [2, ISX, AP], [2.5, ISX, AP], [3.4, ISX, LN], [4.7, BBX, LN], [5.7, BBX, AP], [6.2, BBX, AP], [6.5, BBX, RT], [6.8, BBX, RT], [7.1, BBX, AP], [7.4, BBX, AP], [8.4, BBX, LN],
    [14.8, PX0, LN], [17.3, PX0, SZ0], [18.4, PX0, SZ0], [20.9, PX0, LN], [22.6, SX0, LN], [25.1, SX0, SZ0], [26.2, SX0, SZ0], [28.7, SX0, LN],
    [33.7, BBX, LN], [34.7, BBX, AP], [35.2, BBX, AP], [36.2, BBX, LN], [39.7, BUF, LN], [43, BUF, BZ + 1.1], [43.5, BUF, BZ + 1.1], [46.8, BUF, LN],
    [49.1, ISX, LN], [50.1, ISX, AP], [50.6, ISX, AP], [51.6, ISX, LN], [LL, ISX, LN]];
  const L4 = [[0, 0.1], [2, 0.1], [2.5, 0.4], [5.7, 0.4], [6.2, 0.225], [6.5, 0.225], [6.8, 0.1], [7.1, 0.1], [7.4, 0.3], [17.6, 0.3], [17.8, 0.1], [25.5, 0.1], [25.7, 0.3],
    [34.7, 0.3], [35.2, 0.1], [43, 0.1], [43.5, 0.3], [50.1, 0.3], [50.6, 0.1], [LL, 0.1]];
  const TOPY = 1.26, LOW = TOPY - 0.125 - N * SH, EMPTY = TOPY - 0.125;
  const onForks = (p, f, l) => { const y = f.rotation.y; p.g.position.set(f.position.x - 1.1 * Math.sin(y), l - 0.1, f.position.z - 1.1 * Math.cos(y)); p.g.rotation.y = y; };
  const place = (p, x, y, z, ry = 0) => { p.g.position.set(x, y, z); p.g.rotation.y = ry; };
  const t0 = performance.now();
  const tick = now => {
    const T = (now - t0) / 1000, L = Math.floor(T / LL), t = T - LL * L;
    // decor colours
    const FRONT_T = PAL0 - CUT_P - BELT_T, jobAt = Ta => { const La = Math.floor(Ta / LL); return Ta - LL * La >= PAL0 ? La : La - 1; };
    const jp = Math.floor((T - FRONT_T + WEB_T) / LL), dist = (T - (LL * jp + FRONT_T - WEB_T)) * WEB_V, dNew = decOf(jp), dOld = decOf(jp - 1), done = dist >= WEB_LEN, dWeb = done ? dNew : dOld;
    P1.ink.forEach(m => m.color.setHex(dNew.ink)); P1.printed.forEach(m => m.color.setHex(dWeb.printed)); P1.impreg.forEach(m => m.color.setHex(dWeb.impreg));
    ovMat.printed.color.setHex(dNew.printed); ovMat.impreg.color.setHex(dNew.impreg);
    fronts.forEach(o => { const f = done ? 0 : Math.min(1, Math.max(0, (dist - o.start) / o.L)); o.piv.visible = f > 0.001 && dNew !== dOld; o.piv.scale.x = Math.max(f, 0.001); });
    pt.mat.color.setHex(decOf(t >= 33.5 ? L : L - 1).impreg); rakeMat.color.setHex(decOf(L).impreg);
    pc.mat.color.setHex(decOf(L - 1).impreg);
    pi.mat.color.setHex(decOf(t >= DROP_T ? L - 1 : L - 2).impreg);
    const cyc = k => d2(8 * k + 1), cc = Math.floor(T / 8), kk = cc % 5;
    panelMats.forEach((m, i) => m.color.setHex(cyc(i === 0 ? cc + 1 : cc - i + 1)));
    sheetMat.color.setHex(cyc(cc - 5));
    boardMats.forEach((m, b) => m.color.setHex(cyc((b >= 7 ? cc - kk + b - 7 : cc - kk - 1) - 5)));
    dispMat.color.setHex(cyc(Math.floor(T / 40) * 5 - 20));
    // cutter, inspection belt, rake + lift table
    const TOPY = 1.26, tc = (t - PAL0 + LL) % LL, count = Math.floor(tc / CUT_P) + 1;
    knife.rotation.z = 2 * Math.PI * (((tc + BELT_T) / CUT_P) % 1);
    sheetPool.forEach((m, d) => {
      const k = Math.floor(tc / CUT_P) + 1 + d, land = k * CUT_P, st = land - CUT_P - BELT_T;
      m.visible = tc >= st && tc < land;
      if (!m.visible) return;
      const a = tc - st, kk = k % N, onRake = kk * CUT_P < RAKE_T;
      m.material.color.setHex(decOf(jobAt(T + land - tc)).impreg);
      if (a < CUT_P) { const f = a / CUT_P; m.scale.x = Math.max(f, 0.001); m.position.set(CTXW + 1.25 * f, WEB_Y, 0); }
      else {
        const b = (a - CUT_P) / BELT_T, yT = TOPY + (onRake ? 0.01 + kk * SH : 0) + SH * 0.45;
        m.scale.x = 1; m.position.set(CTXW + 1.25 + (LX - CTXW - 1.25) * b, b < 0.75 ? WEB_Y : WEB_Y + (yT - WEB_Y) * ease((b - 0.75) / 0.25), 0);
      }
    });
    // rake: in before the full pallet drops away, holds the first sheets of the next pallet, out once the new empty pallet is raised
    const R1 = PAL0 + RAKE_T, rIn = t >= 13.2 && t < R1 + 0.3, rz = t < 13.8 ? (1 - ease((t - 13.2) / 0.6)) * -2.4 : t >= R1 ? ease((t - R1) / 0.3) * -2.4 : 0;
    rake.visible = rIn; rake.position.z = rz;
    rakeSheets.forEach((r, i) => r.visible = rIn && t < R1 && tc < RAKE_T && i < count);
    let tt, shown;
    if (t >= 14 && t < 33.5) { shown = N; tt = t < 15 ? (TOPY - 0.125 - N * SH) + (0.25 - (TOPY - 0.125 - N * SH)) * ease(t - 14) : 0.25; }
    else if (t >= 33.5 && t < R1) { shown = 0; tt = t < 34 ? 0.25 : 0.25 + (TOPY - 0.125 - 0.25) * ease((t - 34) / (R1 - 34)); }
    else { shown = count; const base = TOPY - 0.125 - count * SH; tt = tc < RAKE_T + 0.4 ? (TOPY - 0.125) + (base - (TOPY - 0.125)) * ease((tc - RAKE_T) / 0.4) : base; }
    ltPlat.position.y = tt - 0.03; ltCol.scale.y = tt - 0.18; ltCol.position.y = (0.12 + tt - 0.06) / 2;
    pt.g.visible = t < 16.6 || t >= 33.5; pt.g.position.set(LX, tt, 0); pt.fill(shown);
    // forklifts
    const [x3, z3] = key(F3, t), l3 = key(L3, t)[0], [x4, z4] = key(F4, t), l4 = key(L4, t)[0];
    f3.position.set(x3, 0, z3); c3.position.y = l3 + 0.22; steer(f3, key(F3, t), key(F3, t + 0.05));
    f4.position.set(x4, 0, z4); c4.position.y = l4 + 0.22; steer(f4, key(F4, t), key(F4, t + 0.05));
    pStore.sh.scale.y = shut(t, 17.3); bStore.sh.scale.y = shut(t, 25.1);
    // new stacking pallet: dispenser slot → collector forks (29.6) → lift table (33.5); next one drops into the slot
    pm.g.visible = t >= 29.6 && t < 33.5; if (pm.g.visible) onForks(pm, f3, l3);
    pd.g.visible = !(t >= 29.6 && t < 30.6); pd.g.position.y = t >= 30.6 && t < 31.6 ? 0.5 * (1 - ease(t - 30.6)) : 0;
    pc.g.visible = t >= 16.6 && t < DROP_T;
    if (t < 24.2) onForks(pc, f3, l3);
    else if (t < 43) place(pc, BUF, 0, BZ);
    else onForks(pc, f4, l4);
    pi.g.visible = !(t >= 2 && t < DROP_T); pi.fill(t >= DROP_T ? N : Math.round(N * Math.max(0, 1 - (t + LL - DROP_T) / 11)));
    // particleboard: in the bay 35.2 → 7.1; out with the empties, left in the pallet store (17.8), fresh stack from the board store (25.6)
    const inBay = t >= 35.2 || t < 7.1;
    pb.g.visible = inBay || t < 17.8 || t >= 25.6;
    if (inBay) place(pb, BBX, 0, BBZ); else onForks(pb, f4, l4);
    pb.fill(inBay ? Math.round(NB * Math.max(0, 1 - (t >= 35.2 ? t - 35.2 : t + LL - 35.2) / 30)) : t < 17.8 ? 0 : NB);
    pe.g.visible = t >= 2 && t < 17.8;
    if (t < 6.2) onForks(pe, f4, l4);
    else { pe.g.position.copy(pb.g.position); pe.g.position.y += 0.125; pe.g.rotation.y = pb.g.rotation.y; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- hangars: white corrugated arch buildings ---------- */
const HANGARS = [];
{
  const R = 9;
  const stripes = vertical => {
    const c = document.createElement('canvas'); c.width = vertical ? 32 : 4; c.height = vertical ? 4 : 32; const g = c.getContext('2d');
    for (let i = 0; i < 32; i++) { const v = Math.round(214 + 41 * Math.cos(i / 32 * Math.PI * 2)); g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; vertical ? g.fillRect(i, 0, 1, 4) : g.fillRect(0, i, 4, 1); }
    return c;
  };
  const tex = (vertical, rx, ry) => { const t = new T.CanvasTexture(stripes(vertical)); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; };
  const sheet = (n, map) => new T.MeshStandardMaterial({ name: n, color: 0xfbfaf6, roughness: 0.45, metalness: 0.15, side: T.DoubleSide, map, bumpMap: map, bumpScale: 1.5 });
  const trim = std('hangar_trim', 0x55595c, 0.5, 0.4), frame = std('hangar_arch_frame', 0xd9d6cf, 0.5, 0.4);
  const doorFrame = std('hangar_door_frame', 0x6b6f72, 0.5, 0.4), louvre = std('hangar_louvre', 0x2b2e30, 0.6, 0.3);
  const ribGeo = new T.TorusGeometry(R - 0.15, 0.07, 6, 24, Math.PI / 2);
  const endMap = tex(true, 1 / 0.3, 1);
  const shell = (g, n, x0, x1, near) => {
    const L = x1 - x0, geo = new T.CylinderGeometry(R, R, L, 64, 1, true, near ? 0 : Math.PI / 2, Math.PI / 2);
    geo.rotateZ(Math.PI / 2);
    return mesh(g, n, geo, sheet(n + '_sheeting', tex(false, 1, L / 0.3)), (x0 + x1) / 2, 0, 0);
  };
  const endWall = (g, n, x, doors, out, label) => {
    const s = new T.Shape(); s.moveTo(-R, 0); s.absarc(0, 0, R, Math.PI, 0, true);
    doors.map(d => [-d.z - d.w / 2, -d.z + d.w / 2, d.h]).sort((p, q) => q[0] - p[0]).forEach(([a, b, h]) => { s.lineTo(b, 0); s.lineTo(b, h); s.lineTo(a, h); s.lineTo(a, 0); });
    s.lineTo(-R, 0);
    const w = mesh(g, n + '_wall', new T.ShapeGeometry(s, 48), sheet(n + '_cladding', endMap), x, 0, 0); w.rotation.y = Math.PI / 2;
    const tr = mesh(g, n + '_edge_trim', new T.TorusGeometry(R, 0.12, 8, 64, Math.PI), trim, x, 0, 0); tr.rotation.y = Math.PI / 2;
    const fx = x + out * 0.06;
    doors.forEach((d, i) => {
      const k = n + '_door_' + (i + 1);
      for (const sd of [1, -1]) box(g, k + '_jamb_' + (sd > 0 ? 'a' : 'b'), 0.16, d.h + 0.15, 0.16, doorFrame, fx, (d.h + 0.15) / 2, d.z + sd * (d.w / 2 + 0.08));
      box(g, k + '_header', 0.16, 0.16, d.w + 0.32, doorFrame, fx, d.h + 0.08, d.z);
      const zmax = Math.abs(d.z) + d.w / 2 + 0.1;
      if (Math.sqrt(R * R - zmax * zmax) > d.h + 0.75) {
        cylZ(g, k + '_shutter_coil', 0.24, d.w + 0.1, doorFrame, x - out * 0.3, d.h + 0.42, d.z, 32);
        box(g, k + '_shutter_hood', 0.55, 0.06, d.w + 0.2, trim, x - out * 0.3, d.h + 0.69, d.z);
      }
      box(g, k + '_threshold', 0.6, 0.004, d.w, M.marking, x, 0.003, d.z);
    });
    for (const z of [-2.4, 2.4]) {
      box(g, n + '_window_frame_' + (z < 0 ? 'drive' : 'operator'), 0.08, 0.8, 1.7, doorFrame, fx, 6.0, z);
      box(g, n + '_window_glass_' + (z < 0 ? 'drive' : 'operator'), 0.1, 0.68, 1.58, M.glass, fx, 6.0, z);
      for (let j = 1; j < 3; j++) box(g, n + '_window_mullion_' + (z < 0 ? 'drive' : 'operator') + '_' + j, 0.12, 0.68, 0.04, doorFrame, fx, 6.0, z - 0.79 + j * 0.527);
    }
    box(g, n + '_louvre', 0.1, 0.75, 0.75, louvre, fx, 6.0, 0);
    for (let j = 0; j < 5; j++) box(g, n + '_louvre_slat_' + (j + 1), 0.14, 0.03, 0.7, doorFrame, fx + out * 0.02, 5.7 + j * 0.15, 0);
    const c = document.createElement('canvas'); c.width = 1040; c.height = 430; const g2 = c.getContext('2d');
    g2.fillStyle = '#1d1f20'; g2.fillRect(0, 0, 1040, 430); g2.fillStyle = '#b3342b'; g2.fillRect(0, 0, 1040, 22);
    g2.fillStyle = '#ffffff'; g2.textAlign = 'center';
    g2.font = '700 180px "Barlow Condensed","Arial Narrow",Arial,sans-serif'; g2.fillText(label[0], 520, 205, 980);
    g2.font = '600 130px "Barlow Condensed","Arial Narrow",Arial,sans-serif'; g2.fillText(label[1], 520, 370, 980);
    const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 8;
    box(g, n + '_nameplate_frame', 0.08, 2.04, 4.84, louvre, fx, 7.55, 0);
    const np = mesh(g, n + '_nameplate', new T.PlaneGeometry(4.6, 1.9), new T.MeshStandardMaterial({ name: n + '_nameplate_face', map: tx, emissiveMap: tx, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.5 }), fx + out * 0.045, 7.55, 0);
    np.rotation.y = out * Math.PI / 2;
  };
  const hangar = (n, x0, x1, westDoors, eastDoors, label) => {
    const g = grp(model, n), Hg = { g, x0, x1 };
    Hg.near = grp(g, n + '_operator_side'); Hg.far = grp(g, n + '_drive_side');
    Hg.west = grp(g, n + '_west_end'); Hg.east = grp(g, n + '_east_end');
    box(g, n + '_floor_slab', x1 - x0, 0.15, 2 * R, M.concrete, (x0 + x1) / 2, -0.075, 0);
    shell(Hg.near, n + '_shell_operator_side', x0, x1, true);
    shell(Hg.far, n + '_shell_drive_side', x0, x1, false);
    for (const sd of [1, -1]) box(sd > 0 ? Hg.near : Hg.far, n + '_base_rail_' + (sd > 0 ? 'operator' : 'drive'), x1 - x0, 0.22, 0.22, trim, (x0 + x1) / 2, 0.11, sd * (R - 0.08));
    const nr = Math.ceil((x1 - x0) / 4.5);
    for (let i = 1; i < nr; i++) for (const sd of [1, -1]) {
      const r = mesh(sd > 0 ? Hg.near : Hg.far, n + '_arch_rib_' + i + '_' + (sd > 0 ? 'operator' : 'drive'), ribGeo, frame, x0 + i * (x1 - x0) / nr, 0, 0);
      r.rotation.y = -sd * Math.PI / 2;
    }
    endWall(Hg.west, n + '_west', x0, westDoors, -1, label);
    endWall(Hg.east, n + '_east', x1, eastDoors, 1, label);
    g.traverse(o => { if (o.isMesh) o.userData.noCast = true; });
    HANGARS.push(Hg);
  };
  hangar('hangar_1', -35.8, 15.6, [{ z: 3.7, w: 3.6, h: 3.6 }], [{ z: 5.8, w: 3.6, h: 3.6 }], ['HANGAR-1', '01 · 02 · 03 · 04']);
  hangar('hangar_2', 20.3, 54.0, [{ z: 6.4, w: 3.4, h: 3.4 }], [{ z: 6.1, w: 3.4, h: 3.4 }], ['HANGAR-2', '05 · 06']);
}
{
  const q = grp(model, 'sheet_quality_control');
  const g1 = gan.clone(true); g1.traverse(o => { o.name = 'h1_' + o.name; }); g1.position.x = 9.8 - GX; q.add(g1);
  const gl = gloss.clone(true); gl.traverse(o => { o.name = 'h1_' + o.name; }); gl.position.x = 11.4 - GLX; q.add(gl);
  const d1 = desk.clone(true); d1.traverse(o => { o.name = 'h1_' + o.name; }); d1.position.x = 9.6 - QX; q.add(d1);
  const w6 = model.getObjectByName('worker_05_quality').clone(true); w6.traverse(o => { o.name = o.name.replace('worker_05_quality', 'worker_06_sheet_qc'); });
  w6.position.set(9.7, 0, QZ + 0.55); q.add(w6);
  sign(q, 'sign_04', 4, 7.6, 3.0);
  const t0 = performance.now();
  const idle = now => { const t = (now - t0) / 1000; w6.rotation.y = 0.45 * Math.max(0, Math.sin(t * 0.6)) - 0.1; requestAnimationFrame(idle); };
  requestAnimationFrame(idle);
}
{
  const L1 = new T.Group(); L1.name = 'hangar_1_line'; model.add(L1);
  model.attach(lt);
  [s1, s2, s3].forEach(o => L1.attach(o));
  flow.children.filter(o => /^web_/.test(o.name)).forEach(o => L1.attach(o));
  model.children.filter(o => /^guide_stand_/.test(o.name)).forEach(o => L1.attach(o));
  ['zone_line_1', 'zone_line_2'].forEach(n => { const o = site.getObjectByName(n); if (o) L1.attach(o); });
  L1.position.x = -4;
}
// hangar 2 zone (04–05, its hangar, markings, outbound truck + forklift): turned 180° and placed parallel to hangar 1
{
  const P2 = new T.Group(); P2.name = 'hangar_2_zone'; model.add(P2);
  const take = o => { if (o) P2.attach(o); };
  [s4, s5, conv, model.getObjectByName('hangar_2')].forEach(take);
  panels.forEach(take);
  ['zone_line_4', 'zone_line_5', 'hangar_sign_2'].forEach(n => take(site.getObjectByName(n)));
  site.children.filter(o => /^(press_feed_bay|board_feed_bay)_/.test(o.name)).forEach(take);
  const tr2 = tray.clone(true); tr2.traverse(o => { o.name = 'h2_' + o.name; }); tr2.position.x = 38.5; P2.add(tr2);
  box(P2, 'h2_aisle_line_operator', 32, 0.004, 0.1, M.marking, 37, 0.002, 3.4);
  box(P2, 'h2_aisle_line_drive', 32, 0.004, 0.1, M.marking, 37, 0.002, -3.4);
  P2.position.set(35.9, 0, 28); P2.rotation.y = Math.PI;
}

/* ---------- centre on origin, base at y = 0 ---------- */
const bb = new T.Box3().setFromObject(model), c = bb.getCenter(new T.Vector3());
model.position.set(-c.x, -bb.min.y, -c.z);
model.traverse(o => { if (o.isMesh) { o.castShadow = !o.userData.noCast; o.receiveShadow = true; } });
stage.setObject(model);
{
  const C = stage._controls, MB = T.MOUSE, TO = T.TOUCH;
  C.mouseButtons = { LEFT: MB.ROTATE, MIDDLE: MB.DOLLY, RIGHT: MB.PAN };
  C.touches = { ONE: TO.ROTATE, TWO: TO.DOLLY_PAN };
  C.screenSpacePanning = false;
  C.panSpeed = 1.2;
  const note = (stage.shadowRoot || stage).querySelector('.note');
  if (note) note.textContent = 'Drag to orbit · right-drag to pan · scroll to zoom';
}
{
  const cam = stage._camera, tgt = stage._controls.target;
  cam.position.sub(tgt).multiplyScalar(0.3).add(tgt);
  cam.near = Math.max(cam.near * 0.3, 0.01);
  cam.updateProjectionMatrix();
  stage._controls.update();
}
/* ---------- hangar view mode: cutaway (walls facing the camera hidden) · solid · hidden ---------- */
{
  const cam = stage._camera, v = new T.Vector3(), MODES = ['Cutaway', 'Solid', 'Hidden'];
  let mode = 0;
  const btn = document.createElement('button');
  btn.type = 'button';
  Object.assign(btn.style, { position: 'fixed', top: '16px', left: '16px', zIndex: 10, font: '600 14px/1 "Barlow Condensed","Arial Narrow",sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '10px 14px', color: '#f2f2f3', background: '#5980a6', border: '1px solid #3f6286', borderRadius: '0', cursor: 'pointer' });
  const label = () => { btn.textContent = 'Hangars: ' + MODES[mode]; };
  btn.onmouseenter = () => btn.style.background = '#4a7096'; btn.onmouseleave = () => btn.style.background = '#5980a6';
  btn.onclick = () => { mode = (mode + 1) % 3; label(); };
  label(); document.body.appendChild(btn);
  const loop = () => {
    const cut = mode === 0, cz = cam.position.z;
    HANGARS.forEach(H => { H.cz = H.g.localToWorld(new T.Vector3((H.x0 + H.x1) / 2, 0, 0)).z; });
    HANGARS.forEach(H => {
      v.copy(cam.position); H.g.worldToLocal(v);
      const farOK = !HANGARS.some(G => G !== H && Math.sign(G.cz - H.cz) === Math.sign(H.cz - cz));
      H.g.visible = mode !== 2;
      H.near.visible = !cut || (v.z < 0 && farOK); H.far.visible = !cut || (v.z >= 0 && farOK);
      H.west.visible = !cut || v.x > H.x0; H.east.visible = !cut || v.x < H.x1;
    });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
