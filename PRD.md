# Nebulon: Infinite Frontier. Product Requirements

## 1. Summary
A 3D space-exploration arcade game that runs entirely in the browser. The player flies through endless space, dodges incoming objects, collects energy, boosts with Hyperdrive and crosses wormholes into new universes. Nuxt 3 (SPA mode), Vue 3, TypeScript, Three.js. Static deploy on Vercel. No backend, accounts or analytics. The only network request is the game music file (see section 21).

## 2. Scope (current)
Included: flight, obstacles, energy orbs, Hyperdrive, five free ships, three modes, wormhole universe changes, scenery events, settings, local records.
Removed by request: achievements, missions, upgrades, ship unlock costs, currency, shield (bubble and charges), laser barriers, rotating gates, mines, tunnel rings.

## 3. Architecture
- `game/engine.ts`: one class owning the renderer, the single animation loop, world, pools and run state. Lifecycle: `initialize`, `setView`, `startRun`, `pause`, `resume`, `restartRun`, `abandonRun`, `dispose`.
- `game/ships.ts`: procedural builders for five ships with five distinct silhouettes (style 0 to 4), layered armor with a generated panel-line texture, canopy, intakes, vents, cannons, nav lights, engine nozzles, flares and thin laser trails.
- `game/textures.ts`: canvas-generated textures (hull panels, rock, planets, rings, galaxy, accretion disk, station windows, glow, streaks).
- `game/config.ts`: ships, modes, universes, scoring, quality tiers.
- `composables/useGame.ts`: UI state machine, the only bridge to the engine. HUD state is a `shallowRef` updated about 12 times a second.
- `composables/useSave.ts`: versioned save (v2), safe load, run settlement.

### Screen state machine
`loading → menu`, `menu → playing | hangar | settings`, `playing ⇄ paused`, `playing → over`, `paused → menu | settings`, `over → playing | hangar | menu`, `hangar → menu`, `settings → menu | paused`. Invalid transitions are rejected by one table.

## 4. Gameplay
- Controls: WASD or arrows, touch or mouse drag, hold Space or the on-screen button for Hyperdrive, Esc to pause. The tab auto-pauses when hidden.
- One hit ends the run. Collision uses swept depth checks.
- Obstacles (all collide, sparse by design): asteroids, satellites, derelict wrecks, crystal clusters, comets (fast, with tails), energy anomalies (oscillating). Types unlock with level (every 350 m).
- Fairness: each pattern keeps a reachable safe point, clears a radius around it, limits movement between patterns by lateral and forward speed, and spaces patterns so they never overlap in depth.
- Energy orbs have distinct shapes: ion cell (blue, 1, ringed core), void crystal (purple, 3, elongated with orbiting shards), solar star (gold, 5, crossed star with ring). Magnet radius depends on the ship.
- Hyperdrive: real speed multiplier up to 1.7x, drain and recharge, lockout under 25% after emptying, longer exhaust, star streaks, wider FOV.
- Score = distance m × 1 + energy × 25 + objects passed × 10.

## 5. Living universe
The background is built from shaders (the lobby footer shows the window-size hint instead): shader-lit planets of five styles with moons and atmospheres, shader stars with coronas, three parallax star layers, black holes with accretion disks, galaxies, nebulae, star clusters, stations, asteroid fields, comets, and space events (meteor shower, solar flare, supernova, ion storm, singularity) fired every 13 to 22 s with an on-screen notice.

(Earlier scenery notes below are superseded by this.)
- Scenery drifts toward the camera and recycles: ringed and moon-bearing planets with generated textures, black holes (event horizon, tilted accretion disk, photon ring, glow), modular stations, spiral galaxies, nebula clouds, pulsars with rotating beams and comets crossing the sky. At most one black hole at a time; each item is disposed when it leaves.
- Near-field dust and background stars move at different rates for parallax. Distant rocks are instanced.
- Wormholes (enhanced): spiral disc shader showing the destination universe color in its core, a receding funnel, rim ring, inward spiralling particles, pulsing light, and a swirling tunnel around the ship during the 2 s warp. Every 1,800 to 3,000 m (first one at 1,300 to 1,900 m) spawning pauses and a swirling portal approaches. Crossing it triggers a 2 s warp (speed surge, FOV spike, streaks, white flash, invulnerable), swaps the universe palette (Nebulon Reach, Crimson Veil, Verdant Drift, Golden Expanse, Glacial Deep), regenerates scenery and clears the field.

