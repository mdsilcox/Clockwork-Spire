#!/bin/sh
# D4 samples: 8 candidates each, in the shared style. Run from the repo root with the server up.
set -e
python art/gen.py --asset sprocket --kind character --view profile \
  --subject "side view profile of Sprocket, a Pembroke Welsh corgi standing on all four short legs, facing left, whole dog visible from nose to fluffy rear, all four legs visible and separated, big upright ears, orange and white fur, leather collar with a small brass gear tag, friendly bright eyes" \
  --extra-negative "front view, three quarter view, sitting, goggles on eyes, clothes"
python art/gen.py --asset boilermaker --kind character --view front \
  --subject "full body front view of the Boilermaker Queen, a towering regal steam automaton boss, her body a great riveted copper boiler with a glowing furnace door at the waist, a crown of three brass smokestacks venting steam, a round pressure gauge set in her chest like a jewel, a long skirt of overlapping copper plates, two slender jointed brass arms held out to the sides, one hand holding a valve wheel scepter, small proud face mask of polished brass with glowing amber eyes, standing tall and symmetrical" \
  --extra-negative "side view, human skin, person, woman face, hair"
python art/gen.py --asset cog-rat --kind character --view profile \
  --subject "side view profile of a Cog Rat, a small clockwork rat made of brass and copper, facing left, four thin jointed metal legs visible and separated, a wind-up key on its back, a segmented tail ending in a tiny gear, round glass eye glowing amber, sharp brass teeth, scrappy and quick" \
  --extra-negative "front view, real rat fur, multiple rats"
python art/gen.py --asset title --kind scene --view landscape \
  --subject "the Clockwork Spire at dusk, a colossal clock tower of brass and dark stone rising into an amber and teal sky, a great glowing clock face near the top, steam drifting from vents along its sides, a small cozy town with warm lit windows huddled at its foot, winding stairs and pipes climbing the tower, empty sky in the upper left third" \
  --extra-negative "people, text, title"
