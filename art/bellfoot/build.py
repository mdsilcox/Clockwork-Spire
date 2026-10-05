"""Assemble Bellfoot's three layers from the cut pieces (art/bellfoot/cut.py) and the candidates.
  python art/bellfoot/build.py   -> art/bellfoot/layers/{sky,street,foreground}.png, art/bellfoot/wide.png (a flat preview)
Scene units: the street is 2400 x 800, the ground line is y 640, each place stands at its contract anchor x (src/ui/town.ts):
gate 200, workshop 520, Sprocket's corner 840, trophies 1160, archivist 1480, stalls 1700 + 120 i, clock tower 2250.
Layers: sky (1800 wide, parallax 0.3), street (2400, parallax 1: back wall, fronts, cobbles), foreground (2400: lamp posts, shade)."""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

HERE = Path(__file__).parent
CAND = HERE / "candidates"
CUTS = HERE / "cuts"
OUT = HERE / "layers"
OUT.mkdir(exist_ok=True)
W, H, GROUND = 2400, 800, 640
WALL = 400  # the street wall's top edge


def rgba(p):
    return Image.open(p).convert("RGBA")


def fit_h(im, h):
    return im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)


def fit_w(im, w):
    return im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)


def tint(im, mul=(1, 1, 1), bright=1.0):
    r, g, b, a = im.split()
    r, g, b = [c.point(lambda v, m=m: min(255, int(v * m * bright))) for c, m in zip((r, g, b), mul)]
    return Image.merge("RGBA", (r, g, b, a))


# ---------------- sky: the town and the Spire at dusk (scaled so the rooftops meet the wall's top) ----------------
def sky():
    k = 0.68  # 640 painted rows of the picture (everything above its rooftops) fill the 400 px above the wall
    a = rgba(CAND / "sky_seed3.png")
    a = a.resize((round(a.width * k), round(a.height * k)), Image.LANCZOS)
    b = rgba(CAND / "sky2_seed1.png")
    b = b.resize((round(b.width * k), round(b.height * k)), Image.LANCZOS)
    c = rgba(CAND / "sky2_seed3.png")
    c = c.resize((round(c.width * k), round(c.height * k)), Image.LANCZOS)
    out = Image.new("RGBA", (1800, 800), (24, 16, 12, 255))
    x = 0
    for i, im in enumerate((a, b, c)):
        if i == 0:
            out.paste(im, (0, 0))
            x = im.width
            continue
        fade = 240
        layer = Image.new("RGBA", out.size, (0, 0, 0, 0))
        layer.paste(im, (x - fade, 0))
        m = Image.new("L", out.size, 0)
        d = ImageDraw.Draw(m)
        for xx in range(x - fade, min(1800, x - fade + im.width)):
            d.line([(xx, 0), (xx, 800)], fill=int(255 * (lambda t: t * t * (3 - 2 * t))(min(1.0, (xx - (x - fade)) / fade))))
        out.paste(layer, (0, 0), m)
        x = x - fade + im.width
    # below the pictures (hidden by the wall) a dark rooftop band
    ImageDraw.Draw(out).rectangle([0, 516, 1800, 800], fill=(24, 16, 12, 255))
    return out.convert("RGB")


def awning(s, i):
    """Vary the five awnings: teal, amber, plum, original teal darker, sage; the tables get a light tint."""
    r, g, b, a = s.split()
    top = Image.new("L", s.size, 0)
    ImageDraw.Draw(top).rectangle([0, 0, s.width, int(s.height * 0.42)], fill=255)
    mix = {
        0: (r, g, b),
        1: (g, g.point(lambda v: int(v * 0.72)), b.point(lambda v: int(v * 0.35))),
        2: (b.point(lambda v: int(v * 0.85)), r.point(lambda v: int(v * 0.6)), g.point(lambda v: int(v * 0.8))),
        3: tuple(c.point(lambda v: int(v * 0.8)) for c in (r, g, b)),
        4: (g.point(lambda v: int(v * 0.8)), g, b.point(lambda v: int(v * 0.7))),
    }[i]
    var = Image.merge("RGBA", (*mix, a))
    out = Image.composite(var, s, top)
    return tint(out, [(1, 1, 1), (1.05, 0.97, 0.92), (0.96, 1.0, 1.04), (1.03, 1.0, 0.94), (0.98, 0.99, 1.04)][i], 0.92)


