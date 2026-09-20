"""
Blender 4.x master-scene builder for the delivered Atoll reconstruction.
Run from project root:
    blender -b --python blender/build_atoll_scene.py
or open Blender > Scripting and run this file.

It imports the delivered editable GLB meshes, establishes the reference camera/light rig,
creates the lagoon water surface, then saves blender/atoll_master.blend.
"""
import bpy, math, os
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WORLD_GLB = os.path.join(ROOT, 'public', 'assets', 'atoll_world.glb')
BOAT_GLB = os.path.join(ROOT, 'public', 'assets', 'boat.glb')
OUT_BLEND = os.path.join(HERE, 'atoll_master.blend')

# clean scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
    pass

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 1716
scene.render.resolution_y = 1270
scene.render.resolution_percentage = 50
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.world.color = (0.012, 0.23, 0.34)
scene.view_settings.look = 'AgX - Medium High Contrast'

# import world
bpy.ops.import_scene.gltf(filepath=WORLD_GLB)
world_objs = list(bpy.context.selected_objects)
world_col = bpy.data.collections.new('ATOLL_WORLD')
scene.collection.children.link(world_col)
for obj in world_objs:
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    world_col.objects.link(obj)

# import boat
bpy.ops.import_scene.gltf(filepath=BOAT_GLB)
boat_objs = list(bpy.context.selected_objects)
boat_col = bpy.data.collections.new('BOAT')
scene.collection.children.link(boat_col)
for obj in boat_objs:
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    boat_col.objects.link(obj)

# parent boat pieces to a root empty
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(-1.6, 0.15, 2.9))
boat_root = bpy.context.object
boat_root.name = 'Boat_Root'
for obj in boat_objs:
    obj.parent = boat_root
boat_root.scale = (0.91,0.91,0.91)

# water plane
def make_mat(name, color, rough=.36, metallic=0):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes=True
    bsdf=m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*color,1)
    bsdf.inputs['Roughness'].default_value=rough
    bsdf.inputs['Metallic'].default_value=metallic
    return m

bpy.ops.mesh.primitive_plane_add(size=120, location=(0,-0.18,0))
water=bpy.context.object
water.name='Lagoon_Water'
water.scale.y=.75
water.data.materials.append(make_mat('LagoonWater',(0.018,0.34,0.47),.28))

# camera matching the reference-style orthographic viewpoint
bpy.ops.object.camera_add(location=(-13.0,25.5,19.2))
cam=bpy.context.object
cam.name='Reference_Camera'
cam.data.type='ORTHO'
cam.data.ortho_scale=25.8
scene.camera=cam

def track_to(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat('-Z','Y').to_euler()
track_to(cam,(0,0,0))

# key light: long soft shadows like supplied frames
bpy.ops.object.light_add(type='AREA', location=(-18,28,16))
key=bpy.context.object
key.name='Warm_Sun_Key'
key.data.energy=1450
key.data.color=(1.0,.88,.64)
key.data.shape='DISK'
key.data.size=8
track_to(key,(8,0,-2))

bpy.ops.object.light_add(type='AREA', location=(18,12,-15))
fill=bpy.context.object
fill.name='Cyan_Lagoon_Fill'
fill.data.energy=700
fill.data.color=(.28,.79,.76)
fill.data.size=18
track_to(fill,(5,0,-2))

# camera-follow target for animators
bpy.ops.object.empty_add(type='SPHERE', location=(0,0,0))
target=bpy.context.object
target.name='Camera_Follow_Target'

# basic hand-authored path, matching the supplied 21.3s source progression
curve=bpy.data.curves.new('Boat_Demo_Path','CURVE')
curve.dimensions='3D'; curve.resolution_u=24
s=curve.splines.new('BEZIER')
pts=[(-1.6,.15,2.9),(-4.8,.15,1.4),(-8.4,.15,-1.6),(-11.2,.15,-4.8),(-9,.15,-7.6),(-4.1,.15,-9.2),(1.8,.15,-8.3),(4.8,.15,-5.3),(1.7,.15,-2.8),(-3.6,.15,-2),(-6.8,.15,.2),(-3,.15,2.6),(2.4,.15,3),(6.2,.15,1)]
s.bezier_points.add(len(pts)-1)
for bp,co in zip(s.bezier_points,pts):
    bp.co=co; bp.handle_left_type='AUTO'; bp.handle_right_type='AUTO'
path_obj=bpy.data.objects.new('Boat_Demo_Path',curve)
scene.collection.objects.link(path_obj)
path_obj.hide_render=True

# organise and save
for obj in scene.objects:
    if hasattr(obj,'select_set'):
        obj.select_set(False)

bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
print('Saved', OUT_BLEND)
