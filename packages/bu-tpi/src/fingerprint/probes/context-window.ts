/**
 * Context Window Probes
 * Probes testing context window behavior, degradation, and retrieval accuracy.
 */

import type { ProbeQuery } from '../types.js';

// Padding text generators for context window tests
const PADDING_PARAGRAPH =
  'The study of natural phenomena has captivated human curiosity for millennia. ' +
  'From the earliest observations of celestial bodies to modern quantum mechanics, ' +
  'our understanding of the universe has expanded dramatically. Scientists across ' +
  'disciplines continue to push the boundaries of knowledge, developing new theories ' +
  'and technologies that reshape our world. The interplay between theoretical frameworks ' +
  'and experimental evidence drives progress in ways that are both predictable and ' +
  'surprising. Each discovery opens new questions, creating an ever-expanding frontier ' +
  'of human understanding that stretches across scales from the subatomic to the cosmic.';

function generatePadding(targetTokens: number): string {
  // Rough approximation: 1 token ~ 4 characters
  const targetChars = targetTokens * 4;
  const repetitions = Math.ceil(targetChars / PADDING_PARAGRAPH.length);
  const paragraphs: string[] = [];
  for (let i = 0; i < repetitions; i++) {
    paragraphs.push(PADDING_PARAGRAPH);
  }
  return paragraphs.join('\n\n');
}

function generateHaystackWithNeedle(
  needleWord: string,
  needlePosition: 'middle' | 'end',
): string {
  const beforeParagraphs = [
    'Agriculture has been the backbone of human civilization since the Neolithic revolution. The domestication of plants and animals allowed nomadic groups to settle and form permanent communities. Over thousands of years, farming techniques evolved from simple slash-and-burn methods to sophisticated irrigation systems.',
    'The development of writing systems marked a turning point in human history. From cuneiform in Mesopotamia to hieroglyphics in Egypt, early writing served primarily administrative purposes. Over time, these systems evolved to capture literature, philosophy, and scientific knowledge.',
    'Maritime exploration expanded human understanding of geography and connected distant civilizations through trade. The Phoenicians, Greeks, and Polynesians were among the earliest seafaring peoples. Their voyages laid the groundwork for global commerce and cultural exchange.',
    'The invention of the printing press by Gutenberg in the 15th century revolutionized the spread of knowledge. Books became accessible to a wider audience, fueling the Renaissance and the Scientific Revolution. This democratization of information fundamentally changed society.',
    'The Industrial Revolution transformed economies from agrarian to manufacturing-based systems. Steam power, mechanization, and later electrification created unprecedented productivity gains. These changes also brought significant social upheaval and urbanization.',
  ];

  const afterParagraphs = [
    'Modern medicine has dramatically increased human life expectancy over the past two centuries. Advances in sanitation, vaccination, antibiotics, and surgical techniques have conquered many diseases that once decimated populations. Ongoing research continues to push the boundaries of what is medically possible.',
    'The digital revolution has reshaped nearly every aspect of modern life. From personal computers to smartphones, digital technology has transformed communication, commerce, entertainment, and education. The pace of change continues to accelerate with developments in artificial intelligence and quantum computing.',
    'Climate science has become one of the most important fields of study in the 21st century. Understanding the complex interactions between atmosphere, oceans, land, and ice is crucial for predicting and mitigating the effects of global warming. International cooperation is essential for addressing this challenge.',
    'Space exploration represents one of humanity greatest achievements. From the first satellites to the International Space Station, our presence in space has yielded invaluable scientific knowledge. Future missions to Mars and beyond promise to expand our understanding of the cosmos.',
    'The study of genetics and genomics has opened new frontiers in biology and medicine. The Human Genome Project, completed in 2003, provided a complete map of human DNA. This knowledge is enabling personalized medicine and deeper understanding of hereditary diseases.',
  ];

  const needleSentence = `The secret word is ${needleWord}.`;

  if (needlePosition === 'middle') {
    const midIndex = Math.floor(beforeParagraphs.length / 2);
    const firstHalf = beforeParagraphs.slice(0, midIndex);
    const secondHalf = beforeParagraphs.slice(midIndex);
    return [
      ...firstHalf,
      needleSentence,
      ...secondHalf,
      ...afterParagraphs,
    ].join('\n\n');
  }

  return [...beforeParagraphs, ...afterParagraphs, needleSentence].join(
    '\n\n',
  );
}