## Difficulty (reduced)
Difficulty rises every 600 m (was 350), speed ramp is capped at +14 (was +30), Hyperdrive multiplier is 1.55x (was 1.7x), at most 6 objects per pattern, comets from level 2 and anomalies from level 3, wider safe corridors, forgiving hitboxes, and each wormhole halves the accumulated difficulty and leaves a short empty stretch.

## 6. Modes
Classic, Survival (denser, faster ramp), Hyperdrive (1.3x base speed, 2.2x recharge).

## 7. Mobile
Portrait: smaller ship (0.3 vs 0.42 scale, hitbox scaled with it), wider FOV and a dismissible hint suggesting landscape. Landscape and desktop are unchanged.

## 8. Persistence
`nebulon.save` (v2): pilot id, selected ship, best score, best distance, lifetime stats, settings. Invalid JSON or missing storage falls back to defaults with a warning in Settings. Reset All Data has a confirmation step. Progress is per browser and device.

## 9. Performance
Pooled obstacles and orbs, fixed particle buffers, instanced rocks, quality tiers (pixel ratio, stars, dust, streaks, particles, rocks). Delta time clamped to 50 ms. No post-processing.

## 10. Status
Nothing has been run or built by the author. All acceptance items are unverified until `npm install && npm run dev` is tried. Known gap: ship and scenery appearance has not been checked in a render and will likely need tuning.

## 11. Commands
```
npm install
npm run dev
npm run build
npm run generate
npm run preview
```
Vercel: build command `npm run generate`, output `.output/public` (set in `vercel.json`).

## 12. Update log (latest)
- Particles: all points (stars, dust, orb bursts, wormhole sparks) use one circular shader, small white orbs, no squares.
- Removed the dwarf star slots and the long-ray comet/meteor streaks. Added three slow comets with a soft dust tail.
- HP system: 100 hull (70 in Survival). Damage per object type, 1.2 s invulnerability, red vignette; gold orb heals 15, purple heals 5. Zero hull ends the run.
- Wormholes now appear on a timer (first after 22 to 40 s, then every 30 to 65 s). Entry animation: ship is pulled to center, spins and shrinks, shockwave rings and bursts at entry and exit, destination-colored flash, swirling tunnel.
- Difficulty: after a wormhole spawns are reduced to 60% and recover over 1,500 m; new universes spawn 15% fewer objects; speed ramp cap +10.
- Cheat easter egg: type `nebulon` or the Konami code, or tap the title 7 times. Hyperspeed, infinite hull, auto-destroys incoming objects with laser zaps.
- Fonts: Orbitron (titles), Exo 2 (UI), Share Tech Mono (numbers), bundled via @fontsource.
- Lobby flicker: caused by ion-storm lightning in the lobby; lobby events removed, ion light reduced, engine flame flicker slowed, overlapping surfaces offset.
- HUD is now minimal and transparent for a more cinematic look.

## 13. Update log (universes, cheat, death)
- 15 universes: Nebulon Reach, Crimson Veil, Verdant Drift, Golden Expanse, Glacial Deep, Dracula's Dominion, Digital Matrix (falling code), Love Nebula (floating hearts), Black Void, Empty Space, The Abyss, Aurora Paradise, Toxic Mist, Inferno, Twilight Bloom. Each tunes nebula, planet, galaxy, cluster, black hole and comet density, star density and tint, exposure and an ambient particle layer.
- Space stations removed.
- Galaxies are untinted, denser and rounder.
- Cheat: tap the HP readout 4 times in a run to toggle (also: type `nebulon` or the Konami code). Works in every mode. Gold pulse, burst, glowing screen edge and a CHEAT badge while on.
- Death: the ship loses control, spins and trails smoke and sparks, then explodes into debris with a shockwave ring, flash and brief slow motion; the camera pulls back before the game-over screen.
- Lobby: GitHub URL removed; responsive rules for under 600 px and under 400 px.

