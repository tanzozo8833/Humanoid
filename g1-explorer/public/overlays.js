// Analysis layers drawn over the main 3D robot ("Lớp xem" menu). Everything is computed from the URDF
// data inside the GLB (joint axes / limits, link masses + centres of mass, link geometry) - nothing
// here is hand-placed, except the material map, which assigns a material per link from the teardown
// (中邮证券: structure aluminium, calf link steel, torso shell ABS/PA + silicone).
//
//   axes      every revolute joint: arrow along its axis (x red, y green, z blue) + arc = its range
//   com       each link's centre of mass (size ~ mass), the whole-robot COM, its ground projection
//             and the support polygon of the feet - the robot stays up while the projection is inside
//   material  recolour links by material
//   fov       D435i frustum (87 x 58 deg) and MID-360 band (-7..+52 deg, mounted upside down)
//   dims      height, shoulder width, leg and arm lengths measured on the model, live
//   reach     workspace of both hands: random joint angles within the URDF limits -> palm position
import * as THREE from 'three';

const AXIS_COLORS = [0xf85149, 0x3fb950, 0x4fa3ff];
const MATERIALS = {
  aluminium: { color: 0x9ecbff, label: 'Nhôm (CNC / đúc) - khung, vỏ actuator' },
  steel: { color: 0x6e7681, label: 'Thép - thanh cẳng chân (chi tiết thép duy nhất)' },
  plastic: { color: 0xf0f3f6, label: 'Nhựa kỹ thuật ABS/PA + silicone - vỏ thân, đầu' },
  rubber: { color: 0x3fb950, label: 'Cao su / nhựa mềm - bàn tay bản thường, đế' },
  hand: { color: 0xd2a8ff, label: 'Bàn tay khéo / tay kẹp (module mua ngoài)' },
};
function materialOf(link) {
  if (/rubber_hand/.test(link)) return 'rubber';
  if (/hand_|thumb|index|middle|ring|little|base_link$|force_sensor|dex1/.test(link)) return 'hand';
  if (/torso|head|logo|pelvis_contour|handle|neck/.test(link)) return 'plastic';
  if (/knee_link/.test(link)) return 'steel';
  return 'aluminium';
}

