# Current visual verification

## Latest requested changes — verified

- Coral clusters are distributed irregularly with open channels instead of an evenly spaced belt.
- All generated coral objects are offset below the water surface at varying depths. Marine material shading applies depth-dependent red absorption, blue-green haze, moving caustics, and subtle refractive motion. Water opacity varies across the shallow/deep transition.
- Seventeen beds of flowering groundcover surround the house, with additional palms. Five-petalled flowers sit above the leaves so blooms remain visible.
- Six schools / 96 fish use cohesion, alignment and separation. Fast approaching hulls trigger fleeing and diving. Slow moving hulls invite an escort. Water clicks attract nearby schools for five seconds, with surface ripples.
- Actual horizontal boat velocity drives reactions; vertical bobbing is excluded.

## Evidence and checks

- `reference/recovered-garden.png`: browser screenshot of restored garden, scattered submerged coral and fish; viewport 1280×900, `/?frame=0&view=harbour`.
- Live browser checked at `/?view=harbour`: navigation present, water click accepted, fresh browser console has no errors.
- `npm test`: hull avoidance, slow escort, stationary boat, click attraction, attraction expiry, stable submerged fish positions passed.
- `npm run build`: passed; Three.js bundle size advisory remains nonfatal.
- GLB normals validated; four exclusively marine material batches have all vertices below water. Pink/yellow materials are also used by above-water flowers and are not suitable for whole-material depth assertions.

## Recovery

The workspace was replaced with its older version while these changes were being developed. Source files, UI crops, model generator, models and interaction tests were reconstructed in `/private/tmp/island2-recovery` and then copied back. A standalone archive and SHA-256 manifest are stored outside the workspace. No unrelated application was stopped or modified.

## Original reference-video goal

The requested marine/garden iteration is implemented and checked. The earlier strict frame-for-frame 1:1 video goal is still not accepted: model details, original unseen menu content and precise camera trajectory remain approximate. This report does not claim an exact reproduction of the original scene.

final result: blocked

The blocked status applies to strict 1:1 acceptance, not to the completed recovery and marine/garden iteration.

## 2026-09-19 — screenshot-inspired shallows continuation

- Retained the generated sandy shelf, fractured reef rocks, loose seagrass/coral groups, vivid flower beds and expanded pier from the interrupted work.
- Increased outer-water coverage to hide the hard edge of the seabed; kept clear sand-colored shallows and depth-dependent absorption.
- Added four fish silhouettes with species-specific fins, body proportions, stripes, sizes and tail rhythms. Existing schooling, fleeing, escort and click attraction remain active. Fish depth now respects the sand floor.
- Added scattered scallop shells placed on the actual beach surface, nine sidestepping crabs with legs/claws/eyes, and a bobbing boat tied beside the pier. The tied boat is decorative; the controllable boat retains free sailing.
- `npm test` passes including species coverage and sand-floor clearance. `npm run build` passes (existing bundle-size advisory).
- Browser: live harbour loaded, water click accepted, Space changed status to STOPPED, no console errors from port 5174. Screenshot saved as `reference/shallows-current.png`.
- Port 5173 currently serves another project; this project is running at http://127.0.0.1:5174/. No unrelated server was stopped.
- The screenshot palette/detail iteration is complete; exact reference geometry and camera matching remain approximate as noted above.

## 2026-09-19 — warmer reference palette and closer composition

- Increased normal camera zoom from 1.0 to 1.10; harbour focus now (12.3, 0, 1.8), placing the island farther toward the upper right with foreground reef space.
- Added `src/palette.js` to grade the loaded model materials consistently: cream sand, orange terracotta tiles, brighter pastel corals, warm stone and vivid flowers. Generated GLBs remain intact; palette overrides are applied at load time.
- Lifted sky fill, reduced underwater red absorption, brightened cyan water and refined caustic scale with a narrow lace-like shoreline foam band.
- Browser live scene verified without console errors; production build passes. Screenshot: `reference/harbour-color-composition.png`.
- This change enlarges the island's appearance through camera framing; physical land/collision dimensions are unchanged.