def no_dog(im):
    """Sprocket's doorstep: the real Sprocket stands here, so paint the sitting dog out of the cut (869 x 1074):
    its warm pixels are masked, grown, and filled with the rows 175 px above (door panel, wall), then the step is redrawn."""
    sx = im.width / 869
    box = tuple(int(v * sx) for v in (195, 790, 480, 1000))
    px = im.convert("RGBA")
    r, g, b, a = px.split()
    warm = Image.new("L", px.size, 0)
    wp, rp, gp, bp = warm.load(), r.load(), g.load(), b.load()
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            if rp[x, y] > 100 and rp[x, y] - bp[x, y] > 35 and rp[x, y] > gp[x, y] + 12:
                wp[x, y] = 255
    mask = warm.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(2))
    shift = int(175 * sx)
    src = Image.new("RGBA", px.size)
    src.paste(px, (0, shift))
    out = Image.composite(src, px, mask)
    # the doorstep: a dark worn slab along the foot of the door where the dog's paws were
    ImageDraw.Draw(out).rectangle([int(205 * sx), int(978 * sx), int(470 * sx), int(1000 * sx)], fill=(46, 38, 34, 255))
    return out


# ---------------- street: back wall, cobbles, the fronts ----------------
def tile_h(src, width, fade=110):
    """Lay a texture across `width` in copies that overlap by `fade` px and cross-fade, so no join and no mirror shows."""
    out = Image.new("RGBA", (width, src.height), (0, 0, 0, 0))
    x = 0
    while x < width:
        layer = Image.new("RGBA", out.size, (0, 0, 0, 0))
        layer.paste(src, (x, 0))
        m = Image.new("L", out.size, 0)
        d = ImageDraw.Draw(m)
        for xx in range(max(0, x), min(width, x + src.width)):
            e = min(xx - x, x + src.width - 1 - xx)
            d.line([(xx, 0), (xx, src.height)], fill=255 if (e >= fade or x == 0 and xx - x < src.width - fade) else int(255 * e / fade))
        out.paste(layer, (0, 0), m)
        x += src.width - fade
    return out


DUSK = {"gate": (0.9, 0.84, 0.82), "archivist": (0.86, 0.8, 0.78), "clocktower": (0.47, 0.44, 0.46), "sprocket": (0.95, 0.9, 0.88)}