## 14. Update log (distinct universes, cheat beams)
- Every universe now has its own sky shader (gradient, nebula wash, aurora curtains, or a digital grid), fog color and density, ambient particles and signature objects: Dracula (blood moon, bats), Digital Matrix (glyph walls, grid sky, code rain), Love Nebula (giant pulsing heart, floating hearts), Black Void (lone black-hole eye), Abyss (jellyfish, plankton), Aurora Paradise (strong aurora), Toxic Mist (thick green fog, spores), Inferno (red sun, embers), Golden Expanse (sun, gold dust), Twilight Bloom (dusk sky, petals), Glacial Deep (snow, blue aurora), Crimson Veil (red curtains), Verdant Drift (green aurora, spores).
- Cheat toggle moved to the Hyperdrive label: tap it 4 times to enable or disable. Cheat beams are thick glowing gold and cyan beams from alternating wing guns with impact bursts, plus decorative forward beams while cheat is on.

## 15. Update log (performance, hazards)
- Performance: the sky is baked once into a texture (re-baked about once a second only in aurora and matrix universes, never on Low); each ship's static meshes are merged by material into a handful of draw calls; render resolution caps are now 0.75 / 1 / 1.5 for Low / Medium / High; antialiasing is off on dense screens; Low hides black holes, clusters and most galaxies, nebulae and planets, halves ambient particles and shows fewer bats, jellyfish and glyph walls; per-frame array allocations in the speed-streak loop removed.
- Hazards: Digital Matrix glitches invert controls for 3.5 s every 12 to 20 s; Dracula bat swarms weave and dodge toward you every 10 to 16 s (8 damage each); Inferno fire storms warn for 2 s then rain aimed fireballs for 5 s (14 damage).
- Cosmic phenomena: pulsar sweeps (a vertical energy sheet crosses the field after a 1.6 s warning, 12 damage); solar flares (glare, Hyperdrive offline for 3.5 s); gravity lensing (a nearby black hole pulls the ship sideways, FOV stretches, notice shown).

## 16. Update log (branding, cheat boost, black hole)
- Removed pulsar sweeps and solar flares (Hyperdrive offline). Gravity lensing stays.
- Lobby logo (top centre), social preview image and favicon / touch icons are loaded from the hosted URLs in `game/brand.ts` and `nuxt.config.ts`. The lobby falls back to the text title if the logo fails to load. Logo height scales with viewport (small phones, landscape phones, large desktops).
- Cheat mode: holding the Hyperdrive button (or Space) multiplies speed by 3 (smoothed), widens the auto-destroy range and FOV. The gold edge glow was removed.
- Black Void's black hole is now a shader: event horizon, thin photon ring, tilted accretion disk with Doppler-brighter side, and lensed arcs above and below.

## 17. Update log (lobby redesign)
- Lobby fully redesigned (`components/MainMenu.vue`, new `assets/css/lobby.css`, old menu rules removed from `main.css`). Glass "launch deck" on the left with mission cards (Classic, Survival, Hyperdrive; each has an icon, colour theme and hull/speed/boost tags), a gradient START FLIGHT button that takes the selected mission's colour, Hangar and Settings shortcuts showing the current ship, and a 2x2 records grid (best score, best distance, flights, energy banked). Top-left logo and tagline, top-right pilot chip and mute toggle, bottom-right active-ship plate with stat bars and Change ship. Scrim keeps the 3D scene readable.
- Shortcuts: Enter starts, 1 / 2 / 3 pick a mission (ignored while a control has focus). Logo still triggers the 7-tap cheat.
- Responsive: wide layout; portrait becomes a bottom sheet with compact mission chips; short landscape phones get a compact deck. Reduced-motion setting disables entrance and shine animations.
- Hangar and Settings frames share the glass look (rounded controls, gradient primary button, ship colour swatches and roles in the ship list).
- Unverified: the Nuxt build was not run (no npm access in the authoring sandbox). Layout was checked with a static render only.

