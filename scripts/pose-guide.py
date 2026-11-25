"""
Draws walk/run POSE GUIDES: 8 gray stick mannequins in a correct side-view cycle (dark limbs =
near side, light limbs = far side), 2 rows of 4 on green. Give a guide to the image model as an
extra reference ("redraw the character in exactly these poses") so every frame gets a different,
correct leg position. Image models can't invent a cycle on their own.

  python scripts/pose-guide.py      # writes guide-run.png and guide-walk.png in the current folder

Also prints the travel speed (body heights per second) at which the feet don't slide.
Needs Pillow (pip install pillow).
"""
import math, json
from PIL import Image, ImageDraw

# Per-leg cycle over 8 frames: (thigh angle, knee bend) in degrees; + = forward (to the right).
# The other leg runs 4 frames behind. Arms swing opposite to the same-side leg.
CYCLES = {
  'run':  dict(leg=[(32,12),(12,42),(-12,22),(-36,8),(-40,72),(-12,115),(32,100),(50,45)],
               lean=10, arm=0.85, elbow=95, air={3:0.035,7:0.035}, fps=14),
  'walk': dict(leg=[(24,2),(16,16),(2,6),(-18,2),(-26,24),(-10,55),(12,42),(26,12)],
               lean=2, arm=0.9, elbow=18, air={}, fps=10),
}
H = 1.0
L = dict(thigh=.245, shin=.235, torso=.30, uarm=.165, farm=.15, head=.07)

def pose(c, f):
    leg = c['leg']
    out = {}
    hip = [0.0, 0.0]
    for side, off in (('near', 0), ('far', 4)):
        t, k = leg[(f + off) % 8]
        tr, kr = math.radians(t), math.radians(t - k)
        knee = (hip[0] + L['thigh']*math.sin(tr), hip[1] + L['thigh']*math.cos(tr))
        ank = (knee[0] + L['shin']*math.sin(kr), knee[1] + L['shin']*math.cos(kr))
        out[side+'_leg'] = (tuple(hip), knee, ank, t)
    return out

def figure(c, f):
    p = pose(c, f)
    lean = math.radians(c['lean'])
    hip = (0.0, 0.0)
    sh = (hip[0] + L['torso']*math.sin(lean), hip[1] - L['torso']*math.cos(lean))
    head = (sh[0] + 0.03 + .02*math.sin(lean), sh[1] - L['head'] - .03)
    segs = {}
    for side in ('near', 'far'):
        h, kn, an, t = p[side+'_leg']
        segs[side+'_leg'] = [h, kn, an]
        a = math.radians(-t * c['arm'] + c['lean'])
        el = (sh[0] + L['uarm']*math.sin(a), sh[1] + L['uarm']*math.cos(a))
        fa = a + math.radians(c['elbow'])
        wr = (el[0] + L['farm']*math.sin(fa), el[1] + L['farm']*math.cos(fa))
        segs[side+'_arm'] = [sh, el, wr]
    lowest = max(p['near_leg'][2][1], p['far_leg'][2][1])
    return segs, sh, hip, head, lowest

def draw_sheet(name, c, cols, rows, W=2400, H_=1350):
    im = Image.new('RGB', (W, H_), (0, 255, 0))
    d = ImageDraw.Draw(im)
    cw, ch = W/cols, H_/rows
    S = ch*0.62  # body height in px
    for f in range(8):
        cx = (f % cols + .5)*cw - S*0.03
        gy = (f//cols + 1)*ch - ch*0.1
        segs, sh, hip, head, lowest = figure(c, f)
        lift = c['air'].get(f, 0)
        oy = gy - (lowest + .03)*S - lift*S  # ankle a bit above ground for the shoe
        P = lambda q: (cx + q[0]*S, oy + q[1]*S)
        def limb(pts, col, w):
            pp = [P(q) for q in pts]
            d.line(pp, fill=col, width=int(w*S), joint='curve')
            for q in pp: d.ellipse([q[0]-w*S/2, q[1]-w*S/2, q[0]+w*S/2, q[1]+w*S/2], fill=col)
        def shoe(ank, col):
            a = P(ank)
            d.rounded_rectangle([a[0]-.03*S, a[1]-.01*S, a[0]+.075*S, a[1]+.035*S], radius=int(.015*S), fill=col)
        FAR, NEAR = (150,150,160), (40,40,55)
        limb(segs['far_arm'], FAR, .05); limb(segs['far_leg'], FAR, .075); shoe(segs['far_leg'][2], FAR)
        limb([hip, sh], (90,90,105), .13)
        hp = P(head); r = L['head']*S
        d.ellipse([hp[0]-r, hp[1]-r, hp[0]+r, hp[1]+r], fill=(90,90,105))
        d.polygon([(hp[0]+r*.85, hp[1]-r*.2), (hp[0]+r*1.3, hp[1]+r*.15), (hp[0]+r*.85, hp[1]+r*.35)], fill=(90,90,105))  # nose → facing right
        limb(segs['near_leg'], NEAR, .08); shoe(segs['near_leg'][2], NEAR)
        limb(segs['near_arm'], NEAR, .055)
    im.save(name)

info = {}
for name, c in CYCLES.items():
    draw_sheet(f'guide-{name}.png', c, 4, 2)
    # speed: during stance the planted near foot slides back relative to the hip;
    # body speed = that distance / stance time (contact frame 0 -> push-off frame 3)
    f0 = pose(c, 0)['near_leg'][2][0]; f3 = pose(c, 3)['near_leg'][2][0]
    info[name] = dict(speed_body_heights_per_s=round((f0 - f3) / (3 / c['fps']), 2), fps=c['fps'])
print(json.dumps(info))
