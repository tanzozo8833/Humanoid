"""Offline build of the 3D model the web page loads - run once, the page only loads the output.

  input   model_src/g1_description/g1_29dof_with_hand_rev_1_0.urdf  (Unitree, unitree_ros repo)
          model_src/g1_description/meshes/*.STL                      (Unitree CAD export)
  output  public/robot/g1.glb    the whole robot in ONE file
          public/robot/g1.json   joint table + stats (the page reads joint data from the GLB
                                 node extras; this file is for humans / debugging)

GLB node tree mirrors the URDF kinematic tree, so the page can pose the robot by rotating joint
nodes:

  <link>            node named exactly like the URDF link (pelvis, left_knee_link, d435_link...)
    <link>__visual  mesh node, transform = URDF <visual><origin>
    <joint>         node named like the URDF joint, transform = URDF <joint><origin>,
                    extras = {joint: true, type, axis, lower, upper, effort, velocity, child}
      <child link>  ...

Coordinates stay in ROS convention (Z up, metres); the page rotates the root to three.js Y-up.
Each mesh is simplified to a triangle budget (Unitree's STL are far denser than a web view needs).

Usage:  python model_src/build_g1_model.py [path/to/robot.urdf] [out_name]
Needs:  numpy, trimesh, fast-simplification
"""

import json
import math
import os
import struct
import sys
import xml.etree.ElementTree as ET

import fast_simplification
import numpy as np
import trimesh

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(os.path.dirname(HERE), "public")
OUT_DIR = os.path.join(PUBLIC, "robot")
DEFAULT_URDF = os.path.join(HERE, "g1_description", "g1_29dof_with_hand_rev_1_0.urdf")

# Most triangles kept per link. Hand links are small on screen; body shells keep more so the
# silhouette stays smooth when the camera is close.
BUDGET_BODY = 9000
BUDGET_SMALL = 2500
SMALL_LINK_KEYS = ("hand_", "logo", "wrist_roll", "wrist_yaw", "ankle_pitch", "thumb", "index", "middle", "ring", "little", "force_sensor", "base_link", "dex1", "rubber_hand", "neck", "handle")


