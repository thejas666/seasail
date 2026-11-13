# SeaSurvival — The Sunhaven Passage

A relaxing single-player 3D browser adventure. Sail a little boat, collect island supplies, fish, reinforce your hull, and follow a chart to Sunhaven Harbor. Artwork and sound are generated locally or bundled with the game; no account is needed for local play.

The latest art pass uses rounded illustrated trees, a wooden sailboat, dense grass, soft sea mist, and a compact game HUD. Optimized fern and rock meshes are bundled locally with their credits in `public/assets/CREDITS.md`; the game makes no external asset requests.

## Run

Requires Node.js 22.12+ (or 20.19+).

```sh
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` checks TypeScript and creates `dist/`; `npm run preview` serves the production build. `npm test` checks progression, resource renewal, save validation, and recovery resources.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Walk; throttle and steer while sailing |
| Drag mouse | Look around in third person |
| Click world | Capture mouse in first person |
| Scroll | Third-person camera distance |
| E | Gather, dock, board |
| F / Space during fishing | Cast / catch when the bite appears |
| V | Switch first / third person |
| Tab | Supplies, upgrades, objectives, fish journal |
| M | Archipelago map |
| Esc | Pause / close panel / release captured mouse |
| X | Lower / raise anchor |
| Space ashore | Jump |
| 1–8 | Activate the corresponding hotbar slot |

The pregame menu includes Start Game, Continue, Settings, and Controls. Performance mode reduces grass instances from 8,000 to 2,200 per island, removes shadows, limits render resolution, and reduces decorative foliage and rain. Physical tree trunks and their collision shapes remain present in both modes.

Sailing uses gradual acceleration, coasting, rudder inertia, wind drift, soft impact response, and wave-driven buoyancy. The explorer has acceleration, gravity for small jumps, and collision with trunks, rocks, wrecks, buildings, and jetty posts. All five island locations stay on the map, while the sea fog hides distant shores in the world.

An 18-minute day/night cycle provides a warm sunset and a readable, moonlit night with stars and a boat lantern. Gulls fly around the boat and occasionally land on its rails when it is moving slowly; they leave during squalls. Storms remain brief and forgiving, with soft rain and no combat.

## First journey

1. Press E at Palm Island to disembark. Pick up the fishing rod beside the dock, collect four wood and four palm fiber. Fruit restores nourishment through the journal.
2. Return to the jetty and board. Sail northeast to Wreck Island; its two metal pieces are guaranteed.
3. Reinforce your boat aboard through the Supplies tab (4 wood, 4 fiber, 2 metal).
4. Sail northwest to Lookout Island. Collect the chart beneath its tower.
5. Sail northeast through the outer channel and follow the buoys to Sunhaven. Press E at the harbor jetty to finish. You can keep exploring afterward.

Shell Cove is optional. Fish near each island to discover its local species. Wood, fruit, and fiber replenish after 150 seconds of active play, including across reloads. Nourishment never causes death. A disabled boat returns to its last safe dock with all inventory intact and 65% condition.

## Technical notes

TypeScript + Vite + Three.js, with DOM overlays and Web Audio ambience. The map and resource definitions live in `src/data.ts`; player, camera, sailing, and fishing orchestration in `src/game.ts`; pure progression and validated versioned persistence in `src/state.ts`; procedural scenery in `src/world.ts`; menus in `src/ui.ts`.

Progress is saved locally under `seasurvival.sunhaven.v1`. Continue resumes at the last safe dock, preserving objectives, collection state, settings, and survival meters. Opening a panel pauses active play. Clearing browser data removes the save. First-person camera and pointer lock work best on desktop Chrome or Edge with hardware acceleration enabled.

The first-playthrough pacing target is 15–25 minutes with optional fishing and exploration; this needs human playtesting. This release is desktop-first. No multiplayer, mobile controls, or additional maps are included. The lower graphics option disables shadows and reduces pixel density.