export function createOverlays({ scene, robot, labelsHost, h }) {
  const on = { axes: false, com: false, material: false, fov: false, dims: false, reach: false };
  let M = null;                          // {links, joints, linkMeshes}
  const groups = {};                     // per layer: objects attached to links / scene
  const domLabels = [];                  // {el, get: () => Vector3 (world), layer}
  let savedColors = null;
  const tmp = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);
  const Zv = new THREE.Vector3(0, 0, 1);

  function track(layer, obj) { (groups[layer] ||= []).push(obj); obj.visible = on[layer]; return obj; }
  function label(layer, text, get, color = '#e6edf3') {
    const el = h('span', { class: 'label3d ovl-label', style: `--c:${color}` }, text);
    labelsHost.append(el);
    domLabels.push({ el, get, layer });
    return el;
  }
  function clear() {
    for (const list of Object.values(groups)) for (const o of list) o.parent?.remove(o);
    for (const k of Object.keys(groups)) delete groups[k];
    for (const l of domLabels) l.el.remove();
    domLabels.length = 0;
    savedColors = null;
  }

  // ------------------------------------------------------------------ build per model
  function build(model) {
    clear();
    M = model;
    const { links, joints } = model;

    // axes + range arcs, in the parent link frame so the arc does not turn with the joint
    for (const j of Object.values(joints)) {
      if (j.data.type !== 'revolute' || j.data.mimic) continue;
      const parent = links[j.data.parent];
      if (!parent) continue;
      const axis = j.axis.clone().applyQuaternion(j.restQ).normalize();
      const k = (j.data.axis || [0, 0, 1]).findIndex((v) => Math.abs(v) > 0.5);
      const small = /hand_|thumb|index|middle|ring|little|dex1/.test(j.data.child);
      const len = small ? 0.025 : 0.07;
      const arrow = new THREE.ArrowHelper(axis, j.restPos, len, AXIS_COLORS[k], len * 0.3, len * 0.18);
      arrow.line.material.depthTest = false;
      arrow.cone.material.depthTest = false;
      arrow.renderOrder = 20;
      parent.add(arrow);
      track('axes', arrow);
      const r = small ? 0.012 : 0.04;
      const arc = new THREE.Mesh(new THREE.RingGeometry(r * 0.85, r, 48, 1, j.data.lower, j.data.upper - j.data.lower),
        new THREE.MeshBasicMaterial({ color: AXIS_COLORS[k], transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthTest: false }));
      arc.quaternion.setFromUnitVectors(Zv, axis);
      arc.position.copy(j.restPos);
      arc.renderOrder = 19;
      parent.add(arc);
      track('axes', arc);
    }

    // centres of mass
    const comSpheres = [];
    for (const [name, obj] of Object.entries(links)) {
      const m = obj.userData?.mass;
      if (!m || m < 0.005 || !obj.userData.com) continue;
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.006 + 0.014 * Math.cbrt(m / 7), 14, 10),
        new THREE.MeshBasicMaterial({ color: 0xe3b341, depthTest: false, transparent: true, opacity: 0.85 }));
      s.position.set(...obj.userData.com);
      s.renderOrder = 21;
      obj.add(s);
      track('com', s);
      comSpheres.push({ obj, mass: m, local: new THREE.Vector3(...obj.userData.com), name });
    }
    const total = comSpheres.reduce((a, c) => a + c.mass, 0);
    const bigCom = track('com', new THREE.Mesh(new THREE.SphereGeometry(0.025, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0xf85149, depthTest: false })));
    bigCom.renderOrder = 22;
    scene.add(bigCom);
    const drop = track('com', new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineDashedMaterial({ color: 0xf85149, dashSize: 0.02, gapSize: 0.015, depthTest: false })));
    scene.add(drop);
    const proj = track('com', new THREE.Mesh(new THREE.RingGeometry(0.015, 0.025, 24), new THREE.MeshBasicMaterial({ color: 0xf85149, side: THREE.DoubleSide })));
    proj.rotation.x = -Math.PI / 2;
    scene.add(proj);
    const poly = track('com', new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x3fb950 })));
    scene.add(poly);
    const comLabel = label('com', '', () => bigCom.position, '#f85149');
    model.com = { comSpheres, total, bigCom, drop, proj, poly, comLabel };

    // field of view of the head sensors
    const d435 = links.d435_link;
    if (d435) {
      const L = 0.7;
      const hx = Math.tan((87 * Math.PI) / 360) * L;
      const hz = Math.tan((58 * Math.PI) / 360) * L;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(L, hx, hz), new THREE.Vector3(L, -hx, hz),
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(L, -hx, hz), new THREE.Vector3(L, -hx, -hz),
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(L, -hx, -hz), new THREE.Vector3(L, hx, -hz),
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(L, hx, -hz), new THREE.Vector3(L, hx, hz),
      ]);
      geo.computeVertexNormals();
      const frustum = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x58a6ff, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false }));
      d435.add(frustum);
      track('fov', frustum);
      label('fov', 'D435i: 87° × 58°, chúc 47.6°', () => d435.localToWorld(tmp.set(0.45, 0, -0.18)).clone(), '#58a6ff');
    }
    const mid = links.mid360_link;
    if (mid) {
      const r = 1.0;
      const pts = [-7, 52].map((e) => new THREE.Vector2(Math.cos((e * Math.PI) / 180) * r, Math.sin((e * Math.PI) / 180) * r));
      const band = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.03, 0), ...pts], 64),
        new THREE.MeshBasicMaterial({ color: 0x3fb950, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
      band.rotation.x = Math.PI / 2;
      mid.add(band);
      track('fov', band);
      label('fov', 'MID-360: 360° × 59° (lật ngược → nhìn xuống)', () => mid.localToWorld(tmp.set(0.0, 0.9, 0.5)).clone(), '#3fb950');
    }

    // dimensions (live)
    const dimDefs = [
      ['Cao', () => {
        // bounding box of the body meshes only (not the overlay / X-ray helpers)
        const b = new THREE.Box3();
        for (const ms of Object.values(model.linkMeshes)) for (const m of ms) b.expandByObject(m);
        const x = b.max.x + 0.15;
        return [new THREE.Vector3(x, b.min.y, 0), new THREE.Vector3(x, b.max.y, 0)];
      }],
      ['Vai ↔ vai', () => [w('left_shoulder_pitch_link'), w('right_shoulder_pitch_link')]],
      ['Chân (hông → cổ chân)', () => [w('left_hip_pitch_link'), w('left_ankle_pitch_link')]],
      ['Tay (vai → cổ tay)', () => [w('right_shoulder_pitch_link'), w('right_wrist_roll_link') || w('right_wrist_roll_rubber_hand')]],
    ];
    function w(n) { return links[n] ? links[n].getWorldPosition(new THREE.Vector3()) : null; }
    model.dims = dimDefs.map(([name, fn]) => {
      const line = track('dims', new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
        new THREE.LineBasicMaterial({ color: 0xffa657, depthTest: false })));
      line.renderOrder = 23;
      scene.add(line);
      const el = label('dims', name, () => line.userData.mid || new THREE.Vector3(), '#ffa657');
      return { name, fn, line, el };
    });

    // reach (built on demand - it moves the arm joints)
    model.reachBuilt = false;
  }

  // ------------------------------------------------------------------ reach: forward kinematics sampling
  function buildReach() {
    const { links, joints } = M;
    const torso = links.torso_link;
    if (!torso) return;
    const tq = new THREE.Quaternion();
    for (const side of ['left', 'right']) {
      const chain = ['shoulder_pitch', 'shoulder_roll', 'shoulder_yaw', 'elbow', 'wrist_roll', 'wrist_pitch', 'wrist_yaw']
        .map((n) => joints[`${side}_${n}_joint`]).filter(Boolean);
      const tip = links[`${side}_hand_palm_link`] || links[`${side}_base_link`] || links[`${side}_dex1_base_link`]
        || links[`${side}_rubber_hand`] || links[`${side}_wrist_roll_rubber_hand`] || links[`${side}_wrist_yaw_link`];
      if (!chain.length || !tip) continue;
      const saved = chain.map((j) => j.node.quaternion.clone());
      const N = 2500;
      const pos = new Float32Array(N * 3);
      const col = new Float32Array(N * 3);
      const c = new THREE.Color();
      torso.updateWorldMatrix(true, false);
      const inv = torso.matrixWorld.clone().invert();
      for (let i = 0; i < N; i += 1) {
        for (const j of chain) {
          const q = j.data.lower + Math.random() * (j.data.upper - j.data.lower);
          j.node.quaternion.copy(j.restQ).multiply(tq.setFromAxisAngle(j.axis, q));
        }
        chain[0].node.updateWorldMatrix(false, true);
        tip.getWorldPosition(tmp).applyMatrix4(inv);
        pos.set([tmp.x, tmp.y, tmp.z], i * 3);
        c.setHSL(0.6 - Math.min(0.6, Math.max(0, (tmp.z + 0.3) / 1.2)) * 0.6, 0.85, 0.55);
        col.set([c.r, c.g, c.b], i * 3);
      }
      chain.forEach((j, k) => j.node.quaternion.copy(saved[k]));
      chain[0].node.updateWorldMatrix(false, true);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const cloud = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.012, vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false }));
      torso.add(cloud);
      track('reach', cloud);
    }
    label('reach', 'Vùng với tới bàn tay (2500 tư thế ngẫu nhiên / tay, trong giới hạn URDF)', () => links.torso_link.localToWorld(tmp.set(0.25, 0, 0.55)).clone(), '#79c0ff');
    M.reachBuilt = true;
  }

  // ------------------------------------------------------------------ material recolouring
  function applyMaterials(enable) {
    const { linkMeshes } = M;
    if (enable) {
      savedColors = new Map();
      for (const [link, meshes] of Object.entries(linkMeshes)) {
        const c = MATERIALS[materialOf(link)].color;
        for (const m of meshes) { savedColors.set(m, m.material.color.getHex()); m.material.color.setHex(c); }
      }
    } else if (savedColors) {
      for (const [m, c] of savedColors) m.material.color.setHex(c);
      savedColors = null;
    }
  }

  // ------------------------------------------------------------------ public
  function set(layer, value) {
    on[layer] = value;
    if (!M) return;
    if (layer === 'reach' && value && !M.reachBuilt) buildReach();
    if (layer === 'material') applyMaterials(value);
    for (const o of groups[layer] || []) o.visible = value;
  }

  const wp = new THREE.Vector3();
  function update(camera, rect) {
    if (!M) return;
    if (on.com && M.com) {
      const { comSpheres, total, bigCom, drop, proj, poly, comLabel } = M.com;
      const c = new THREE.Vector3();
      for (const s of comSpheres) {
        wp.copy(s.local);
        s.obj.localToWorld(wp);
        c.addScaledVector(wp, s.mass);
      }
      c.multiplyScalar(1 / total);
      bigCom.position.copy(c);
      drop.geometry.setFromPoints([c, new THREE.Vector3(c.x, 0.002, c.z)]);
      drop.computeLineDistances();
      proj.position.set(c.x, 0.003, c.z);
      // support polygon: convex hull of the two foot outlines on the ground
      const pts = [];
      for (const side of ['left', 'right']) {
        const f = M.links[`${side}_ankle_roll_link`];
        if (!f) continue;
        // sole outline of ankle_roll_link (mesh bounds x -0.066..0.142, y +-0.038, sole at z -0.035)
        for (const [x, y] of [[-0.06, -0.035], [0.14, -0.035], [0.14, 0.035], [-0.06, 0.035]]) {
          wp.set(x, y, -0.035);
          f.localToWorld(wp);
          if (wp.y < 0.06) pts.push(new THREE.Vector2(wp.x, wp.z));
        }
      }
      const hull = convexHull(pts);
      poly.geometry.setFromPoints(hull.map((p) => new THREE.Vector3(p.x, 0.004, p.y)));
      const inside = hull.length >= 3 && pointInPoly(new THREE.Vector2(c.x, c.z), hull);
      poly.material.color.setHex(inside ? 0x3fb950 : 0xf85149);
      comLabel.textContent = `Trọng tâm: ${total.toFixed(1)} kg, cao ${c.y.toFixed(2)} m · ${inside ? 'trong vùng chân đỡ' : 'NGOÀI vùng chân đỡ'}`;
    }
    if (on.dims && M.dims) {
      for (const d of M.dims) {
        const pr = d.fn();
        if (!pr || !pr[0] || !pr[1]) { d.line.visible = false; continue; }
        d.line.visible = true;
        d.line.geometry.setFromPoints(pr);
        d.line.userData.mid = pr[0].clone().lerp(pr[1], 0.5);
        d.el.textContent = `${d.name}: ${(pr[0].distanceTo(pr[1]) * 1000).toFixed(0)} mm`;
      }
    }
    for (const l of domLabels) {
      if (!on[l.layer]) { l.el.style.display = 'none'; continue; }
      const p = l.get();
      tmp.copy(p).project(camera);
      if (tmp.z > 1 || Math.abs(tmp.x) > 1.05 || Math.abs(tmp.y) > 1.05) { l.el.style.display = 'none'; continue; }
      l.el.style.display = '';
      l.el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * rect.width}px, ${(-tmp.y * 0.5 + 0.5) * rect.height}px)`;
    }
  }

  return { build, set, update, MATERIALS, isOn: (k) => on[k] };
}

function convexHull(points) {
  const p = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), q) <= 0) lower.pop(); lower.push(q); }
  const upper = [];
  for (const q of p.reverse()) { while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
function pointInPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i];
    const b = poly[j];
    if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