def rpy_to_matrix(r, p, y):
    """URDF rpy = fixed-axis X then Y then Z: R = Rz(y) @ Ry(p) @ Rx(r)."""
    cr, sr, cp, sp, cy, sy = math.cos(r), math.sin(r), math.cos(p), math.sin(p), math.cos(y), math.sin(y)
    return np.array([
        [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
        [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
        [-sp, cp * sr, cp * cr],
    ])


def matrix_to_quat(m):
    """Rotation matrix -> glTF quaternion [x, y, z, w]."""
    t = m[0, 0] + m[1, 1] + m[2, 2]
    if t > 0:
        s = math.sqrt(t + 1.0) * 2
        w, x, y, z = 0.25 * s, (m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = math.sqrt(1.0 + m[0, 0] - m[1, 1] - m[2, 2]) * 2
        w, x, y, z = (m[2, 1] - m[1, 2]) / s, 0.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s
    elif m[1, 1] > m[2, 2]:
        s = math.sqrt(1.0 + m[1, 1] - m[0, 0] - m[2, 2]) * 2
        w, x, y, z = (m[0, 2] - m[2, 0]) / s, (m[0, 1] + m[1, 0]) / s, 0.25 * s, (m[1, 2] + m[2, 1]) / s
    else:
        s = math.sqrt(1.0 + m[2, 2] - m[0, 0] - m[1, 1]) * 2
        w, x, y, z = (m[1, 0] - m[0, 1]) / s, (m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, 0.25 * s
    return [x, y, z, w]


def parse_origin(el):
    if el is None:
        return [0.0, 0.0, 0.0], [0.0, 0.0, 0.0]
    xyz = [float(v) for v in el.get("xyz", "0 0 0").split()]
    rpy = [float(v) for v in el.get("rpy", "0 0 0").split()]
    return xyz, rpy


def node_trs(xyz, rpy):
    out = {}
    if any(abs(v) > 1e-12 for v in xyz):
        out["translation"] = xyz
    if any(abs(v) > 1e-12 for v in rpy):
        out["rotation"] = matrix_to_quat(rpy_to_matrix(*rpy))
    return out


def load_mesh(path, budget):
    mesh = trimesh.load(path, force="mesh", process=True)
    mesh.merge_vertices()
    faces_in = len(mesh.faces)
    verts, faces = np.asarray(mesh.vertices, dtype=np.float32), np.asarray(mesh.faces, dtype=np.uint32)
    if faces_in > budget:
        verts, faces = fast_simplification.simplify(verts, faces, target_reduction=1 - budget / faces_in)
        mesh = trimesh.Trimesh(verts, faces, process=True)
    # CAD parts have hard edges: split vertices where faces meet at > 35 deg so flat faces stay flat
    mesh = trimesh.graph.smooth_shade(mesh, angle=math.radians(35), facet_minarea=None)
    normals = np.asarray(mesh.vertex_normals, dtype=np.float32)
    return (np.asarray(mesh.vertices, dtype=np.float32), np.asarray(mesh.faces, dtype=np.uint32),
            normals, faces_in)


class GlbWriter:
    def __init__(self):
        self.bin = bytearray()
        self.gltf = {"asset": {"version": "2.0", "generator": "g1-explorer build_g1_model.py"},
                     "scene": 0, "scenes": [{"nodes": []}], "nodes": [], "meshes": [],
                     "materials": [], "accessors": [], "bufferViews": [], "buffers": []}

    def _view(self, data, target):
        while len(self.bin) % 4:
            self.bin.append(0)
        off = len(self.bin)
        self.bin += data
        self.gltf["bufferViews"].append({"buffer": 0, "byteOffset": off, "byteLength": len(data), "target": target})
        return len(self.gltf["bufferViews"]) - 1

    def _accessor(self, arr, comp, typ, target, minmax=False):
        view = self._view(arr.tobytes(), target)
        acc = {"bufferView": view, "componentType": comp, "count": int(arr.shape[0]), "type": typ}
        if minmax:
            acc["min"] = arr.min(axis=0).tolist()
            acc["max"] = arr.max(axis=0).tolist()
        self.gltf["accessors"].append(acc)
        return len(self.gltf["accessors"]) - 1

    def add_material(self, name, rgba):
        self.gltf["materials"].append({"name": name, "pbrMetallicRoughness": {
            "baseColorFactor": rgba, "metallicFactor": 0.3, "roughnessFactor": 0.55}})
        return len(self.gltf["materials"]) - 1

    def add_mesh(self, name, verts, faces, normals, material):
        pos = self._accessor(verts, 5126, "VEC3", 34962, minmax=True)
        nor = self._accessor(normals, 5126, "VEC3", 34962)
        idx_arr = faces.reshape(-1).astype(np.uint16 if len(verts) < 65536 else np.uint32)
        idx = self._accessor(idx_arr, 5123 if idx_arr.dtype == np.uint16 else 5125, "SCALAR", 34963)
        self.gltf["meshes"].append({"name": name, "primitives": [
            {"attributes": {"POSITION": pos, "NORMAL": nor}, "indices": idx, "material": material}]})
        return len(self.gltf["meshes"]) - 1

    def add_node(self, node):
        self.gltf["nodes"].append(node)
        return len(self.gltf["nodes"]) - 1

    def write(self, path):
        while len(self.bin) % 4:
            self.bin.append(0)
        self.gltf["buffers"] = [{"byteLength": len(self.bin)}]
        js = json.dumps(self.gltf, separators=(",", ":")).encode()
        while len(js) % 4:
            js += b" "
        total = 12 + 8 + len(js) + 8 + len(self.bin)
        with open(path, "wb") as f:
            f.write(struct.pack("<III", 0x46546C67, 2, total))
            f.write(struct.pack("<II", len(js), 0x4E4F534A))
            f.write(js)
            f.write(struct.pack("<II", len(self.bin), 0x004E4942))
            f.write(self.bin)


def main():
    urdf_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URDF
    out_name = sys.argv[2] if len(sys.argv) > 2 else "g1"
    urdf_dir = os.path.dirname(urdf_path)
    root = ET.parse(urdf_path).getroot()

    colors = {}
    for m in root.findall("material"):
        c = m.find("color")
        if c is not None:
            colors[m.get("name")] = [float(v) for v in c.get("rgba").split()]

    links = {l.get("name"): l for l in root.findall("link")}
    joints = root.findall("joint")
    children_of = {}
    child_links = set()
    for j in joints:
        children_of.setdefault(j.find("parent").get("link"), []).append(j)
        child_links.add(j.find("child").get("link"))
    roots = [n for n in links if n not in child_links and (n in children_of or links[n].find("visual") is not None)]

    w = GlbWriter()
    mat_index = {}
    stats = {"links": 0, "faces_in": 0, "faces_out": 0}
    joint_table = []

    def material_for(name):
        if name not in mat_index:
            mat_index[name] = w.add_material(name, colors.get(name, [0.7, 0.7, 0.72, 1]))
        return mat_index[name]

    def build_link(name):
        link = links[name]
        node = {"name": name, "children": []}
        mass = link.find("inertial/mass")
        if mass is not None:
            com, _ = parse_origin(link.find("inertial/origin"))      # centre of mass, link frame
            node["extras"] = {"mass": float(mass.get("value")), "com": com}
        for i, vis in enumerate(link.findall("visual")):
            mesh_el = vis.find("geometry/mesh")
            if mesh_el is None:
                continue
            path = os.path.join(urdf_dir, mesh_el.get("filename").replace("package://", ""))
            small = any(k in name for k in SMALL_LINK_KEYS)
            verts, faces, normals, faces_in = load_mesh(path, BUDGET_SMALL if small else BUDGET_BODY)
            mat_el = vis.find("material")
            mesh = w.add_mesh(f"{name}__mesh", verts, faces, normals, material_for(mat_el.get("name") if mat_el is not None else "default"))
            xyz, rpy = parse_origin(vis.find("origin"))
            vnode = {"name": f"{name}__visual" + (f"{i}" if i else ""), "mesh": mesh, **node_trs(xyz, rpy)}
            node["children"].append(w.add_node(vnode))
            stats["links"] += 1
            stats["faces_in"] += faces_in
            stats["faces_out"] += len(faces)
            print(f"  {name:32s} {faces_in:7d} -> {len(faces):6d} tris")
        for j in children_of.get(name, []):
            xyz, rpy = parse_origin(j.find("origin"))
            jnode = {"name": j.get("name"), **node_trs(xyz, rpy)}
            extras = {"joint": True, "type": j.get("type"), "child": j.find("child").get("link"),
                      "parent": name}
            axis = j.find("axis")
            if axis is not None:
                extras["axis"] = [float(v) for v in axis.get("xyz").split()]
            lim = j.find("limit")
            if lim is not None:
                for k in ("lower", "upper", "effort", "velocity"):
                    if lim.get(k) is not None:
                        extras[k] = float(lim.get(k))
            mimic = j.find("mimic")              # Inspire hand: distal joints follow a driven one
            if mimic is not None:
                extras["mimic"] = {"joint": mimic.get("joint"), "multiplier": float(mimic.get("multiplier", 1)),
                                   "offset": float(mimic.get("offset", 0))}
            jnode["extras"] = extras
            jnode["children"] = [build_link(extras["child"])]
            node["children"].append(w.add_node(jnode))
            joint_table.append({"name": j.get("name"), **extras, "origin_xyz": xyz, "origin_rpy": rpy})
        if not node["children"]:
            del node["children"]
        return w.add_node(node)

    top = {"name": "g1_root", "children": [build_link(r) for r in roots]}
    w.gltf["scenes"][0]["nodes"] = [w.add_node(top)]

    os.makedirs(OUT_DIR, exist_ok=True)
    glb_path = os.path.join(OUT_DIR, f"{out_name}.glb")
    w.write(glb_path)
    with open(os.path.join(OUT_DIR, f"{out_name}.json"), "w", encoding="utf-8") as f:
        json.dump({"source": os.path.basename(urdf_path), "stats": stats, "joints": joint_table}, f, indent=1)
    print(f"roots={roots} links={stats['links']} tris {stats['faces_in']} -> {stats['faces_out']}  "
          f"{os.path.getsize(glb_path) / 1e6:.1f} MB -> {glb_path}")


if __name__ == "__main__":
    main()
