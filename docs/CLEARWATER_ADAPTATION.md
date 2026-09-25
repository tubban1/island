# Clearwater water adaptation

Reference: https://github.com/Aureliengmz/clearwater/tree/main
Copyright (c) 2026 Lumaris. MIT license retained at `/licenses/clearwater-MIT.txt`.

Implemented:
- Exact dielectric Fresnel equation adapted from Clearwater (water IOR 1.333).
- Six directional wave components for animated surface normals.
- Submerged scene render target, clipped at water level, projected through a refracted offset.
- Approximate depth-based RGB absorption and sky-colour reflection.
- Refraction target capped at 960px width and 65% drawing-buffer resolution; alternate-frame updates with stationary camera.
- Refraction disabled for the room's separate window camera to avoid sampling the wrong perspective.

Not ported: FFT simulation, refracted-ray caustic grid, spectral dispersion, LEAN slope filtering, diffraction glare. Existing procedural caustics remain. Optical depth uses coastline distance rather than measured per-pixel seabed depth. This is an adaptation for the existing stylized island, not full Clearwater parity. Mobile GPU frame-time profiling remains outstanding.
