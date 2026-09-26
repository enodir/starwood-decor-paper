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
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd' };
function digit(p, n, d, cx, cy, z, dw = 0.12, dh = 0.22, t = 0.025) {
  const pos = { a: [0, dh / 2, 1], d: [0, -dh / 2, 1], g: [0, 0, 1], f: [-dw / 2, dh / 4, 0], b: [dw / 2, dh / 4, 0], e: [-dw / 2, -dh / 4, 0], c: [dw / 2, -dh / 4, 0] };
  for (const s of SEG[d]) { const [x, y, hor] = pos[s]; box(p, `${n}_seg_${s}`, hor ? dw : t, hor ? t : dh / 2, 0.01, M.paper, cx + x, cy + y, z); }
}
const SIGN_NAMES = { 1: 'RAW MATERIAL ARRIVAL', 2: 'GRAVURE PRINTING', 3: 'IMPREGNATION', 4: 'PRESSING', 5: 'QUALITY CONTROL' };
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
  cylY(g, `${n}_post`, 0.05, 3.0, M.rubber, x, 1.5, z - 0.06, 16);
  box(g, `${n}_plate`, 1.5, 0.96, 0.05, M.rubber, x, 3.0, z);
  mesh(g, `${n}_face`, new T.PlaneGeometry(1.44, 0.9), face, x, 3.0, z + 0.026);
  const back = mesh(g, `${n}_face_back`, new T.PlaneGeometry(1.44, 0.9), face, x, 3.0, z - 0.026); back.rotation.y = Math.PI;
  box(g, `${n}_base`, 0.4, 0.04, 0.4, M.rubber, x, 0.02, z - 0.06);
  return g;
}

/* =======================================================
   FLOOR, MARKINGS, SERVICES
   ======================================================= */
const site = grp(model, 'site');
box(site, 'factory_floor', 78, 0.15, 18, M.concrete, 3, -0.075, 0);
box(site, 'aisle_line_operator', 70, 0.004, 0.1, M.marking, -1, 0.002, 3.4);
box(site, 'aisle_line_drive', 54, 0.004, 0.1, M.marking, 6, 0.002, -3.4);
for (const [i, x] of [-15.2, -4.6, 11.0, 19.6].entries())
  box(site, `zone_line_${i + 1}`, 0.1, 0.004, 6.8, M.marking, x, 0.002, 0);
const tray = grp(site, 'cable_tray'), TX0 = -18, TX1 = 29, TL = TX1 - TX0, TC = (TX0 + TX1) / 2;
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
for (const [i, rx] of [-3.3, -1.9].entries()) {
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
const fl = grp(s1, 'forklift_roll_handler', -29.45, 0, 4.4); fl.rotation.y = Math.PI / 2;
rbox(fl, 'fl_chassis', 1.2, 0.6, 2.1, 0.08, M.paint, 0, 0.6, 1.3);
rbox(fl, 'fl_counterweight', 1.22, 0.75, 0.5, 0.12, M.steelDark, 0, 0.78, 2.3);
rbox(fl, 'fl_seat', 0.5, 0.12, 0.5, 0.05, M.rubber, 0, 1.0, 1.55);
rbox(fl, 'fl_seat_back', 0.5, 0.5, 0.1, 0.04, M.rubber, 0, 1.3, 1.82);
cylBetween(fl, 'fl_steering_column', 0.035, [0, 0.9, 0.75], [0, 1.35, 1.05], M.steelDark, 12);
{ const sw = mesh(fl, 'fl_steering_wheel', new T.TorusGeometry(0.17, 0.02, 8, 32), M.rubber, 0, 1.37, 1.07); sw.rotation.x = -1.0; }
for (const [px, pz] of [[0.52, 0.72], [-0.52, 0.72], [0.52, 2.0], [-0.52, 2.0]]) cylY(fl, 'fl_guard_post_' + (px > 0 ? 'r' : 'l') + (pz < 1 ? 'f' : 'b'), 0.035, 1.35, M.steelDark, px, 1.575, pz, 12);
rbox(fl, 'fl_overhead_guard', 1.14, 0.05, 1.4, 0.02, M.steelDark, 0, 2.27, 1.36);
// wheels: steer knuckle (the rear axle steers) › spinning hub › lathed tyre with tread lugs, rim, hub cap, nuts
const flNut = new T.CylinderGeometry(0.016, 0.016, 0.03, 6);
function flTyre(r, w) {
  const h = w / 2, pts = [[r * 0.6, -h], [r - 0.03, -h], [r - 0.008, -h + 0.02], [r, -h + 0.05], [r, h - 0.05], [r - 0.008, h - 0.02], [r - 0.03, h], [r * 0.6, h]];
  const g = new T.LatheGeometry(pts.map(([a, b]) => new T.Vector2(a, b)), 40); g.rotateZ(Math.PI / 2); return g;
}
for (const [wx, wz, r] of [[0.52, 0.45, 0.32], [-0.52, 0.45, 0.32], [0.52, 2.05, 0.26], [-0.52, 2.05, 0.26]]) {
  const n = 'fl_wheel_' + (wx > 0 ? 'r' : 'l') + (wz < 1 ? 'f' : 'b'), o = Math.sign(wx), hub = grp(grp(fl, n + '_steer', wx, r, wz), n + '_spin');
  mesh(hub, n + '_tyre', flTyre(r, 0.26), M.rubber, 0, 0, 0);
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; box(hub, `${n}_tread_${k + 1}`, 0.2, 0.024, 0.07, M.rubber, 0, Math.cos(a) * r, Math.sin(a) * r).rotation.x = a; }
  cylX(hub, n + '_rim', r * 0.64, 0.22, M.steelLight, 0, 0, 0, 28);
  cylX(hub, n + '_hub_cap', r * 0.24, 0.05, M.steelDark, o * 0.11, 0, 0, 20);
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; mesh(hub, `${n}_nut_${k + 1}`, flNut, M.steelDark, o * 0.115, Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4).rotation.z = Math.PI / 2; }
}
for (const sd of [1, -1]) box(fl, 'fl_mast_' + (sd > 0 ? 'r' : 'l'), 0.1, 2.9, 0.14, M.steelDark, sd * 0.38, 1.5, 0.12);
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
guideStand(model, 'guide_stand_03_04', 11.6);

