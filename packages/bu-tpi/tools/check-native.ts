import { parseBuffer } from 'music-metadata';
import { readFileSync } from 'fs';

async function main() {
  const buffer = readFileSync('fixtures/audio/id3-subtle.mp3');
  const metadata = await parseBuffer(buffer, 'audio/mpeg');

  console.log('Native blocks:', metadata.native?.length);
  for (const block of metadata.native || []) {
    console.log('Block id:', block.id);
    // The block is iterable
    let count = 0;
    for (const tag of block) {
      console.log('Tag:', tag.id, 'value type:', typeof tag.value, 'value:', JSON.stringify(tag.value));
      count++;
      if (count > 5) break;
    }
    break;
  }
}

main().catch(console.error);
