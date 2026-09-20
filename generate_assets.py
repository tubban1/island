import math, random, os, hashlib, json
from pathlib import Path
import numpy as np
import trimesh
from trimesh.transformations import translation_matrix, rotation_matrix, scale_matrix, concatenate_matrices

ROOT = Path(__file__).resolve().parent
ASSET_DIR = ROOT / 'public' / 'assets'
ASSET_DIR.mkdir(parents=True, exist_ok=True)
ISLAND_SCALE=json.loads((ROOT/'src'/'island-size.json').read_text())['linearScale']
LAYOUT=json.loads((ROOT/'src'/'harbour-layout.json').read_text())
random.seed(2099506310794600740)
np.random.seed(42)

# ---------- materials ----------
def mat(name, hex_color, rough=0.82, metallic=0.0):
    if isinstance(hex_color, str):
        h = hex_color.lstrip('#')
        rgb = tuple(int(h[i:i+2], 16) for i in (0,2,4))
    else:
        rgb = hex_color
    linear=lambda v: v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
    return trimesh.visual.material.PBRMaterial(
        name=name,
        baseColorFactor=[linear(rgb[0]/255), linear(rgb[1]/255), linear(rgb[2]/255), 1.0],
        metallicFactor=metallic,
        doubleSided=True,
        roughnessFactor=rough
    )

M = {
 'sand': mat('Warm lagoon sand','#F4DA9D'),
 'sand_hi': mat('Sunlit sand','#FFE7AA'),
 'grass': mat('Island ground','#B4BD68'),
 'grass_dark': mat('Dense green','#348A42'),
 'wall': mat('Sun bleached plaster','#F4F0E4'),
 'wood': mat('Honey wood','#C89A62'),
 'wood_dark': mat('Dark wood','#91633F'),
 'roof': mat('Terracotta roof','#B98A51'),
 'teal': mat('Nowsome teal','#168B82'),
 'teal_dark': mat('Deep teal','#0B665E'),
 'white': mat('Boat ivory','#F7F4E9'),
 'glass': mat('Window glass','#4FA5A0', rough=0.28, metallic=0.0),
 'pink': mat('Coral pink','#D9799D'),
 'pink2': mat('Flower pink','#FF498D'),
 'purple': mat('Coral purple','#7458A0'),
 'aqua': mat('Coral aqua','#30B8B1'),
 'cyan': mat('Coral cyan','#43C8C8'),
 'mint': mat('Coral mint','#91D8A6'),
 'lime': mat('Palm lime','#B2D64B'),
 'leaf': mat('Palm leaf','#70BA3B'),
 'leaf_dark': mat('Palm dark','#34994A'),
 'yellow': mat('Coral yellow','#DDD17E'),
 'reef': mat('Reef rock','#9F9686'),
 'reef_sand': mat('Reef rock sandstone','#C0AF94'),
 'reef_slate': mat('Reef rock slate','#78818A'),
 'reef_brown': mat('Reef rock brown','#968572'),
 'rock': mat('Beach rock','#8E8C7C'),
 'motor': mat('Motor green','#208A66'),
 'red': mat('Flag red','#E24B45'),
 'black': mat('Charcoal','#313A36'),
 'seabed': mat('Submerged sand','#E7D8A7'),
 'shell': mat('Shell ivory','#FFF0D5'),
 'shell_pink': mat('Shell rose','#EDB6A0'),
 'crab': mat('Crab coral','#D96238'),
 'flower_magenta': mat('Flower magenta','#CF2683'),
 'flower_orange': mat('Flower orange','#FF7959'),
}

# ---------- scene helpers ----------
class MeshCollection:
    def __init__(self): self.groups={}

def add(scene, mesh, name, matl=None, T=None):
    mesh=mesh.copy()
    if T is not None: mesh.apply_transform(T)
    mesh.apply_translation([0,getattr(scene,"y_offset",0),0])
    mesh.visual=trimesh.visual.TextureVisuals(material=matl)
    scene.groups.setdefault(matl.name,[]).append(mesh)

def trs(pos=(0,0,0), rot=(0,0,0), scl=(1,1,1)):
    tx = translation_matrix(pos)
    rx = rotation_matrix(rot[0], [1,0,0])
    ry = rotation_matrix(rot[1], [0,1,0])
    rz = rotation_matrix(rot[2], [0,0,1])
    sc = scale_matrix(1.0)
    sc[0,0], sc[1,1], sc[2,2] = scl
    return concatenate_matrices(tx, rz, ry, rx, sc)

def irregular_disc(rx, rz, h, n=64, seed=1, wobble=0.08):
    rng=random.Random(seed)
    phases=[rng.random()*math.tau for _ in range(4)]
    verts=[[0,h/2,0]]
    rings=[(.64,h/2),(.86,h*.37),(1.0,-h*.22),(1.12,-h*1.1)]
    for r,y in rings:
        for i in range(n):
            a=i*math.tau/n
            w=1+wobble*(.45*math.sin(3*a+phases[0])+.3*math.sin(5*a+phases[1])+.2*math.sin(7*a+phases[2]))
            verts.append([rx*r*w*math.cos(a),y,rz*r*w*math.sin(a)])
    faces=[]
    for i in range(n): faces.append([0,1+(i+1)%n,1+i])
    for ring in range(len(rings)-1):
        for i in range(n):
            a=1+ring*n+i; b=1+ring*n+(i+1)%n; c=a+n; d=b+n
            faces.extend([[a,b,c],[b,d,c]])
    return trimesh.Trimesh(vertices=verts,faces=faces,process=False)

