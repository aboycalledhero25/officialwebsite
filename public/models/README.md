# 3D Guitar Models

Drop your own `.glb` (or `.gltf`) model files here to replace the procedural guitars.

## Expected files

| File | Role | Fallback colour |
|------|------|-----------------|
| `strat.glb` | Turquoise guitar on the **left** | `#00f0ff` (cyan) |
| `jaguar.glb` | Pink guitar on the **right** | `#ff006e` (neon pink) |

If a file is missing, the site automatically falls back to a procedural silhouette.

## Where to get models

### Free sources
- **Sketchfab** — search "Fender Stratocaster" / "Fender Jaguar". Many creators offer free downloads under CC licenses. Download as `.glb`.
- **CGTrader** — mix of free and paid guitar models.
- **TurboSquid** — some free models available.

### Paid (higher quality)
- **CGTrader** / **TurboSquid** — detailed scanned guitars, usually $5–$30.
- **Hum3D** — vehicle/instrument models with good topology.

## Tips for best results

1. **Format**: Use `.glb` (single file, all textures embedded). `.gltf` works too but requires companion files.
2. **File size**: Keep under ~5 MB for web. Use [gltf-pipeline](https://github.com/CesiumGS/gltf-pipeline) to compress:
   ```bash
   npx gltf-pipeline -i source.glb -o strat.glb --draco.compressionLevel=10
   ```
3. **Orientation**: The code auto-scales the model to fit, but ideally your guitar should stand upright (neck pointing up) in the source file.
4. **Colour tinting**: The code automatically tints loaded models toward the theme colour (turquoise/pink) and adds emissive glow. If your model has detailed textures, you may want to tweak the `tintModel()` function in `components/guitar-background.tsx`.

## Quick start

1. Download a Fender Stratocaster `.glb` model.
2. Rename it to `strat.glb`.
3. Place it in this folder (`public/models/`).
4. Restart the dev server.
5. The turquoise guitar is now your real 3D model.
