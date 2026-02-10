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

def remove_white_background(img, threshold=250):
    """Convert white/light background to transparent."""
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    datas = img.getdata()
    new_data = []
    for item in datas:
        r, g, b, a = item
        # If pixel is close to white, make it transparent
        if r > threshold and g > threshold and b > threshold:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    
    img.putdata(new_data)
    return img

def crop_to_content(img, padding=0):
    """Crop image to non-transparent content."""
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    if bbox:
        left, top, right, bottom = bbox
        # Add padding
        left = max(0, left - padding)
        top = max(0, top - padding)
        right = min(img.width, right + padding)
        bottom = min(img.height, bottom + padding)
        return img.crop((left, top, right, bottom))
    return img

def center_in_cell(img, cell_size=128):
    """Center image in a cell of given size."""
    cell = Image.new('RGBA', (cell_size, cell_size), (0, 0, 0, 0))
    
    # Resize to fit within cell while maintaining aspect ratio
    img.thumbnail((cell_size - 16, cell_size - 16), Image.Resampling.LANCZOS)
    
    # Center in cell
    x = (cell_size - img.width) // 2
    y = cell_size - img.height - 8  # 8px margin from bottom (feet at ground line)
    
    cell.paste(img, (x, y), img if img.mode == 'RGBA' else None)
    return cell

def load_and_process_frame(filepath):
    """Load raw frame, remove background, resize to fit 128x128 cell."""
    img = Image.open(filepath)
    
    # Remove white background
    img = remove_white_background(img)
    
    # Crop to content
    img = crop_to_content(img, padding=10)
    
    # Center in cell
    img = center_in_cell(img, CELL_SIZE)
    
    return img

def create_walk_variations(base_img):
    """Create 4 walk cycle variations from a single base frame.
    
    Since we only have one frame per direction, we create subtle
    variations to simulate a walk cycle:
    - Frame 0: Neutral
    - Frame 1: Slight bounce down
    - Frame 2: Neutral (slight stretch)
    - Frame 3: Slight bounce up
    """
    frames = []
    w, h = base_img.size
    
    # Frame 0: Original
    frames.append(base_img.copy())
    
    # Frame 1: Shift down 3px (contact/bounce down)
    frame1 = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    frame1.paste(base_img, (0, 3), base_img)
    frames.append(frame1)
    
    # Frame 2: Original with slight squash (passing position)
    # Actually just use original for now
    frames.append(base_img.copy())
    
    # Frame 3: Shift up 2px (push off/bounce up)
    frame3 = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    frame3.paste(base_img, (0, -2), base_img)
    frames.append(frame3)
    
    return frames

def flip_horizontal(img):
    """Flip image horizontally."""
    return img.transpose(Image.FLIP_LEFT_RIGHT)

def create_spritesheet(direction_frames):
    """Create spritesheet in v1 format: 4 columns (frames) × 4 rows (directions)."""
    sheet_width = CELL_SIZE * FRAMES  # 512
    sheet_height = CELL_SIZE * len(DIRECTIONS)  # 512
    
    spritesheet = Image.new('RGBA', (sheet_width, sheet_height), (0, 0, 0, 0))
    
    for row, direction in enumerate(DIRECTIONS):
        frames = direction_frames[direction]
        for col, frame in enumerate(frames):
            x = col * CELL_SIZE
            y = row * CELL_SIZE
            spritesheet.paste(frame, (x, y), frame)
    
    return spritesheet

def main():
    raw_dir = '/home/jndoye/shared/projects/pikaboard/frontend/public/characters/pika/raw'
    output_dir = '/home/jndoye/shared/projects/pikaboard/frontend/public/characters/pika/sprites'
    
    os.makedirs(output_dir, exist_ok=True)
    
    print("Processing raw walk frames...")
    
    # Available: S, N, E, SE, NE
    # Need to create: W (flip E), SW (flip SE), NW (flip NE) for 8-dir
    # For 4-dir: just need W from E
    
    raw_frames = {}
    
    # Load and process existing directions
    for direction in ['S', 'N', 'E', 'SE', 'NE']:
        filepath = os.path.join(raw_dir, f'walk_{direction}.png')
        if os.path.exists(filepath):
            raw_frames[direction] = load_and_process_frame(filepath)
            print(f"  Processed walk_{direction}.png -> {raw_frames[direction].size}")
    
    # Create missing directions by flipping
    print("\nCreating missing directions by flipping...")
    
    # W = flip E
    if 'E' in raw_frames:
        raw_frames['W'] = flip_horizontal(raw_frames['E'])
        print("  Created W from E (flipped)")
    
    # Create walk variations for each direction
    print("\nGenerating 4-frame walk cycles...")
    direction_frames = {}
    for direction in DIRECTIONS:
        if direction in raw_frames:
            frames = create_walk_variations(raw_frames[direction])
            direction_frames[direction] = frames
            print(f"  Created 4 frames for {direction}")
    
    # Create spritesheet
    print("\nAssembling spritesheet...")
    spritesheet = create_spritesheet(direction_frames)
    
    output_path = os.path.join(output_dir, 'walk.png')
    spritesheet.save(output_path, 'PNG')
    print(f"  Saved: {output_path} ({spritesheet.size[0]}x{spritesheet.size[1]})")
    
    # Check file size
    file_size = os.path.getsize(output_path)
    print(f"  File size: {file_size} bytes")
    
    # Also process idle frames
    print("\nProcessing idle frames...")
    process_idle_frames(output_dir)
    
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

def process_idle_frames(output_dir):
    """Process idle frames from raw_v2 (cleaner versions)."""
    raw_v2_dir = '/home/jndoye/shared/projects/pikaboard/frontend/public/characters/pika/raw_v2'
    
    # raw_v2 has: idle_S, idle_W, idle_N, idle_NW, idle_SE
    # Need: S, W, N, E (E from flipped W)
    
    idle_frames = {}
    
    for direction in ['S', 'W', 'N', 'NW', 'SE']:
        filepath = os.path.join(raw_v2_dir, f'idle_{direction}.png')
        if os.path.exists(filepath):
            idle_frames[direction] = load_and_process_frame(filepath)
            print(f"  Processed idle_{direction}.png")
    
    # Create E from W
    if 'W' in idle_frames:
        idle_frames['E'] = flip_horizontal(idle_frames['W'])
        print("  Created E from W (flipped)")
    
    # Create spritesheet (4 frames per direction, but idle only has 1 frame, so duplicate)
    DIRECTIONS = ['S', 'W', 'N', 'E']
    sheet = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    
    for row, direction in enumerate(DIRECTIONS):
        if direction in idle_frames:
            frame = idle_frames[direction]
            # Duplicate 4 times for idle animation
            for col in range(4):
                x = col * 128
                y = row * 128
                sheet.paste(frame, (x, y), frame)
    
    idle_path = os.path.join(output_dir, 'idle.png')
    sheet.save(idle_path, 'PNG')
    print(f"  Saved: {idle_path}")

if __name__ == '__main__':
    main()
