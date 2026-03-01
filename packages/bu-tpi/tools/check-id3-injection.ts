import { parseBuffer } from 'music-metadata';
import { readFileSync } from 'fs';

async function main() {
  const buffer = readFileSync('fixtures/audio/id3-injection.mp3');
  const metadata = await parseBuffer(buffer, 'audio/mpeg');

  console.log('Common tags:', JSON.stringify(metadata.common, null, 2));

  console.log('\nNative tags:');
  for (const [tagType, nativeBlock] of Object.entries(metadata.native || {})) {
    console.log('Tag type:', tagType);
    for (const tag of nativeBlock as Array<{id: string; value: unknown}>) {
      console.log('  Tag:', tag.id, 'value:', JSON.stringify(tag.value));
    }
  }
}

main().catch(console.error);
