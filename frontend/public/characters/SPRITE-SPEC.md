# Sprite Template Specification

## Common Industry Standards

| Format | Cell Size | Use Case |
|--------|-----------|----------|
| **RPG Maker** | 48×48 or 32×32 | Top-down RPGs |
| **LPC (Liberated Pixel Cup)** | 64×64 | Top-down, 4-dir, very popular open standard |
| **Isometric (standard)** | 128×64 or 64×32 | Classic isometric (diamond tiles) |
| **Modern pixel art** | 32×32, 64×64, 128×128 | Most common for indie games |
| **HD sprites** | 256×256, 512×512 | High-res / mobile |

**Most common for character sprites: 64×64 or 128×128.**

## PikaBoard Sprite Spec (v1)

### Cell Size: **128×128 px**
- Matches common indie standard
- Good balance: detailed enough for cards, light enough for animation
- Scales well to 64px (game view) and 256px (detail modal)

### Layout

**Spritesheet: 4 columns × N rows**
```
       Frame1  Frame2  Frame3  Frame4
       0,0     128,0   256,0   384,0
Row 0: [  S  ] [  S  ] [  S  ] [  S  ]    ← South (front)
Row 1: [  W  ] [  W  ] [  W  ] [  W  ]    ← West
Row 2: [  N  ] [  N  ] [  N  ] [  N  ]    ← North (back)
Row 3: [  E  ] [  E  ] [  E  ] [  E  ]    ← East
--- 8-dir adds: ---
Row 4: [ SW  ] [ SW  ] [ SW  ] [ SW  ]    ← Southwest
Row 5: [ NW  ] [ NW  ] [ NW  ] [ NW  ]    ← Northwest
Row 6: [ NE  ] [ NE  ] [ NE  ] [ NE  ]    ← Northeast
Row 7: [ SE  ] [ SE  ] [ SE  ] [ SE  ]    ← Southeast
```

### Spritesheet Dimensions
| Mode | Columns | Rows | Sheet Size |
|------|---------|------|------------|
| **iso4** (4-dir) | 4 | 4 | 512×512 |
| **iso8** (8-dir) | 4 | 8 | 512×1024 |

### Per-Animation Files
```
characters/{agent}/
├── idle.png          ← 4 frames × 4 or 8 directions
├── walk.png          ← 4 frames × 4 or 8 directions
├── manifest.json     ← metadata (see below)
└── raw/              ← source images (optional)
```

### Character Placement Rules (CRITICAL)

```
┌────────────────────┐
│    8px margin       │
│  ┌──────────────┐  │
│  │              │  │
│  │  CHARACTER   │  │   Character MUST fit within
│  │  centered    │  │   the safe zone (112×112)
│  │  in safe     │  │
│  │  zone        │  │   Centered horizontally AND
│  │              │  │   vertically in the 128×128 cell
│  └──────────────┘  │
│    8px margin       │
└────────────────────┘
     128 × 128 px
```

- **Safe zone:** 112×112 px (8px margin on all sides)
- **Character must be centered** in the cell (both X and Y)
- **Feet at ~row 110** (consistent ground line across all directions)
- **Transparent background** (RGBA, alpha=0 for empty space)
- **No white backgrounds** — always transparent PNG

### Ground Line
All directions must share the same ground line (y ≈ 110px from top).
This ensures characters don't "float" or "sink" when changing direction.

```
         ┌─────────┐
         │  head   │
         │  body   │
         │  feet   │  ← y=110 (ground line)
         │ margin  │
         └─────────┘
              128px
```

### manifest.json
```json
{
  "agent": "pika",
  "version": 1,
  "cellSize": 128,
  "directions": 8,
  "directionOrder": ["S", "W", "N", "E", "SW", "NW", "NE", "SE"],
  "animations": {
    "idle": { "file": "idle.png", "frames": 4, "fps": 5 },
    "walk": { "file": "walk.png", "frames": 4, "fps": 5 }
  },
  "groundLine": 110,
  "safeZone": { "margin": 8 }
}
```

