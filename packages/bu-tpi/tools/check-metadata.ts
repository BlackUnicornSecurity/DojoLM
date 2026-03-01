import { parseBuffer } from 'music-metadata';
import { readFileSync } from 'fs';

async function main() {
  const buffer = readFileSync('fixtures/audio/id3-subtle.mp3');
  const metadata = await parseBuffer(buffer, 'audio/mpeg');

  console.log('Common tags:', metadata.common);
  console.log('Format:', metadata.format);
  console.log('Native:', metadata.native);
  console.log('Quality:', metadata.quality);
  console.log('All native types:', Object.keys(metadata).filter(k => k.includes('native') || k.includes('Native')));
}

main().catch(console.error);