## 18. Update log (mode identities)
Each mode now has its own profile in `MODES` (`game/config.ts`, `ModeDef` in `types/index.ts`) and the engine reads it:
- **Classic (Easy):** 120 hull, damage x0.75, orb healing x1.25, 1.5 s invulnerability after a hit, density 0.8, speed ramp 0.8, level step 750 m, hazards (glitch, bats, fire storms) 1.4x rarer.
- **Survival (Hard):** 70 hull, damage x1.3, healing x0.6, 1.0 s invulnerability, density 1.5 with up to 4 objects per pattern, speed x1.1 and ramp 1.6, level step 450 m and starts one level up (comets and anomalies arrive early), Hyperdrive recharge x0.85, hazards 1.5x more frequent.
- **Hyperdrive (Epic, normal difficulty):** 100 hull, speed x1.15, recharge x2.2, wormholes 35% sooner, cosmic events every 8 to 14 s, plus epic scenery events every 24 to 36 s (never repeating back to back): **Stardust river** (a sinuous ribbon of energy orbs ending in a solar star, patterns paused), **Warp current** (orb ribbon, then 6 s of x1.3 speed with widened FOV and streaks, patterns paused), **Cosmic spectacle** (supernova, then meteor cascade, then ion aurora in sequence). All epic events are safe and rewarding.
- Lobby mode cards show a tier badge (Easy / Hard / Epic), hull, a threat meter and the perk.
- Unverified: not built or played; numbers will need tuning in play.

## 19. Update log (realm universes, FPP, PWA)
Verification note: the sandbox had no network, so `npm install`, the Nuxt build and a browser run were **not** possible. What was checked: TypeScript against a stub of three.js; every realm, signature, ambient, cosmos and wormhole code path run for 90 simulated seconds against a fake three.js; script blocks of all `.vue` files parse. Visuals, balance and mobile performance need a play-through.

### Universes: 15 -> 23
Wormholes now draw from a **shuffle bag** (`drawUniverse` in `game/config.ts`): every eligible universe is visited once before any repeats. The Corrupted Universe is **late-game**: it only enters the draw after 3 universes were visited in the run. Each realm universe has a `realm` id; `game/realms.ts` owns its mechanic, near-field scenery and rare discoveries, and the engine only reads forces/modifiers from it (`RealmFx`).
- **The Crystal Universe**: luminous crystal spires with energy-signal rings (`signature.ts`), cyan/violet/blue sky, glowing crystal asteroids (obstacle rock material is re-coloured per universe via `Universe.rock`). *Mechanic:* collect crystal shards; every 4 shards upgrades the ship for the rest of the run (Crystal Magnet, Lattice Hull +20, Prism Drive, Refraction Plating -20% damage, Harmonic Core x2 energy). A cyan aura grows around the ship. *Rare:* **Galaxy Geode**, a gigantic crystal with a spinning miniature galaxy inside.
- **The Fractured Timeline**: planets time-lapse through molten, ocean, ice and dead eras; two star layers run backward; ancient stations flicker in and out; frozen debris pockets and a backward clock. *Mechanic:* about half of the wormholes here are **temporal**: they lead to another era of the same universe (Age of Dawn, Present, Age of Embers) with a different sky, planets and palette. *Secret:* **The Eternal Moment**, a planet that never changes.
- **The Living Universe**: organic planets (new planet shader style 5), glowing organisms, drifting leviathans, breathing asteroid fields, tendrils growing around wormholes. *Mechanic:* things react: organisms curl up and flash when you boost or collect, tendrils lean toward you, the **Mimic** (a "planet" that opens eyes, tracks you and exhales spores as you pass). *Rare:* **The Titan**, a colossal organism with star systems orbiting it.
- **The Black Hole Universe**: giant lensing black holes with debris spiralling into accretion disks, stars swirling toward them, asteroid fields that orbit. *Mechanic:* **gravity wells** pull the ship and have a deadly core; bait orbs ring each well. *Rare:* **Wormhole Forge**, a megastructure orbiting a black hole that spawns wormholes and opens one for you.
- **The Ocean of Stars**: rippling light surface above and a glowing floor below, floating islands, swimming creatures, bubbles. *Mechanic:* **cosmic currents**: a constant gentle tide, plus announced tailwinds (x1.4 speed) and crosswinds (lateral push); patterns pause during the warning. *Rare:* **The Upwelling**, where the ocean flows up into another dimension (and releases an energy river).
- **The Frozen Universe**: ice formations, ice-bound stations, ice chunks, snow. *Mechanic:* **cold fronts** drain the hyperdrive meter, stop its recharge, dull steering, thicken fog and frost the screen; solar stars shorten a front. *Rare:* **Relic World**, a planet frozen in time with ruins; recharges hyperdrive and grants 45 s of frost immunity.
- **The Chaos Universe**: planets with wobbling size and erratic moons, wireframe impossible shapes that jump, asteroids on impossible paths, **unstable wormholes** whose destination changes until you cross. *Mechanic:* **physics zones** (gravity flip, lateral shear, inverted controls, heavy, weightless, vortex, navigation blackout with noisy instruments, time dilation), each announced. *Rare:* **The Origin**, a stable region and source of wormholes (zones pause, a wormhole opens).
- **The Corrupted Universe** (late-game): glitching sky, planets and quantised starfield, missing-texture fragments, popping geometry, distorted wormholes. *Mechanic:* far obstacles flicker out and jump; reality stabilises (and snaps back with a flash) within 50 units, so the route stays fair. *Secret:* **Patient Zero**, the infection source. Corruption stays inside this universe (see section 20).
- **Rare discoveries** (9): each realm rolls per visit (30 to 75%, +18% per earlier miss in the run; always in cheat mode so they can be tested). Finding one pays +50 energy (+80 for secrets), +25 hull, and is saved to the pilot's **codex** (`Save.codex`, shown in the lobby as Discoveries n / 9 and listed on the game-over screen).
- HUD: realm status chip (`HudState.tag`), frost and corruption overlays, scrambled readouts during navigation blackout.