## 2026-09-19 — cottage, coherent pier, rear clearing and navigation

- Rebuilt cottage: raised foundation and plank porch, descending stone steps, white gables, rounded clay tiles and ridge caps, front door, shutters and side window, chairs/table, upright surfboard, life ring, barrel and flowering pergola vines.
- Replaced the oversized pier landing with a coherent narrower pier, piles, rope rails, wrapped rope, plank nails and hanging lamps. Added a path and readable Home Harbour sign.
- Extended the rear sand geometry by 27% along its rear local axis, brought the cottage forward and reduced rear planting; moved obstructing foreground palms aside. Rear space is physically enlarged, not just reframed.
- Generator exports `src/shoreline.json` from the full sloping beach footprint. Navigation uses a conservative 1.38-unit hull radius and swept movement tests against the shoreline, pier and moored boat. Both automatic and manual sailing use the same rules; the automatic route was rerouted around the extended beach and pier.
- `npm test`: fish tests plus land, rear clearing, pier, bow/stern clearance, tunneling and 2,501 automatic route samples passed. `npm run build` passed. Browser loaded without errors and remained in AUTO SAIL after running.
- Screenshot: `reference/harbour-house-pier.png`. This improves the reference-inspired scene; fine model details remain stylized rather than an exact reproduction.

## 2026-09-19 — pier placement correction

- Moved pier start to (16.1, 4.65), beside the porch steps, rotated 0.52 radians toward the right/front sea. Removed the detached sideways stepping-stone connection; placed the sign left of the entrance.
- Moved the decorative boat into the foreground shallows with an independent wrapped mooring pile and a curved bow rope. Cleared nearby coral to leave room beneath the boat.
- Added deck rope coils, cleats and small beach starfish.
- `src/harbour-layout.json` now supplies the generator, runtime sign/boat/rope placement and navigation obstacles; collision bounds rotate with the pier.
- Updated navigation tests verify the relocated pier, hull clearance, mooring boat/pile, freed previous mooring location and all 2,501 automatic route samples. Tests/build passed; browser reported no errors.
- Screenshot: `reference/harbour-pier-alignment.png`.

## 2026-09-19 — paved connection, cottage details and transparent surf

- Moved the pier threshold outward and shortened it to retain its seaward end; added ten staggered flagstones between porch steps and pier. Navigation geometry derives its length from the shared layout.
- Added framed door lamps, flower boxes, a striped porch rug and potted plants.
- Water color/transparency now varies through layered world-space noise rather than only concentric distance bands; brighter underwater visibility and small moving highlights remain.
- Generator exports actual sloping beach rings to `src/surf-rings.json`; `src/shore-surf.js` uses them for a raised conforming swash mesh. A moving broken foam front and dissipating lace foam wash in/out along the wet sand, including the expanded rear beach.
- Tests passed (fish and all collision/route checks), production build passed. Browser caught a reserved GLSL identifier during development; renamed it and verified the corrected live shader with no new console errors after reload.
- Screenshot: `reference/harbour-path-surf.png`.

## 2026-09-19 — longer straight path and aligned pier

- Set pier center to x=15.05, matching the cottage door and stairs, removed its rotation and moved its threshold to z=7.0.
- Extended paving to nine paired rows (18 horizontal flagstones), with a low stone support bed on the descending beach. Corrected stone yaw to avoid tilted slabs.
- Shifted the seaward automatic route outward to maintain full hull clearance around the new pier end. All navigation/fish tests and build passed.
- Browser visual evidence: `reference/harbour-straight-pier.png`.

## 2026-09-19 — reference garden hierarchy and six paving slabs

- Added two stepped plinth courses beside the house, keeping the three front porch steps separate from the path.
- Replaced the paired paving and continuous support bed with exactly six independent single-file slabs, with visible sand gaps before the pier.
- Rebalanced smaller flower beds outside the plinth and placed seven irregular boulders at tree roots and garden edges; kept the entry and rear clearing open.
- Rebuilt palms with fifteen tangent-aligned tapered trunk segments following a quadratic curve, growth collars and crowns placed at the actual curved trunk endpoints.
- Regenerated assets, passed fish/navigation tests and production build; visually checked the arrangement in-browser. Screenshot: `reference/harbour-garden-steps.png`.

