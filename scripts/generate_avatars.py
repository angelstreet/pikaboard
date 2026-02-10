#!/usr/bin/env python3
"""
Generate 512x512 high-res avatars for all characters from existing avatar.png files.
"""

from PIL import Image
import os

BASE_DIR = '/home/jndoye/shared/projects/pikaboard/frontend/public/characters'

def create_avatar(source_path, output_path, size=512):
    """Create high-res avatar from source image."""
    if not os.path.exists(source_path):
        print(f"  Source not found: {source_path}")
        return False
    
    img = Image.open(source_path)
    
    # Convert to RGBA if needed
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Remove white background if present
    datas = img.getdata()
    new_data = []
    for item in datas:
        r, g, b, a = item
        # If pixel is close to white and has high alpha, check if it should be transparent
        if r > 250 and g > 250 and b > 250:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    
    img.putdata(new_data)
    
    # Resize to 512x512 with high quality
    img_resized = img.resize((size, size), Image.Resampling.LANCZOS)
    
    img_resized.save(output_path, 'PNG')
    print(f"  Created: {output_path} ({size}x{size})")
    return True

def main():
    characters = ['pika', 'bulbi', 'tortoise', 'sala', 'evoli', 'psykokwak', 'mew', 'lanturn', 'porygon']
    
    print("Generating 512x512 avatars...\n")
    
    for char in characters:
        char_dir = os.path.join(BASE_DIR, char)
        if not os.path.exists(char_dir):
            print(f"Character dir not found: {char}")
            continue
        
        print(f"Processing {char}...")
        
        # Source: existing avatar.png in character dir
        source = os.path.join(char_dir, 'avatar.png')
        output = os.path.join(char_dir, 'avatar.png')  # Overwrite with 512x512
        
        # Check current size
        if os.path.exists(source):
            img = Image.open(source)
            if img.size == (512, 512):
                print(f"  Already 512x512, skipping")
                continue
        
        create_avatar(source, output, 512)
    
    print("\n✅ Avatar generation complete!")

if __name__ == '__main__':
    main()
