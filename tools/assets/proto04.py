# © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.
#
# Prototype 04 in Blender 5.0. One script, one stage per run, so the machine's single
# Blender slot is held only briefly:
#
#   node TOOLS/blender.mjs SITE/tools/assets/proto04.py -- <stage> [options]
#
#   layers   OBJ -> five watertight low layers (asserted) + one shared UV atlas -> .work/proto04-low.glb
#            and .work/layers.blend (low layers + the untouched hi parts with their own objects)
#   bake     hi materials -> low atlas: DIFFUSE colour (selected to active) x AO -> .work/atlas.png
#   matcap   lit sphere for the live x-ray's MeshMatcapMaterial -> .work/matcap.png
#   shadow   top-down contact shadow for the live ground quad -> .work/shadow.png
#   stills   hero | inside | cuts | wind (comma list, default all) -> .work/still-*.png
#            options: --spp N  --scale F (draft renders at a fraction of the size)
#
# Inputs come from export-shoe.mjs: .work/shoe-hi.obj and .work/shoe-meta.json, which carry
# every figure from src/lib/shoe-spec.ts (stack, lugs, plate, cameras, cut stations).
#
# The hi set is the procedural parts themselves (smooth, beveled, each with its own material);
# the low set is the voxel-remeshed, decimated, watertight layer the browser decodes. Layers
# never touch one another: no cross-layer booleans, only the plate's own fork cut.
import bpy, bmesh, json, math, os, sys, time
import numpy as np
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, ".work")
ARGV = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
STAGE = ARGV[0] if ARGV else "layers"
OPTS = {}
_i = 1
while _i < len(ARGV):
    if ARGV[_i].startswith("--"):
        OPTS[ARGV[_i][2:]] = ARGV[_i + 1] if _i + 1 < len(ARGV) else "1"
        _i += 2
    else:
        OPTS.setdefault("what", ARGV[_i]); _i += 1
META = json.load(open(os.path.join(WORK, "shoe-meta.json"), encoding="utf-8"))
LAYERS = ["outsole", "carrier", "plate", "foam", "upper"]
T0 = time.time()

def log(*a):
    print(f"[proto04 {STAGE} {time.time() - T0:6.1f}s]", *a, flush=True)

def fail(msg):
    print("FAIL:", msg, flush=True); sys.exit(1)

def srgb(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)

def activate(o):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o

def apply_all(o):
    activate(o)
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)

def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)

def manifold_report(o):
    bm = bmesh.new(); bm.from_mesh(o.data)
    bad = sum(1 for e in bm.edges if not e.is_manifold); bnd = sum(1 for e in bm.edges if e.is_boundary)
    bm.free(); return bad, bnd

def weld(o, dist=1e-6):
    """Weld seams and point every face outward: solidify (offset -1) and the EXACT cuts both read the winding."""
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data); bm.free()

def group_of(name):
    for layer, names in META["groups"].items():
        if name in names:
            return layer
    return None

# ------------------------------------------------------------------------- layers ---

def clamp_to_profile(o, layer):
    """Decimating the carrier to 1500 tris lets its surfaces wander more than the 0.3 mm gap,
    into the plate (BVH overlap found 327 triangle pairs). Re-assert the gap analytically from
    shoe-spec's own profile, per vertex: the carrier's top sits >= 0.45 mm under the plate,
    the fork key's walls stay >= 0.5 mm inside the slot (0.3 mm gap + 0.2 mm), the plate's
    slot walls stay on the nominal slot, and its underside on or above the carrier top.
    (Scene units: 0.001 = 0.1 mm.) Topology is untouched, so the manifold assertion still holds."""
    if layer not in ("carrier", "plate"):
        return 0
    P = META["profile"]; n = P["n"] - 1; L = META["SHOE_LENGTH"]
    ct, kh, sh = P["carrierTop"], P["keyHalf"], P["slotHalf"]
    moved = 0
    for v in o.data.vertices:
        x, by, bz = v.co
        u = min(1.0, max(0.0, (x + L / 2) / L)); i = int(round(u * n))
        top, key, slot = ct[i], kh[i], sh[i]
        z3 = -by
        if layer == "plate":
            if bz < top + 0.0003:
                v.co.z = top + 0.0003; moved += 1
            if slot > 0.005 and abs(z3) < slot:
                v.co.y = -math.copysign(slot, z3) if z3 != 0 else -slot; moved += 1
            continue
        in_key = key > 0 and abs(z3) < key + 0.004 and bz > top - 0.0015  # the key's walls rise above the carrier top
        if in_key:
            lim = key - 0.002
            if abs(z3) > lim:
                v.co.y = -math.copysign(lim, z3); moved += 1
        elif bz > top - 0.0045:
            v.co.z = top - 0.0045; moved += 1
    o.data.update()
    return moved

