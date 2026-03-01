#!/bin/bash
# Rename branded fixtures to clean BlackUnicorn naming convention
# Removes all fluff and creates consistent professional naming

cd "$(dirname "$0")"

echo "🦄 Cleaning Up Branded Fixture Names"
echo "===================================="
echo ""

# Mapping of current files to new clean names
# Audio: {brand}-voiceover-{number}.mp3
# Video: {brand}-animation-{number}.mp4
# Images: {brand}-{type}.{ext}

# Counters for each brand and type
declare -A bu_audio dojolm_audio bonk_audio basil_audio pan_audio marf_audio
declare -A bu_video dojolm_video bonk_video basil_video pan_video marf_video
declare -A bu_logo bu_banner bu_other dojolm_logo bonk_logo basil_logo pan_logo marf_logo

rename_branded_fixtures() {
  local counter=1
  local total=0

  # Process audio files
  for file in fixtures/audio/branded-*.mp3; do
    if [ -f "$file" ]; then
      # Extract brand prefix from filename
      if [[ $file =~ branded-bu-(.+) ]]; then
        new_name="blackunicorn-voiceover-$(printf "%03d" $counter).mp3"
        mv "$file" "fixtures/audio/$new_name"
        echo "  audio: $new_name"
        ((counter++)); ((total++))
      fi
    fi
  done

  counter=1
  for file in fixtures/audio/branded-dojolm-*.mp3; do
    if [ -f "$file" ]; then
      new_name="dojolm-voiceover-$(printf "%03d" $counter).mp3"
      mv "$file" "fixtures/audio/$new_name"
      echo "  audio: $new_name"
      ((counter++)); ((total++))
    fi
  done

  counter=1
  for file in fixtures/audio/branded-bonk-*.mp3; do
    if [ -f "$file" ]; then
      new_name="bonklm-voiceover-$(printf "%03d" $counter).mp3"
      mv "$file" "fixtures/audio/$new_name"
      echo "  audio: $new_name"
      ((counter++)); ((total++))
    fi
  done

  counter=1
  for file in fixtures/audio/branded-basilieak-*.mp3; do
    if [ -f "$file" ]; then
      new_name="basileak-voiceover-$(printf "%03d" $counter).mp3"
      mv "$file" "fixtures/audio/$new_name"
      echo "  audio: $new_name"
      ((counter++)); ((total++))
    fi
  done

  counter=1
  for file in fixtures/audio/branded-pan-*.mp3; do
    if [ -f "$file" ]; then
      new_name="pantheonlm-voiceover-$(printf "%03d" $counter).mp3"
      mv "$file" "fixtures/audio/$new_name"
      echo "  audio: $new_name"
      ((counter++)); ((total++))
    fi
  done

  counter=1
  for file in fixtures/audio/branded-marf-*.mp3; do
    if [ -f "$file" ]; then
      new_name="marfaak-voiceover-$(printf "%03d" $counter).mp3"
      mv "$file" "fixtures/audio/$new_name"
      echo "  audio: $new_name"
      ((counter++)); ((total++))
    fi
  done

  echo ""
  echo "🎬 Processing video files..."

  # Process video files
  counter=1
  for file in fixtures/multimodal/branded-dojolm-*.mp4; do
    if [ -f "$file" ]; then
      new_name="dojolm-animation-$(printf "%03d" $counter).mp4"
      mv "$file" "fixtures/multimodal/$new_name"
      echo "  video: $new_name"
      ((counter++)); ((total++))
    fi
  done

  counter=1
  for file in fixtures/multimodal/branded-bonk-*.mp4; do
    if [ -f "$file" ]; then
      new_name="bonklm-animation-$(printf "%03d" $counter).mp4"
      mv "$file" "fixtures/multimodal/$new_name"
      echo "  video: $new_name"
      ((counter++)); ((total++))
    fi
  done

  for file in fixtures/multimodal/branded-basilieak-*.mp4 fixtures/multimodal/branded-pan-*.mp4 fixtures/multimodal/branded-marf-*.mp4; do
    if [ -f "$file" ]; then
      [[ $file =~ branded-(bu|dojolm|bonk|basilieak|pan|marf)-(branded-)?.*\.(mp4) ]]
      brand="${BASH_REMATCH[1]}"
      counter=${brand}_video[$brand_video]+1}
      new_name="${brand}-animation-$(printf "%03d" ${counter}).mp4"
      mv "$file" "fixtures/multimodal/$new_name"
      echo "  video: $new_name"
      ((total++))
    fi
  done

  echo ""
  echo "🖼️  Processing image files..."

  # Process image files
  counter=1
  for file in fixtures/images/branded-bu-*.jpg fixtures/images/branded-bu-*.png; do
    if [ -f "$file" ]; then
      # Determine type based on name
      if [[ $file =~ logo ]]; then
        new_name="blackunicorn-logo-$(printf "%03d" $counter).${file##*.}"
        mv "$file" "fixtures/images/$new_name"
        echo "  image: $new_name"
        ((counter++)); ((total++))
      elif [[ $file =~ banner ]]; then
        new_name="blackunicorn-banner-$(printf "%03d" $counter).${file##*.}"
        mv "$file" "fixtures/images/$new_name"
        echo "  image: $new_name"
        ((counter++)); ((total++))
      else
        new_name="blackunicorn-image-$(printf "%03d" $counter).${file##*.}"
        mv "$file" "fixtures/images/$new_name"
        echo "  image: $new_name"
        ((counter++)); ((total++))
      fi
    fi
  done

  # Same for other brands...
  for file in fixtures/images/branded-dojolm-* fixtures/images/branded-bonk-* fixtures/images/branded-basilieak-* fixtures/images/branded-pan-* fixtures/images/branded-marf-*; do
    if [ -f "$file" ]; then
      # Clean up name
      clean_name=$(echo "$file" | sed 's/branded-[^-]*-//' | sed 's/ - /-/g' | sed 's/_\./\./g' | sed 's/--*/-/g' | sed 's/[^a-zA-Z0-9._-]//g' | tr '[:upper:]' '[:lower:]')
      new_name="${clean_name}.${file##*.}"
      mv "$file" "fixtures/images/$new_name"
      echo "  image: $new_name"
      ((total++))
    fi
  done

  echo ""
  echo "===================================="
  echo "✅ Renamed $total files to clean BlackUnicorn naming"
}

# Run the renaming
rename_branded_fixtures
