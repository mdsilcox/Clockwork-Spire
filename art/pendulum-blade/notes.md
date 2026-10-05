# Pendulum Blade: rig notes (896x1152, pad [260, 100])
`clean.py` removes the baked ground shadow under the base (cut.clean.png). Build: `python art/bell-ringer/build.py pendulum-blade`.
## Anchors
blade-edge (452, 1070, 58) the pendulum tip; blade-weight (445, 802, 75) the hub gear (counterweight) it hangs from; core (445, 560, 90); eyes (445, 405, 40) the wheel hub.
## Rig
Pendulum (pivot (445, 802), polyline weights), the wheel (pivot (445, 405), ticks in 0.8 degree steps), body lean and squash about the feet (445, 1100).
## Moods
idle 4: pendulum swings once every two seconds, wheel ticks with small settles and a ring every second tick. attack 2.4: pendulum draws back right, then whips left (smear, star, sparks, ring) while the frame leans after it. hurt: flash, jolt, pendulum flung. death 3: shudder, hub dies, the frame topples and sags, the wheel droops, the pendulum swings loose.
## Broken looks
Pendulum tip snapped in a jagged bite; hub gear blown open.