def custom_leaf(length=2.2, width=0.58, lift=0.16, segments=5):
    # vertical y is thickness/lift; blade extends on local +Z
    verts=[]
    for i in range(segments+1):
        t=i/segments
        w=width*(math.sin(math.pi*t)**0.72)*(1-0.23*t)
        z=length*t
        y=lift*math.sin(math.pi*t) - length*.16*t*t
        verts.append([-w/2,y,z]); verts.append([0,y+width*.13*math.sin(math.pi*t),z]); verts.append([w/2,y,z])
    faces=[]
    for i in range(segments):
        a=3*i
        faces += [[a,a+3,a+1],[a+1,a+3,a+4],[a+1,a+4,a+2],[a+2,a+4,a+5]]
    return trimesh.Trimesh(vertices=np.array(verts), faces=np.array(faces), process=False)

def gable_roof(w=5.0,d=4.0,h=1.6):
    # y up, x width, z depth
    v=np.array([
        [-w/2,0,-d/2],[w/2,0,-d/2],[-w/2,0,d/2],[w/2,0,d/2],
        [0,h,-d/2],[0,h,d/2]
    ],float)
    f=np.array([
        [0,1,4], [2,5,3],
        [0,4,2],[2,4,5],
        [1,3,4],[3,5,4],
        [0,2,1],[1,2,3]
    ])
    return trimesh.Trimesh(vertices=v,faces=f,process=False)

def boat_hull():
    # pointed bow + squared stern, y up
    v=np.array([
      [-0.75,0,-1.55],[0.75,0,-1.55],[-0.83,0,0.9],[0.83,0,0.9],[0,0,1.95],
      [-0.55,0.52,-1.35],[0.55,0.52,-1.35],[-0.62,0.52,0.86],[0.62,0.52,0.86],[0,0.52,1.72]
    ],float)
    f=[]
    # bottom/top-ish sides
    f += [[0,1,2],[1,3,2],[2,3,4]]
    # Open interior; deck planks are a separate surface.
    # sides
    for a,b,c,d in [(0,2,5,7),(1,6,3,8),(2,4,7,9),(4,3,9,8),(0,5,1,6)]:
        f += [[a,b,c],[c,b,d]]
    return trimesh.Trimesh(vertices=v, faces=np.array(f), process=False)

# ---------- assets ----------
def add_palm(scene, x,z, scale=1.0, rot=0.0, name='Palm'):
    h=4.1*scale
    # Continuous arcing trunk; each tapered segment follows the local tangent.
    lean=np.array([-math.cos(rot),0,math.sin(rot)])*1.15*scale
    def centre(t):return np.array([x,.48+h*t,z])+lean*(.18*t+.82*t*t)
    for i in range(15):
        start=centre(i/15);end=centre((i+1)/15);direction=end-start
        seg=trimesh.creation.cylinder(radius=.22*scale*(1-.40*i/15),height=np.linalg.norm(direction)+.025,sections=10)
        T=trimesh.geometry.align_vectors([0,0,1],direction/np.linalg.norm(direction));T[:3,3]=(start+end)/2
        add(scene,seg,f'{name}_Trunk_{i}',M['wood'] if i%3 else M['wood_dark'],T)
        collar=trimesh.creation.cylinder(radius=.227*scale*(1-.40*i/15),height=.035,sections=10)
        T[:3,3]=start;add(scene,collar,f'{name}_GrowthRing_{i}',M['sand_hi'],T)
    crown=centre(1);x,z=float(crown[0]),float(crown[2]);crown_y=float(crown[1])
    # coconuts
    for i,a in enumerate([0,2.1,4.2]):
        sph=trimesh.creation.icosphere(subdivisions=1,radius=.18*scale)
        add(scene,sph,f'{name}_Coconut_{i}',M['wood_dark'],trs((x+.23*math.cos(a)*scale,crown_y-.12*scale,z+.23*math.sin(a)*scale)))
    leaf=custom_leaf(2.65*scale,.78*scale,.22*scale,segments=6)
    for i in range(9):
        a=rot+i*math.tau/9
        # leaf local extends +Z, rotate around y, droop around x
        T=trs((x,crown_y,z),(-0.02-0.07*(i%2),a,0))
        add(scene,leaf,f'{name}_Leaf_{i}',M['leaf'] if i%3 else M['lime'],T)

def add_bush(scene,x,z,s=1.0,name='Bush'):
    rng=random.Random(int.from_bytes(hashlib.sha256(f'{x:.2f},{z:.2f},{name}'.encode()).digest()[:4], 'little'))
    scene.y_offset=.52
    for i in range(7):
        r=(0.32+rng.random()*0.25)*s
        ico=trimesh.creation.icosphere(subdivisions=1,radius=r)
        c=M['leaf_dark'] if i%3==0 else M['leaf']
        add(scene,ico,f'{name}_Leaf_{i}',c,trs((x+(rng.random()-.5)*1.35*s,0.22+r*.75,z+(rng.random()-.5)*1.1*s),scl=(1,0.72,1)))
    for j in range(22):
        angle=j*2.399
        blade=custom_leaf((.9+rng.random()*.7)*s,.57*s,.43*s,6)
        add(scene,blade,f'{name}_Blade_{j}',M['leaf'] if j%3 else M['lime'],trs((x,.32,z),(-.45,angle,0)))
    # Five-petalled hibiscus above the groundcover, not hidden inside it.
    for j in range(14):
        px=x+(rng.random()-.5)*1.9*s; pz=z+(rng.random()-.5)*1.7*s
        py=(1.02+rng.random()*.25)*s
        color=[M['pink2'],M['flower_magenta'],M['flower_orange'],M['white'],M['yellow']][j%5]
        for k in range(5):
            a=k*math.tau/5
            petal=trimesh.creation.icosphere(subdivisions=1,radius=.125*s)
            add(scene,petal,f'{name}_Flower_{j}_{k}',color,trs((px+.13*s*math.cos(a),py,pz+.13*s*math.sin(a)),scl=(1,.42,1)))
        add(scene,trimesh.creation.icosphere(subdivisions=1,radius=.055*s),f'{name}_Pollen_{j}',M['yellow'],trs((px,py+.035*s,pz)))
    scene.y_offset=0

