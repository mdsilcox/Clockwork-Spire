"""Repaint an existing painting with SDXL through ComfyUI: a whole-image high-resolution pass, or a masked region.

  Hi-res pass (sharper scenes, art-direction.md):
    python art/lib/img2img.py --src art/title/source.png --out art/title/hires --scale 2 --denoise 0.35 --kind scene --subject "..."
  Masked repaint (a new mouth, a fixed paw):
    python art/lib/img2img.py --src art/sprocket/source.png --out art/sprocket/happy --mask art/sprocket/happy/mask.png --denoise 0.6 --kind character --subject "..."
The mask is a PNG the size of the source: white = repaint, black = keep. Only the masked area changes; the
result is composited back over the original so untouched pixels stay identical. Seeds 1..N.
"""
import argparse
import io
import json
import sys
import urllib.request
import uuid
from pathlib import Path

from PIL import Image, ImageFilter

sys.path.insert(0, str(Path.home() / ".claude" / "tools" / "art"))
import comfy  # noqa: E402

ART = Path(__file__).resolve().parent.parent


def upload(host, img, name):
    buf = io.BytesIO()
    img.save(buf, "PNG")
    boundary = uuid.uuid4().hex
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{name}\"\r\n"
            f"Content-Type: image/png\r\n\r\n").encode() + buf.getvalue() + \
        f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(f"http://{host}/upload/image", data=body,
                                 headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())["name"]


def workflow(prompt, negative, seed, image_name, mask_name, denoise, steps, cfg, prefix):
    wf = {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["1", 1]}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": negative, "clip": ["1", 1]}},
        "10": {"class_type": "LoadImage", "inputs": {"image": image_name}},
        "11": {"class_type": "VAEEncode", "inputs": {"pixels": ["10", 0], "vae": ["1", 2]}},
        "5": {"class_type": "KSampler", "inputs": {
            "model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["11", 0],
            "seed": seed, "steps": steps, "cfg": cfg, "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": denoise}},
        "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
        "7": {"class_type": "SaveImage", "inputs": {"images": ["6", 0], "filename_prefix": prefix}},
    }
    if mask_name:
        wf["12"] = {"class_type": "LoadImage", "inputs": {"image": mask_name}}
        wf["13"] = {"class_type": "ImageToMask", "inputs": {"image": ["12", 0], "channel": "red"}}
        wf["14"] = {"class_type": "SetLatentNoiseMask", "inputs": {"samples": ["11", 0], "mask": ["13", 0]}}
        wf["5"]["inputs"]["latent_image"] = ["14", 0]
    return wf


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--subject", required=True)
    ap.add_argument("--kind", default="character", choices=["character", "part", "scene"])
    ap.add_argument("--mask")
    ap.add_argument("--scale", type=float, default=1.0)
    ap.add_argument("--denoise", type=float, default=0.5)
    ap.add_argument("--seeds", type=int, default=6)
    ap.add_argument("--extra-negative", default="")
    ap.add_argument("--host", default="127.0.0.1:8188")
    a = ap.parse_args()
    style = json.loads((ART / "style.json").read_text(encoding="utf-8"))
    kind = style["kinds"][a.kind]
    prompt = f"{a.subject}, {kind['framing']}, {style['core']}"
    negative = ", ".join(x for x in (style["negative"], kind["negative"], a.extra_negative) if x)
    src = Image.open(a.src).convert("RGB")
    if a.scale != 1.0:
        w, h = (round(src.width * a.scale / 8) * 8, round(src.height * a.scale / 8) * 8)
        src = src.resize((w, h), Image.LANCZOS)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    image_name = upload(a.host, src, f"cs_src_{out.name}.png")
    mask = None
    mask_name = None
    if a.mask:
        mask = Image.open(a.mask).convert("L").resize(src.size)
        mask_name = upload(a.host, mask.convert("RGB"), f"cs_mask_{out.name}.png")
    (out / "prompt.json").write_text(json.dumps({"prompt": prompt, "negative": negative, "denoise": a.denoise,
                                                 "scale": a.scale, "mask": a.mask}, indent=1), encoding="utf-8")
    s = style["sampler"]
    for seed in range(1, a.seeds + 1):
        path = out / f"seed{seed}.png"
        secs = comfy.run(a.host, workflow(prompt, negative, seed, image_name, mask_name, a.denoise, s["steps"], s["cfg"],
                                          f"cs_i2i_{out.name}"), path)
        if mask is not None:  # keep untouched pixels exactly; feather the seam
            res = Image.open(path).convert("RGB").resize(src.size)
            soft = mask.filter(ImageFilter.GaussianBlur(6))
            Image.composite(res, src, soft).save(path)
        print(f"{out.name} seed {seed}: {secs:.1f} s", flush=True)


if __name__ == "__main__":
    main()
