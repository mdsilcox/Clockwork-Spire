#!/bin/sh
# D4 round 2 (style v2, D-030): Sprocket, the Queen and the Cog Rat regenerated with the inked style.
set -e
python art/gen.py --asset sprocket --kind character --view profile \
  --subject "side view profile of Sprocket, a Pembroke Welsh corgi standing, facing left, long low body on very short stubby legs, the near and far legs offset so all four paws are visible with space between them, big upright ears, orange and white fur, fluffy white chest and rear, a small leather harness with a brass gear tag, friendly bright eyes" \
  --extra-negative "front view, three quarter view, sitting, long legs, collie, fox, clothes, goggles"
python art/gen.py --asset boilermaker --kind character --view front \
  --subject "full body front view of the Boilermaker Queen, a towering regal steam automaton boss, her body a great riveted copper boiler skirt with a glowing furnace door at the waist, a brass crown with three small smokestacks, a round pressure gauge set in a gold chest plate, two jointed brass arms held out from the body, one hand raising a sun orb scepter, a tall clock staff standing at her other side, a proud polished brass face mask with glowing amber eyes, standing tall and symmetrical" \
  --extra-negative "side view, human skin, woman, hair, skull"
python art/gen.py --asset cog-rat --kind character --view profile \
  --subject "side view profile of a Cog Rat, a small scrappy clockwork rat made of brass and teal enamel, facing left, a rat head with a long pointed snout, big round ears and wire whiskers, one round glass eye glowing amber, sharp brass teeth, a wind-up key on its back, four sturdy jointed metal legs clearly separated, a long segmented tail ending in a small gear" \
  --extra-negative "front view, pig, tapir, real fur, multiple rats, wheel"