def add_coral_cluster(scene,x,z,s=1.0,seed=0,name='Reef'):
    rng=random.Random(seed)
    # Entire coral, including the highest tube, stays below the surface.
    radius=math.hypot((x-13.5)/(10.15*ISLAND_SCALE),z/(7.65*ISLAND_SCALE))
    coral_y_offset=min(seabed_height(radius)+.40,-.38-1.15*s)
    # Lift only the broad rocks onto the sandy shelf: their bases remain below
    # the water plane while their upper edges stay visible at the shoreline.
    scene.y_offset=seabed_height(radius)-.02
    for k in range(2+(seed%2)):
        rock=trimesh.creation.icosphere(subdivisions=1,radius=1)
        add(scene,rock,f'{name}_Rock_{k}',[M['reef'],M['reef_sand'],M['reef_slate'],M['reef_brown']][(seed+k)%4],trs((x+(k-.5)*.65*s,-.12,z+(rng.random()-.5)*.6*s),(0,rng.random()*math.tau,0),scl=(1.05*s,.30*s,.76*s)))
    scene.y_offset=coral_y_offset
    # tube corals
    for i in range(rng.randint(1,5)):
        rad=(.08+rng.random()*.08)*s; hh=(.42+rng.random()*.48)*s
        tube=trimesh.creation.cylinder(radius=rad,height=hh,sections=7)
        px=x+(rng.random()-.5)*1.65*s; pz=z+(rng.random()-.5)*1.1*s
        add(scene,tube,f'{name}_Tube_{i}',M['purple'] if i%2 else M['cyan'],trs((px,.16+hh/2,pz),(math.pi/2,0,0)))
        # hollow rim ring-ish via torus
        tor=trimesh.creation.torus(major_radius=rad*.72, minor_radius=rad*.18, major_sections=8, minor_sections=5)
        add(scene,tor,f'{name}_TubeRim_{i}',M['yellow'] if i%3==0 else M['aqua'],trs((px,.16+hh,pz),(math.pi/2,0,0)))
        dark=trimesh.creation.cylinder(radius=rad*.64,height=.012,sections=10)
        add(scene,dark,f'{name}_TubeHole_{i}',M['teal_dark'],trs((px,.165+hh,pz),(math.pi/2,0,0)))
    # tiered cabbage coral with scalloped pale rims
    for j in range(rng.randint(0,3)):
        px=x+(rng.random()-.5)*1.5*s; pz=z+(rng.random()-.5)*s
        for k in range(4):
            r=(.36-k*.065)*s
            plate=irregular_disc(r,r,.065*s,n=24,seed=seed+j,wobble=.25)
            add(scene,plate,f'{name}_Cabbage_{j}_{k}',M['aqua'],trs((px,.23+k*.14*s,pz)))
            rim=trimesh.creation.torus(major_radius=r*.89,minor_radius=.013*s,major_sections=24,minor_sections=4)
            add(scene,rim,f'{name}_CabbageRim_{j}_{k}',M['mint'],trs((px,.27+k*.14*s,pz),(math.pi/2,0,0)))
    # brain / ball corals
    for i in range(rng.randint(1,4)):
        r=(.18+rng.random()*.16)*s
        ico=trimesh.creation.icosphere(subdivisions=2,radius=r)
        px=x+(rng.random()-.5)*1.55*s; pz=z+(rng.random()-.5)*s
        add(scene,ico,f'{name}_Ball_{i}',[M['yellow'],M['pink'],M['mint'],M['aqua']][i],trs((px,.21+r*.5,pz),scl=(1,0.76,1)))
        for j in range(16):
            a=j*2.399; yy=1-j/16
            rr=math.sqrt(1-yy*yy)*r
            bud=trimesh.creation.icosphere(subdivisions=0,radius=r*.21)
            add(scene,bud,f'{name}_Polyp_{i}_{j}',M['mint'] if i%2 else M['yellow'],trs((px+rr*math.cos(a),.25+r*.5+yy*r*.7,pz+rr*math.sin(a))))
    # fan coral leaves / sea grass
    for i in range(5):
        blade=custom_leaf((.52+rng.random()*.4)*s,(.16+rng.random()*.14)*s,.06*s,4)
        a=rng.random()*math.tau
        add(scene,blade,f'{name}_Grass_{i}',M['aqua'] if i%2 else M['pink'],trs((x+(rng.random()-.5)*1.7*s,.12,z+(rng.random()-.5)*1.15*s),(-.25,a,0)))

    for j in range(rng.randint(8,17)):
        px=x+(rng.random()-.5)*3*s; pz=z+(rng.random()-.5)*2*s
        blade=custom_leaf(rng.uniform(.35,.85)*s,.055*s,.08*s,5)
        add(scene,blade,f'{name}_Seagrass_{j}',M['teal'],trs((px,-.10,pz),(-1.25,rng.random()*math.tau,0)))
    scene.y_offset=0

def beam(scene,a,b,r,material,name):
    start=np.array(a);end=np.array(b);direction=end-start
    mesh=trimesh.creation.cylinder(radius=r,height=np.linalg.norm(direction),sections=8)
    transform=trimesh.geometry.align_vectors([0,0,1],direction/np.linalg.norm(direction))
    transform[:3,3]=(start+end)/2
    add(scene,mesh,name,material,transform)

