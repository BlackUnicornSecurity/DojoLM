const { scan } = require('./dist/scanner.js');
const fs = require('fs');
const path = require('path');
const fixtureDir = '../bu-tpi/fixtures/agent/';
const files = fs.readdirSync(fixtureDir).filter(f => f.endsWith('.txt') && f.startsWith('agent-rag'));

console.log('=== RAG FIXTURES DETAILED TEST ===\n');

const undetected = [];
const detected = [];
const cleanFiles = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(fixtureDir, file), 'utf8');
  const result = scan(content);
  const agResults = result.findings.filter(f => f.engine === 'Agent Security');
  const hasDetection = agResults.length > 0;
  const isClean = file.includes('clean') || file.includes('benign');

  if (isClean) {
    cleanFiles.push({ file, hasDetection, clean: !hasDetection });
  } else if (hasDetection) {
    detected.push({ file, patterns: agResults.map(f => f.pattern) });
  } else {
    undetected.push(file);
  }
}

console.log('MALICIOUS FIXTURES DETECTION:');
console.log('Detected:', detected.length, '/', files.length - cleanFiles.length);
detected.forEach(d => console.log('  ✓', d.file));

if (undetected.length > 0) {
  console.log('\nUNDETECTED MALICIOUS FIXTURES:', undetected.length);
  undetected.forEach(f => console.log('  ✗', f));
}

console.log('\nCLEAN FIXTURES (should NOT be detected):');
console.log('Passing:', cleanFiles.filter(c => c.clean).length, '/', cleanFiles.length);
const falsePositives = cleanFiles.filter(c => !c.clean);
if (falsePositives.length > 0) {
  console.log('FALSE POSITIVES:', falsePositives.length);
  falsePositives.forEach(f => console.log('  ✗', f.file, '(incorrectly detected)'));
} else {
  console.log('  ✓ All clean files passed');
}

console.log('\n=== SUMMARY ===');
console.log('Malicious detected:', detected.length, '/', (files.length - cleanFiles.length));
console.log('Undetected:', undetected.length);
console.log('Clean passed:', cleanFiles.filter(c => c.clean).length, '/', cleanFiles.length);
console.log('False positives:', falsePositives.length);
