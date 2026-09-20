# The Atoll — interactive reconstruction

## Run

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 5173
npm test
npm run build
```

## Interaction

- WASD / arrows: sail manually. Space: stop. The top-right control restarts automatic sailing.
- Fast boat approaches scatter fish; slower sailing invites some fish to follow beside the wake.
- Click water to gather nearby fish. A surface ripple marks the interaction; the fish return to schooling after five seconds.
- Map switches to the island overview. Local information dialogs are illustrative because the original video's menu contents are not shown.

## Scene updates

Coral gardens are scattered across varied seabed depths, with open channels between groups. Depth-dependent color absorption, moving light patterns and surface transparency create underwater layering. Six schools contain 96 animated fish rendered with two instanced meshes. The house is surrounded by flowering groundcover and additional palms.

## Regenerate models

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements-assets.txt
.venv/bin/python generate_assets.py
```

The generator is deterministic and uses NumPy for vertex normals. It produces both GLBs and batches geometry by material. The older Blender file is retained but does not reproduce the latest assets.

## Inspection

`/?frame=0` freezes the opening pose. `/?frame=0&view=harbour` provides a close view of the garden. Fixed poses do not simulate historical wake. The broader source-video 1:1 goal remains unaccepted: the scene is a reconstruction, not the original models.

### Latest shallow-water scene (2026-09-19)

Preview: `http://127.0.0.1:5174/?view=harbour` (5173 was occupied by another project).
New details: exposed underwater sand and reef rocks, scattered shells, animated small crabs, four visually distinct fish species, vivid flower beds and a pier with a tied boat. The controllable boat still supports WASD/arrows, Space to stop, and clicking water to attract fish. `?frame=0&view=harbour` freezes the scene for comparison.

Recovery snapshot: `backups/shallows-complete-20260919.tgz`; a second copy lives in `/private/tmp/island2-shallows-complete-20260919.tgz`. Both contain source, generated assets, model generator and tests.

### Cottage and navigation update

`src/navigation.js` shares hull clearance and swept collision checks between manual and automatic sailing. `src/shoreline.json` is exported by `generate_assets.py` from the expanded island beach. Regenerate both GLBs and shoreline together after terrain edits (`python generate_assets.py`, with numpy and trimesh installed). `npm test` validates collision boundaries and the complete automatic route as well as fish behavior.

Latest recovery: `backups/harbour-house-pier-20260919.tgz` and `/private/tmp/island2-harbour-house-pier-20260919.tgz`.

## Gift island prototype (2026-09-20)

The entry page now offers a complete local gift flow. Choose **布置礼物**, enter names,
choose one of three sailing difficulties, upload up to six JPG/PNG/WebP images into
specific room frames, add captions and a letter, and generate an invitation.
Images are resized to a maximum 1100 px and converted to JPEG in the browser.
The recipient follows the invitation from a mainland port through navigation buoys,
docks outside the island pier, walks to the cottage, and opens the memory room.
Click water to steer, use WASD/arrows or the touch pad, and Space to stop.
The room supports photo close-ups and reading the letter.

```sh
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
# or build and run the standalone local server:
npm run build
npm start
```

Vite's local API and the standalone server both persist immutable invitations in
`.gift-data/` (gitignored). `GIFT_DATA_DIR` can select another persistent directory.
A random 192-bit token identifies each invitation; anyone with that link can read
its content. Creator changes create a new invitation, preserving previous gifts.
The browser separately keeps the editable draft in local storage when space allows.
Back up `.gift-data/` separately if you want to preserve locally created gifts;
code backups intentionally exclude personal photos and invitation data.

**Local prototype only:** a `127.0.0.1` link works on this computer. It is not an
internet share link. Public deployment, hosted private media, accounts, revocation,
abuse controls and durable remote storage remain a later phase. Gameplay reveals
content in sequence; it is not an authorization boundary for the invitation owner.

Tests cover gift validation, independent persistent invitations, missing links,
all three navigable routes and landing gates, plus the existing wildlife and hull
collision tests. HTTP integration tests require permission to bind a localhost port.

### Cozy room and live sea window

Open `/?room=preview` for the sender's current room draft. The room now has a
reading corner, linen sofa, layered woven rug, oak tables, a window seat, curtains,
flowers, books, candles, individual memory frames and a letter on the table.
Photo frames and the letter can also be clicked directly in the 3D room.

The sea window reuses the existing exterior scene through a 480×320 half-float
render target, capped at 8 updates/second, only while indoors. It reuses cached
exterior shadows. The window toggle freezes the last view without further exterior
render passes. Static interior decorations are merged by material; the room's
static shadow map is calculated once. Curtains continue a very gentle sway.

`/?room=preview&perf=1` shows diagnostic CPU submission time and asynchronous GPU
timer-query measurements for the **window pass only**, when the browser supports
GPU timers. These are local samples, not a universal device benchmark or total
frame cost. Color plus depth attachments use roughly 1.8 MiB, excluding driver
bookkeeping and existing scene assets. The game targets 30 frames/second.

### Production deployment — 2026-09-20

The `island` Vercel project is deployed to the `tubbans-projects-c58b36e6` team.
Production uses the Vercel Function at `/api/gifts` and the Supabase Postgres
connection supplied through `SUPABASE_DB_URL` / `SUPABASE_DB_SSL`. The function
creates `island_gifts` on first use and stores validated invitation metadata plus
browser-compressed JPEG payloads in a JSONB column. Only those database variables
were configured in Vercel Production; the local `.env` was not uploaded.
The custom domain is `island.fde.fan`.

For a larger public launch, move photo payloads out of JSONB into Supabase Storage
or Vercel Blob and keep only object paths in Postgres. That will reduce request
size and make image retention, deletion and access policy explicit.