def add_house(scene,x,z,rot=0.0):
    def box(name,size,pos,material,rotation=(0,0,0)):
        add(scene,trimesh.creation.box(size),name,material,trs(pos,rotation))
    box('HouseFoundation',[5.95,.25,4.45],(x,.84,z),M['rock'])
    box('HouseWalls',[5.8,2.85,4.25],(x,2.30,z),M['wall'])
    add(scene,gable_roof(6.25,4.8,1.65),'HouseRoof',M['roof'],trs((x,3.63,z)))
    # Rounded half-barrel roof tiles, with warm varied clay courses.
    for side in [-1,1]:
        slope=-side*math.atan(1.65/3.125)
        for row in range(8):
            xx=side*(.18+row*.39);yy=3.63+1.65*(1-abs(xx)/3.125)+.055
            for col in range(11):
                tint=['#BF925A','#C89B63','#AD8049','#D0A16C'][(row*7+col*3)%4]
                tile=trimesh.creation.cylinder(radius=.235,height=.43,sections=10)
                add(scene,tile,'ClayTile',mat('Roof tile '+tint,tint),trs((x+xx,yy,z-2.17+col*.435),(0,0,slope),scl=(1,.36,1)))
    for zz in np.arange(z-2.3,z+2.5,.4):
        add(scene,trimesh.creation.cylinder(radius=.16,height=.43,sections=10),'RidgeTile',M['roof'],trs((x,5.31,zz)))
    for side in [-1,1]:
        gable=trimesh.Trimesh(vertices=[[-2.88,0,0],[2.88,0,0],[0,1.52,0]],faces=[[0,1,2]],process=False)
        add(scene,gable,'WhiteGable',M['wall'],trs((x,3.64,z+side*2.411)))
    # Front door, teal shutters and framed side window.
    box('DoorFrame',[1.0,2.30,.15],(x+.25,1.97,z+2.18),M['wood_dark'])
    box('TealDoor',[.78,2.1,.17],(x+.25,1.93,z+2.23),M['teal_dark'])
    add(scene,trimesh.creation.icosphere(subdivisions=1,radius=.055),'DoorHandle',M['yellow'],trs((x+.52,1.85,z+2.34)))
    for dx in [-1.65,1.85]:
        box('WindowFrame',[.96,1.20,.15],(x+dx,2.48,z+2.18),M['wood'])
        box('WindowGlass',[.75,.98,.17],(x+dx,2.48,z+2.20),M['glass'])
        for sx in [-.59,.59]:
            box('WindowShutter',[.25,1.20,.15],(x+dx+sx,2.48,z+2.24),M['teal'])
            for k in range(5):box('ShutterSlat',[.27,.04,.06],(x+dx+sx,2.08+k*.19,z+2.34),M['teal_dark'])
        box('WindowCross',[.06,1.02,.08],(x+dx,2.48,z+2.32),M['wood'])
        box('WindowCross',[.8,.06,.08],(x+dx,2.48,z+2.32),M['wood'])
    box('SideWindowFrame',[.14,1.35,1.25],(x-2.94,2.5,z-.3),M['wood'])
    box('SideWindow',[.16,1.1,1.02],(x-2.98,2.5,z-.3),M['teal'])
    for dz in [-.28,.28]:box('SideWindowBars',[.18,1.1,.055],(x-3.01,2.5,z-.3+dz),M['wood'])
    # Stepped stone plinth along the house edges, with planting outside it.
    for side in [-1,1]:
        for level in range(2):
            box('HouseEdgeStep',[.42,.17,4.65],(x+side*(3.04+level*.30),.70-level*.15,z),M['sand_hi'])
    # Walkable raised porch and broad descending steps.
    for i in range(17):box('PorchBoard',[.305,.18,2.55],(x-2.45+i*.305,.94,z+3.45),M['wood'])
    for i in range(3):box('PorchStep',[2.0,.18,.46],(x+.25,.80-i*.17,z+4.85+i*.40),M['sand_hi'])
    for dx in [-2.45,2.45]:
        for dz in [2.25,4.65]:box('PergolaPost',[.19,2.55,.19],(x+dx,2.18,z+dz),M['wood_dark'])
    for dz in [2.25,4.65]:box('PergolaCrossBeam',[5.35,.20,.20],(x,3.42,z+dz),M['wood'])
    for dx in np.arange(-2.5,2.6,.43):box('PergolaRafter',[.14,.16,2.95],(x+dx,3.57,z+3.45),M['wood'])
    for side in [-1,1]:
        for k in range(13):
            yy=1.1+k*.18;px=x+side*2.48+.09*math.sin(k)
            leaf=custom_leaf(.38,.20,.09,4)
            add(scene,leaf,'PergolaVine',M['leaf_dark'] if k%2 else M['leaf'],trs((px,yy,z+4.72),(.4,k*2.4,0)))
            if k%3==0:
                for petal in range(5):
                    a=petal*math.tau/5
                    add(scene,trimesh.creation.icosphere(subdivisions=1,radius=.095),'VineFlower',M['pink2'],trs((px+.10*math.cos(a),yy+.10*math.sin(a),z+4.78),scl=(1,1,.45)))
    # Porch chairs and a small round table leave a clear central door path.
    for dx in [-1.6,1.6]:
        box('ChairSeat',[.64,.12,.65],(x+dx,1.48,z+3.35),M['wood'])
        box('ChairCushion',[.54,.10,.54],(x+dx,1.59,z+3.35),M['teal'])
        box('ChairBack',[.64,.65,.10],(x+dx,1.88,z+3.04),M['wood'])
        for cx in [-.24,.24]:
            for cz in [-.24,.24]:box('ChairLeg',[.075,.50,.075],(x+dx+cx,1.22,z+3.35+cz),M['wood_dark'])
    add(scene,trimesh.creation.cylinder(radius=.40,height=.12,sections=16),'TableTop',M['wood'],trs((x+1.6,1.75,z+4.18),(math.pi/2,0,0)))
    box('TableStem',[.12,.72,.12],(x+1.6,1.36,z+4.18),M['wood_dark'])
    # Door lanterns, window flower boxes and a woven porch rug.
    for dx in [-.48,.96]:
        box('DoorLanternBracket',[.08,.12,.40],(x+dx,2.75,z+2.38),M['black'])
        box('DoorLanternGlass',[.20,.30,.20],(x+dx,2.55,z+2.52),M['sand_hi'])
        for yy in [2.38,2.72]:box('DoorLanternRim',[.27,.055,.27],(x+dx,yy,z+2.52),M['black'])
    for dx in [-1.65,1.85]:
        box('WindowBox',[1.05,.22,.36],(x+dx,1.79,z+2.42),M['wood'])
        for k in range(7):
            px=x+dx-.42+k*.14
            add(scene,trimesh.creation.icosphere(subdivisions=1,radius=.13),'WindowBoxLeaf',M['leaf_dark'],trs((px,1.98,z+2.43),scl=(1,.8,1)))
            add(scene,trimesh.creation.icosphere(subdivisions=1,radius=.075),'WindowBoxFlower',M['pink2'] if k%2 else M['yellow'],trs((px,2.09,z+2.50)))
    box('PorchRug',[1.12,.015,1.72],(x+.05,1.042,z+3.38),M['teal'])
    for zz in [2.63,2.75,4.01,4.13]:box('RugStripe',[1.12,.017,.065],(x+.05,1.044,z+zz),M['white'])
    for dx in [-2.25,2.1]:
        add(scene,trimesh.creation.cylinder(radius=.20,height=.33,sections=10),'TerracottaPot',M['roof'],trs((x+dx,1.20,z+4.2),(math.pi/2,0,0)))
        for k in range(6):
            add(scene,custom_leaf(.58,.22,.20,4),'PottedLeaf',M['leaf'],trs((x+dx,1.37,z+4.2),(-.55,k*math.tau/6,0)))
    # Upright longboard and life ring, with real orientation and thickness.
    board=trimesh.creation.icosphere(subdivisions=2,radius=1)
    add(scene,board,'Surfboard',M['white'],trs((x-2.85,1.96,z+2.9),(0,0,-.13),scl=(.26,1.12,.075)))
    box('SurfboardStripe',[.09,1.95,.025],(x-2.85,1.96,z+2.98),M['teal'],(0,0,-.13))
    ring=trimesh.creation.torus(major_radius=.29,minor_radius=.075)
    add(scene,ring,'LifeRing',M['white'],trs((x+2.45,2.35,z+4.8),(math.pi/2,0,0)))
    for a in [0,math.pi/2,math.pi,3*math.pi/2]:
        box('LifeRingBand',[.12,.14,.12],(x+2.45+.29*math.cos(a),2.35+.29*math.sin(a),z+4.8),M['red'])
    # A barrel next to the porch, strapped with dark hoops.
    add(scene,trimesh.creation.cylinder(radius=.34,height=.8,sections=12),'Barrel',M['wood'],trs((x+3.22,1.17,z+2.8),(math.pi/2,0,0)))
    for yy in [.89,1.40]:
        add(scene,trimesh.creation.torus(major_radius=.342,minor_radius=.023),'BarrelBand',M['wood_dark'],trs((x+3.22,yy,z+2.8),(math.pi/2,0,0)))

