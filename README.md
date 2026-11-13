# SeaSurvival — The Sunhaven Passage

A relaxing single-player 3D browser adventure. Sail a little boat, collect island supplies, fish, reinforce your hull, and follow a chart to Sunhaven Harbor. Artwork and sound are generated locally or bundled with the game; no account is needed for local play.

The latest art pass uses rounded illustrated trees, a wooden sailboat, dense grass, soft sea mist, and a compact game HUD. Ferns, flowers, and rocks use the same illustrated palette, and all artwork is generated directly in the game. The game makes no external asset requests.

## Run

Requires Node.js 22.12+ (or 20.19+).

```sh
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` checks TypeScript and creates `dist/`; `npm run preview` serves the production build. `npm test` checks progression, resource renewal, save validation, and recovery resources.

## Work on another machine

Install Git and a supported Node.js version, then run:

```sh
git clone https://github.com/thejas666/seasail.git
cd seasail
npm ci
npm run dev
```

Before editing on an existing machine, run `git pull --ff-only` with a clean working tree. After making changes, run `git add .`, `git commit -m "Describe your changes"`, and `git push`. Commit and push before switching machines. `node_modules`, generated builds, and local scratch files are excluded by `.gitignore`; `npm ci` restores dependencies from the lockfile.

GitHub synchronizes source code. Browser saves stay on the device and browser where the game was played. Pushing source does not automatically update a hosted game unless a deployment workflow is configured.

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
| Shift ashore | Jog |
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

The sail uses a small Verlet cloth membrane with mast and boom attachments. Wind, gusts, and sailing speed deform it; performance mode runs the solver at 30 Hz and reduced motion holds the cloth steady. The pennant also flutters. Birds face their actual travel direction. Their heads scan and track the nearby explorer, eyes blink, wings alternate flapping and gliding, primary feathers spread, and feet extend for landing. Perched gulls balance, shuffle, preen, and chirp with their beaks; nearby gulls tuck their wings along their bodies. Performance mode reduces the number of distant birds.

The explorer now uses an articulated rig with two-bone aiming for elbows, knees, wrists, and ankles. Walking blends into idle; gathering includes a short approach, bend, reach, lift, and stow, with inventory awarded once at hand contact. Casting, waiting for a bite, reeling, and lifting a catch use a visible rod, spinning reel, and line. Steering hands follow the boat’s tiller and the body balances with the hull. In first person, the body and hat are hidden while action arms and equipment remain visible.

The boat lantern has glass panes, corner bars, a vented cap, a handle, a flame, and damped sway. The prop pass also adds barrel hoops and lids, crate braces and nails, driftwood growth rings, dock cleats and fenders, rope wraps and support beams, island sign lettering, chart markings, detailed channel buoys, lookout bracing and railings, a chart table, lighthouse portholes and lens framing, and cottage doors, shutters, chimneys, and warm night windows. Shared materials and merged geometry keep the added detail inexpensive.

The gull model follows the supplied illustrated asset reference: a white upright neck and rounded head, small dark eyes, a warm ochre beak, layered blue-gray folded wings, dark primary feathers with pale markings, and slender pink legs with webbed toes. The game uses the custom continuous mesh with a neck/head skeleton, wing morph targets, articulated wrists, and tucking legs. Its airborne body is narrower and flatter than its perched pose, and the flock is roughly 30% smaller than the previous version. All birds share geometry and material while keeping independent skeletons and poses. The game requires no downloaded textures or model files. Geometry budgets, neutral-pose preservation, flight direction, independent rigs, and moving-boat perching are covered by tests.

Bird behavior is driven by independent world-space coastal routes in `src/systems/bird-behavior.ts`. Birds change waypoints, glide duration, gaze, and passing routes on individual timers; they do not circle the boat on a common loop. Occasional encounters choose from the whole active flock, with individual size/phase variation. A stationary boat may receive one short visit, followed by a quiet cooldown. The same two birds are not assigned permanent boat roles. Visitors approach from outside the boat, settle on the bench or roof, and leave for the coast; sailing quickly or a squall interrupts a visit. Long seeded simulations check visitor diversity, irregular intervals, cooldowns, and the one-visitor limit.

## Custom gull — model and animation study

Open `/bird-study.html` on the local server or published Site to inspect the same animated rig used in the game. Choose Perched, Flying, Gliding, Landing, or Take off; pause any pose and inspect it from reference-angle, side, front, or back views. Reference still displays the original stationary model for comparison. Download that static GLB from `public/assets/models/perched-gull.glb` or the study page.

The source model is authored in `src/assets/perched-gull.ts` using a continuous body/neck/head surface, swept thin wing patches, long feather contours, vertex-painted plumage, a curved bill, and webbed feet. `src/assets/animated-gull.ts` builds the game rig directly from those source surfaces. Its flight morph and skin transforms preserve a continuous neck; wing folding morphs the painted surfaces rather than replacing them with a separate bird. The runtime rig uses about 22,000 triangles and 11 draws per bird, with shared geometry. Performance mode displays six birds instead of nine and reduced motion suppresses flapping, scanning, blinking, and optional sway.

The downloadable GLB remains an unanimated, single-mesh reference. Run `npm run asset:bird` after editing its source to regenerate that binary, then run `npm test` and `npm run build`. The live animation is driven by the runtime rig rather than embedded GLB animation clips. The original reference image remains outside the shipped game.

Real-gull references used to refine the stylized movement include [RSPB's Herring Gull account](https://www.rspb.org.uk/birds-and-wildlife/herring-gull), [Cornell's gull identification guide](https://www.allaboutbirds.org/guide/Herring_Gull/id), and [Harvey and Inman's study of gull wing morphing](https://pmc.ncbi.nlm.nih.gov/articles/PMC9477410/). The artwork retains the supplied illustration's small dark eyes and warm bill; this is a stylized animation informed by anatomy, not a measured aerodynamic simulation.