### Animation Timing
- **Frames per animation:** 4
- **FPS:** 5 (200ms per frame)
- **Loop:** continuous

### Color / Rendering
- `image-rendering: pixelated` for crisp scaling
- Source at 128px, display at any size (64, 96, 128, 200, 256)
- Transparent PNG (RGBA)

### Direction Order Change (v1 vs v0)
**v0 (current, broken):** S, SW, W, NW, N, NE, E, SE — 8 cols × N frame rows
**v1 (new standard):** S, W, N, E, SW, NW, NE, SE — 4 frame cols × N direction rows

v1 is better because:
1. Cardinal directions first (iso4 = first 4 rows, just crop)
2. Columns = frames (natural left-to-right animation)
3. Rows = directions (easy to add/remove directions)

### Generation Prompt Template
When generating sprites with AI (Gemini/etc), use this prompt structure:

**CRITICAL: No background, no shadow from the start. Do NOT generate with white/colored background and try to remove it afterwards — artifacts are inevitable.**

```
Generate a 2D character sprite for a game. The character is: [CHARACTER DESCRIPTION]

STRICT REQUIREMENTS:
- The character is facing [DIRECTION] (front/back/left/right/diagonal)
- TRANSPARENT BACKGROUND ONLY — absolutely NO background color, NO ground, NO shadow, NO drop shadow, NO ambient occlusion shadow beneath the character
- The character floats in empty transparent space
- PNG with alpha channel
- Character centered horizontally in frame
- Character's feet/bottom at consistent Y position (bottom 15% of frame)
- Consistent proportions: character fills ~70-80% of the frame height
- Clean edges, no anti-aliasing against a colored background
- Style: [3D rendered / pixel art / chibi] cute game character
- [ANIMATION]-specific: [idle=standing pose with subtle life / walk=mid-stride pose]

DO NOT include:
- Any background (white, gray, colored, gradient)
- Ground plane or floor
- Shadow beneath the character
- Any environmental elements
```

### Raw File Naming Convention (CRITICAL)
File name = direction the character **actually faces** (verified by vision, not by prompt).

### ⚠️ Gemini Mirroring Quirk
Gemini consistently mirrors diagonal directions. When you prompt "SE" (front-right), it generates front-LEFT (SW). This is baked into the pipeline — we prompt for one thing and use the result as the mirrored version.

**Prompt → Actual result mapping:**
| We prompt for | Gemini generates | We use it as |
|---------------|-----------------|--------------|
| S (front)     | S (front) ✓     | S            |
| W (left)      | W (left) ✓      | W            |
| N (back)      | N (back) ✓      | N            |
| SE (front-right) | SW (front-left) | SW, flip→SE |
| NW (back-left)   | NW (back-left) ✓ | NW, flip→NE |

Cardinals are correct. Diagonals get mirrored. We just accept it.

### Flip Rules
We generate 5 raw views (S, W, N + 2 diags), flip 3:
- `W` → flip → `E`
- `idle_SE.png` (actually SW) → use as SW, flip → SE
- `idle_NW.png` (correct NW) → use as NW, flip → NE

Always: **crop to bounding box → flip → re-center in cell**. This prevents offset drift.

### Generation Workflow (per agent)

1. **Generate with chromakey green (#00FF00) background** — 5 views
2. **HSV chromakey removal** — detect green in HSV space, morphological cleanup, green spill removal
3. **Verify directions** with vision model (Gemini mirrors diagonals!)
4. **Map to correct directions** accounting for mirroring
5. **Flip** to get remaining 3 directions
6. **Crop + center** each in 128×128 cell
7. **Assemble spritesheet** — 4 cols × 8 rows, save as `{animation}.png`

### Centering Validation Script
After generation, run validation:
```python
# Check each cell: character must be centered, feet at ground line
for each cell in spritesheet:
    bbox = get_non_transparent_bbox(cell)
    center_x = (bbox.left + bbox.right) / 2
    assert abs(center_x - 64) < 10  # centered horizontally
    assert bbox.bottom > 100 and bbox.bottom < 120  # feet near ground line
    assert bbox.top > 4  # not touching top edge
```