def add_dock(scene,x,z,rot=0.0):
    destination=scene;scene=MeshCollection();origin=(x,0,z);x=0;z=0
    # One coherent narrow pier, with supports below every rail span.
    for i in range(21):
        pz=z+i*.30
        add(scene,trimesh.creation.box([2.35,.16,.28]),'PierPlank',M['wood'],trs((x,.48,pz)))
        for px in [-.94,.94]:
            add(scene,trimesh.creation.cylinder(radius=.025,height=.01,sections=6),'PlankNail',M['black'],trs((x+px,.565,pz),(math.pi/2,0,0)))
    for side in [-1,1]:
        add(scene,trimesh.creation.box([.16,.24,6.5]),'PierBeam',M['wood_dark'],trs((x+side*.98,.28,z+3.0)))
        for j in range(5):
            pz=z+j*1.50;px=x+side*1.16
            add(scene,trimesh.creation.cylinder(radius=.14,height=3.4,sections=12),'PierPile',M['wood_dark'],trs((px,-.25,pz),(math.pi/2,0,0)))
            add(scene,trimesh.creation.cylinder(radius=.17,height=.10,sections=12),'PierCap',M['wood'],trs((px,1.48,pz),(math.pi/2,0,0)))
            for yy in [1.10,1.19,1.28]:
                add(scene,trimesh.creation.torus(major_radius=.15,minor_radius=.022),'RopeWrap',M['sand_hi'],trs((px,yy,pz),(math.pi/2,0,0)))
            if j<4:
                for k in range(8):
                    t=k/8;u=(k+1)/8
                    beam(scene,(px,1.18-.24*math.sin(t*math.pi),pz+1.5*t),(px,1.18-.24*math.sin(u*math.pi),pz+1.5*u),.024,M['sand_hi'],'PierRope')
            if j in [0,3]:
                add(scene,trimesh.creation.box([.25,.34,.25]),'LanternGlass',M['sand_hi'],trs((px+side*.27,1.14,pz)))
                add(scene,trimesh.creation.box([.33,.07,.33]),'LanternCap',M['black'],trs((px+side*.27,1.34,pz)))
                beam(scene,(px,1.44,pz),(px+side*.27,1.44,pz),.025,M['black'],'LanternHook')
    # Coiled rope on the last planks, beside the mooring cleat.
    for radius in [.13,.18,.23,.28]:
        add(scene,trimesh.creation.torus(major_radius=radius,minor_radius=.023),'DeckRopeCoil',M['sand_hi'],trs((.63,.59,5.45),(math.pi/2,0,0)))
    for zz in [.7,4.7]:
        add(scene,trimesh.creation.box([.40,.065,.08]),'PierCleat',M['black'],trs((-.82,.65,zz)))
    transform=trs(origin,(0,rot,0))
    for name,meshes in scene.groups.items():
        for mesh in meshes:mesh.apply_transform(transform)
        destination.groups.setdefault(name,[]).extend(meshes)