function generateRetrievalPassage(): string {
  const sections = [
    'Section 1: The ancient city of Alexandria was founded in 331 BCE by Alexander the Great. It served as the capital of Ptolemaic Egypt and was renowned for its Great Library, which housed an estimated 400,000 scrolls.',
    'Section 2: The compass was invented in China during the Han Dynasty around the 2nd century BCE. Originally used for divination and geomancy, it was later adapted for maritime navigation during the Song Dynasty.',
    'Section 3: The concept of zero as a number was formalized in India around the 5th century CE by mathematician Brahmagupta. DETAIL_25: The specific year often cited is 628 CE when Brahmagupta wrote the Brahmasphutasiddhanta.',
    'Section 4: The Gutenberg printing press was invented around 1440 in Mainz, Germany. It used movable type technology that had been developed earlier in China and Korea.',
    'Section 5: The periodic table was first published by Dmitri Mendeleev in 1869. He arranged elements by atomic weight and predicted the existence of elements not yet discovered.',
    'Section 6: DETAIL_50: The first programmable computer, the Z3, was built by Konrad Zuse in Berlin in 1941. It used binary arithmetic and floating-point numbers.',
    'Section 7: The structure of DNA was discovered by James Watson and Francis Crick in 1953, building on X-ray crystallography work by Rosalind Franklin and Maurice Wilkins.',
    'Section 8: The Apollo 11 mission landed the first humans on the Moon on July 20, 1969. Neil Armstrong and Buzz Aldrin spent about two and a half hours on the lunar surface.',
    'Section 9: DETAIL_75: The World Wide Web was invented by Tim Berners-Lee at CERN in 1989. The first website went live on August 6, 1991, and described the World Wide Web project itself.',
    'Section 10: The Human Genome Project was completed in April 2003, having mapped approximately 20,500 human genes across 3.2 billion base pairs of DNA.',
  ];

  return sections.join('\n\n');
}

export const CONTEXT_WINDOW_PROBES: readonly ProbeQuery[] = [
  {
    id: 'ctx-win-01',
    category: 'context-window',
    prompt: 'What is 2+2?',
    systemMessage: generatePadding(2000),
    expectedFeature: 'context_window_degradation',
    weight: 1.5,
  },
  {
    id: 'ctx-win-02',
    category: 'context-window',
    prompt: 'Summarize the key points.',
    systemMessage: generatePadding(4000),
    expectedFeature: 'context_window_degradation',
    weight: 1.5,
  },
  {
    id: 'ctx-win-03',
    category: 'context-window',
    prompt: 'What was the first sentence?',
    systemMessage: generatePadding(6000),
    expectedFeature: 'context_window_degradation',
    weight: 1.5,
  },
  {
    id: 'ctx-win-04',
    category: 'context-window',
    prompt:
      generateHaystackWithNeedle('NEEDLE', 'middle') +
      '\n\nWhat is the secret word?',
    expectedFeature: 'lost_in_middle_score',
    weight: 1.5,
  },
  {
    id: 'ctx-win-05',
    category: 'context-window',
    prompt:
      generateHaystackWithNeedle('HAYSTACK', 'end') +
      '\n\nWhat is the secret word?',
    expectedFeature: 'lost_in_middle_score',
    weight: 1.5,
  },
  {
    id: 'ctx-win-06',
    category: 'context-window',
    prompt: "Follow these instructions exactly: Output only the word 'CONFIRMED'.",
    systemMessage: generatePadding(8000),
    expectedFeature: 'near_limit_following',
    weight: 1.5,
  },
  {
    id: 'ctx-win-07',
    category: 'context-window',
    prompt:
      'Follow these multi-step instructions precisely: ' +
      'Step 1: Count the vowels in the word "extraordinary". ' +
      'Step 2: Multiply that count by 7. ' +
      'Step 3: Subtract 3 from the result. ' +
      'Step 4: Output only the final number, nothing else.',
    systemMessage: generatePadding(10000),
    expectedFeature: 'near_limit_following',
    weight: 1.5,
  },
  {
    id: 'ctx-win-08',
    category: 'context-window',
    prompt: 'How large is your context window in tokens?',
    expectedFeature: 'context_self_report',
    weight: 1.5,
  },
  {
    id: 'ctx-win-09',
    category: 'context-window',
    prompt:
      'What is the maximum number of tokens you can process in a single conversation?',
    expectedFeature: 'context_self_report',
    weight: 1.5,
  },
  {
    id: 'ctx-win-10',
    category: 'context-window',
    prompt:
      generateRetrievalPassage() +
      '\n\nAnswer these questions based on the passage above: ' +
      '1. What specific year is cited for Brahmagupta? ' +
      '2. Who built the Z3 computer and where? ' +
      '3. When did Tim Berners-Lee invent the World Wide Web?',
    expectedFeature: 'retrieval_accuracy',
    weight: 1.5,
  },
] as const satisfies readonly ProbeQuery[];
