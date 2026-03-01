#!/bin/bash
# Branded Media Integration Script
# Integrates all branded media assets as fixtures

FIXTURES_DIR="$(pwd)/fixtures"
BRANDING_ROOT="$(pwd)/../../team/branding/assets"

echo "🦄 Integrating Branded Media Assets"
echo "===================================="
echo ""

total_processed=0

# ============================================================
# PHASE 1: MP3 AUDIO FIXTURES
# ============================================================
echo "🎵 Phase 1: Processing Branded MP3s..."
echo ""

for brand_dir in blackunicorn dojolm bonklm Basileak PantheonLM Marfaak; do
  brand_short=$(echo "$brand_dir" | sed 's/basel/BasilI/' | sed 's/Basil/BasilI/' | tr '[:upper:]' '[:lower:]' | sed 's/pantheonlm/pan/' | sed 's/blackunicorn/bu/' | sed 's/dojolm/dojolm/' | sed 's/bonklm/bonk/' | sed 's/marfaak/marf/')

  source_dir="$BRANDING_ROOT/$brand_dir/unprocessed"

  if [ ! -d "$source_dir" ]; then
    continue
  fi

  for mp3 in "$source_dir"/*.mp3; do
    if [ -f "$mp3" ]; then
      filename=$(basename "$mp3")
      # Clean filename
      clean_name=$(echo "$filename" | sed 's/_Bright_Eleven_v3_[a-f0-9-]*//g' | sed 's/_Shadow_Eleven_v3_[a-f0-9-]*//g' | sed 's/_Wit_Eleven_v3_[a-f0-9-]*//g' | sed 's/_Kling_26_Pro_[0-9]*//g' | sed 's/_Nano_Banana_Pro_[0-9]*//g' | sed 's/(1)//g' | sed 's/ /-/g')
      dest_name="branded-${brand_short}-${clean_name}"
      dest_path="$FIXTURES_DIR/audio/$dest_name"

      cp "$mp3" "$dest_path"
      echo "  ✓ $dest_name"
      ((total_processed++))
    fi
  done
done

# ============================================================
# PHASE 2: MP4 VIDEO FIXTURES
# ============================================================
echo ""
echo "🎬 Phase 2: Processing Branded MP4s..."
echo ""

for brand_dir in blackunicorn dojolm bonklm Basileak PantheonLM Marfaak; do
  brand_short=$(echo "$brand_dir" | sed 's/basel/BasilI/' | sed 's/Basil/BasilI/' | tr '[:upper:]' '[:lower:]' | sed 's/pantheonlm/pan/' | sed 's/blackunicorn/bu/' | sed 's/dojolm/dojolm/' | sed 's/bonklm/bonk/' | sed 's/marfaak/marf/')

  source_dir="$BRANDING_ROOT/$brand_dir/unprocessed"

  if [ ! -d "$source_dir" ]; then
    continue
  fi

  for mp4 in "$source_dir"/*.mp4; do
    if [ -f "$mp4" ]; then
      filename=$(basename "$mp4")
      # Clean filename
      clean_name=$(echo "$filename" | sed 's/_Bright_Eleven_v3_[a-f0-9-]*//g' | sed 's/_Shadow_Eleven_v3_[a-f0-9-]*//g' | sed 's/_Wit_Eleven_v3_[a-f0-9-]*//g' | sed 's/_Kling_26_Pro_[0-9]*//g' | sed 's/_Nano_Banana_Pro_[0-9]*//g' | sed 's/(1)//g' | sed 's/ /-/g')
      dest_name="branded-${brand_short}-${clean_name}"
      dest_path="$FIXTURES_DIR/multimodal/$dest_name"

      cp "$mp4" "$dest_path"
      echo "  ✓ $dest_name"
      ((total_processed++))
    fi
  done
done

# ============================================================
# PHASE 3: IMAGE FIXTURES
# ============================================================
echo ""
echo "🖼️  Phase 3: Processing Branded Images..."
echo ""

for brand_dir in blackunicorn dojolm bonklm Basileak PantheonLM Marfaak; do
  brand_short=$(echo "$brand_dir" | sed 's/basel/BasilI/' | sed 's/Basil/BasilI/' | tr '[:upper:]' '[:lower:]' | sed 's/pantheonlm/pan/' | sed 's/blackunicorn/bu/' | sed 's/dojolm/dojolm/' | sed 's/bonklm/bonk/' | sed 's/marfaak/marf/')

  source_dir="$BRANDING_ROOT/$brand_dir/unprocessed"

  if [ ! -d "$source_dir" ]; then
    continue
  fi

  for img in "$source_dir"/*.{jpg,jpeg,png,svg}; do
    if [ -f "$img" ]; then
      filename=$(basename "$img")
      ext="${filename##*.}"
      base_name="${filename%.*}"
      # Clean filename
      clean_name=$(echo "$base_name" | sed 's/_Bright_Eleven_v3_[a-f0-9-]*//g' | sed 's/_Shadow_Eleven_v3_[a-f0-9-]*//g' | sed 's/_Wit_Eleven_v3_[a-f0-9-]*//g' | sed 's/_Kling_26_Pro_[0-9]*//g' | sed 's/_Nano_Banana_Pro_[0-9]*//g' | sed 's/(1)//g' | sed 's/[_ ]+/-/g' | tr '[:upper:]' '[:lower:]')
      dest_name="branded-${brand_short}-${clean_name}.${ext}"
      dest_path="$FIXTURES_DIR/images/$dest_name"

      cp "$img" "$dest_path"
      echo "  ✓ $dest_name"
      ((total_processed++))
    fi
  done
done

echo ""
echo "===================================="
echo "✅ Complete! $total_processed branded media files integrated"
echo "   Package size increased by ~135MB (acceptable for comprehensive lab)"
echo ""
echo "Next: Add metadata injection for attack vectors"
echo "===================================="