def add_sign(scene,x,z):
    for px in [x-.85,x+.85]:
        add(scene,trimesh.creation.box([.14,1.35,.14]),'SignPost',M['wood_dark'],trs((px,.7,z)))
    add(scene,trimesh.creation.box([2.55,.58,.16]),'HomeHarbourSign',M['wood_dark'],trs((x,1.2,z)))
    # small red tag
    add(scene,trimesh.creation.box([.58,.55,.09]),'SignTag',M['red'],trs((x-.72,.46,z+.10)))

def seabed_height(radius):
    return -.38-max(0,radius-.90)*4.5

def add_seabed(scene):
    vertices=[];faces=[];segments=120
    radii=[.72,.90,1.02,1.15,1.32,1.52,1.80,2.15,2.5]
    for r in radii:
        for j in range(segments):
            a=j*math.tau/segments
            y=seabed_height(r)+.035*math.sin(a*13+r*17)
            vertices.append([13.5+10.15*ISLAND_SCALE*r*math.cos(a),y,7.65*ISLAND_SCALE*r*math.sin(a)])
    for k in range(len(radii)-1):
        for j in range(segments):
            a=k*segments+j;b=k*segments+(j+1)%segments;c=a+segments;d=b+segments
            faces.extend([[a,b,c],[b,d,c]])
    add(scene,trimesh.Trimesh(vertices=vertices,faces=faces,process=False),'SandyShelf',M['seabed'])

def add_shells(scene):
    rng=random.Random(831)
    for i in range(65):
        a=rng.uniform(.05,math.tau);r=rng.uniform(.70,.86)
        x=13.5+9.4*ISLAND_SCALE*r*math.cos(a);z=7.1*ISLAND_SCALE*r*math.sin(a)
        size=rng.uniform(.055,.12)
        # A ribbed fan shell; slightly convex with radial ribs.
        vertices=[[0,.03,0]];faces=[]
        for j in range(13):
            theta=-1.1+j/12*2.2;rr=size*(1 if j%2 else .91)
            vertices.append([math.sin(theta)*rr,0,math.cos(theta)*rr])
        for j in range(12):faces.append([0,j+2,j+1])
        mesh=trimesh.Trimesh(vertices=vertices,faces=faces,process=False)
        add(scene,mesh,f'Shell_{i}',M['shell'] if i%3 else M['shell_pink'],trs((x,.385,z),(0,rng.random()*math.tau,0)))

def add_beach_lounge(scene):
    # Two staggered chairs look out to the right-hand bay, leaving the pier route clear.
    canvas=mat('Umbrella linen','#FFF0D4')
    canvas_shade=mat('Umbrella linen shade','#E8D8B9')
    towel=mat('Lounge seafoam towel','#91C7BB')
    def chair(cx,cz,angle):
        local=MeshCollection()
        def plank(name,size,pos,material,rot=(0,0,0)):
            add(local,trimesh.creation.box(size),name,material,trs(pos,rot))
        for side in [-1,1]:
            plank('LoungeSideRail',[.09,.13,1.85],(side*.44,.38,.1),M['wood_dark'])
            for zz in [-.55,.74]:
                beam(local,(side*.44,.06,zz+.12),(side*.44,.40,zz),.045,M['wood_dark'],'LoungeLeg')
            beam(local,(side*.44,.4,-.63),(side*.44,1.03,-1.38),.045,M['wood'],'LoungeBackFrame')
        for j in range(10):plank('LoungeSeatSlat',[.88,.075,.145],(0,.46,-.55+j*.16),M['wood'])
        for j in range(6):plank('LoungeBackSlat',[.88,.065,.16],(0,.51+j*.095,-.67-j*.12),M['wood'],(.67,0,0))
        plank('LoungeTowel',[.57,.014,.90],(.05,.506,.30),towel)
        for zz in [-.04,.02,.61,.67]:plank('TowelStripe',[.57,.017,.025],(.05,.510,zz),canvas)
        pillow=trimesh.creation.icosphere(subdivisions=2,radius=1)
        add(local,pillow,'LoungePillow',canvas,trs((0,.95,-1.12),(.67,0,0),scl=(.34,.085,.19)))
        transform=trs((cx,.36,cz),(0,angle,0))
        for name,meshes in local.groups.items():
            for mesh in meshes:mesh.apply_transform(transform)
            scene.groups.setdefault(name,[]).extend(meshes)
    chair(21.0,3.1,.60)
    chair(23.0,2.75,.72)
    # A small shared table between the chairs, with a cup and a closed book.
    tx,tz=22.0,2.8
    add(scene,trimesh.creation.cylinder(radius=.36,height=.10,sections=20),'BeachTableTop',M['wood'],trs((tx,1.04,tz),(math.pi/2,0,0)))
    beam(scene,(tx,.39,tz),(tx,1.02,tz),.055,M['wood_dark'],'BeachTableStem')
    for a in [0,2.1,4.2]:beam(scene,(tx,.58,tz),(tx+.25*math.cos(a),.38,tz+.25*math.sin(a)),.035,M['wood_dark'],'BeachTableFoot')
    add(scene,trimesh.creation.box([.25,.035,.19]),'BeachBook',M['teal'],trs((tx-.10,1.11,tz+.03),(0,.25,0)))
    add(scene,trimesh.creation.cylinder(radius=.06,height=.13,sections=12),'BeachCup',canvas,trs((tx+.14,1.155,tz-.08),(math.pi/2,0,0)))
    # Linen canopy with softly scalloped panels and visible timber ribs.
    ux,uz=22.0,1.10
    beam(scene,(ux,.36,uz),(ux,3.08,uz),.045,M['wood'],'UmbrellaPole')
    radius=1.48
    for panel in range(8):
        verts=[[0,0,0]]
        for j in range(5):
            angle=(panel+j/4)*math.tau/8
            rr=radius*(1-.045*math.sin(j/4*math.pi))
            verts.append([rr*math.cos(angle),-.54-.10*math.sin(j/4*math.pi),rr*math.sin(angle)])
        mesh=trimesh.Trimesh(vertices=verts,faces=[[0,j+1,j+2] for j in range(4)],process=False)
        add(scene,mesh,'LinenCanopy',canvas if panel%2 else canvas_shade,trs((ux,3.03,uz)))
        angle=panel*math.tau/8
        beam(scene,(ux,2.99,uz),(ux+radius*math.cos(angle),2.48,uz+radius*math.sin(angle)),.018,M['wood'],'UmbrellaRib')
    add(scene,trimesh.creation.icosphere(subdivisions=1,radius=.07),'UmbrellaFinial',M['wood'],trs((ux,3.08,uz)))