/* =======================================================
   04 — PRESSING (short-cycle platen press)
   ======================================================= */
const s4 = grp(model, 'station_04_pressing'), PRX = 15.5;
sign(s4, 'sign_04', 4, PRX, 3.5);
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
cabinet(s4, 'press_control_cabinet', 12.9, 2.55);

// continuous roller conveyor: press outfeed through QC
const conv = grp(model, 'roller_conveyor'), CX0 = 18.1, CX1 = 28.8, CL = CX1 - CX0, CR = 0.06, BOARD_BOT = WEB_Y - 0.049;
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

/* =======================================================
   05 — QUALITY CONTROL + STACKING
   ======================================================= */
const s5 = grp(model, 'station_05_quality_control'), GX = 23.2;
sign(s5, 'sign_05', 5, 26.6, 3.0);
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
strip(flow, 'web_impregnated', 1.6, WEB_Y, PRX - 1.8, WEB_Y, M.impreg);
const BX0 = PRX - 1.8, BX1 = CX1 - 0.2;
// pressed board, cut to final panels: one in the press, the rest indexing along the conveyor to the stacker
const PANEL_L = 2.6, PANEL_S = [15.5, 18.26, 21.02, 23.78, 26.54, 29.3], PANEL_P = 2.76;
const panels = PANEL_S.map((x, i) => {
  const g = grp(flow, `finished_panel_${i + 1}`, x, 0, 0);
  rbox(g, `finished_panel_${i + 1}_core`, PANEL_L, 0.044, W, 0.004, M.mdf, 0, BOARD_BOT + 0.022, 0);
  box(g, `finished_panel_${i + 1}_decor`, PANEL_L - 0.004, 0.006, W - 0.004, M.decor, 0, WEB_Y + 0.002, 0);
  return g;
});

/* ---------- driving: rear-steer forklift routes ---------- */
// A route is traced by the front (drive) axle midpoint, the one point on a rear-steer truck that never slips
// sideways, and the body always points along the path (forks trailing it in reverse), so nothing crabs.
// Poses are [axle x, axle z, ψ]; forks face (−sin ψ, −cos ψ). Steps:
//   {go: [[x, z], …], r, rev, v, lift: [to, from, until]}  drive through the points, corners filleted at r
//   {lift, d}  raise/lower in place · {wait} · {until: t}   — `mark` records a step's start time
const FL_AXLE = 0.45, FL_BASE = 1.6, FL_ACC = 1.8;
const wrapA = a => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
const smooth = u => (u = Math.min(1, Math.max(0, u)), u * u * (3 - 2 * u));
function fillet(pts, r) {
  const out = []; let [cx, cz] = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const [x1, z1] = pts[i], L = Math.hypot(x1 - cx, z1 - cz), ux = (x1 - cx) / L, uz = (z1 - cz) / L;
    if (i === pts.length - 1) { if (L > 1e-6) out.push({ x: cx, z: cz, ux, uz, len: L }); break; }
    const [x2, z2] = pts[i + 1], N = Math.hypot(x2 - x1, z2 - z1), vx = (x2 - x1) / N, vz = (z2 - z1) / N;
    const turn = Math.atan2(ux * vz - uz * vx, ux * vx + uz * vz), sg = Math.sign(turn), d = r * Math.tan(Math.abs(turn) / 2);
    const sx = x1 - ux * d, sz = z1 - uz * d, ox = sx - sg * uz * r, oz = sz + sg * ux * r;
    out.push({ x: cx, z: cz, ux, uz, len: L - d }, { ox, oz, r, th: Math.atan2(sz - oz, sx - ox), sg, len: r * Math.abs(turn) });
    cx = x1 + vx * d; cz = z1 + vz * d;
  }
  return out;
}
// point + unit tangent at arc length s
function along(path, s) {
  for (const p of path) {
    if (s <= p.len || p === path[path.length - 1]) {
      s = Math.min(s, p.len);
      if (p.ox === undefined) return [p.x + p.ux * s, p.z + p.uz * s, p.ux, p.uz];
      const th = p.th + p.sg * s / p.r;
      return [p.ox + p.r * Math.cos(th), p.oz + p.r * Math.sin(th), -p.sg * Math.sin(th), p.sg * Math.cos(th)];
    }
    s -= p.len;
  }
}
// accelerate at a to v, cruise, brake to a stop
function trapezoid(L, v, a = FL_ACC) {
  const ta = Math.min(v / a, Math.sqrt(L / a)), vp = a * ta, dur = 2 * ta + (L - a * ta * ta) / vp;
  return { dur, s: t => t < ta ? a * t * t / 2 : t > dur - ta ? L - a * (dur - t) ** 2 / 2 : a * ta * ta / 2 + vp * (t - ta) };
}
function route(start, lift0, steps) {
  const legs = [], marks = {};
  let [ax, az, psi] = start, lift = lift0, t = 0, D = 0;
  const face = (tx, tz, rev) => rev ? Math.atan2(tx, tz) : Math.atan2(-tx, -tz);
  for (const st of steps) {
    if (st.mark) marks[st.mark] = t;
    const leg = { t0: t, ax, az, psi, lift, D };
    if (st.go) {
      const path = fillet([[ax, az], ...st.go], st.r || 0.5), L = path.reduce((s, p) => s + p.len, 0), pr = trapezoid(L, st.v || 2);
      const [l1, lu0, lu1] = [].concat(st.lift ?? lift, 0, 1), e = along(path, L);
      Object.assign(leg, { path, L, pr, dir: st.rev ? -1 : 1, rev: !!st.rev, l1, lu0, lu1, dur: pr.dur });
      [ax, az] = e; psi = face(e[2], e[3], st.rev); lift = l1; D += leg.dir * L;
    } else if (st.d !== undefined) Object.assign(leg, { dur: st.d, l1: st.lift, lu0: 0, lu1: 1 }), lift = st.lift;
    else leg.dur = st.until !== undefined ? Math.max(0, st.until - t) : st.wait;
    t += leg.dur; legs.push(leg);
  }
  // k = heading change per metre driven (signed by gear), averaged over ±0.35 m so the steer eases in and out
  const at = time => {
    time = Math.min(Math.max(time, 0), t);
    const l = legs.find(g => time < g.t0 + g.dur) || legs[legs.length - 1], u = l.dur > 0 ? (time - l.t0) / l.dur : 1;
    const lf = l.l1 === undefined ? l.lift : l.lift + (l.l1 - l.lift) * smooth((u - l.lu0) / (l.lu1 - l.lu0));
    if (!l.path) return { x: l.ax, z: l.az, psi: l.psi, lift: lf, D: l.D, v: 0, k: null, rev: false };
    const tt = time - l.t0, s = l.pr.s(tt), [x, z, tx, tz] = along(l.path, s), s0 = Math.max(0, s - 0.35), s1 = Math.min(l.L, s + 0.35);
    const a = along(l.path, s0), b = along(l.path, s1);
    const k = s1 - s0 > 1e-6 ? l.dir * wrapA(face(b[2], b[3], l.rev) - face(a[2], a[3], l.rev)) / (s1 - s0) : 0;
    const v = (l.pr.s(Math.min(l.dur, tt + 0.02)) - l.pr.s(Math.max(0, tt - 0.02))) / 0.04;
    return { x, z, psi: face(tx, tz, l.rev), lift: lf, D: l.D + l.dir * s, v, k, rev: l.rev };
  };
  // body origin (mast base) sits FL_AXLE ahead of the drive axle
  const pose = time => { const p = at(time); p.ox = p.x - FL_AXLE * Math.sin(p.psi); p.oz = p.z - FL_AXLE * Math.cos(p.psi); return p; };
  return { T: t, D, marks, pose };
}
// a forklift's moving parts, found by name so clones work too
function forkliftRig(f, carY) {
  const find = s => { let o; f.traverse(c => { if (!o && c.name.endsWith(s)) o = c; }); return o; };
  return { f, carY, car: find('fl_carriage'), op: rigOf(find('fl_operator'), 3), steer: 0, back: 0,
    wheels: ['rf', 'lf', 'rb', 'lb'].map(k => ({ steer: find(`fl_wheel_${k}_steer`), spin: find(`fl_wheel_${k}_spin`), r: k[1] === 'f' ? 0.32 : 0.26, rear: k[1] === 'b' })) };
}
// place the truck from its route: wheels roll with distance driven, the rear pair steers to the path's curvature
function drive(k, R, el, loop, dt) {
  const p = R.pose(el % loop), D = p.D + Math.floor(el / loop) * R.D;
  k.f.position.set(p.ox, 0, p.oz); k.f.rotation.y = p.psi; k.car.position.y = p.lift + k.carY;
  if (p.k !== null) k.steer += (-Math.atan(FL_BASE * p.k) - k.steer) * Math.min(1, dt * 8);
  for (const w of k.wheels) { w.spin.rotation.x = -D / w.r; if (w.rear) w.steer.rotation.y = k.steer; }
  k.back += (+p.rev - k.back) * Math.min(1, dt * 3.5);
  seat(k.op, k.back, k.steer);
  return p;
}

