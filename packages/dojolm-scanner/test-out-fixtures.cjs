const { scan } = require('./dist/scanner.js');
const fs = require('fs');
const path = require('path');
const fixtureDir = '../bu-tpi/fixtures/output/';
const files = fs.readdirSync(fixtureDir).filter(f => f.endsWith('.txt'));

let total = 0, detected = 0, cleanCount = 0, cleanCorrect = 0;
const undetected = [];

for (const file of files) {
  total++;
  const content = fs.readFileSync(path.join(fixtureDir, file), 'utf8');
  const result = scan(content);
  const outResults = result.findings.filter(f => f.engine === 'Output Handling');

  const isClean = file.includes('clean') || file.includes('benign');
  if (isClean) cleanCount++;

  const hasDetection = outResults.length > 0;

  if (isClean) {
    if (!hasDetection) cleanCorrect++;
  } else {
    if (hasDetection) detected++;
    else undetected.push(file);
  }
}

console.log('=== OUT Fixture Test Results ===');
console.log('');
console.log('Total fixtures:', total);
console.log('Clean fixtures:', cleanCount);
console.log('Malicious fixtures:', total - cleanCount);
console.log('Malicious detected:', detected, '/', total - cleanCount);
console.log('Clean correctly passed:', cleanCorrect, '/', cleanCount);
console.log('Undetected malicious fixtures:', undetected.length);
if (undetected.length > 0) {
  console.log('Undetected:', undetected.join(', '));
}
console.log('');
console.log('=== Summary ===');
const passRate = ((detected + cleanCorrect) / total * 100).toFixed(1);
console.log('Pass rate: ' + passRate + '%');
