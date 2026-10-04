"""Art trial: generate Clockwork Spire images through a local ComfyUI server.

Usage: python generate.py [--host 127.0.0.1:8188] [--seeds 4]
Standard library only, so ComfyUI's embedded Python can run it.
Writes PNGs next to this file plus timings.json.
"""
import argparse
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

OUT = Path(__file__).parent

# One fixed style for every asset, so the set reads as one game.
STYLE = (
    "storybook steampunk illustration, painterly digital art, clean confident linework, "
    "rich brass and copper tones, warm amber lamplight, soft steam haze, deep teal shadows, "
    "detailed but readable silhouette, centered character on a plain dark backdrop, "
    "professional indie game character art, high quality"
)
NEGATIVE = (
    "photo, photorealistic, 3d render, blurry, lowres, jpeg artifacts, extra limbs, "
    "deformed, bad anatomy, text, watermark, signature, frame, cropped, multiple characters"
)

SUBJECTS = {
    "sprocket": "Sprocket, a cheerful Pembroke Welsh corgi, short legs, big upright ears, "
                "fluffy rear, orange and white fur, small brass goggles pushed up on the head, "
                "a leather collar with a little gear tag, sitting and smiling",
    "foreman": "the Foreman, a hulking brass automaton boss, riveted barrel chest with a glowing "
               "furnace grate, piston arms ending in heavy wrenches, one round glass eye, "
               "menacing stance",
}


def workflow(prompt: str, seed: int, prefix: str, size: tuple[int, int] = (1024, 1024)) -> dict:
    return {
        "1": {"class_type": "CheckpointLoaderSimple",
              "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["1", 1]}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": NEGATIVE, "clip": ["1", 1]}},
        "4": {"class_type": "EmptyLatentImage",
              "inputs": {"width": size[0], "height": size[1], "batch_size": 1}},
        "5": {"class_type": "KSampler", "inputs": {
            "model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0],
            "latent_image": ["4", 0], "seed": seed, "steps": 30, "cfg": 6.5,
            "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 1.0}},
        "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
        "7": {"class_type": "SaveImage", "inputs": {"images": ["6", 0], "filename_prefix": prefix}},
    }


def call(host: str, path: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"http://{host}{path}", data=data,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def fetch_image(host: str, img: dict) -> bytes:
    q = urllib.parse.urlencode(img)
    with urllib.request.urlopen(f"http://{host}/view?{q}", timeout=60) as r:
        return r.read()


def run(host: str, name: str, prompt: str, seed: int, size: tuple[int, int] = (1024, 1024)) -> float:
    start = time.time()
    pid = call(host, "/prompt", {"prompt": workflow(prompt, seed, f"trial_{name}", size)})["prompt_id"]
    while True:
        hist = call(host, f"/history/{pid}")
        if pid in hist:
            entry = hist[pid]
            if entry.get("status", {}).get("status_str") == "error":
                raise RuntimeError(json.dumps(entry["status"], indent=1))
            imgs = entry["outputs"]["7"]["images"]
            (OUT / f"{name}_seed{seed}.png").write_bytes(fetch_image(host, imgs[0]))
            return time.time() - start
        time.sleep(1)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="127.0.0.1:8188")
    ap.add_argument("--seeds", type=int, default=4)
    args = ap.parse_args()
    timings = []
    for name, subject in SUBJECTS.items():
        for seed in range(1, args.seeds + 1):
            secs = run(args.host, name, f"{subject}, {STYLE}", seed)
            timings.append({"image": f"{name}_seed{seed}.png", "seconds": round(secs, 1)})
            print(f"{name} seed {seed}: {secs:.1f} s", flush=True)
    (OUT / "timings.json").write_text(json.dumps(timings, indent=1))


if __name__ == "__main__":
    main()
