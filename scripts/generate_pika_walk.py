#!/usr/bin/env python3
"""
Generate Pika walk spritesheet from raw frames.
Creates 4-frame walk cycle following SPRITE-SPEC.md v1 format.
"""

from PIL import Image
import os

# Config
CELL_SIZE = 128
FRAMES = 4
DIRECTIONS = ['S', 'W', 'N', 'E']  # 4-dir for now
GROUND_LINE = 110  # feet position from top
MARGIN = 8

def load_and_crop_to_cell(filepath):
    """Load raw frame and resize/crop to fit 128x128 cell."""
    img = Image.open(filepath)
    # Raw frames are 1024x1024, need to resize to 128x128
    # Use high-quality downsampling
    img_resized = img.resize((CELL_SIZE, CELL_SIZE), Image.Resampling.LANCZOS)
    return img_resized

def create_walk_cycle_frames(base_img):
    """Create 4 walk cycle frames from a single base image.
    
    Walk cycle phases:
    Frame 0: Standing (contact) - neutral pose
    Frame 1: Push off (recoil) - slight lean back
    Frame 2: Passing (mid-stride) - legs cross
    Frame 3: Reach (high-point) - stride extended
    
    Since we only have one frame per direction, we'll create variations
    by slightly shifting/cropping to simulate motion.
    """
    frames = []
    w, h = base_img.size
    
    # Frame 0: Original/neutral
    frames.append(base_img.copy())
    
    # Frame 1: Slight vertical shift (bob down)
    frame1 = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    frame1.paste(base_img, (0, 2))  # Shift down 2px
    frames.append(frame1)
    
    # Frame 2: Neutral with slight stretch
    frame2 = base_img.resize((w, h-1), Image.Resampling.LANCZOS)
    frame2_full = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    frame2_full.paste(frame2, (0, 1))
    frames.append(frame2_full)
    
    # Frame 3: Slight vertical shift (bob up)
    frame3 = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    frame3.paste(base_img, (0, -1))  # Shift up 1px
    frames.append(frame3)
    
    return frames

def flip_horizontal(img):
    """Flip image horizontally."""
    return img.transpose(Image.FLIP_LEFT_RIGHT)

def create_spritesheet(direction_frames):
    """Create spritesheet in v1 format: 4 columns (frames) × 4 rows (directions)."""
    # Layout: Row 0=S, Row 1=W, Row 2=N, Row 3=E
    sheet_width = CELL_SIZE * FRAMES  # 512
    sheet_height = CELL_SIZE * len(DIRECTIONS)  # 512
    
    spritesheet = Image.new('RGBA', (sheet_width, sheet_height), (0, 0, 0, 0))
    
    for row, direction in enumerate(DIRECTIONS):
        frames = direction_frames[direction]
        for col, frame in enumerate(frames):
            x = col * CELL_SIZE
            y = row * CELL_SIZE
            spritesheet.paste(frame, (x, y))
    
    return spritesheet

def main():
    raw_dir = '/home/jndoye/shared/projects/pikaboard/frontend/public/characters/pika/raw'
    output_dir = '/home/jndoye/shared/projects/pikaboard/frontend/public/characters/pika/sprites'
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Load available raw frames
    print("Loading raw walk frames...")
    
    # Available: S, N, E, SE, NE
    # Need to create: W (flip E), SW (flip SE), NW (flip NE)
    
    raw_frames = {}
    
    # Load existing directions
    for direction in ['S', 'N', 'E', 'SE', 'NE']:
        filepath = os.path.join(raw_dir, f'walk_{direction}.png')
        if os.path.exists(filepath):
            raw_frames[direction] = load_and_crop_to_cell(filepath)
            print(f"  Loaded walk_{direction}.png")
    
    # Create missing directions by flipping
    print("\nCreating missing directions by flipping...")
    
    # W = flip E
    if 'E' in raw_frames:
        raw_frames['W'] = flip_horizontal(raw_frames['E'])
        print("  Created W from E (flipped)")
    
    # For 4-dir, we only need S, W, N, E
    # But if we wanted 8-dir: SW from SE, NW from NE
    
    # Create walk cycle frames for each direction
    print("\nGenerating 4-frame walk cycles...")
    direction_frames = {}
    for direction in DIRECTIONS:
        if direction in raw_frames:
            frames = create_walk_cycle_frames(raw_frames[direction])
            direction_frames[direction] = frames
            print(f"  Created 4 frames for {direction}")
    
    # Create spritesheet
    print("\nAssembling spritesheet...")
    spritesheet = create_spritesheet(direction_frames)
    
    output_path = os.path.join(output_dir, 'walk.png')
    spritesheet.save(output_path, 'PNG')
    print(f"  Saved: {output_path} ({spritesheet.size[0]}x{spritesheet.size[1]})")
    
    # Also copy idle.png from existing spritesheet
    idle_source = '/home/jndoye/shared/projects/pikaboard/frontend/public/characters/pika/spritesheet_idle.png'
    idle_dest = os.path.join(output_dir, 'idle.png')
    
    # The existing idle is 1024x128 (8 columns x 1 row in v0 format)
    # Need to convert to v1 format: 4 columns x 4 rows
    print("\nConverting idle to v1 format...")
    convert_idle_to_v1(idle_source, os.path.join(output_dir, 'idle.png'))
    
    # Create manifest.json
    manifest = {
        "agent": "pika",
        "version": 1,
        "cellSize": 128,
        "directions": 4,
        "directionOrder": ["S", "W", "N", "E"],
        "animations": {
            "idle": {"file": "idle.png", "frames": 4, "fps": 5},
            "walk": {"file": "walk.png", "frames": 4, "fps": 5}
        },
        "groundLine": 110,
        "safeZone": {"margin": 8}
    }
    
    import json
    manifest_path = os.path.join(output_dir, 'manifest.json')
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    print(f"  Saved: {manifest_path}")
    
    print("\n✅ Walk spritesheet generation complete!")

def convert_idle_to_v1(idle_source, idle_dest):
    """Convert v0 format idle (8 cols x 1 row) to v1 format (4 cols x 4 rows)."""
    img = Image.open(idle_source)
    w, h = img.size
    
    # v0 format: 8 columns (directions) × 1 row (frames)
    # Each cell should be 128x128, so total is 1024x128
    cell_w = w // 8  # 128
    cell_h = h // 1  # 128
    
    # Extract cells: S, SW, W, NW, N, NE, E, SE (v0 order)
    cells = {}
    v0_order = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE']
    
    for i, direction in enumerate(v0_order):
        x = i * cell_w
        cell = img.crop((x, 0, x + cell_w, cell_h))
        cells[direction] = cell
    
    # v1 format: 4 columns (frames) × 4 rows (directions: S, W, N, E)
    # For idle, we duplicate the single frame to make 4 frames
    v1_directions = ['S', 'W', 'N', 'E']
    sheet = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    
    for row, direction in enumerate(v1_directions):
        source_cell = cells[direction]
        # Duplicate the same frame 4 times for idle animation
        for col in range(4):
            x = col * 128
            y = row * 128
            sheet.paste(source_cell, (x, y))
    
    sheet.save(idle_dest, 'PNG')
    print(f"  Saved: {idle_dest} (512x512)")

if __name__ == '__main__':
    main()
