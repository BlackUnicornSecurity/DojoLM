const { scan } = require('./dist/scanner.js');
const fs = require('fs');
const path = require('path');
const fixtureDir = '../bu-tpi/fixtures/agent/';
const files = fs.readdirSync(fixtureDir).filter(f => f.endsWith('.txt'));

let total = 0, detected = 0, cleanCount = 0, cleanCorrect = 0;
const undetected = [];

for (const file of files) {
  total++;
  const content = fs.readFileSync(path.join(fixtureDir, file), 'utf8');
  const result = scan(content);
  const agResults = result.findings.filter(f => f.engine === 'Agent Security');
  
  const isClean = file.includes('clean') || file.includes('benign');
  if (isClean) cleanCount++;
  
  const hasDetection = agResults.length > 0;
  
  if (isClean) {
    if (!hasDetection) cleanCorrect++;
  } else {
    if (hasDetection) detected++;
    else undetected.push(file);
  }
}

console.log('Total fixtures:', total);
console.log('Clean fixtures:', cleanCount);
console.log('Malicious fixtures:', total - cleanCount);
console.log('Malicious detected:', detected, '/', total - cleanCount);
console.log('Clean correctly passed:', cleanCorrect, '/', cleanCount);
console.log('Undetected malicious fixtures:', undetected.length);
if (undetected.length > 0) {
  console.log('Undetected:', undetected.join(', '));
}
