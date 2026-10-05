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
    k = 0.62  # 640 painted rows of the picture (everything above its rooftops) fill the 400 px above the wall
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
        fade = 140
        layer = Image.new("RGBA", out.size, (0, 0, 0, 0))
        layer.paste(im, (x - fade, 0))
        m = Image.new("L", out.size, 0)
        d = ImageDraw.Draw(m)
        for xx in range(x - fade, min(1800, x - fade + im.width)):
            d.line([(xx, 0), (xx, 800)], fill=min(255, int(255 * (xx - (x - fade)) / fade)))
        out.paste(layer, (0, 0), m)
        x = x - fade + im.width
    # below the pictures (hidden by the wall) a dark rooftop band
    ImageDraw.Draw(out).rectangle([0, 516, 1800, 800], fill=(24, 16, 12, 255))
    return out.convert("RGB")


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


DUSK = {"gate": (0.9, 0.84, 0.82), "archivist": (0.86, 0.8, 0.78), "clocktower": (0.55, 0.52, 0.54), "sprocket": (0.95, 0.9, 0.88)}


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
    img.paste(wall, (0, WALL))
    d = ImageDraw.Draw(img)
    d.rectangle([0, WALL - 8, W, WALL + 4], fill=(24, 17, 12, 255))  # the coping
    d.rectangle([0, WALL + 4, W, WALL + 8], fill=(120, 84, 48, 255))
    # cobbles: the leaves-and-cogs texture, a worn gutter edge at the wall's foot
    cob = rgba(CAND / "ground_seed4.png")
    cob = cob.resize((int(cob.width * 0.8), int(cob.height * 0.8)), Image.LANCZOS).crop((0, 0, 972, H - GROUND))
    cob = tile_h(cob, W)
    cob = tint(cob, (1.0, 0.92, 0.85), 0.88)
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
            im = im.crop((int(im.width * 0.08), int(im.height * 0.12), int(im.width * 0.92), im.height))
        elif crop:
            im = im.crop(crop)
        a = im.getchannel("A")
        solid = a.point(lambda v: 255 if v > 100 else 0)
        closed = solid.filter(ImageFilter.MaxFilter(21)).filter(ImageFilter.MinFilter(21))  # fills windows and holes the cutout left see-through
        a = ImageChops.lighter(a.point(lambda v: 0 if v < 110 else v), closed)
        im.putalpha(a)
        if name in DUSK:
            im = tint(im, DUSK[name], 1.0)
        im = fit_h(im, h)
        # a soft shadow on the cobbles under each front
        sh = Image.new("RGBA", (im.width + 60, 36), (0, 0, 0, 0))
        ImageDraw.Draw(sh).ellipse([0, 0, sh.width - 1, 35], fill=(8, 5, 4, 120))
        sh = sh.filter(ImageFilter.GaussianBlur(7))
        img.alpha_composite(sh, (x - sh.width // 2, GROUND - 14))
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
        s = tint(s, [(1, 1, 1), (1.08, 0.96, 0.9), (0.94, 1.0, 1.04), (1.05, 1.0, 0.92), (0.96, 0.98, 1.06)][i], 0.95)
        x = 1700 + i * 120
        sh = Image.new("RGBA", (s.width, 24), (0, 0, 0, 0))
        ImageDraw.Draw(sh).ellipse([4, 0, s.width - 5, 23], fill=(8, 5, 4, 110))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(5)), (x - s.width // 2, GROUND - 10))
        img.alpha_composite(s, (x - s.width // 2, GROUND + 6 - s.height))
    return img


# ---------------- foreground: lamp posts in front of the street and a shade along the bottom edge ----------------
def foreground():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    lamp = rgba(CUTS / "lamp.png")
    lamp.putalpha(lamp.getchannel("A").point(lambda v: 0 if v < 110 else v))
    lamp = lamp.crop((int(lamp.width * 0.36), 0, int(lamp.width * 0.66), lamp.height))
    bbox = lamp.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    lamp = fit_h(lamp.crop(bbox), 330)
    for x in (360, 1000, 1320, 1590):
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
