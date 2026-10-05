#!/bin/sh
set -e
until grep -q "tinpot-general seed 8" "$1"; do sleep 5; done
python art/gen.py --kind character --asset tinker --view profile \
  --subject "side view profile of one young apprentice tinkerer, a cheerful kid inventor walking to the right, simple warm picture book hero, leather work apron over a teal shirt, brass goggles pushed up on messy hair, a small satchel of tools at the hip, rolled sleeves, sturdy boots, both legs and both arms visible and apart" \
  --extra-negative "front view, three quarter view, adult, beard, weapon, bicycle, background, workshop"
python art/gen.py --kind character --asset foreman --view front \
  --subject "one hulking brass factory automaton boss standing alone, front view, a round glowing furnace grate in the middle of his barrel chest, one big round glowing glass eye in a small riveted head, a huge wrench gripped in his right hand, a stubby rivet gun built into his left forearm, a heavy leather work apron tied over his belly, short sturdy legs, arms held clear of the body, symmetrical" \
  --extra-negative "side view, human face, beard, person, diving helmet"
E:/AI/rembg/.venv/Scripts/python.exe art/lib/img2img.py --src art/foreman/trial-gray.png --out art/foreman/candidates/from-trial --denoise 0.6 --seeds 4 --kind character \
  --subject "the Foreman, a hulking brass factory automaton boss, front view, round glowing furnace grate in his chest, one glowing round eye, a huge wrench in his right hand, a heavy leather work apron over his belly, a rivet gun on his left forearm, symmetrical"