def create_world():
    scene=MeshCollection()
    # main island lives to the right/top in reference
    island=(10.5,-2.0)
    add_seabed(scene)
    sand=irregular_disc(9.4*ISLAND_SCALE,7.1*ISLAND_SCALE,.48,n=72,seed=11,wobble=.10)
    # Extend only the rear beach, leaving a usable clearing behind the cottage.
    sand.vertices[:,2]=np.where(sand.vertices[:,2]<0,sand.vertices[:,2]*1.27,sand.vertices[:,2])
    add(scene,sand,'Island_Sand',M['sand'],trs((island[0]+3,.15,island[1]+2),(0,.13,0)))
    inner=irregular_disc(6.8,5.2,.62,n=64,seed=12,wobble=.12)
    add(scene,inner,'Island_Ground',M['grass'],trs((island[0]+4.6,.52,island[1]+1.45),(0,.13,0)))
    # house/dock/palms
    add_house(scene,14.8,-1.35)
    add_beach_lounge(scene)
    dock=LAYOUT['dock'];add_dock(scene,dock['x'],dock['z'],dock['angle'])
    # Six separate single-file slabs: stairs first, then a sandy path, then wood.
    for row in range(6):
        t=row/5;cz=4.68+(LAYOUT['dock']['z']-.29-4.68)*t
        stone=trimesh.creation.cylinder(radius=1,height=.12,sections=8)
        add(scene,stone,'HarbourFlagstone',M['sand_hi'] if row%3 else M['rock'],trs((15.05+.035*math.sin(row*2),.40,cz),(math.pi/2,.04*math.sin(row),0),scl=(.70,.34,1)))

    add_shells(scene)
    # A few small starfish on the dry sand, outside the walking route.
    for index,(sx,sz) in enumerate([(8.4,3.4),(12.0,5.75),(19.7,1.3)]):
        verts=[[0,.065,0]]
        for k in range(10):
            a=k*math.pi/5;radius=.23 if k%2==0 else .09
            verts.append([math.cos(a)*radius,.015,math.sin(a)*radius])
        faces=[[0,(k+1)%10+1,k+1] for k in range(10)]
        star=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
        add(scene,star,'BeachStarfish',M['shell_pink'],trs((sx,.38,sz),(0,index*.7,0)))
    add_sign(scene,LAYOUT['sign']['x'],LAYOUT['sign']['z'])
    moor=LAYOUT['mooring']
    add(scene,trimesh.creation.cylinder(radius=.17,height=2.0,sections=12),'MooringPost',M['wood_dark'],trs((moor['postX'],-.2,moor['postZ']),(math.pi/2,0,0)))
    for yy in [.60,.67,.74]:
        add(scene,trimesh.creation.torus(major_radius=.175,minor_radius=.025),'MooringRope',M['sand_hi'],trs((moor['postX'],yy,moor['postZ']),(math.pi/2,0,0)))
    palms=[(11.05,.15,1.23,.35),(18.9,-1.8,1.05,2.8)]
    for i,(x,z,s,r) in enumerate(palms): add_palm(scene,x,z,s,r,f'Palm_Main_{i}')
    # Lush planting around the actual house footprint; leave the porch entrance open.
    garden=[(10.6,-2.8,.64),(10.55,-1.15,.68),(10.8,.2,.64),
            (11.3,1.7,.64),(12.0,2.8,.56),(12.2,3.65,.55),
            (18.75,-2.6,.64),(18.85,-.9,.65),(18.65,.8,.68),
            (18.0,2.65,.62),(17.7,3.7,.55)]
    # Large pale rocks at tree roots and planting edges, not a uniform border.
    for i,(rx,rz,size) in enumerate([(10.7,.55,.70),(10.4,-.5,.48),(11.55,2.9,.61),(12.8,3.9,.42),(18.9,-1.3,.65),(18.6,1.7,.52),(17.8,4.0,.42)]):
        rock=trimesh.creation.icosphere(subdivisions=1,radius=size)
        add(scene,rock,'GardenBoulder',M['rock'],trs((rx,.48+size*.38,rz),(0,i*.71,.12),scl=(1,.90,.78)))
    for i,(x,z,scale) in enumerate(garden): add_bush(scene,x,z,scale,f'Garden_{i}')
    for i,(x,z,scale) in enumerate([(20,-3.6,.8)]):
        add_palm(scene,x,z,scale,i*.7,f'GardenPalm_{i}')
    # single rock in beach center
    rock=trimesh.creation.icosphere(subdivisions=1,radius=.45)
    add(scene,rock,'BeachRock',M['rock'],trs((7.4,.62,5.0),scl=(1,.75,.8)))
    # Broken, patchy reef meadows with open channels rather than a necklace.
    rng=random.Random(734)
    points=[]
    for attempt in range(260):
        a=rng.uniform(0,math.tau)
        radius=rng.uniform(1.13,1.62)
        x=13.5+10.15*ISLAND_SCALE*radius*math.cos(a); z=7.65*ISLAND_SCALE*radius*math.sin(a)
        # Density varies around the reef; individual coral gardens do not overlap.
        if rng.random()<.28 or any((x-px)**2+(z-pz)**2<2.8 for px,pz,_ in points): continue
        points.append((x,z,rng.uniform(.28,.85)))
        if len(points)>=46: break
    # Loose foreground groups, with broad gaps for the boat and fish.
    points += [(1.3,1,.65),(2,5,.72),(4,8,.5),(7,9.5,.75),(10,10,.55),(-.5,4,.4),(3,-4,.6)]
    points=[(x,z,scale) for x,z,scale in points if math.hypot((x-13.5)/(10.15*ISLAND_SCALE),z/(7.65*ISLAND_SCALE))>1.12]
    points=[(x,z,scale) for x,z,scale in points if math.hypot(x-LAYOUT['mooring']['x'],z-LAYOUT['mooring']['z'])>2.0]
    for i,(x,z,scale) in enumerate(points):
        add_coral_cluster(scene,x,z,scale,1000+i,f'LagoonReef_{i}')
    return scene

