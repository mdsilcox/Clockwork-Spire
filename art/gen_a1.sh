#!/bin/sh
# A1 candidates (style v2): 8 seeds each. Every breakable part in docs/content.md must be visible in the painting.
set -e
G="python art/gen.py --kind character"
$G --asset tinker --view profile \
  --subject "side view profile of the young apprentice tinkerer, a cheerful kid inventor facing right, simple warm design like a picture book hero, leather work apron over a teal shirt, brass goggles pushed up on messy hair, a satchel of small tools at the hip, rolled sleeves, sturdy boots, standing mid-step with both legs and both arms clearly visible and apart" \
  --extra-negative "front view, three quarter view, adult man, beard, weapon, gun, complex armor"
$G --asset foreman --view front \
  --subject "full body front view of the Foreman, a hulking brass factory automaton boss, a round glowing furnace grate in the middle of his barrel chest, one big round glowing glass eye in a small riveted head, a huge wrench held in his right hand, a stubby rivet gun built into his left forearm, a heavy leather work apron tied over his lower body, short sturdy legs, arms held clear of the body, symmetrical stance" \
  --extra-negative "side view, human face, beard, person, skull"
$G --asset rust-mite --view profile \
  --subject "side view profile of a Rust Mite, a tiny clockwork mite facing left, round rusty iron body on six thin jointed legs held apart, two big front claw pincers raised, a swollen glowing orange rust sac on its back, beady glass eyes" \
  --extra-negative "front view, spider web, real insect, multiple creatures"
$G --asset brass-beetle --view profile \
  --subject "side view profile of a Brass Beetle, a polishing machine beetle facing left, a big domed brass carapace on its back, large curved mandibles at the front, a riveted shell plate on its underside, six short jointed legs held apart, small glowing eyes" \
  --extra-negative "front view, real insect, wings spread, multiple creatures"
$G --asset oil-slick --view profile \
  --subject "side view profile of an Oil Slick, a squat oil tank creature facing left on four stubby iron legs, a dripping brass nozzle spout on top dribbling black oil, a wide open round mouth at the front spitting oil, glossy black oil stains, small glowing eyes" \
  --extra-negative "front view, puddle only, multiple creatures"
$G --asset spring-imp --view profile \
  --subject "side view profile of a Spring Imp, a small mischievous clockwork imp facing left, a long coiled spring tail curling behind it, a brass wind-up key sticking out of its back, pointed ears, thin arms and legs held apart, a grinning tin face with glowing eyes" \
  --extra-negative "front view, demon horns, fire, multiple creatures"
$G --asset gearhound --view profile \
  --subject "side view profile of a Gearhound, a lean mechanical hunting hound facing left, open jaws full of gear-tooth fangs, a horseshoe magnet set in its nose, a big piston in its hind leg haunch, riveted brass and teal plates, four legs clearly separated, a whip-thin cable tail, glowing eyes" \
  --extra-negative "front view, real dog fur, corgi, multiple creatures"
$G --asset tinpot-general --view front \
  --subject "full body front view of the Tinpot General, a short pompous tin soldier automaton, a big dented tin helmet hat with a plume, a sabre blade for a right arm raised, a brass bugle held in the left hand, a curled barracks horn hanging at its hip, medals on a puffed tin chest, short legs, arms held clear of the body" \
  --extra-negative "side view, human face, real person, gun"