def stage_layers():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.wm.obj_import(filepath=os.path.join(WORK, "shoe-hi.obj"), forward_axis="Y", up_axis="Z")
    parts = {o.name: o for o in bpy.context.scene.objects if o.type == "MESH"}
    log("imported", len(parts), "parts")
    for o in parts.values():
        weld(o)  # TubeGeometry repeats its seam vertex; weld so every part is one closed solid
    for name, t in META["solidify"].items():
        m = parts[name].modifiers.new("solid", "SOLIDIFY"); m.thickness = t; m.offset = -1; m.use_rim = True
    for o in parts.values():
        apply_all(o)

    hi = bpy.data.collections.new("hi"); bpy.context.scene.collection.children.link(hi)
    low = bpy.data.collections.new("low"); bpy.context.scene.collection.children.link(low)
    # The hi set: every part as built, kept separate so it can carry its own material.
    for name, o in parts.items():
        if name == "forkCutter":
            continue
        c = o.copy(); c.data = o.data.copy(); c.name = f"hi_{name}"; c.data.name = c.name
        hi.objects.link(c)
        c["layer"] = group_of(name) or ""
        c["part"] = name
    # The plate's fork, cut in place (EXACT, intra-layer, small meshes) on both copies.
    cutter = parts["forkCutter"]
    for target in (parts["plate"], bpy.data.objects["hi_plate"]):
        m = target.modifiers.new("fork", "BOOLEAN"); m.operation = "DIFFERENCE"; m.object = cutter; m.solver = "EXACT"
        apply_all(target)
    bpy.data.objects.remove(cutter, do_unlink=True)
    for o in hi.objects:
        for p in o.data.polygons:
            p.use_smooth = True

    TARGET = {"outsole": 6000, "carrier": 1500, "plate": 1000, "foam": 4000, "upper": 9000}
    VOX = {"outsole": 0.005, "carrier": 0.005, "plate": 0.003, "foam": 0.005, "upper": 0.004}
    if "target-upper" in OPTS:
        TARGET["upper"] = int(OPTS["target-upper"])
    report = {}
    for layer in LAYERS:
        names = [n for n in META["groups"][layer] if n in parts]
        objs = [parts[n] for n in names]
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        o = bpy.context.active_object; o.name = layer; o.data.name = layer
        for coll in list(o.users_collection):
            coll.objects.unlink(o)
        low.objects.link(o)
        raw = tris(o)
        r = o.modifiers.new("remesh", "REMESH"); r.mode = "VOXEL"; r.voxel_size = VOX[layer]; r.adaptivity = 0
        apply_all(o)
        remeshed = tris(o)
        d = o.modifiers.new("decimate", "DECIMATE"); d.decimate_type = "COLLAPSE"
        d.ratio = min(1.0, TARGET[layer] / max(remeshed, 1)); d.use_collapse_triangulate = True
        apply_all(o)
        moved = clamp_to_profile(o, layer)
        t = o.modifiers.new("tri", "TRIANGULATE"); apply_all(o)
        if moved:
            log("clamped", moved, "vertices of", layer, "to keep the carrier-plate gap")
        bad, bnd = manifold_report(o)
        report[layer] = {"raw": raw, "remeshed": remeshed, "tris": tris(o), "nonmanifold": bad, "boundary": bnd, "voxel": VOX[layer]}
        log("LAYER", layer, report[layer])
        if bad or bnd:
            fail(f"{layer}: {bad} non-manifold and {bnd} boundary edges after remesh + decimate")

    # One shared atlas: multi-object edit, smart project 80 degrees, pack with rotation.
    lows = [bpy.data.objects[n] for n in LAYERS]
    bpy.ops.object.select_all(action="DESELECT")
    for o in lows:
        o.select_set(True)
    bpy.context.view_layer.objects.active = lows[-1]
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(80), island_margin=0.003, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(margin=0.003, rotate=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    for o in lows:
        activate(o)
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))

    bpy.ops.object.select_all(action="DESELECT")
    for o in lows:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(WORK, "proto04-low.glb"), export_format="GLB", use_selection=True,
        export_yup=True, export_normals=True, export_texcoords=True, export_materials="NONE", export_apply=True,
        export_draco_mesh_compression_enable=False, export_animations=False)
    for o in hi.objects:
        o.hide_set(False)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, "layers.blend"), compress=True)
    report["seconds"] = round(time.time() - T0, 1)
    json.dump(report, open(os.path.join(WORK, "layers-report.json"), "w"), indent=1)
    log("DONE", json.dumps(report))

# ---------------------------------------------------------------------- materials ---

def new_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    return m, nt, b

def obj_coords(nt, scale=1.0, rot=(0, 0, 0)):
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale, scale, scale); mp.inputs["Rotation"].default_value = rot
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"]); return mp.outputs["Vector"]

def value_jitter(nt, base_hex, fac_socket, amount):
    """Base colour whose value moves +-amount with a 0..1 pattern."""
    hsv = nt.nodes.new("ShaderNodeHueSaturation")
    hsv.inputs["Color"].default_value = (*srgb(base_hex), 1)
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = 1 - amount; mr.inputs["To Max"].default_value = 1 + amount
    nt.links.new(fac_socket, mr.inputs["Value"]); nt.links.new(mr.outputs["Result"], hsv.inputs["Value"])
    return hsv.outputs["Color"]