/* ---------- people: rig posing — walk cycle, work poses, seated drivers ---------- */
// Joints are set every frame from a gait phase that advances with distance walked, so a stance foot stays
// planted: legs are two-bone IK to ankle targets (heel strike → roll over the ball → toe-off → swing arc),
// the pelvis dips at double support, arms counter-swing, the chest twists against the stride and the head
// holds level. Turning on the spot marks time with small steps instead of sliding round.
const HIP = 0.95, THIGH = 0.43, SHIN = 0.44, ANK = 0.085, UARM = 0.29, FARM = 0.285;
const VN = 1.1, STRIDE = 1.1, DUTY = 0.62;
const staff = {}, _m = new T.Matrix4(), _v = new T.Vector3();
function rigOf(g, seed = 0) {
  const f = s => { let o; g.traverse(c => { if (!o && c.name.endsWith(s)) o = c; }); return o; };
  return { g, seed, phase: 0, hips: f('_hips'), sp: f('_spine'), neck: f('_neck'), head: f('_head'),
    legs: ['l', 'r'].map(s => ({ hip: f('_hip_' + s), knee: f('_knee_' + s), ank: f('_ankle_' + s) })),
    arms: ['l', 'r'].map(s => ({ sh: f('_shoulder_' + s), el: f('_elbow_' + s), wr: f('_wrist_' + s) })) };
}
// two-bone chain from a joint toward a target `up`/`fwd` of it → [aim, open, bend]
function ik2(l1, l2, up, fwd) {
  const d = Math.min(Math.max(Math.hypot(up, fwd), Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-4);
  return [Math.atan2(fwd, -up), Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)), Math.PI - Math.acos((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2))];
}
// knee forward, boot held at `pitch` (+ toe up) whatever the shin does
function legTo(L, hipY, fwd, up, pitch) {
  const [a, o, b] = ik2(THIGH, SHIN, up - hipY, fwd);
  L.hip.rotation.x = a + o; L.knee.rotation.x = -b; L.ank.rotation.x = pitch - (a + o - b);
}
// ankle offset as the boot rocks on its heel (toe up) or on the ball of the foot (heel up)
function rock(pitch) {
  const f = pitch > 0 ? 0.08 : -0.135, c = Math.cos(pitch), s = Math.sin(pitch);
  return [f * c - ANK * s - f, f * s + ANK * c - ANK];
}
// hand i toward a point in the rig's root space, blended in by w
function aim(r, i, x, y, z, w) {
  const A = r.arms[i], S = A.sh.rotation;
  r.hips.updateMatrix(); r.sp.updateMatrix();
  _v.set(x, y, z).applyMatrix4(_m.multiplyMatrices(r.hips.matrix, r.sp.matrix).invert()).sub(A.sh.position);
  const [a, o, b] = ik2(UARM, FARM, _v.y, Math.hypot(_v.x, _v.z));
  S.x += (a - o - S.x) * w; S.y += (Math.atan2(-_v.x, -_v.z) - S.y) * w; S.z -= S.z * w;
  A.el.rotation.x += (b - A.el.rotation.x) * w;
}
// s: {v speed, w turn rate, act, aw action weight, at time into it, arg} from walkPlan
function stride(r, s, dt, t) {
  const a = Math.min(1, s.v / VN), turn = Math.min(1, Math.abs(s.w) / 2.2), idle = 1 - a;
  if (Math.max(a, turn) > 0.01) r.phase = (r.phase + dt * Math.max(s.v, VN) / STRIDE) % 1;
  const ph = r.phase, span = STRIDE * DUTY * a, lift = 0.1 * a + 0.055 * turn * idle, pa = Math.max(a, 0.3 * turn);
  const hy = HIP - 0.006 - a * (0.012 + 0.036 * (0.5 + 0.5 * Math.cos(4 * Math.PI * (ph - 0.06)))) - 0.012 * turn;
  r.hips.position.set(0, hy, 0);
  r.legs.forEach((L, i) => {
    const p = (ph + 0.5 * i) % 1, st = p < DUTY, u = st ? p / DUTY : (p - DUTY) / (1 - DUTY);
    const pitch = pa * (st ? 0.26 * Math.max(0, 1 - u / 0.14) ** 2 - 0.42 * smooth((u - 0.62) / 0.38) : -0.42 + 0.68 * smooth(u / 0.7));
    const [df, du] = rock(pitch);
    legTo(L, hy, (st ? 0.5 - u : smooth(u) - 0.5) * span + df, ANK + du + (st ? 0 : lift * Math.sin(Math.PI * u)), pitch);
  });
  const c = Math.cos(2 * Math.PI * ph), sw = Math.sin(2 * Math.PI * (ph - 0.06)), br = Math.sin(t * 1.5 + r.seed);
  r.sp.position.set(-0.016 * a * sw + 0.008 * idle * Math.sin(t * 0.45 + r.seed), 0.08, 0);
  r.sp.rotation.set(-0.05 * a + 0.012 * br, 0.09 * a * c, 0.02 * a * sw);
  r.neck.rotation.set(0.04 * a, -0.07 * a * c + 0.1 * idle * Math.sin(t * 0.31 + 2 * r.seed), 0);
  r.head.rotation.set(0, 0, 0);
  r.arms.forEach((A, i) => {
    const side = i ? 1 : -1, fw = 0.42 * a * c * side;   // right arm swings with the left leg
    A.sh.rotation.set(fw - 0.03, 0, side * (0.07 + 0.012 * br));
    A.el.rotation.x = 0.16 + 0.2 * a + 0.4 * Math.max(0, fw);
    A.wr.rotation.x = 0.1;
  });
  if (s.act && s.aw > 0) work(r, s);
}
// upper-body work poses layered over the stride, faded in and out with the step
function work(r, s) {
  const w = s.aw, at = s.at, mix = (o, k, v) => { o[k] += (v - o[k]) * w; }, [L, R] = r.arms;
  if (s.act === 'look') { mix(r.neck.rotation, 'y', 0.75 * Math.sin(at * 0.8)); mix(r.head.rotation, 'x', 0.04); }
  else if (s.act === 'inspect') {   // lean in, hands clasped behind the back, eyes on the job
    mix(r.sp.rotation, 'x', -0.28); mix(r.head.rotation, 'x', -0.35 + 0.07 * Math.sin(at * 1.4)); mix(r.neck.rotation, 'y', 0.25 * Math.sin(at * 0.6));
    for (const [A, sd] of [[L, -1], [R, 1]]) { mix(A.sh.rotation, 'x', 0); mix(A.sh.rotation, 'y', sd * 1.8); mix(A.sh.rotation, 'z', -sd * 0.3); mix(A.el.rotation, 'x', 1.2); }
  } else if (s.act === 'signal') {  // arm up, beckoning the truck in
    mix(R.sh.rotation, 'x', 2.75); mix(R.sh.rotation, 'z', 0.25); mix(R.el.rotation, 'x', 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(at * 8)));
    mix(r.head.rotation, 'x', 0.12);
  } else if (s.act === 'hmi') {     // taps through the press recipe on the cabinet screen
    const [x, y, z] = s.arg;
    mix(r.sp.rotation, 'x', -0.06); mix(r.head.rotation, 'x', -0.1);
    aim(r, 1, x, y, z + 0.035 * Math.max(0, Math.sin(at * 5.5)) ** 4, w);
  } else if (s.act === 'type') {
    const [x, y, z] = s.arg;
    mix(r.sp.rotation, 'x', -0.1); mix(r.head.rotation, 'x', -0.12);
    aim(r, 0, -x, y + 0.012 * Math.max(0, Math.sin(at * 11)), z, w); aim(r, 1, x, y + 0.012 * Math.max(0, Math.sin(at * 13 + 1)), z, w);
  }
}
// a seated driver: hands on the wheel, boots on the pedals, glancing into turns and over the right shoulder in reverse
function seat(r, back, steer) {
  r.hips.position.set(0, HIP, 0); r.sp.position.set(0, 0.08, 0);
  r.sp.rotation.set(-0.1 + 0.05 * back, -0.45 * back, 0);
  r.neck.rotation.set(0, -1.0 * back - 0.5 * steer * (1 - back), 0); r.head.rotation.set(-0.08 + 0.06 * back, 0, 0);
  r.legs.forEach((L, i) => { legTo(L, HIP, 0.84, 0.795, 0.3); L.hip.rotation.z = (i ? 1 : -1) * 0.1; });
  r.arms.forEach((A, i) => { A.sh.rotation.set(0, 0, 0); A.el.rotation.x = 0; aim(r, i, i ? 0.16 : -0.16, 1.18, -0.53, 1); A.wr.rotation.x = -0.25; });
}
// a looping route on foot: ['walk', [[x, z], …], r] turns to face the way first, ['face', ψ] turns on the spot,
// ['do', act, seconds, arg] stays put working. Returns position, heading and the rates the gait needs.
function walkPlan([x, z, h], steps) {
  const segs = []; let t = 0;
  const turnTo = h1 => { const d = wrapA(h1 - h); if (Math.abs(d) < 0.02) return; const dur = 0.45 + Math.abs(d) / 2.4; segs.push({ t0: t, dur, x, z, h, d }); t += dur; h += d; };
  for (const [k, a, b, arg] of steps) {
    if (k === 'face') turnTo(a);
    else if (k === 'walk') {
      const path = fillet([[x, z], ...a], b || 0.6), L = path.reduce((s, p) => s + p.len, 0), s0 = along(path, 0), h0 = Math.atan2(-s0[2], -s0[3]);
      turnTo(h0);
      const pr = trapezoid(L, VN, 1.6), off = h - h0, e = along(path, L);
      segs.push({ t0: t, dur: pr.dur, path, pr, off }); t += pr.dur;
      [x, z] = e; h = Math.atan2(-e[2], -e[3]) + off;
    } else { segs.push({ t0: t, dur: b, x, z, h, act: a, arg }); t += b; }
  }
  const at = time => {
    const g = segs.find(q => time < q.t0 + q.dur) || segs[segs.length - 1], tt = Math.min(time - g.t0, g.dur);
    if (g.path) {
      const p = along(g.path, g.pr.s(tt)), v = (g.pr.s(Math.min(g.dur, tt + 0.02)) - g.pr.s(Math.max(0, tt - 0.02))) / 0.04;
      return { x: p[0], z: p[1], h: Math.atan2(-p[2], -p[3]) + g.off, v, w: 0 };
    }
    if (g.d !== undefined) { const u = tt / g.dur; return { x: g.x, z: g.z, h: g.h + g.d * smooth(u), v: 0, w: g.d * 6 * u * (1 - u) / g.dur }; }
    return { x: g.x, z: g.z, h: g.h, v: 0, w: 0, act: g.act, arg: g.arg, at: tt, aw: smooth(tt / 0.45) * smooth((g.dur - tt) / 0.45) };
  };
  return { T: t, at };
}

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
  // operators in DECOSTAR workwear, one per station: a jointed rig (hips › knees › ankles, spine › neck › head,
  // shoulders › elbows › wrists) that the walk cycles and work poses drive every frame. Faces −z at rest.
  const wLogo = new T.MeshStandardMaterial({ name: 'uniform_logo', map: logoTex(true), transparent: true, alphaTest: 0.02, roughness: 0.8 });
  const jacket = std('uniform_jacket', 0x2b3034, 0.85), trousers = std('uniform_trousers', 0x1d1f20, 0.9), band = std('uniform_band', 0xb3342b, 0.6);
  const hat = std('hard_hat_white', 0xf4f3ef, 0.4), refl = std('uniform_reflective', 0xd3d6d8, 0.3, 0.55), glove = std('work_glove', 0x8a7a64, 0.85);
  const bootM = std('safety_boot', 0x2b2622, 0.6), soleM = std('boot_sole', 0x141414, 0.9), eyeM = std('eye', 0x16120f, 0.25);
  const looks = [[0xd6b497, 0x2b211b], [0x9a6a4a, 0x16120f], [0xe2c1a2, 0x6b4a2e], [0x7a5038, 0x1c1714], [0xc49a78, 0x3a2a1f], [0xb07b58, 0x241c17], [0xdcb99a, 0x4a3526]]
    .map(([s, h], i) => [std(`worker_skin_${i + 1}`, s, 0.7), std(`worker_hair_${i + 1}`, h, 0.9)]);
  const limb = (p, n, r0, r1, len, mat) => mesh(p, n, new T.CylinderGeometry(r0, r1, len, 14), mat, 0, -len / 2, 0);
  const oval = (p, n, geo, mat, x, y, z, sx, sy, sz) => { const m = mesh(p, n, geo, mat, x, y, z); m.scale.set(sx, sy, sz); return m; };
  // logo plane bent round the elliptical torso so it doesn't stand off the back at its edges
  const wrapLogo = (h, r) => {
    const g = new T.PlaneGeometry(h * LA, h, 12, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const a = p.getX(i) / r; p.setXYZ(i, r * Math.sin(a), p.getY(i), 0.6 * r * (Math.cos(a) - 1)); }
    g.computeVertexNormals(); return g;
  };
  let who = 0;
  const worker = (p, n, x, y, z, ry = 0) => {
    const [skin, hair] = looks[who++ % looks.length], g = grp(p, n, x, y, z); g.rotation.y = ry;
    const hips = grp(g, `${n}_hips`, 0, HIP, 0);
    oval(hips, `${n}_pelvis`, new T.CylinderGeometry(0.17, 0.15, 0.22, 24), trousers, 0, 0, 0, 1, 1, 0.68);
    for (const sd of [1, -1]) {
      const s = sd > 0 ? 'r' : 'l', hip = grp(hips, `${n}_hip_${s}`, sd * 0.095, 0, 0);
      limb(hip, `${n}_thigh_${s}`, 0.078, 0.062, THIGH, trousers);
      const knee = grp(hip, `${n}_knee_${s}`, 0, -THIGH, 0);
      mesh(knee, `${n}_kneecap_${s}`, new T.SphereGeometry(0.062, 14, 10), trousers, 0, 0, -0.004);
      limb(knee, `${n}_shin_${s}`, 0.06, 0.047, SHIN, trousers);
      cylY(knee, `${n}_shin_band_${s}`, 0.0545, 0.035, refl, 0, -0.27, 0, 16);
      const ank = grp(knee, `${n}_ankle_${s}`, 0, -SHIN, 0);
      cylY(ank, `${n}_boot_shaft_${s}`, 0.053, 0.11, bootM, 0, 0.005, 0.004, 14);
      rbox(ank, `${n}_boot_${s}`, 0.11, 0.085, 0.26, 0.035, bootM, 0, -0.035, -0.05);
      rbox(ank, `${n}_toe_bumper_${s}`, 0.114, 0.04, 0.05, 0.015, soleM, 0, -0.06, -0.158);
      rbox(ank, `${n}_sole_${s}`, 0.118, 0.022, 0.275, 0.008, soleM, 0, -0.074, -0.05);
    }
    const sp = grp(hips, `${n}_spine`, 0, 0.08, 0);
    oval(sp, `${n}_abdomen`, new T.CylinderGeometry(0.18, 0.172, 0.2, 24), jacket, 0, 0.1, 0, 1, 1, 0.62);
    oval(sp, `${n}_chest`, new T.CylinderGeometry(0.205, 0.182, 0.3, 24), jacket, 0, 0.34, 0, 1, 1, 0.6);
    oval(sp, `${n}_chest_top`, new T.SphereGeometry(0.205, 24, 12), jacket, 0, 0.49, 0, 1, 0.3, 0.6);
    oval(sp, `${n}_yoke`, new T.CapsuleGeometry(0.062, 0.28, 6, 14), jacket, 0, 0.455, 0, 1, 1, 1.3).rotation.z = Math.PI / 2;
    oval(sp, `${n}_hivis_band`, new T.CylinderGeometry(0.176, 0.176, 0.05, 24), band, 0, 0.03, 0, 1, 1, 0.63);
    oval(sp, `${n}_chest_stripe`, new T.CylinderGeometry(0.19, 0.188, 0.04, 24), refl, 0, 0.235, 0, 1, 1, 0.61);
    oval(sp, `${n}_collar`, new T.CylinderGeometry(0.066, 0.074, 0.06, 18), jacket, 0, 0.525, 0.004, 1, 1, 0.95);
    box(sp, `${n}_zip`, 0.01, 0.4, 0.006, soleM, 0, 0.29, -0.112);
    mesh(sp, `${n}_logo_back`, wrapLogo(0.13, 0.2), wLogo, 0, 0.395, 0.12);
    mesh(sp, `${n}_logo_chest`, LP(0.045), wLogo, 0.085, 0.4, -0.109).rotation.y = Math.PI - 0.28;
    const neck = grp(sp, `${n}_neck`, 0, 0.53, 0);
    cylY(neck, `${n}_neck_skin`, 0.047, 0.11, skin, 0, 0.03, 0.006, 14);
    const head = grp(neck, `${n}_head`, 0, 0.07, 0);
    oval(head, `${n}_skull`, new T.SphereGeometry(0.1, 28, 20), skin, 0, 0.09, -0.005, 0.9, 1.08, 1);
    oval(head, `${n}_jaw`, new T.SphereGeometry(0.07, 20, 14), skin, 0, 0.035, -0.032, 1, 0.9, 1);
    oval(head, `${n}_hair`, new T.SphereGeometry(0.103, 24, 16), hair, 0, 0.1, 0.014, 0.93, 1.03, 1);
    mesh(head, `${n}_nose`, new T.ConeGeometry(0.016, 0.04, 10), skin, 0, 0.078, -0.108).rotation.x = -Math.PI / 2;
    for (const sd of [1, -1]) {
      const s = sd > 0 ? 'r' : 'l';
      oval(head, `${n}_ear_${s}`, new T.SphereGeometry(0.026, 10, 8), skin, sd * 0.09, 0.085, 0.006, 0.45, 1, 0.75);
      mesh(head, `${n}_eye_${s}`, new T.SphereGeometry(0.012, 10, 8), eyeM, sd * 0.033, 0.103, -0.093);
      box(head, `${n}_brow_${s}`, 0.034, 0.008, 0.01, hair, sd * 0.034, 0.124, -0.094);
    }
    oval(head, `${n}_hard_hat`, new T.SphereGeometry(0.123, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), hat, 0, 0.135, 0.004, 1, 0.88, 1);
    cylY(head, `${n}_hard_hat_brim`, 0.133, 0.012, hat, 0, 0.139, 0.004, 28);
    mesh(head, `${n}_hard_hat_peak`, new T.CylinderGeometry(0.158, 0.158, 0.01, 28, 1, false, Math.PI / 2, Math.PI), hat, 0, 0.137, 0.004).scale.x = 0.84;
    oval(head, `${n}_hard_hat_ridge`, new T.TorusGeometry(0.119, 0.011, 6, 24, Math.PI), hat, 0, 0.135, 0.004, 1, 0.88, 1).rotation.y = Math.PI / 2;
    for (const sd of [1, -1]) {
      const s = sd > 0 ? 'r' : 'l', sh = grp(sp, `${n}_shoulder_${s}`, sd * 0.2, 0.44, 0); sh.rotation.order = 'YXZ';
      mesh(sh, `${n}_deltoid_${s}`, new T.SphereGeometry(0.06, 16, 12), jacket, 0, -0.014, 0);
      limb(sh, `${n}_upper_arm_${s}`, 0.056, 0.047, UARM, jacket);
      cylY(sh, `${n}_sleeve_band_${s}`, 0.0555, 0.03, refl, 0, -0.1, 0, 14);
      const el = grp(sh, `${n}_elbow_${s}`, 0, -UARM, 0);
      mesh(el, `${n}_elbow_joint_${s}`, new T.SphereGeometry(0.047, 14, 10), jacket, 0, 0, 0);
      limb(el, `${n}_forearm_${s}`, 0.046, 0.039, 0.23, jacket);
      cylY(el, `${n}_cuff_${s}`, 0.042, 0.035, band, 0, -0.215, 0, 14);
      const wr = grp(el, `${n}_wrist_${s}`, 0, -0.235, 0);
      rbox(wr, `${n}_glove_${s}`, 0.042, 0.095, 0.082, 0.018, glove, 0, -0.05, 0);
      rbox(wr, `${n}_thumb_${s}`, 0.024, 0.052, 0.024, 0.01, glove, -sd * 0.012, -0.038, -0.046).rotation.x = 0.4;
    }
    return g;
  };
  staff.worker = worker;
  worker(s1, 'worker_01_unwind', -19.6, 0, 3.5);
  worker(s2, 'worker_02_printing', PX - 1.1, 0.6, 2.2);
  worker(s3, 'worker_03_impregnation', 1.1, 0, 3.5);
  worker(s4, 'worker_04_pressing', 13.9, 0, 4.3, 0.5);
  worker(s5, 'worker_05_quality', QX + 0.1, 0, QZ + 0.55);
  seat(rigOf(worker(fl, 'fl_operator', 0, 0.19, 1.6)), 0, 0);   // the forklift driver
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
  prefix(tk2, 'out_'); tk2.name = 'outbound_truck'; s5.add(tk2);

  const fl2 = fl.clone(true); fl2.position.set(36.7, 0, 5.95); fl2.rotation.y = 0;
  fl2.remove(fl2.getObjectByName('fl_operator'));
  seat(rigOf(staff.worker(fl2, 'fl_operator', 0, 0.19, 1.6)), 0, 0);   // a different driver, not a clone
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
  // staged far enough in from the floor edge that the truck can square up to each pallet behind it
  const SX = [36.7, 34.0], SZ = 2.9, TKX = 37, PZ = -2.91;
  const pals = SX.map((x, i) => { const g = outPallet('dispatch_pallet_' + (i + 1)); g.position.set(x, 0, SZ); return g; });

  const ease = u => u * u * (3 - 2 * u);
  const key = (K, t) => {
    if (t <= K[0][0]) return K[0].slice(1);
    for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const a = K[i - 1], b = K[i], u = ease((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * u); }
    return K[K.length - 1].slice(1);
  };
  // fork each pallet from behind, run it straight into its slot on the bed, reverse out swinging the tail into
  // the aisle, then drive round and square up to the next one
  const R = route([36.7, 6.4, 0], 0.08, [
    { until: 4.2 },
    { go: [[36.7, 4.45]], v: 1.0 },
    { lift: 0.25, d: 0.5, mark: 'pick1' },
    { go: [[36.7, PZ]], v: 2.2, lift: [1.55, 0.05, 0.6] },
    { lift: 1.45, d: 0.45 },
    { wait: 0.2, mark: 'drop1' },
    { lift: 1.4, d: 0.2 },
    { go: [[36.7, 7.0], [37.2, 7.0]], r: 0.5, rev: true, v: 2.2, lift: [0.08, 0.25, 0.8] },
    { wait: 0.25 },
    { go: [[34.0, 7.0], [34.0, 4.45]], r: 0.6, v: 2.0 },
    { lift: 0.25, d: 0.5, mark: 'pick2' },
    { go: [[34.0, PZ]], v: 2.2, lift: [1.55, 0.05, 0.6] },
    { lift: 1.45, d: 0.45 },
    { wait: 0.2, mark: 'drop2' },
    { lift: 1.4, d: 0.2, mark: 'clear' },
    { go: [[34.0, 7.0], [33.5, 7.0]], r: 0.5, rev: true, v: 2.2, lift: [0.08, 0.25, 0.8] },
    { wait: 0.25 },
    { go: [[36.7, 7.0], [36.7, 6.4]], r: 0.6, v: 2.0 },
    { wait: 1.0 },
  ]);
  const mk = R.marks, LOOP = Math.max(R.T, mk.clear + 9.5), PICK = [mk.pick1, mk.pick2], DROP = [mk.drop1, mk.drop2];
  const TK = [[0, 56], [6, TKX], [mk.clear + 3.5, TKX], [mk.clear + 9.5, 56]];
  const DS = [[0, 0], [6, 0], [8, 0.94], [mk.clear + 2, 0.94], [mk.clear + 3.5, 0]];
  const drv = forkliftRig(fl2, 0.22);
  let prevX = null, last = performance.now(); const t0 = last;
  const tick = now => {
    const el = (now - t0) / 1000, t = el % LOOP, dt = Math.min((now - last) / 1000, 0.1); last = now;
    const [tx] = key(TK, t); tk2.position.x = tx;
    if (prevX !== null) wheels2.forEach(w => w.rotation.z -= (tx - prevX) / 0.52);
    prevX = tx;
    hinge2.rotation.x = key(DS, t)[0] * Math.PI;
    const p = drive(drv, R, el, LOOP, dt), s = Math.sin(p.psi), c = Math.cos(p.psi);
    pals.forEach((g, i) => {
      if (t < PICK[i]) g.position.set(SX[i], 0, SZ), g.rotation.y = 0;
      else if (t < DROP[i]) g.position.set(p.ox - 1.1 * s, p.lift - 0.1, p.oz - 1.1 * c), g.rotation.y = p.psi;
      else g.position.set(SX[i] + tx - TKX, 1.35, PZ - FL_AXLE - 1.1), g.rotation.y = 0;
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- people: walks between stations and the work they do there ---------- */
{
  const KEYS = [0.12, 1.16, -0.44];   // hands on the QC keyboard, from where that operator stands
  const crew = [
    ['worker_01_unwind', [-19.6, 3.5, 0], [['do', 'look', 2.5], ['face', Math.PI / 2], ['do', 'signal', 2.6], ['walk', [[-16.6, 2.35]]], ['face', 0],
      ['do', 'inspect', 3.2], ['walk', [[-19.6, 3.5]]], ['face', 0], ['do', 'rest', 2]]],
    ['worker_02_printing', [PX - 1.1, 2.2, 0], [['do', 'rest', 1.5], ['walk', [[PX + 0.9, 2.2]]], ['face', -0.5], ['do', 'inspect', 3.5],
      ['walk', [[PX - 1.1, 2.2]]], ['face', 0], ['do', 'look', 3]]],
    ['worker_03_impregnation', [1.1, 3.5, 0], [['do', 'rest', 2], ['walk', [[1.1, 2.15]]], ['do', 'inspect', 3.2], ['walk', [[1.1, 3.5]]], ['face', 0], ['do', 'look', 2.5]]],
    ['worker_04_pressing', [13.9, 4.3, 0.5], [['do', 'rest', 2], ['walk', [[12.6, 3.3]]], ['face', 0], ['do', 'hmi', 3.4, [0.075, 1.5, -0.42]],
      ['walk', [[14.6, 4.05], [16.8, 4.2]], 0.8], ['face', 0], ['do', 'inspect', 3.5], ['walk', [[13.9, 4.3]]], ['face', 0.5]]],
    ['worker_05_quality', [QX + 0.1, QZ + 0.55, 0], [['do', 'type', 5, KEYS], ['do', 'look', 2.2], ['walk', [[QX + 0.95, QZ + 0.6], [QX + 1.6, QZ - 0.55]], 0.5],
      ['face', 0], ['do', 'inspect', 3], ['walk', [[QX + 0.95, QZ + 0.55], [QX + 0.1, QZ + 0.55]], 0.5], ['face', 0], ['do', 'type', 3, KEYS]]],
  ].map(([n, start, steps], i) => { const g = model.getObjectByName(n); return { g, r: rigOf(g, i * 1.7), plan: walkPlan(start, steps) }; });
  let last = performance.now(); const t0 = last;
  const tick = now => {
    const el = (now - t0) / 1000, dt = Math.min((now - last) / 1000, 0.1); last = now;
    for (const w of crew) { const s = w.plan.at(el % w.plan.T); w.g.position.x = s.x; w.g.position.z = s.z; w.g.rotation.y = s.h; stride(w.r, s, dt, el); }
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
  const rolls = [1, 2].map(i => tk.getObjectByName('truck_roll_' + i));
  const RX = [-3.3, -1.9], RY = 1.35 + 0.62 + 0.001;
  const tops = [stack.getObjectByName('roll_top_2'), stack.getObjectByName('roll_top_1')];
  // square up to the bed and spear the core, lift, reverse out swinging the tail wide, carry forward at knee
  // height, turn in, raise and set the roll on the pyramid; then back out and round for the next one
  const xs1 = -23.325, xs2 = -24.575;
  const R = route([-29.0, 4.4, Math.PI / 2], 0.3, [
    { until: 5.2 },
    { go: [[-33.3, 4.4], [-33.3, -2.8]], r: 1.2, v: 3.0, lift: [RY, 0.3, 0.8] },
    { wait: 0.25 },
    { lift: 2.08, d: 0.5, mark: 'pick1' },
    { go: [[-33.3, 5.4], [-33.8, 5.4]], r: 0.5, rev: true, v: 2.2, lift: [1.0, 0.3, 0.9] },
    { wait: 0.25 },
    { go: [[xs1, 5.4], [xs1, 4.2]], r: 1.2, v: 2.6, lift: [2.08, 0.82, 1] },
    { go: [[xs1, 1.8]], v: 1.2 },
    { lift: 1.692, d: 0.5 },
    { wait: 0.25, mark: 'drop1' },
    { go: [[xs1, 4.4], [xs1 + 0.5, 4.4]], r: 0.5, rev: true, v: 2.0, lift: [RY, 0.76, 1] },
    { wait: 0.25 },
    { go: [[-31.9, 4.4], [-31.9, -2.8]], r: 1.2, v: 3.0 },
    { wait: 0.25 },
    { lift: 2.08, d: 0.5, mark: 'pick2' },
    { go: [[-31.9, 5.4], [-32.4, 5.4]], r: 0.5, rev: true, v: 2.2, lift: [1.0, 0.3, 0.9] },
    { wait: 0.25, mark: 'clear' },
    { go: [[xs2, 5.4], [xs2, 4.2]], r: 1.2, v: 2.6, lift: [2.08, 0.82, 1] },
    { go: [[xs2, 1.8]], v: 1.2 },
    { lift: 1.692, d: 0.5 },
    { wait: 0.25, mark: 'drop2' },
    { go: [[xs2, 4.4], [xs2 + 0.5, 4.4]], r: 0.5, rev: true, v: 2.0, lift: [0.3, 0.76, 1] },
    { wait: 0.25 },
    { go: [[-29.0, 4.4]], v: 2.6 },
    { wait: 1.0 },
  ]);
  const mk = R.marks, LOOP = R.T, PICK = [mk.pick1, mk.pick2], DROP = [mk.drop1, mk.drop2];
  const TK = [[0, -50], [6, -30], [mk.clear + 1.5, -30], [mk.clear + 6.5, -50]];
  const DS = [[0, 0], [6, 0], [8, 0.94], [mk.clear, 0.94], [mk.clear + 1.5, 0]];
  const ease = u => u * u * (3 - 2 * u);
  const key = (K, t) => {
    if (t <= K[0][0]) return K[0].slice(1);
    for (let i = 1; i < K.length; i++) if (t <= K[i][0]) {
      const a = K[i - 1], b = K[i], u = ease((t - a[0]) / (b[0] - a[0]));
      return a.slice(1).map((v, j) => v + (b[j + 1] - v) * u);
    }
    return K[K.length - 1].slice(1);
  };
  const drv = forkliftRig(fl, 0);
  let prevX = null, last = performance.now(); const t0 = last;
  const tick = now => {
    const el = (now - t0) / 1000, t = el % LOOP, dt = Math.min((now - last) / 1000, 0.1); last = now;
    const [tx] = key(TK, t); tk.position.x = tx;
    if (prevX !== null) wheels.forEach(w => w.rotation.z -= (tx - prevX) / 0.52);
    prevX = tx;
    hinge.rotation.x = key(DS, t)[0] * Math.PI;
    straps.forEach(m => m.visible = t < 6);
    const p = drive(drv, R, el, LOOP, dt), s = Math.sin(p.psi), c = Math.cos(p.psi);
    // a carried roll rides the ram 1.35 ahead of the mast and turns with the truck; its group origin is the bed slot
    rolls.forEach((r, i) => {
      r.visible = t < DROP[i]; tops[i].visible = t >= DROP[i];
      if (t >= PICK[i] && t < DROP[i]) r.position.set(p.ox - 1.35 * s - RX[i] * c - tk.position.x, p.lift - RY, p.oz - 1.35 * c + RX[i] * s - tk.position.z), r.rotation.y = p.psi;
      else r.position.set(0, 0, 0), r.rotation.y = 0;
    });
    requestAnimationFrame(tick);
  };
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
  const belts = [...scroll(['web_raw', 'web_printed', 'web_bath_descent', 'web_bath_immersion', 'web_bath_ascent', 'web_impregnated'], true)];
  const spinners = [];
  model.traverse(o => { if (o.isMesh && (/_shell$/.test(o.name) || /^conveyor_roller_\d+$/.test(o.name) || /^unwind_roll_/.test(o.name))) spinners.push({ m: o, r: o.geometry.parameters.radiusTop, cont: !o.name.startsWith('conveyor') }); });
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
    panels.forEach((g, i) => { g.position.x = PANEL_S[i] + PANEL_P * pu; g.visible = i < 5 || p < 2; });
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

/* ---------- centre on origin, base at y = 0 ---------- */
const bb = new T.Box3().setFromObject(model), c = bb.getCenter(new T.Vector3());
model.position.set(-c.x, -bb.min.y, -c.z);
model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
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
  cam.position.sub(tgt).multiplyScalar(0.44).add(tgt);
  cam.near = Math.max(cam.near * 0.44, 0.01);
  cam.updateProjectionMatrix();
  stage._controls.update();
}
