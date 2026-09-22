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
function sign(p, n, num, x, z) {
  const g = grp(p, n);
  cylY(g, `${n}_post`, 0.035, 2.2, M.steelDark, x, 1.1, z - 0.04, 16);
  box(g, `${n}_plate`, 0.62, 0.42, 0.03, M.steelDark, x, 2.15, z);
  box(g, `${n}_rule`, 0.5, 0.012, 0.01, M.marking, x, 1.99, z + 0.02);
  digit(g, `${n}_digit_tens`, 0, x - 0.1, 2.18, z + 0.02);
  digit(g, `${n}_digit_units`, num, x + 0.1, 2.18, z + 0.02);
  return g;
}

/* =======================================================
   FLOOR, MARKINGS, SERVICES
   ======================================================= */
const site = grp(model, 'site');
box(site, 'factory_floor', 70, 0.15, 14, M.concrete, -1, -0.075, 0);
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
sign(s1, 'sign_01', 1, -23.95, 3.0);

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
mesh(tk, 'cab_shell', cabGeo, M.paint, CX, CY, 0);
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
sign(s4, 'sign_04', 4, PRX, 3.0);
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
box(desk, 'desk_top', 1.2, 0.05, 0.6, M.steel, QX, 0.75, QZ);
for (const dx of [-0.55, 0.55]) for (const dz of [-0.25, 0.25]) box(desk, `desk_leg_${dx < 0 ? 'l' : 'r'}_${dz < 0 ? 'b' : 'f'}`, 0.04, 0.725, 0.04, M.steelDark, QX + dx, 0.3625, QZ + dz);
box(desk, 'monitor_stand', 0.06, 0.3, 0.06, M.steelDark, QX, 0.925, QZ - 0.18);
box(desk, 'monitor', 0.9, 0.55, 0.04, M.steelDark, QX, 1.35, QZ - 0.2);
box(desk, 'monitor_screen', 0.84, 0.49, 0.005, M.glass, QX, 1.35, QZ - 0.177);
box(desk, 'keyboard', 0.45, 0.02, 0.15, M.steelDark, QX, 0.785, QZ + 0.05);
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
box(flow, 'board_core', BX1 - BX0, 0.044, W, M.mdf, (BX0 + BX1) / 2, BOARD_BOT + 0.022, 0);
box(flow, 'board_decor_surface', BX1 - BX0, 0.01, W, M.decor, (BX0 + BX1) / 2, WEB_Y, 0);

/* ---------- centre on origin, base at y = 0 ---------- */
const bb = new T.Box3().setFromObject(model), c = bb.getCenter(new T.Vector3());
model.position.set(-c.x, -bb.min.y, -c.z);
model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
stage.setObject(model);
