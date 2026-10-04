"""Generate candidates for one asset in the shared style (art/style.json).

Usage (ComfyUI server running, see ~/.claude/tools/art/comfy.py):
  python art/gen.py --asset cog-rat --kind character --view profile --subject "..." [--seeds 8]
Writes art/<asset>/candidates/<asset>_seed<N>.png and prints seconds per image.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path.home() / ".claude" / "tools" / "art"))
import comfy  # noqa: E402

ART = Path(__file__).parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--asset", required=True)
    ap.add_argument("--kind", required=True, choices=["character", "part", "scene"])
    ap.add_argument("--view", required=True)
    ap.add_argument("--subject", required=True)
    ap.add_argument("--extra-negative", default="")
    ap.add_argument("--seeds", type=int, default=8)
    ap.add_argument("--first-seed", type=int, default=1)
    ap.add_argument("--host", default="127.0.0.1:8188")
    a = ap.parse_args()
    style = json.loads((ART / "style.json").read_text(encoding="utf-8"))
    kind = style["kinds"][a.kind]
    size = tuple(int(v) for v in kind["sizes"][a.view].split("x"))
    prompt = f"{a.subject}, {kind['framing']}, {style['core']}"
    negative = ", ".join(x for x in (style["negative"], kind["negative"], a.extra_negative) if x)
    s = style["sampler"]
    out = ART / a.asset / "candidates"
    out.mkdir(parents=True, exist_ok=True)
    (out / "prompt.json").write_text(json.dumps({"prompt": prompt, "negative": negative, "size": size}, indent=1),
                                     encoding="utf-8")
    for seed in range(a.first_seed, a.first_seed + a.seeds):
        wf = comfy.workflow(prompt, negative, seed, size, f"cs_{a.asset}", steps=s["steps"], cfg=s["cfg"])
        secs = comfy.run(a.host, wf, out / f"{a.asset}_seed{seed}.png")
        print(f"{a.asset} seed {seed}: {secs:.1f} s", flush=True)


if __name__ == "__main__":
    main()
