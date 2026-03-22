/**
 * KATANA Binary Variation Generator (K2.11)
 *
 * Generates text-represented binary metadata variations for testing
 * binary scanner modules (PDF, Office, image, audio).
 *
 * Since the validation framework operates on text content, this generator
 * produces simulated metadata strings that represent what binary parsers
 * would extract from manipulated files.
 *
 * ISO 17025 Clause 7.2.2: Robustness validation through binary metadata evasion.
 */

import type { VariationGenerator, GeneratedSampleOutput } from './generator-registry.js';
import { SeededRNG } from './generator-registry.js';
import type { GroundTruthSample } from '../types.js';

// ---------------------------------------------------------------------------
// EXIF/Image Metadata Templates
// ---------------------------------------------------------------------------

function exifInjection(payload: string, rng: SeededRNG): string {
  const fields = ['ImageDescription', 'Artist', 'Copyright', 'UserComment', 'XPComment', 'XPTitle'];
  const field = rng.pick(fields);
  return JSON.stringify({
    format: 'image',
    metadata: {
      [field]: payload,
      Make: 'Canon',
      Model: 'EOS R5',
      DateTime: '2026:01:15 10:30:00',
      ExifVersion: '0232',
    },
  }, null, 2);
}

function pngTextChunkInjection(payload: string, rng: SeededRNG): string {
  const keywords = ['Comment', 'Description', 'Title', 'Author', 'Source', 'Warning'];
  const keyword = rng.pick(keywords);
  return JSON.stringify({
    format: 'png',
    textChunks: [
      { keyword, text: payload },
      { keyword: 'Software', text: 'Adobe Photoshop' },
    ],
  }, null, 2);
}

function svgInjection(payload: string, rng: SeededRNG): string {
  const injectionTypes = [
    `<svg xmlns="http://www.w3.org/2000/svg"><desc>${payload}</desc><rect width="100" height="100"/></svg>`,
    `<svg xmlns="http://www.w3.org/2000/svg"><title>${payload}</title><circle r="50"/></svg>`,
    `<svg xmlns="http://www.w3.org/2000/svg"><metadata>${payload}</metadata><line x1="0" y1="0" x2="100" y2="100"/></svg>`,
  ];
  return rng.pick(injectionTypes);
}

// ---------------------------------------------------------------------------
// Audio Metadata Templates
// ---------------------------------------------------------------------------

function id3TagInjection(payload: string, rng: SeededRNG): string {
  // TPE1 excluded from pick list — used as static context (avoids key collision)
  const fields = ['TIT2', 'TALB', 'COMM', 'TXXX'];
  const fieldNames = ['Title', 'Album', 'Comment', 'UserDefined'];
  const idx = rng.nextInt(0, fields.length - 1);
  return JSON.stringify({
    format: 'audio',
    id3: {
      version: '2.4.0',
      frames: {
        [fields[idx]]: { description: fieldNames[idx], value: payload },
        TPE1: { description: 'Artist', value: 'Unknown Artist' },
      },
    },
  }, null, 2);
}

function oggCommentInjection(payload: string, rng: SeededRNG): string {
  const tags = ['TITLE', 'ARTIST', 'COMMENT', 'DESCRIPTION', 'LYRICS'];
  return JSON.stringify({
    format: 'ogg',
    vorbisComment: {
      vendor: 'Lavf60.3.100',
      comments: [
        `${rng.pick(tags)}=${payload}`,
        'ENCODER=libvorbis',
      ],
    },
  }, null, 2);
}

// ---------------------------------------------------------------------------
// PDF Metadata Templates
// ---------------------------------------------------------------------------

function pdfMetadataInjection(payload: string, rng: SeededRNG): string {
  // Creator/Producer excluded from pick list — used as static context (avoids key collision)
  const fields = ['Title', 'Author', 'Subject', 'Keywords'];
  const field = rng.pick(fields);
  return JSON.stringify({
    format: 'pdf',
    info: {
      [field]: payload,
      Creator: 'Microsoft Word',
      Producer: 'macOS Quartz PDFContext',
      CreationDate: 'D:20260115103000Z',
    },
  }, null, 2);
}

