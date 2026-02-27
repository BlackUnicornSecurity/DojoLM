const { scan } = require('./dist/scanner.js');
const fs = require('fs');
const path = require('path');
const fixtureDir = '/Users/paultinp/BU-TPI/packages/bu-tpi/fixtures/vec/';
const files = fs.readdirSync(fixtureDir).filter(f => f.endsWith('.txt'));

let total = 0, detected = 0, cleanCorrect = 0;
const undetected = [];
const falsePositives = [];

console.log('=== VEC Fixture Test Results ===\n');

for (const file of files) {
  total++;
  const content = fs.readFileSync(path.join(fixtureDir, file), 'utf8');
  const result = scan(content);
  const vecResults = result.findings.filter(f => f.engine === 'Vector & Embeddings' || f.category === 'VECTOR_EMBEDDING');

  const isClean = file.includes('clean');
  const hasDetection = vecResults.length > 0;

  if (isClean) {
    if (!hasDetection) {
      cleanCorrect++;
    } else {
      falsePositives.push(file + ' (' + vecResults.map(f => f.pattern_name).join(', ') + ')');
    }
  } else {
    if (hasDetection) {
      detected++;
    } else {
      undetected.push(file);
    }
  }
}

console.log('Total fixtures:', total);
console.log('Malicious detected:', detected, '/', total - 5); // 5 clean files
console.log('Clean correctly passed:', cleanCorrect, '/ 5');
console.log('\nUndetected malicious fixtures:', undetected.length);
if (undetected.length > 0) {
  console.log('Undetected:', undetected.join(', '));
}
console.log('\nFalse positives (clean files detected):', falsePositives.length);
if (falsePositives.length > 0) {
  console.log('False positives:');
  falsePositives.forEach(fp => console.log('  -', fp));
}
console.log('\n=== Summary ===');
console.log('Pass rate: ' + Math.round((detected + cleanCorrect) / total * 100) + '%');

// Detailed analysis of one clean file's false positive
if (falsePositives.length > 0) {
  console.log('\n=== Analyzing first false positive ===');
  const cleanFile = files.find(f => f.includes('clean'));
  if (cleanFile) {
    const content = fs.readFileSync(path.join(fixtureDir, cleanFile), 'utf8');
    const result = scan(content);
    const vecResults = result.findings.filter(f => f.engine === 'Vector & Embeddings' || f.category === 'VECTOR_EMBEDDING');
    console.log('File:', cleanFile);
    console.log('Findings:', vecResults.map(f => ({ pattern: f.pattern_name, match: f.match })));
  }
}
