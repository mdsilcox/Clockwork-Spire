# Hour Knight: rig notes (896x1152, pad [330, 120])
`clean.py` removes the tan cloud puffs and their outlines at the feet, the cream swirl left of the helmet and small specks (cut.clean.png). The painting's clipped right edge (shield) does not show in motion. Boots are clipped by the bottom edge and stay planted. Build: `python art/bell-ringer/build.py hour-knight`.
## Anchors
knight-sword (100, 330, 100); knight-shield (665, 765, 150); knight-visor (405, 240, 80); core (390, 520, 90) the chest dial; eyes (395, 212, 40) behind the visor slit.
## Rig
Sword (polyline weights, pivot at the grip (150, 860)), shield (pivot (520, 570)), head nod, body lean and squash about the boots. Sword swings are limited to about 27 degrees so the mesh never smears; the lunge does the rest.
## Moods
idle 4: breath, sword leans, a visor nod, a tick ring from the chest dial. attack 2.4: sword back and shield up, lunge left and chop (smear along the tip, star, sparks, ring). hurt: flash, knock right. death 3: shudder, dial and eyes die, kneels (body compresses and tips), sword and shield drop, rings and shards.
## Broken looks
Sword snapped across the blade; shield rim and dial bitten; visor plate torn.