## 2026-09-19 — double actual island area

- Applied sqrt(2) to both horizontal sand dimensions. Compared generated shoreline polygon areas before/after: 300.3793865464109 to 600.7587730928218 square scene units, ratio exactly 2.0.
- Kept house/garden models at their existing sizes. Expanded seabed, surf geometry, reef placement and shore inhabitants; moved pier threshold and mooring outward, retaining six path slabs.
- Shared size data in `src/island-size.json` drives water, fish and beach life. Updated generated collision outline and automatic route for the larger landmass. Slightly widened the camera framing to show the expanded shore.
- Fish/navigation tests and production build passed. Browser screenshot: `reference/island-double-area.png`.

## 2026-09-19 — clear irregular water palette

- Replaced the single noise/distanced color blend with bent multi-scale fields for broad deep-water basins, smaller turquoise channels and clear sand windows. Deep blue coloration varies independently of shore distance.
- Adjusted shallow coverage locally (0.17–0.33), added light pools, and refined moving caustics/highlights. Applied a depth-weighted cyan grade only to submerged sand so shallows lose their grey/yellow cast while coral colors retain their own shading.
- Production build passed; live browser shader check produced no new console errors. Screenshot: `reference/irregular-clear-water.png`.

## 2026-09-19 — gentle water flow

- Added slow directional drift with small spatial eddies to water color fields and caustics. Added faint broken travelling highlights; shore distance remains anchored to the island.
- Production build and live shader check passed without new console errors.

## 2026-09-19 — natural submerged stone colors

- Replaced the uniform turquoise reef-rock material with four deterministic stone variants: warm grey, sandstone, slate and brown.
- Applied gentler, more neutral underwater absorption/haze to reef rocks while retaining depth and moving caustics. Coral and water palettes remain independently shaded.
- Regenerated GLBs; build and browser shader check passed. Screenshot: `reference/natural-underwater-rocks.png`.

## 2026-09-19 — right beach lounge

- Added two staggered wooden reclining chairs facing the right bay, with slats, inclined backs, pillows and striped seafoam towels.
- Added a small shared round table with book/cup and a cream linen umbrella with scalloped alternating panels, timber ribs and pole.
- Positioned the group beside the garden on the right beach, clear of the front paving and pier access. No lookout tower added.
- Regenerated assets; production build passed and browser reported no new errors. Screenshot: `reference/beach-lounge.png`.

## 2026-09-19 — irregular shore wave sets

- Replaced synchronized sinusoidal wash with three overlapping wave sets. Local speed/phase varies around the coast; each event varies reach, thickness and strength, producing occasional stronger surges and smaller intervening waves.
- Foam advances inland, retreats more slowly and dissipates in broken patches. Periodic coastal coordinates keep the start/end seam continuous.
- Build and live shader checks passed without new errors. Screenshot: `reference/irregular-shore-waves.png`.

## 2026-09-19 — smooth shore without terrain shadow band

- Disabled shadow casting for beach sand, island ground and submerged sand. They still receive object shadows; cottage, vegetation and pier continue casting shadows.
- Applied the same depth-dependent wet-sand color treatment to the submerged beach edge and seabed, reducing their visual seam.
- Browser comparison confirms the dark perimeter band is removed. Build passed; no new browser errors. Screenshot: `reference/smooth-shadowless-shore.png`.

## 2026-09-19 — softer wet-sand color transition

- Feathered water opacity and warm tint across the wet-sand band, accounting for beach rotation and extended rear shore. Near the edge sand shows through before turquoise increases gradually.
- Slowed underwater sand cyan grading and faded caustics in from zero depth, avoiding a sudden bright/color edge at the waterline.
- Build passed and live shader check reported no new errors.

## 2026-09-20 — island-wide turtle, seagrass and foam blending