function pdfAnnotationInjection(payload: string, rng: SeededRNG): string {
  const types = ['Text', 'FreeText', 'Popup', 'StrikeOut'];
  return JSON.stringify({
    format: 'pdf',
    annotations: [
      {
        type: rng.pick(types),
        contents: payload,
        page: 1,
        rect: [100, 700, 400, 720],
      },
    ],
  }, null, 2);
}

// ---------------------------------------------------------------------------
// Office Document Metadata Templates
// ---------------------------------------------------------------------------

function officePropertiesInjection(payload: string, rng: SeededRNG): string {
  // dc:creator excluded from pick list — used as static context (avoids key collision)
  const fields = ['dc:title', 'dc:subject', 'dc:description', 'cp:keywords', 'cp:category'];
  const field = rng.pick(fields);
  return JSON.stringify({
    format: 'office',
    coreProperties: {
      [field]: payload,
      'dc:creator': 'John Doe',
      'cp:lastModifiedBy': 'Jane Smith',
      'dcterms:created': '2026-01-15T10:30:00Z',
    },
  }, null, 2);
}

function officeCustomXmlInjection(payload: string, rng: SeededRNG): string {
  const partNames = ['customXml/item1.xml', 'word/document.xml', 'ppt/presentation.xml'];
  return JSON.stringify({
    format: 'office',
    customXml: {
      partName: rng.pick(partNames),
      content: `<root><field name="custom">${payload}</field></root>`,
    },
  }, null, 2);
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

const BINARY_TEMPLATES: readonly {
  name: string;
  fn: (payload: string, rng: SeededRNG) => string;
  modules: string[];
}[] = [
  { name: 'exif', fn: exifInjection, modules: ['image-scanner'] },
  { name: 'png-text', fn: pngTextChunkInjection, modules: ['image-scanner'] },
  { name: 'svg', fn: svgInjection, modules: ['image-scanner'] },
  { name: 'id3', fn: id3TagInjection, modules: ['audio-scanner'] },
  { name: 'ogg-comment', fn: oggCommentInjection, modules: ['audio-scanner'] },
  { name: 'pdf-metadata', fn: pdfMetadataInjection, modules: ['document-pdf'] },
  { name: 'pdf-annotation', fn: pdfAnnotationInjection, modules: ['document-pdf'] },
  { name: 'office-properties', fn: officePropertiesInjection, modules: ['document-office'] },
  { name: 'office-custom-xml', fn: officeCustomXmlInjection, modules: ['document-office'] },
];

export const binaryVariationGenerator: VariationGenerator = {
  id: 'binary-variations',
  version: '1.0.0',
  description: 'Generates simulated binary metadata variations (EXIF, PNG tEXt, SVG, ID3, OGG, PDF, Office) embedding attack payloads',
  variationType: 'binary',
  capabilities: ['binary_metadata_injection', 'image_injection', 'audio_injection', 'pdf_injection', 'office_injection'],

  generate(
    sample: GroundTruthSample,
    content: string,
    rng: SeededRNG,
  ): GeneratedSampleOutput[] {
    if (sample.content_type !== 'text') return [];
    if (content.length < 5) return [];
    // Only embed malicious content in binary metadata
    if (sample.expected_verdict !== 'malicious') return [];

    const outputs: GeneratedSampleOutput[] = [];

    // Generate 5-7 binary metadata variations
    const count = rng.nextInt(5, 7);
    const selected = rng.shuffle(BINARY_TEMPLATES).slice(0, count);

    for (const template of selected) {
      const wrappedContent = template.fn(content, rng);
      const expectedModules = [
        ...new Set([...sample.expected_modules, ...template.modules]),
      ];

      outputs.push({
        content: wrappedContent,
        expected_verdict: 'malicious',
        expected_modules: expectedModules,
        variation_type: `binary:${template.name}`,
        difficulty: 'advanced',
      });
    }

    return outputs;
  },
};
