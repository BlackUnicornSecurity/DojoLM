#!/usr/bin/env python3
"""
Rename branded fixtures to clean BlackUnicorn naming convention
"""

import os
import re
from pathlib import Path
import shutil

def clean_name(name: str) -> str:
    """Clean up filename by removing fluff"""
    # Remove common AI generation suffixes
    name = re.sub(r'_Bright_Eleven_v3_[a-f0-99-]+', '', name)
    name = re.sub(r'_Shadow_Eleven_v3_[a-f0-9-9-]+', '', name)
    name = re.sub(r'_Wit_Eleven_v3_[a-f0-99-]+', '', name)
    name = re.sub(r'_Kling_26_Pro_[0-9]+', '', name)
    name = re.sub(r'_Nano_Banana_Pro_[0-9]+', '', name)
    name = re.sub(r'\(1\)', '', name)
    name = name.replace('_', ' ').replace('-', ' ').strip()
    return name

# Get all branded files
fixtures_dir = Path('fixtures')
branded_files = []
branded_files.extend(fixtures_dir.joinpath('audio').glob('branded-*.mp3'))
branded_files.extend(fixtures_dir.joinpath('multimodal').glob('branded-*.mp4'))
branded_files.extend(fixtures_dir.joinpath('images').glob('branded-*.*'))

# Brand name mapping
brand_map = {
    'bu': 'blackunicorn',
    'bu-': 'blackunicorn',
    'branded-bu': 'blackunicorn',
    'dojolm': 'dojolm',
    'branded-dojolm': 'dojolm',
    'bonk': 'bonklm',
    'branded-bonk': 'bonklm',
    'basilieak': 'basileak',
    'branded-basilieak': 'basileak',
    'pan': 'pantheonlm',
    'branded-pan': 'pantheonlm',
    'marf': 'marfaak',
    'branded-marf': 'marfaak',
}

# Counters for numbering
counters = {
    'blackunicorn': {'audio': 1, 'video': 1, 'image': 1},
    'dojolm': {'audio': 1, 'video': 1, 'image': 1},
    'bonklm': {'audio': 1, 'video': 1, 'image': 1},
    'basileak': {'audio': 1, 'video': 1, 'image': 1},
    'pantheonlm': {'audio': 1, 'video': 1, 'image': 1},
    'marfaak': {'audio': 1, 'video': 1, 'image': 1},
}

print("🦄 Renaming Branded Fixtures to Clean Names")
print("=" * 60)
print()

renamed = 0

for file in branded_files:
    old_name = file.name
    old_path = str(file)

    # Extract brand
    brand = None
    for prefix, full_brand in brand_map.items():
        if old_name.startswith(prefix):
            brand = full_brand
            break

    if not brand:
        continue

    # Determine file type and generate new name
    ext = file.suffix
    if ext == '.mp3':
        category = 'audio'
        num = counters[brand][category]
        counters[brand][category] = num + 1
        new_name = f"{brand}-{category}-{num:03d}.mp3"
    elif ext == '.mp4':
        category = 'video'
        num = counters[brand][category]
        counters[brand][category] = num + 1
        new_name = f"{brand}-{category}-{num:03d}.mp4"
    else:
        # Images - more descriptive naming
        category = 'image'
        num = counters[brand][category]
        counters[brand][category] = num + 1

        # Determine type from cleaned name
        clean = clean_name(old_name.replace('branded-', '').replace(brand, '', 1))
        if 'logo' in clean.lower():
            new_name = f"{brand}-logo.{ext}"
        elif 'banner' in clean.lower() or 'background' in clean.lower():
            new_name = f"{brand}-banner.{ext}"
        elif 'no text' in clean.lower():
            new_name = f"{brand}-logo.{ext}"
        elif 'text' in clean.lower():
            new_name = f"{brand}-promo.{ext}"
        else:
            new_name = f"{brand}-image-{num:03d}.{ext}"

    new_path = str(file.parent / new_name)

    # Rename
    if old_path != new_path:
        shutil.move(old_path, new_path)
        print(f"  {old_name.split('/')[-1][:50]:50} → {new_name}")
        renamed += 1

print()
print("=" * 60)
print(f"✅ Renamed {renamed} files")
print()

# Show samples of new names
print("Sample New Names:")
print("  Audio:")
for f in fixtures_dir.joinpath('audio').glob('blackunicorn-audio-*.mp3'):
    print(f"    {f.name}")

print("\n  Images:")
for f in fixtures_dir.joinpath('images').glob('blackunicorn-*.*'):
    if 'logo' in f.name or 'banner' in f.name:
        print(f"    {f.name}")