def street():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # back wall: dusk stone, y 300 to the ground, shaded toward the top and under the eaves
    stone = rgba(CAND / "ground_seed2.png")
    stone = stone.resize((int(stone.width * 0.4), int(stone.height * 0.4)), Image.LANCZOS).crop((0, 0, 486, GROUND - WALL))
    wall = tile_h(stone, W)
    wall = tint(wall, (0.9, 0.78, 0.7), 0.5)
    shade = Image.new("L", wall.size, 0)
    sd = ImageDraw.Draw(shade)
    for y in range(wall.height):
        sd.line([(0, y), (W, y)], fill=int(150 * (1 - y / wall.height) ** 1.6))
    dark = Image.new("RGBA", wall.size, (18, 12, 10, 255))
    wall = Image.composite(dark, wall, shade)
    seam = Image.new("L", wall.size, 0)  # darken and soften the stretch where the texture copies meet (x about 1640)
    ImageDraw.Draw(seam).rectangle([1580, 0, 1700, wall.height], fill=110)
    seam = seam.filter(ImageFilter.GaussianBlur(40))
    wall = Image.composite(Image.new("RGBA", wall.size, (16, 11, 9, 255)), wall, seam)
    img.paste(wall, (0, WALL))
    d = ImageDraw.Draw(img)
    # one continuous cornice at a constant height: a dark coping, a thin warm edge and a soft shadow under it
    d.rectangle([0, WALL - 8, W, WALL + 4], fill=(24, 17, 12, 255))
    d.rectangle([0, WALL + 4, W, WALL + 6], fill=(96, 68, 40, 255))
    under = Image.new("RGBA", (W, 60), (0, 0, 0, 0))
    ud = ImageDraw.Draw(under)
    for y in range(60):
        ud.line([(0, y), (W, y)], fill=(10, 6, 5, int(120 * (1 - y / 59) ** 2)))
    img.alpha_composite(under, (0, WALL + 6))
    # cobbles: the leaves-and-cogs texture, a worn gutter edge at the wall's foot
    cob = rgba(CAND / "ground_seed4.png")
    cob = cob.resize((int(cob.width * 0.4), int(cob.height * 0.4)), Image.LANCZOS).crop((0, 0, 486, H - GROUND))
    cob = tile_h(cob, W)
    cob = ImageEnhance.Color(cob.convert("RGB")).enhance(0.72).convert("RGBA")  # about 20 percent less saturated
    cob = tint(cob, (1.0, 0.92, 0.85), 0.7)
    # a calm walk lane: the cobbles melt toward their own soft average and darken from the ground line to y 700
    soft = cob.filter(ImageFilter.GaussianBlur(9))
    lane = Image.new("L", cob.size, 0)
    ld = ImageDraw.Draw(lane)
    for y in range(cob.height):
        ld.line([(0, y), (W, y)], fill=int(190 * max(0.0, 1 - y / 70) ** 0.8))
    cob = Image.composite(soft, cob, lane)
    cob = Image.composite(Image.new("RGBA", cob.size, (22, 15, 11, 255)), cob, lane.point(lambda v: v // 3))
    near = Image.new("L", cob.size, 0)  # about 10 percent less contrast around the lamp bases
    nd = ImageDraw.Draw(near)
    for lx in (360, 1000, 1320, 1590):
        nd.ellipse([lx - 110, 0, lx + 110, 150], fill=130)
    cob = Image.composite(soft, cob, near.filter(ImageFilter.GaussianBlur(30)))
    img.paste(cob, (0, GROUND))
    d.rectangle([0, GROUND - 4, W, GROUND + 2], fill=(20, 14, 10, 255))
    # places, back to front by x: (name, anchor x, height, crop box or None, mirror)
    places = [
        ("gate", 200, 520, None),
        ("workshop", 520, 310, (60, 0, 920, 775)),
        ("sprocket", 840, 380, "sprocket"),
        ("trophies", 1160, 380, None),
        ("archivist", 1480, 420, None),
        ("clocktower", 2250, 460, None),
    ]
    for name, x, h, crop in places:
        im = rgba(CUTS / f"{name}.png")
        if crop == "sprocket":
            im = no_dog(im)
            im = im.crop((int(im.width * 0.08), int(im.height * 0.12), int(im.width * 0.92), im.height))
        elif crop:
            im = im.crop(crop)
        a = im.getchannel("A")
        solid = a.point(lambda v: 255 if v > 100 else 0)
        closed = solid.filter(ImageFilter.MaxFilter(21)).filter(ImageFilter.MinFilter(21))  # fills windows and holes the cutout left see-through
        a = ImageChops.lighter(a.point(lambda v: 0 if v < 110 else v), closed)
        # feather the outer 8 to 12 px so no front reads as a pasted rectangle
        a = a.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(4))
        im.putalpha(a)
        if name in DUSK:
            im = tint(im, DUSK[name], 1.0)
        im = fit_h(im, h)
        if name == "workshop":  # tone the pale brick band at the roof line down about 15 percent
            band = im.crop((0, 8, im.width, 55))
            im.paste(tint(band, (0.85, 0.85, 0.85), 1.0), (0, 8))
        if name in ("gate", "archivist", "clocktower"):
            # feather the top 12 px and set the front into a dark gradient against the sky
            ramp = Image.new("L", im.size, 255)
            rd = ImageDraw.Draw(ramp)
            for y in range(12):
                rd.line([(0, y), (im.width, y)], fill=int(255 * (y / 12) ** 1.4))
            im.putalpha(ImageChops.multiply(im.getchannel("A"), ramp))
            glow = Image.new("RGBA", (im.width + 20, 70), (0, 0, 0, 0))
            gd = ImageDraw.Draw(glow)
            for y in range(70):
                gd.line([(0, y), (glow.width, y)], fill=(12, 8, 7, int(95 * (y / 69) ** 1.6)))
            glow = glow.filter(ImageFilter.GaussianBlur(18))
            img.alpha_composite(glow, (x - glow.width // 2, GROUND + 4 - im.height - 52))
        # a darker band on the wall behind the front, so it sits in the street instead of on it
        bw, bh = im.width + 90, im.height + 50
        band = Image.new("RGBA", (bw + 80, bh + 80), (0, 0, 0, 0))
        ImageDraw.Draw(band).rounded_rectangle([40, 40, bw + 40, bh + 40], 30, fill=(14, 9, 7, 140))
        band = band.filter(ImageFilter.GaussianBlur(22))
        img.alpha_composite(band, (x - band.width // 2, GROUND + 25 - band.height + 40))
        # a soft contact shadow on the cobbles and a baseline strip at the ground line
        sh = Image.new("RGBA", (im.width + 80, 50), (0, 0, 0, 0))
        ImageDraw.Draw(sh).ellipse([0, 8, sh.width - 1, 44], fill=(6, 4, 3, 170))
        sh = sh.filter(ImageFilter.GaussianBlur(9))
        img.alpha_composite(sh, (x - sh.width // 2, GROUND - 22))
        base = Image.new("RGBA", (im.width + 20, 24), (0, 0, 0, 0))
        ImageDraw.Draw(base).rectangle([6, 6, base.width - 6, 18], fill=(8, 5, 4, 150))
        img.alpha_composite(base.filter(ImageFilter.GaussianBlur(5)), (x - base.width // 2, GROUND - 14))
        img.alpha_composite(im, (x - im.width // 2, GROUND + 4 - im.height))
    # five empty stall frames, 120 apart, overlapping a little like a market row; alternate mirrored and tinted
    stall = rgba(CUTS / "stall.png")
    sw, sh_ = stall.size
    inner = Image.new("RGBA", (int(sw * 0.74), int(sh_ * 0.27)), (0, 0, 0, 0))
    idr = ImageDraw.Draw(inner)
    for y in range(inner.height):
        t = y / inner.height
        idr.line([(0, y), (inner.width, y)], fill=(int(70 - 30 * t), int(46 - 20 * t), int(30 - 12 * t), 255))
    stall.alpha_composite(inner, (int(sw * 0.13), int(sh_ * 0.44)))
    stall = fit_w(stall, 150)
    for i in range(5):
        s = stall.transpose(Image.FLIP_LEFT_RIGHT) if i % 2 else stall
        s = awning(s, i)
        x = 1700 + i * 120
        sh = Image.new("RGBA", (s.width, 24), (0, 0, 0, 0))
        ImageDraw.Draw(sh).ellipse([4, 0, s.width - 5, 23], fill=(8, 5, 4, 110))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(5)), (x - s.width // 2, GROUND - 10))
        img.alpha_composite(s, (x - s.width // 2, GROUND + 6 - s.height))
    # the walk lane: the foot of every front dims a little (y 590 to the ground line) so walkers stand out
    dim = Image.new("RGBA", (W, 60), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dim)
    for y in range(60):
        dd.line([(0, y), (W, y)], fill=(12, 8, 6, int(85 * (y / 59) ** 1.5)))
    dim.putalpha(ImageChops.multiply(dim.getchannel("A"), img.crop((0, 585, W, 645)).getchannel("A")))
    img.alpha_composite(dim, (0, 585))
    return img


# ---------------- foreground: lamp posts in front of the street and a shade along the bottom edge ----------------
def foreground():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    lamp = rgba(CUTS / "lamp.png")
    lamp.putalpha(lamp.getchannel("A").point(lambda v: 0 if v < 110 else v).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.4)))
    lamp = lamp.crop((int(lamp.width * 0.36), 0, int(lamp.width * 0.66), lamp.height))
    bbox = lamp.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    lamp = fit_h(lamp.crop(bbox), 330)
    for x in (360, 1000, 1320, 1590):
        gs = Image.new("RGBA", (lamp.width + 90, 40), (0, 0, 0, 0))
        ImageDraw.Draw(gs).ellipse([0, 8, gs.width - 1, 34], fill=(6, 4, 3, 150))
        img.alpha_composite(gs.filter(ImageFilter.GaussianBlur(8)), (x - gs.width // 2, H - 52))
        img.alpha_composite(lamp, (x - lamp.width // 2, H - 20 - lamp.height))
    shade = Image.new("RGBA", (W, 120), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    for y in range(120):
        sd.line([(0, y), (W, y)], fill=(10, 6, 5, int(150 * (y / 119) ** 1.8)))
    img.alpha_composite(shade, (0, H - 120))
    return img


def main():
    s, st, fg = sky(), street(), foreground()
    s.save(OUT / "sky.png")
    st.save(OUT / "street.png")
    fg.save(OUT / "foreground.png")
    # a flat preview: the sky as the back (slightly shifted as at the street's start), the street, the foreground
    wide = Image.new("RGBA", (W, H), (30, 22, 18, 255))
    wide.alpha_composite(s.resize((2400, 800)).convert("RGBA"), (0, 0))
    wide.alpha_composite(st)
    wide.alpha_composite(fg)
    wide.convert("RGB").save(HERE / "wide.png")
    print("layers:", [(n, im.size) for n, im in (("sky", s), ("street", st), ("foreground", fg))])


if __name__ == "__main__":
    main()
