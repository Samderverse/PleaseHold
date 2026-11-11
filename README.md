# Please Hold

A found-footage puzzle game in a waiting room behind a red curtain. You are number seven in the queue, and the music never stops. By Samderverse.

## Play
- In the Waiting Room, tap a curtain. Every room behind one is a different game.
- Fail a room and a bulb pops. Lose all three and you are cut off.
- Clear seven rooms to reach the front of the queue, then find what is wrong in the Waiting Room itself.
- Between rooms the Host offers deals. Each one has a cost.

On phones the game sits at the top with a touch pad below. Desktop: mouse to aim and click, arrow keys and Space in the Drop, S and C in the Same Room, 1 to 3 to pick curtains and deals, P or Esc to pause.

## The rooms
- **The Drop:** aim the lamp, fire a ball into the dark, break every red bulb. Land in the bucket to get the shot back.
- **The Switchboard:** Lights Out. Tapping a bulb flips it and its neighbours. Turn them all off before the lamp burns out.
- **The Wiring:** turn tiles to carry power from the socket to the lamp before the fuse burns down.
- **The Same Room:** look, the tape blinks, then say if anything changed. Some changes are only in the sound.
- **The Last Curtain:** after seven rooms, one thing in the Waiting Room is wrong. Tap it to leave.

## Files
- `index.html`: screens, overlay and styles
- `js/main.js`: flow between the Waiting Room and rooms, input, the loop
- `js/run.js`: the queue, bulbs, deals and curtain choices (no DOM, testable in Node)
- `js/hub.js`: the Waiting Room and the Last Curtain
- `js/rooms/*.js`: one file per room, each with `start`, `update`, `draw` and `timer`
- `js/scenery.js`: curtains, checkerboard floor and furniture, all drawn in code
- `js/light.js`: the darkness and light shared by every scene
- `js/postfx.js`: the VHS/CRT pass (from Breakroom)
- `js/audio.js`: channels, the dissonant music treatment, and the sound for each moment
- `js/config.js`: deals, the Host's lines, room names

To add a room, write a new file in `js/rooms/` with the same four functions and add it to `ROOMS` in `main.js` and `ROOM_TYPES` in `config.js`.

## Sound
The Waiting Rooms theme loops forever. A second copy runs slightly sharp and late, a slow wobble warps the pitch, it is muffled behind curtains, it sags as puzzle timers run down, and the tape drags now and then. The Host's voice is a reversed scrap of the same track.

Sounds reused from Tilt and Breakroom: thuds, glass, chain, clunk, tape buttons, glitch and drips (via Breakroom); switch clicks, chimes and the hang-up (adapted from Tilt's reel stops, chimes and game over).

## Credits
Add the sources for the Waiting Rooms theme, Potential Theme, Dread Ambience and the drips in `js/main.js` (`CREDITS`) and here.
Tilt clip sources: sonidosKMD, Epic Sound Effects, Webiverse Vids, Edwardo Ching. Fonts: Anton, Special Elite, VT323 (Google Fonts).

## Testing helpers
`window.__ph` in the console: `.go('drop')` opens a room, `.win()` and `.lose()` end it, `.last()` jumps to the Last Curtain.
