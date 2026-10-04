"""Generate side-view Sprocket candidates for the cutout rig (trial A)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import generate as g  # noqa: E402

g.OUT = Path(__file__).parent / "candidates"
g.OUT.mkdir(exist_ok=True)

SIDE = (
    "full body side view profile of Sprocket, a Pembroke Welsh corgi standing on all four short legs, "
    "facing right, whole dog visible from nose to fluffy rear, all four legs visible and separated, "
    "big upright ears, orange and white fur, leather collar with a small brass gear tag, "
    "storybook steampunk illustration, painterly digital art, clean confident linework, "
    "warm amber lamplight, isolated on a plain flat light gray background, no scenery, "
    "game character sprite reference, high quality"
)
g.NEGATIVE += ", background scenery, frame, border, circle, vignette, front view, three quarter view, sitting, goggles on eyes"

for seed in range(1, int(sys.argv[1]) + 1 if len(sys.argv) > 1 else 7):
    secs = g.run("127.0.0.1:8188", "side", SIDE, seed, (1216, 832))
    print(f"side seed {seed}: {secs:.1f} s", flush=True)
