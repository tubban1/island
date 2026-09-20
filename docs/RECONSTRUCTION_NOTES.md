# Reconstruction calibration notes

Reference supplied: 1716×1270, 30 fps, ~21.3 seconds.

## Camera
- Orthographic game/diorama framing, not a wide perspective camera.
- Reference calibration: `orthoScale ≈ 25.8`, elevated three-quarter view.
- Camera follow has deliberate lag; boat is kept near the central visual corridor rather than dead centre.

## Palette sampled from reference frames
Dominant water family is clustered around RGB `(6,83,120)`, `(10,96,120)`, with shallow-water teal around `(12,114,123)` and warm island tones around `(214,199,144)`.

## Rebuilt asset groups
- Home Harbour sand island and raised vegetation bed
- white beach house, terracotta gable roof, chimney, teal windows
- porch/pergola, deck, display stand, surfboard
- Home Harbour sign and tag
- wooden dock with four posts/lanterns
- three hero palms with segmented trunks and stylised fronds
- dense tropical flower/bush clusters
- continuous lagoon reef belt
- open-sea reef clusters
- ivory/teal wooden motor boat with three benches, motor and red flag

## Web effects
- procedural deep-to-shallow lagoon shader
- approximate shoreline/reef distance field
- animated caustic interference pattern
- long warm key-light shadows + cyan fill
- dual wake foam trail and expanding eddy rings
- fish schools and gulls
- 21.1-second auto-sail route rebuilt from the supplied video timing
- mild cyan-shadow/warm-highlight grade