### Other changes
- **Empty Space** is truly empty (`Universe.empty`): no obstacles, orbs, decor rocks, asteroid fields, planets, comets, galaxies or space events. Only faint stars and dust remain.
- **Love Nebula** polish: lub-dub heartbeat on a layered heart with orbiting sparks and a smaller companion heart, pulsing hearts plus twinkling sparkles, twinkling mini hearts, rose-quartz rocks, orbs heal x1.5.
- **Digital Matrix** polish: real falling glyph code (atlas of katakana and digits that keeps changing, bright white heads), scrolling grid floor and ceiling, green data-block rocks.
- **Lobby footer**: the credit line is replaced by the window-size message ("The game looks better in landscape. Rotate your device or widen the window."). The popup version is no longer shown on the lobby.
- **Cheat magnet**: in cheat mode a golden ring pulses around the ship and every orb in the world (and crystal shard) is dragged to it.
- **FPP mode** (Settings, default off): the camera sits in the cockpit; a CSS cockpit frame (`components/Cockpit.vue`) sways with banking, rumbles on hyperdrive, jolts on hits and blinks red at low hull. Handled: warp (barrel-roll wobble), wormhole approach, pause, crash (cockpit tumbles, then the camera pulls back for the explosion), realm roll effects, cheat beams, portrait and landscape.
- **PWA**: `public/manifest.webmanifest`, `public/sw.js` (network-first pages, cache-first hashed assets, stale-while-revalidate for the rest), icons in `public/icons`, registration plugin `plugins/pwa.client.ts` (not on localhost), an Install button in Settings (or Add to Home Screen hint on iOS), `vercel.json` headers for the worker and manifest.
- Settings changes no longer rebuild scenery unless quality changed.

## 20. Update log (fixes)
- **Corruption no longer leaks.** The cross-universe "infection" effect (sky glitch, starfield fragments, planet glitches, unstable wormholes, popping shapes in later universes) is removed: `Engine.infection` stays 0. Corrupted effects exist only while inside the Corrupted Universe. Leaving it also re-randomises the stars that the glitch had snapped to a grid.
- **Cheat mode**: the idle yellow beam that fired ahead of the ship every 0.16 s is gone. Beams still flash when cheat mode destroys an obstacle.
- **The universe moves.** Previously only objects streamed toward the ship. Now: the sky dome turns slowly (faster with speed), star layers roll slowly around the view axis (alternating direction), galaxies, nebulae, clusters and black holes sway on slow lateral orbits, planets sway slightly, and far signature scenery drifts and bobs. Applies to all universes, including the lobby.

## 21. Update log (cheat ring, music)
- Cheat mode: the pulsing golden ring in front of the ship (shrinking sprite, `magnetRing`) is removed. The orb magnet itself is unchanged; only the visual is gone. The one-time pulse when toggling cheat stays.
- Game music: new Settings checkbox "Game music" (`settings.music`, default on, older saves default to on). Loops the bundled `/audio/nebulon-theme.mp3` via an `HTMLAudioElement` in `composables/useGame.ts` (`syncMusic`). Plays only while the screen is `playing`; pauses on pause/settings (resumes where it left off), stops and rewinds on menu, game over and restart. Follows master volume and Mute all sound.
- Unverified: not built or run here.