- Expanded turtle destinations to random shores around the island. Offshore waypoint arcs avoid straight travel through land; landing corridors avoid the cottage/garden, lounge, pier and mooring. Swimming floats below the water with gentle depth changes; crawling follows sampled sand height.
- Added deterministic scattered seagrass clumps with varying olive tones/height, rooted in sampled seabed. Instanced blades bend above anchored roots with the current.
- Removed the surf layer's separate aqua wash tint and widened its seaward alpha fade; transparent foam gaps reveal the actual ocean color.
- Fish, navigation and extended turtle tests passed. Turtle test covers continuous motion, rests, different landings, >20 units of horizontal range and visits on both front/rear coasts. Production build passed.
- Browser verification remains incomplete this iteration: the dev server had stopped; restarted on 5174. The existing tab became a data-URL connection-error page and browser URL policy blocked further navigation on that tab. No visual verification or screenshot is claimed for this iteration.

## Shore contact correction — 2026-09-20
- User identified the solid beach/shallows boundary, rather than foam opacity.
- Root cause: the submerged beach skirt ended abruptly above the deeper sandy shelf.
- Warm lagoon sand now fades by world height from y=.10 to -.365, reaching zero before its outer edge at -.378. It renders before the ocean with no depth writes so the existing seabed shows through.
- Removed the minimum water-tint opacity at the inner shore.
- Vite production build passed. In-app browser before/after screenshots confirmed the hard sand silhouette is replaced by a continuous sand-to-aqua transition; cottage, pier, fish and turtle remain visible.

## Local gift game — 2026-09-20
- Added sender setup with names, invitation text, three gameplay difficulties, six room photo slots, photo captions, theme and letter.
- Local API saves immutable invitations and photos under gitignored `.gift-data`; no cloud deployment or remote sharing is claimed.
- Added a mainland departure port, click-to-sail and touch controls, ordered navigation buoys, ocean-current differences, safe recovery, arrival gating and an animated walk from pier to cottage.
- Added a separate 3D memory room with mounted photo textures, close-up gallery and letter reveal. Sender preview and recipient reveal use the saved gift content.
- Browser-tested creation, persisted draft reload, generated invitation, launch, both easy-route buoys, docking, walk to front door, room entry and correct sender/recipient letter content.
- Existing wildlife/navigation tests and new gift schema, full difficulty route clearance, landing gate, HTTP persistence/independent invitation/missing-link tests pass. Production build passes with the pre-existing bundle-size advisory.

## Cozy room and window verification — 2026-09-20
- Rebuilt the room into a sofa/photo-wall area, a window bench and a reading corner, with rounded upholstered furniture, linen weave, curtains, paneled walls, oak flooring, layered rug, flowers, books, candles, mugs and letter details.
- Six uploaded-photo slots remain supported; empty slots display botanical placeholder art. Two server-persisted JPEG test images were verified in their 3D frames, the thumbnail gallery and a close-up with the correct caption after a full mainland-to-cottage journey.
- Real sea-window render target shares the existing exterior scene, at 480×320 and at most 8 updates/sec. Room static meshes are merged by material; static interior shadows are cached.
- At 1280×720, the final frame scheduler showed 30 fps with live window enabled. Warm local sample: window CPU submission 1.67 ms and asynchronous GPU timer 2.84 ms per window update (72 draw calls, 397291 triangles). These measure only the window pass, not total frame cost or a mobile-device guarantee.
- A prior narrow-window sample measured GPU 2.47–2.51 ms per window update. The first render includes setup and is not representative of steady-state cost.
- Photo picker conversion is implemented for JPG/PNG/WebP, but OS file-picker automation was not performed; persisted JPEG content and recipient rendering were tested through the real local API.
- Final comparison at 1280×720: live and static window both showed approximately 30 fps. Warm window-pass GPU measurements were 2.5–2.8 ms. Disabling the window held the render counter at 226 across subsequent observations, confirming no additional exterior window passes.
- Directly clicking the letter mesh opened the correct personalized letter. Restored a clean sender draft (removed only QA names/occasion) for the final preview.
