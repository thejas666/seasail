# SeaSurvival — The Sunhaven Passage

A relaxing single-player 3D browser adventure. Sail a little boat, collect island supplies, fish, reinforce your hull, and follow a chart to Sunhaven Harbor. All geometry and sound are generated locally; there are no external asset or account requirements.

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