def create_boat():
    scene=MeshCollection()
    add(scene,boat_hull(),'Boat_Hull',M['white'],trs((0,.25,0)))
    outline=[(-.65,-1.35),(-.71,.72),(-.44,1.35),(0,1.77),(.44,1.35),(.71,.72),(.65,-1.35)]
    for i in range(len(outline)-1):
        ax,az=outline[i]; bx,bz=outline[i+1]
        length=math.hypot(bx-ax,bz-az)
        angle=math.atan2(bx-ax,bz-az)
        for y,width,material,label in [(.83,.10,M['teal'],'Rail'),(.72,.065,M['wood'],'Lip')]:
            add(scene,trimesh.creation.box([width,.12,length+.06]),f'Boat_{label}_{i}',material,trs(((ax+bx)/2,y,(az+bz)/2),(0,angle,0)))
    for i in range(7):
        add(scene,trimesh.creation.box([.145,.065,2.45]),f'Boat_Plank_{i}',M['wood'],trs((-.48+i*.16,.80,-.05)))
    for i,z in enumerate([-.78,.08,.88]):
        add(scene,trimesh.creation.box([1.17,.12,.28]),f'Boat_Bench_{i}',M['teal'],trs((0,.99,z)))
        for x in [-.5,.5]:
            add(scene,trimesh.creation.box([.065,.07,.3]),f'Boat_BenchEnd_{i}_{x}',M['sand_hi'],trs((x,1.065,z)))
    # stern motor
    add(scene,trimesh.creation.box([.58,.72,.58]),'Boat_Motor',M['motor'],trs((.48,1.0,-1.62)))
    add(scene,trimesh.creation.box([.45,.18,.48]),'Boat_MotorTop',M['teal_dark'],trs((.48,1.45,-1.62)))
    # mast/flag
    add(scene,trimesh.creation.cylinder(radius=.035,height=1.35,sections=6),'Boat_FlagPole',M['wood_dark'],trs((-.48,1.35,.95),(math.pi/2,0,0)))
    flag=trimesh.creation.box([.45,.28,.03])
    add(scene,flag,'Boat_Flag',M['red'],trs((-.25,1.75,.97),(0,0,-.05)))
    # little white bow cap
    cap=trimesh.creation.icosphere(subdivisions=1,radius=.10)
    add(scene,cap,'Boat_BowCap',M['white'],trs((0,1.0,1.65)))
    return scene

def packed(scene):
    result=trimesh.Scene()
    for name,meshes in scene.groups.items():
        combined=trimesh.util.concatenate(meshes)
        combined.visual=trimesh.visual.TextureVisuals(material=meshes[0].visual.material)
        triangles=combined.vertices[combined.faces]
        face_normals=np.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0])
        normals=np.zeros_like(combined.vertices)
        for corner in range(3): np.add.at(normals,combined.faces[:,corner],face_normals)
        normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-12)
        combined.vertex_normals=normals
        result.add_geometry(combined,node_name=name,geom_name=name)
    return result

collection=create_world()
land=collection.groups['Warm lagoon sand'][0]
(ROOT/'src'/'surf-rings.json').write_text(json.dumps([land.vertices[1+i*72:1+(i+1)*72].tolist() for i in [1,2,3]]))
points=[(float(p[0]),float(p[2])) for p in land.vertices]
points=sorted(set(points))
def cross(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
lower=[];upper=[]
for p in points:
    while len(lower)>1 and cross(lower[-2],lower[-1],p)<=0:lower.pop()
    lower.append(p)
for p in reversed(points):
    while len(upper)>1 and cross(upper[-2],upper[-1],p)<=0:upper.pop()
    upper.append(p)
(ROOT/'src'/'shoreline.json').write_text(json.dumps(lower[:-1]+upper[:-1]))
world=packed(collection)
world.export(ASSET_DIR/'atoll_world.glb', include_normals=True)
boat=packed(create_boat())
boat.export(ASSET_DIR/'boat.glb', include_normals=True)

print('exported', ASSET_DIR/'atoll_world.glb', (ASSET_DIR/'atoll_world.glb').stat().st_size)
print('exported', ASSET_DIR/'boat.glb', (ASSET_DIR/'boat.glb').stat().st_size)