def mat_knit(name="knit", base="#2E3138"):
    m, nt, b = new_mat(name)
    v = obj_coords(nt)
    brick = nt.nodes.new("ShaderNodeTexBrick")
    brick.inputs["Scale"].default_value = 20.0; brick.inputs["Mortar Size"].default_value = 0.03
    brick.inputs["Color1"].default_value = (1, 1, 1, 1); brick.inputs["Color2"].default_value = (0.75, 0.75, 0.75, 1)
    brick.inputs["Mortar"].default_value = (0, 0, 0, 1); brick.offset = 0.5
    nt.links.new(v, brick.inputs["Vector"])
    wave = nt.nodes.new("ShaderNodeTexWave"); wave.inputs["Scale"].default_value = 9.0; wave.inputs["Distortion"].default_value = 2.0
    nt.links.new(v, wave.inputs["Vector"])
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "FLOAT"; mix.inputs["Factor"].default_value = 0.35
    nt.links.new(brick.outputs["Fac"], mix.inputs["A"]); nt.links.new(wave.outputs["Fac"], mix.inputs["B"])
    nt.links.new(value_jitter(nt, base, mix.outputs["Result"], 0.08), b.inputs["Base Color"])
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35; bump.inputs["Distance"].default_value = 0.0012
    nt.links.new(brick.outputs["Fac"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.78
    b.inputs["Sheen Weight"].default_value = 0.25
    return m

def mat_flat(name, hexc, rough=0.6, metal=0.0, coat=0.0):
    m, nt, b = new_mat(name)
    b.inputs["Base Color"].default_value = (*srgb(hexc), 1)
    b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    b.inputs["Coat Weight"].default_value = coat
    return m

def mat_foam():
    m, nt, b = new_mat("foam")
    noise = nt.nodes.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 140.0; noise.inputs["Detail"].default_value = 4.0
    nt.links.new(obj_coords(nt), noise.inputs["Vector"])
    nt.links.new(value_jitter(nt, "#E9E9E2", noise.outputs["Fac"], 0.03), b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.62
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.08; bump.inputs["Distance"].default_value = 0.0004
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m

def mat_carbon():
    m, nt, b = new_mat("carbon")
    # 2x2 twill read as a 45-degree checker, 6 mm pitch (two 3 mm squares).
    chk = nt.nodes.new("ShaderNodeTexChecker"); chk.inputs["Scale"].default_value = 1.0 / 0.06
    chk.inputs["Color1"].default_value = (1, 1, 1, 1); chk.inputs["Color2"].default_value = (0, 0, 0, 1)
    nt.links.new(obj_coords(nt, 1.0, (0, 0, math.radians(45))), chk.inputs["Vector"])
    nt.links.new(value_jitter(nt, "#1B1D21", chk.outputs["Fac"], 0.06), b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.32; b.inputs["Coat Weight"].default_value = 0.6
    return m

def mat_emission(name, hexc):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    e = nt.nodes.new("ShaderNodeEmission"); e.inputs["Color"].default_value = (*srgb(hexc), 1); e.inputs["Strength"].default_value = 1.0
    out = nt.nodes.new("ShaderNodeOutputMaterial"); nt.links.new(e.outputs["Emission"], out.inputs["Surface"])
    return m

MATS = {}

def materials():
    if MATS:
        return MATS
    MATS.update({
        "knit": mat_knit(),
        "shell": mat_flat("shell", "#23262B", 0.5, coat=0.15),
        "collar": mat_knit("collarKnit", "#26292E"),
        "lace": mat_flat("lace", "#F2F3EC", 0.7),
        "stripe": mat_flat("stripe", "#CCFF00", 0.45),
        "rail": mat_flat("rail", "#23262B", 0.45),
        "badge": mat_flat("badge", "#1B1D21", 0.3, coat=0.5),
        "letters": mat_flat("letters", "#A9AEA3", 0.55),
        "foam": mat_foam(),
        "carbon": mat_carbon(),
        "carrier": mat_flat("carrier", "#2C2C33", 0.66),
        "rubber": mat_flat("rubber", "#151517", 0.62),
    })
    return MATS

def material_for(part):
    if part.startswith("lug_") or part == "outsole":
        return "rubber"
    if part.startswith("lace_"):
        return "lace"
    if part.startswith("stripe_"):
        return "stripe"
    if part.startswith("rail_"):
        return "rail"
    return {"carrier": "carrier", "carrierKey": "carrier", "plate": "carbon", "foam": "foam", "upper": "knit",
            "tongue": "knit", "collar": "collar", "heelCounter": "shell", "toeCap": "shell", "heelBadge": "badge"}[part]

def open_layers():
    bpy.ops.wm.open_mainfile(filepath=os.path.join(WORK, "layers.blend"))
    MATS.clear()  # opening a file frees every material made before it
    M = materials()
    his = [o for o in bpy.data.objects if o.name.startswith("hi_")]
    for o in his:
        o.data.materials.clear(); o.data.materials.append(M[material_for(o["part"])])
        if o["part"].startswith("lug_"):
            bv = o.modifiers.new("bevel", "BEVEL"); bv.width = 0.004; bv.segments = 2; bv.limit_method = "ANGLE"
    return his

def deboss_badge(mirror=False):
    """Deboss 'HVNF' 0.4 mm into the hi badge (Blender's built-in font). Letter faces take the
    'letters' paint via material TRANSFER. mirror=True pre-flips the text for the wind still's
    mirrored left shoe, so it reads correctly after the flip."""
    M = materials()
    badge = bpy.data.objects["hi_heelBadge"]
    B = META["heelBadge"]
    cap = B["capHeight"]
    cu = bpy.data.curves.new("hvnf", "FONT"); cu.body = "HVNF"; cu.align_x = "CENTER"; cu.align_y = "CENTER"
    cu.size = cap / 0.72; cu.extrude = B["depth"]; cu.space_character = 1.08
    txt = bpy.data.objects.new("hvnf", cu); bpy.context.scene.collection.objects.link(txt)
    n = Vector(B["normal"]).normalized(); xa = Vector(B["along"]).normalized(); ya = n.cross(xa).normalized()
    if mirror:
        xa = -xa
    rot = Matrix((xa, ya, n)).transposed().to_4x4()
    txt.matrix_world = Matrix.Translation(Vector(B["centre"])) @ rot
    activate(txt); bpy.ops.object.convert(target="MESH")
    txt = bpy.context.active_object
    txt.data.materials.clear(); txt.data.materials.append(M["letters"])
    if mirror:
        # Mirrored about its own reading axis, the winding flips: recalc so the solid points outward.
        bm = bmesh.new(); bm.from_mesh(txt.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(txt.data); bm.free()
    m = badge.modifiers.new("deboss", "BOOLEAN"); m.operation = "DIFFERENCE"; m.object = txt; m.solver = "EXACT"; m.material_mode = "TRANSFER"
    apply_all(badge)
    bpy.data.objects.remove(txt, do_unlink=True)
    for p in badge.data.polygons:
        p.use_smooth = False  # a rigid moulded badge: flat faces keep the lettering crisp
    return badge

# ------------------------------------------------------------------------- bake ---

def setup_cycles(spp, w, h, transparent=True):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = spp
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception:
        pass
    sc.cycles.use_adaptive_sampling = True
    sc.render.resolution_x, sc.render.resolution_y = w, h; sc.render.resolution_percentage = 100
    sc.render.film_transparent = transparent
    sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"; sc.render.image_settings.color_depth = "8"
    sc.view_settings.view_transform = "AgX"
    for look in ("AgX - Punchy", "Punchy", "None"):
        try:
            sc.view_settings.look = look; break
        except TypeError:
            pass
    sc.cycles.max_bounces = 6
    return sc

def stage_bake():
    his = open_layers()
    deboss_badge(False)
    sc = setup_cycles(4, 2048, 2048)
    size = int(OPTS.get("size", 2048))
    col = bpy.data.images.new("atlas_col", size, size, alpha=False); col.generated_color = (0.18, 0.18, 0.18, 1)
    ao = bpy.data.images.new("atlas_ao", size, size, alpha=False); ao.generated_color = (1, 1, 1, 1)
    ao.colorspace_settings.name = "Non-Color"
    lows = [bpy.data.objects[n] for n in LAYERS]
    texnodes = {}
    for o in lows:
        m = bpy.data.materials.new(f"bake_{o.name}"); m.use_nodes = True
        t = m.node_tree.nodes.new("ShaderNodeTexImage"); t.image = col
        m.node_tree.nodes.active = t; texnodes[o.name] = t
        o.data.materials.clear(); o.data.materials.append(m)
    bk = sc.render.bake
    bk.use_clear = False; bk.margin = 6; bk.use_selected_to_active = True; bk.cage_extrusion = 0.004; bk.max_ray_distance = 0.03
    for layer in LAYERS:
        bpy.ops.object.select_all(action="DESELECT")
        for o in his:
            if o.get("layer") == layer:
                o.select_set(True)
        lo = bpy.data.objects[layer]; lo.select_set(True); bpy.context.view_layer.objects.active = lo
        bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, use_selected_to_active=True, cage_extrusion=0.004,
                            max_ray_distance=0.03, margin=6, use_clear=False, target="IMAGE_TEXTURES")
        log("baked colour", layer)
    # AO straight on the low layers (hi parts hidden): the hi parts sit within a fraction of a
    # millimetre of the low shells, so an AO ray from a hi point would hit its own low twin.
    for o in his:
        o.hide_render = True
    for t in texnodes.values():
        t.image = ao
    sc.cycles.samples = 64
    sc.world = sc.world or bpy.data.worlds.new("w")
    sc.world.light_settings.distance = 0.03
    bpy.ops.object.select_all(action="DESELECT")
    for o in lows:
        o.select_set(True)
    bpy.context.view_layer.objects.active = lows[0]
    bpy.ops.object.bake(type="AO", use_selected_to_active=False, margin=6, use_clear=False, target="IMAGE_TEXTURES")
    log("baked AO")
    a = np.array(col.pixels[:], dtype=np.float32).reshape(size, size, 4)
    o_ = np.array(ao.pixels[:], dtype=np.float32).reshape(size, size, 4)[..., :1]
    out = a.copy(); out[..., :3] = a[..., :3] * (1 + (o_ - 1) * 0.85); out[..., 3] = 1
    res = bpy.data.images.new("atlas", size, size, alpha=False)
    res.pixels[:] = out.ravel(); res.filepath_raw = os.path.join(WORK, "atlas.png"); res.file_format = "PNG"; res.save()
    col.filepath_raw = os.path.join(WORK, "atlas-colour.png"); col.file_format = "PNG"; col.save()
    log("DONE atlas.png")

# ------------------------------------------------------------------- lights, cams ---

def area(name, loc, target, size, power, hexc="#FFFFFF"):
    d = bpy.data.lights.new(name, "AREA"); d.size = size; d.energy = power; d.color = srgb(hexc)
    o = bpy.data.objects.new(name, d); bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o

def world(hexc="#000000", strength=1.0):
    w = bpy.data.worlds.new("world"); bpy.context.scene.world = w; w.use_nodes = True
    bg = w.node_tree.nodes["Background"]; bg.inputs["Color"].default_value = (*srgb(hexc), 1); bg.inputs["Strength"].default_value = strength
    return w

def three_to_blender(v):
    return Vector((v[0], -v[2], v[1]))

def camera_from(spec, w, h, name="cam"):
    cd = bpy.data.cameras.new(name); cd.sensor_fit = "VERTICAL"; cd.angle_y = math.radians(spec["fov"])
    cd.clip_start = 0.05; cd.clip_end = 40
    cam = bpy.data.objects.new(name, cd); bpy.context.scene.collection.objects.link(cam)
    pos = three_to_blender(spec["pos"]); tgt = three_to_blender(spec["target"])
    cam.location = pos; cam.rotation_euler = (tgt - pos).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam
    return cam

def shoe_lights(strength=1.0, rim=1.0, rim_size=1.6):
    """Key, fill and rim, matched to the matcap: white key top-left front, cool fill left,
    volt rim behind right; plus a white kicker behind the heel so the dark knit holds its
    edge on the night canvas. Blender axes: -Y is the lateral side (toward the cameras)."""
    s = strength * float(OPTS.get("light", 1.0))
    area("key", (-1.6, -3.2, 3.0), (0.1, 0, 0.3), 2.6, 340 * s)
    area("fill", (-4.2, -1.2, 0.8), (0, 0, 0.3), 3.0, 90 * s, "#8891A8")
    area("rim", (2.6, 2.6, 1.6), (0.3, 0, 0.35), rim_size, 520 * s * rim, "#CCFF00")
    area("kick", (-3.0, 2.2, 1.5), (-1.0, 0, 0.45), 1.4, 300 * s)
    # A low grazing strip in front of the shoe: lights the faces of the lugs so the tread reads as teeth.
    area("graze", (0.6, -3.2, 0.0), (0.2, 0, -0.01), 3.6, 260 * s)

def shadow_catcher(z):
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, z))
    p = bpy.context.active_object; p.name = "catcher"; p.is_shadow_catcher = True
    return p

def lowest_z(objs):
    return min((o.matrix_world @ Vector(c)).z for o in objs for c in o.bound_box)

def save_render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    log("wrote", os.path.basename(path))

# ------------------------------------------------------------------------ matcap ---

def stage_matcap():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = setup_cycles(128, 256, 256, transparent=False)
    world("#000000", 0.0)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=1.0)
    s = bpy.context.active_object; bpy.ops.object.shade_smooth()
    m = mat_flat("matcap", "#8A8F98", 0.45); s.data.materials.append(m)
    cd = bpy.data.cameras.new("cam"); cd.type = "ORTHO"; cd.ortho_scale = 2.0
    cam = bpy.data.objects.new("cam", cd); sc.collection.objects.link(cam); cam.location = (0, -6, 0)
    cam.rotation_euler = (math.radians(90), 0, 0); sc.camera = cam
    # Bright enough that its lit zone sits near white, so the live x-ray shows the atlas close to
    # its true albedo and doesn't go darker than the Cycles poster it fades in over; the volt rim
    # is a tight edge, not a band.
    area("key", (-3.0, -4.0, 3.2), (0, 0, 0), 3.0, 2600)
    area("fill", (-5.0, -1.0, 0.0), (0, 0, 0), 3.0, 600, "#8891A8")
    area("rim", (3.0, 4.2, 1.2), (0, 0, 0), 0.9, 520, "#CCFF00")
    save_render(os.path.join(WORK, "matcap.png"))

# ------------------------------------------------------------------------ shadow ---

def stage_shadow():
    his = open_layers()
    for o in bpy.data.objects:
        if o.type == "MESH" and not o.name.startswith("hi_"):
            o.hide_render = True
    for o in his:
        o.visible_camera = False
    sc = setup_cycles(128, 512, 160)
    world("#FFFFFF", 0.35)
    shadow_catcher(lowest_z(his))
    # Live quad: PlaneGeometry(3.4, 1.15) centred on the shoe. 512 px span 3.4; 160 px span 1.15.
    cd = bpy.data.cameras.new("top"); cd.type = "ORTHO"; cd.ortho_scale = 3.4; cd.sensor_fit = "HORIZONTAL"
    cam = bpy.data.objects.new("top", cd); sc.collection.objects.link(cam); cam.location = (0, 0, 6); sc.camera = cam
    sc.render.pixel_aspect_x = 1.0; sc.render.pixel_aspect_y = (1.15 / 160) / (3.4 / 512)
    area("top", (0.0, 0.0, 3.0), (0, 0, 0), 2.2, 700)
    out = os.path.join(WORK, "shadow.png")
    save_render(out)
    # Fade the alpha to exactly 0 at the quad's edges (smoothstep over the outer 14%), so the
    # live ground quad never shows a rectangle, and keep the darkest core at 85%.
    img = bpy.data.images.load(out); w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    def ramp(n):
        t = np.minimum(np.arange(n) + 0.5, n - np.arange(n) - 0.5) / (0.14 * n)
        t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
    px[..., 3] *= 0.85 * np.outer(ramp(h), ramp(w))
    px[..., :3] = 0.0
    img.pixels[:] = px.ravel(); img.filepath_raw = out; img.file_format = "PNG"; img.save()
    log("shadow alpha faded to the edges")

# ------------------------------------------------------------------------ stills ---

def cut_layers(his, u):
    """Section the hi parts at u: EXACT boolean against a box (x < xc) whose flat emission
    takes the layer's cap colour, transferred onto the cut faces."""
    if u < 0.01:
        return
    xc = -META["SHOE_LENGTH"] / 2 + META["SHOE_LENGTH"] * u
    boxes = {}
    for layer in LAYERS:
        bpy.ops.mesh.primitive_cube_add(size=1)
        b = bpy.context.active_object; b.name = f"cut_{layer}"
        b.scale = (4.0, 4.0, 4.0); b.location = (xc - 2.0, 0, 0.5)
        b.data.materials.append(mat_emission(f"cap_{layer}", META["CAPS"][layer]))
        b.hide_render = True; boxes[layer] = b
    for o in his:
        layer = o.get("layer")
        if not layer:
            continue
        bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
        if max(p.x for p in bb) <= xc:
            o.hide_render = True  # wholly cut away
            continue
        if min(p.x for p in bb) >= xc:
            continue
        m = o.modifiers.new("cut", "BOOLEAN"); m.operation = "DIFFERENCE"; m.object = boxes[layer]; m.solver = "EXACT"; m.material_mode = "TRANSFER"
        m.use_self = True; m.use_hole_tolerant = True  # solidified shells fold on themselves at the collar and toe
        apply_all(o)
        after = [o.matrix_world @ Vector(c) for c in o.bound_box]
        span = max(p.x for p in after) - min(p.x for p in after)
        if min(p.x for p in after) < xc - 1e-3 or span > META["SHOE_LENGTH"] + 0.1:
            log("CUT WARN", o.name, "min x", round(min(p.x for p in after), 3), "xc", round(xc, 3))

def frame_hero(his, w, h):
    """Lateral side, toe right, a long lens just below the sole plane (elev -8 degrees by default)
    so the outsole and its lugs show as teeth, rolled so the shoe rises toward the toe."""
    cd = bpy.data.cameras.new("hero"); cd.lens = 120; cd.sensor_fit = "HORIZONTAL"; cd.sensor_width = 36
    cam = bpy.data.objects.new("hero", cd); bpy.context.scene.collection.objects.link(cam)
    tgt = Vector((float(OPTS.get("tx", 0.0)), 0, float(OPTS.get("tz", 0.33))))
    dist = float(OPTS.get("dist", 14.2)); elev = math.radians(float(OPTS.get("elev", -8.0)))
    yaw = math.radians(float(OPTS.get("yaw", 16.0)))  # swing toward the toe: shows the toe box and the tread edge
    cam.location = tgt + Vector((dist * math.cos(elev) * math.sin(yaw), -dist * math.cos(elev) * math.cos(yaw), dist * math.sin(elev)))
    q = (tgt - cam.location).to_track_quat("-Z", "Y")
    roll = Matrix.Rotation(math.radians(float(OPTS.get("roll", -3.0))), 4, "Z")
    cam.matrix_world = Matrix.Translation(cam.location) @ q.to_matrix().to_4x4() @ roll
    bpy.context.scene.camera = cam
    return cam

def hero_sculpt(his):
    """Hero-only shaping of the hi parts, so the launch still reads as a racing shoe and not a
    block: toe spring, a rounded toe, a heel bevel and a taller tongue. Every move is monotonic
    in z for a given x (a shear, a squash toward a centre line, a fading lift), so stacked layers
    keep their order and their 0.3 mm gaps never close. The x-ray pack, poster, cuts and wind
    still keep the unsculpted geometry. Options: --spring --toe --bevel --tongue (in units, 1 = 100 mm;
    --toe is the squash left at the tip, 0..1)."""
    spring = float(OPTS.get("spring", 0.17)); tip = float(OPTS.get("toe", 0.34))
    bevel = float(OPTS.get("bevel", 0.15)); tongue_lift = float(OPTS.get("tongue", 0.14))
    pts = [o.matrix_world @ v.co for o in his for v in o.data.vertices]
    x0 = min(p.x for p in pts); x1 = max(p.x for p in pts); L = x1 - x0
    zmin = min(p.z for p in pts)
    toe_top = max((p.z for p in pts if (p.x - x0) / L > 0.84), default=zmin + 0.5)
    zc = zmin + 0.4 * (toe_top - zmin)  # the toe squashes toward this line: the nose sits low, as on a racer
    log("SCULPT x", round(x0, 3), "..", round(x1, 3), "zmin", round(zmin, 3), "toe top", round(toe_top, 3), "zc", round(zc, 3))

    def ss(a, b, v):
        t = min(1.0, max(0.0, (v - a) / (b - a))); return t * t * (3 - 2 * t)

    # Tongue: stretch its back end upward from its own floor, so it stands proud of the collar.
    tongue = next((o for o in his if o["part"] == "tongue"), None)
    if tongue:
        tw = tongue.matrix_world; ti = tw.inverted()
        tx = [(tw @ v.co) for v in tongue.data.vertices]
        tx0 = min(p.x for p in tx); tx1 = max(p.x for p in tx)
        bins = {}
        for p in tx:
            k = int((p.x - tx0) / max(1e-6, tx1 - tx0) * 24)
            lo, hi = bins.get(k, (p.z, p.z)); bins[k] = (min(lo, p.z), max(hi, p.z))
        for v, p in zip(tongue.data.vertices, tx):
            k = int((p.x - tx0) / max(1e-6, tx1 - tx0) * 24); lo, hi = bins[k]
            w = (p.z - lo) / max(1e-6, hi - lo)
            lift = tongue_lift * (1 - ss(0.0, 0.32, (p.x - tx0) / max(1e-6, tx1 - tx0))) * w
            v.co = ti @ Vector((p.x - 0.35 * lift, p.y, p.z + lift))  # leans back toward the ankle

    for o in his:
        if o.data.users > 1:
            o.data = o.data.copy()  # never sculpt a shared mesh twice
        mw = o.matrix_world; mi = mw.inverted()
        for v in o.data.vertices:
            p = mw @ v.co; t = (p.x - x0) / L; z = p.z
            # Rounded toe: an elliptic squash toward zc over the last 16 % of the length.
            if t > 0.84:
                e = (t - 0.84) / 0.16
                s = tip + (1 - tip) * math.sqrt(max(0.0, 1 - e * e))
                z = zc + (z - zc) * s
            # Heel bevel: the sole's back edge lifts, fading out 60 mm up so the upper is untouched.
            if t < 0.13:
                b = bevel * ((0.13 - t) / 0.13) ** 2
                z += b * max(0.0, 1 - (z - zmin) / 0.6)
            # Toe spring: the whole forefoot rises toward the tip.
            z += spring * ss(0.58, 1.0, t) ** 1.6
            v.co = mi @ Vector((p.x, p.y, z))
        o.data.update()

def stage_stills():
    what = (OPTS.get("what") or "hero,inside,cuts,wind").split(",")
    spp = int(OPTS.get("spp", 96)); k = float(OPTS.get("scale", 1.0))
    tag = OPTS.get("tag", "")
    R = lambda w, h: (max(16, int(w * k)), max(16, int(h * k)))
    if "hero" in what:
        his = open_layers(); deboss_badge(False); _prep_hi_scene()
        if OPTS.get("sculpt", "1") != "0":
            hero_sculpt(his)
        setup_cycles(spp, *R(1800, 900)); world("#000000", 0.0)
        # A softer, wider volt rim than the x-ray stills: a glow along the toe, not a hot edge.
        shoe_lights(rim=float(OPTS.get("rim", 0.45)), rim_size=float(OPTS.get("rim-size", 3.2)))
        # A cool bounce from below and in front: picks out the lugs' faces and the outsole edge,
        # which the low camera now sees, so the tread reads against the night canvas.
        area("under", (0.4, -2.6, -2.2), (0.2, 0, 0.0), 3.0, float(OPTS.get("under", 160)), "#DDE3EA")
        # The camera sits below the sole plane (the lugs read as teeth), so there is no floor to catch a shadow.
        frame_hero(his, 1800, 900)
        save_render(os.path.join(WORK, f"still-hero{tag}.png"))
    if "inside" in what:
        his = open_layers(); deboss_badge(False); _prep_hi_scene()
        setup_cycles(spp, *R(1600, 900)); world("#000000", 0.0); shoe_lights()
        shadow_catcher(lowest_z(his)); camera_from(META["CAMERA_LIVE"], 1600, 900)
        save_render(os.path.join(WORK, f"still-inside{tag}.png"))
    if "cuts" in what:
        only = [int(i) for i in OPTS["stations"].split(",")] if "stations" in OPTS else range(len(META["CUT_STATIONS"]))
        for i in only:
            st = META["CUT_STATIONS"][i]
            his = open_layers(); deboss_badge(False); _prep_hi_scene()
            setup_cycles(spp, *R(1200, 900)); world("#000000", 0.0); shoe_lights()
            shadow_catcher(lowest_z(his))
            cut_layers(his, st["u"])
            camera_from(META["CAMERA_STILLS"], 1200, 900)
            save_render(os.path.join(WORK, f"still-cut-{i}{tag}.png"))
    if "wind" in what:
        his = open_layers(); deboss_badge(True); _prep_hi_scene()
        setup_cycles(spp, *R(1600, 560)); world("#000000", 0.0); shoe_lights()
        root = bpy.data.objects.new("mirror", None); bpy.context.scene.collection.objects.link(root)
        for o in his:
            o.parent = root
        root.scale.x = -1  # the left shoe: toe points LEFT, the lateral side still faces the camera
        bpy.context.view_layer.update()
        cd = bpy.data.cameras.new("wind"); cd.type = "ORTHO"; cd.sensor_fit = "HORIZONTAL"
        # The shoe fills about half the frame's height, so the streamlines have air to climb into.
        cd.ortho_scale = float(OPTS.get("wind-scale", 6.0))
        cam = bpy.data.objects.new("wind", cd); bpy.context.scene.collection.objects.link(cam)
        # Frame bottom = 8 mm under the lug tips, so the streamlines' ground wall sits just below
        # the shoe and the air has room to climb over it.
        cam.location = (float(OPTS.get("wind-x", 0.0)), -8, float(OPTS.get("wind-z", 0.935))); cam.rotation_euler = (math.radians(90), 0, 0)
        bpy.context.scene.camera = cam
        out = os.path.join(WORK, f"still-wind{tag}.png")
        save_render(out)
        # The silhouette for streamlines.mjs: the render's alpha as a grey PNG.
        img = bpy.data.images.load(out)
        w, h = img.size
        px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
        a = np.repeat(px[..., 3:4], 3, axis=2)
        mask = bpy.data.images.new("wind_alpha", w, h, alpha=False)
        mask.pixels[:] = np.concatenate([a, np.ones((h, w, 1), np.float32)], axis=2).ravel()
        mask.filepath_raw = os.path.join(WORK, f"wind-alpha{tag}.png"); mask.file_format = "PNG"; mask.save()
        log("wrote", f"wind-alpha{tag}.png")

def _prep_hi_scene():
    for o in bpy.data.objects:
        if o.type == "MESH" and not o.name.startswith("hi_"):
            o.hide_render = True

def stage_verify():
    """Disjointness proof for the shipped low layers: BVH triangle overlaps between every pair
    of layers (should be 0; a few slivers from decimation are reported, never hidden), plus
    each layer's manifold report."""
    from mathutils.bvhtree import BVHTree
    bpy.ops.wm.open_mainfile(filepath=os.path.join(WORK, "layers.blend"))
    trees = {}
    for n in LAYERS:
        o = bpy.data.objects[n]
        bm = bmesh.new(); bm.from_mesh(o.data); bm.transform(o.matrix_world)
        trees[n] = BVHTree.FromBMesh(bm); bm.free()
        bad, bnd = manifold_report(o)
        log("VERIFY", n, "tris", tris(o), "nonmanifold", bad, "boundary", bnd)
    out = {}
    for i, a in enumerate(LAYERS):
        for b in LAYERS[i + 1:]:
            pairs = trees[a].overlap(trees[b]); k = len(pairs); out[f"{a}/{b}"] = k
            log("VERIFY overlap", a, b, k)
            if k:
                # Where along the shoe (u, heel 0 to toe 1) and across it (z, lateral +) they sit.
                L = META["SHOE_LENGTH"]; mesh = bpy.data.objects[a].data
                us = sorted(round((sum((mesh.vertices[vi].co.x for vi in mesh.polygons[p].vertices)) / 3 + L / 2) / L, 3) for p, _ in pairs)
                zs = sorted(round(-sum((mesh.vertices[vi].co.y for vi in mesh.polygons[p].vertices)) / 3 * 100, 1) for p, _ in pairs)
                log("VERIFY where u", us[0], "..", us[-1], "median", us[len(us) // 2], "| z mm", zs[0], "..", zs[-1])
                out[f"{a}/{b} u"] = [us[0], us[-1]]
    json.dump(out, open(os.path.join(WORK, "verify-report.json"), "w"), indent=1)

STAGES = {"verify": stage_verify, "layers": stage_layers, "bake": stage_bake, "matcap": stage_matcap, "shadow": stage_shadow, "stills": stage_stills}
if STAGE not in STAGES:
    fail(f"unknown stage {STAGE}; use one of {', '.join(STAGES)}")
STAGES[STAGE]()
log("finished")
