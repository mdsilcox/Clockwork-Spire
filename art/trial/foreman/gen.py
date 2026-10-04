"""Generate rig-ready Foreman candidates: full body, front view, limbs clear of the body."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import generate as g  # noqa: E402

g.OUT = Path(__file__).parent / "candidates"
PROMPT = (
    "full body front view of the Foreman, a hulking brass automaton boss standing with feet apart, "
    "riveted barrel chest with a glowing furnace grate in the middle, small round head with one big glowing "
    "round glass eye, two thick piston arms hanging clearly apart from the body, one hand gripping a huge wrench, "
    "short sturdy legs, copper pipes and a small smokestack on the shoulders, "
    "storybook steampunk illustration, painterly digital art, clean confident black linework, rich brass and copper, "
    "teal accents, warm amber glow, isolated on a plain flat light gray background, no scenery, "
    "game character sprite reference, symmetrical pose, high quality"
)
g.NEGATIVE += ", background scenery, frame, border, circle, vignette, side view, cropped feet, human face, beard, person"
for seed in range(1, 9):
    print(f"seed {seed}: {g.run('127.0.0.1:8188', 'foreman', PROMPT, seed, (896, 1152)):.1f} s", flush=True)