## 22. Update log (offline, brand images, About/Terms/License, music, universes)
- **Offline PWA**: `public/sw.js` (v2) reads the app shell on install and stores every `/_nuxt/` file it references, including the fonts and lazy chunks found inside scripts and styles (unused font subsets are skipped), plus the manifest and images. After load the page sends a `WARM` message and the worker also stores the music (`/audio/nebulon-theme.mp3`) and any extra files the page used. Music is served cache-first. Page loads are network-first with a 4 s timeout, falling back to the stored shell, which serves `/`, `/about`, `/terms` and `/license` alike.
- **Brand images**: remote image URLs removed. Wide wordmark `public/brand/nebulon-wordmark.webp` replaces the header text on the landing page and boot screen (text fallback if it fails to load); `public/brand/og-image.jpg` (1200x630) is the link preview. Square art provides exactly three icons: `icon-192.png`, `icon-512.png`, `maskable-512.png` (the 192 file is also the favicon and apple-touch icon).
- **Main menu**: the pilot ID chip and the volume button are gone. An About button (Info icon) opens `/about`. A line under Start Flight says that playing means accepting the Terms and Conditions and License.
- **New pages** (`components/AboutPage.vue`, `TermsPage.vue`, `LicensePage.vue`, `DocShell.vue`): client-side routes handled by `composables/useSite.ts`. The game is paused and not rendered while one is open. The About page lists the creators and the open-source repository; the License page embeds `LICENSE` verbatim.
- **anime.js** (`composables/useMotion.ts`): menu and panel entrances, selection pop on mission cards, page entrance, table-of-contents marker. Respects Reduce interface motion and the OS setting.
- **Black holes -50%**: scenery black holes wait twice as long between appearances (`rest` in `cosmos.ts`), gravity wells in the Black Hole Universe spawn half as often (`realms.ts`), and its second scenery black hole (`maw`) is removed.
- **Wormhole core**: the square star cells in the disc shader are now round dots on a finer grid; the spiralling particles are smaller.
- **Dracula's Dominion**: the red halo of the blood moon was placed at the origin, in front of the camera, and washed the screen red until the group drifted past the ship (about 3 s). It now sits behind the moon.
- **Wormholes**: always lead to a different universe (shuffle bag). The temporal (same-universe) wormholes are removed; a universe with eras (Fractured Timeline) starts in a random era instead.
- **Music**: new `game/music.ts`. The track is fetched as a Blob (same-origin file first), so it loops and works offline. Music is audible during a run and on Settings opened from a paused run, so switching it on there is heard immediately; if the browser blocks playback it retries on the next tap or key press. Settings explains when Mute all sound is silencing the music.
- Unverified: not built or run here (no network in the sandbox).

## 23. Update log (creators, credits, music file, star dots, source cleanup)
- **Creators**: About shows Itz-Anya and Itz-Murali (photo, stylised name, GitHub button) from `CREATORS` in `data/site.ts`; photos fall back to an initial if they cannot load. The README has the same section.
- **Credits**: the VOIDTYPE credit is removed from About, Terms, the footer and Settings. `LICENSE` keeps the same terms but is named for Nebulon (credit to Itz-Murali and Itz-Anya, link to this repository).
- **Footer**: icon-only (Play, About, Terms, License, GitHub) on every full-page screen.
- **Open source**: About and Terms link to https://github.com/Itz-Murali/Nebulon and the live site https://nebulon-frontier.vercel.app.
- **Head tags**: canonical, `og:url`, `og:site_name`, `twitter:url` and VideoGame structured data; `SITE_URL` defaults to the live site.
- **Music**: the bundled track (Sky High by Elektronomia, 96 kbps, cover art stripped) replaces the remote URL everywhere, and is cached for offline play.
- **Star dots**: a fourth star layer of 1,100 tiny round dots (`StarLayer` in `cosmos.ts`) sits in every universe background; it follows the same star-count setting and tint as the other layers.
- **Source cleanup**: every code comment was removed from `.ts`, `.vue`, `.css` and `.js` files, including comments inside GLSL shader strings.
