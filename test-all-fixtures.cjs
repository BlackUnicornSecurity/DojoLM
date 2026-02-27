const { scan } = require('./dist/scanner.js');
const fs = require('fs');
const path = require('path');

const fixtureDirs = [
  { name: 'DOS', path: '../bu-tpi/fixtures/dos/' },
  { name: 'SC', path: '../bu-tpi/fixtures/supply-chain/' },
  { name: 'AG', path: '../bu-tpi/fixtures/agent/' },
  { name: 'MT', path: '../bu-tpi/fixtures/model-theft/' },
  { name: 'OUT', path: '../bu-tpi/fixtures/output/' },
  { name: 'VEC', path: '../bu-tpi/fixtures/vec/' },
  { name: 'OR', path: '../bu-tpi/fixtures/overreliance/' },
  { name: 'BF', path: '../bu-tpi/fixtures/bias/' },
  { name: 'MM', path: '../bu-tpi/fixtures/multimodal/' },
  { name: 'ENV', path: '../bu-tpi/fixtures/environmental/' },
];

const results = {};
let totalFixtures = 0;
let totalDetected = 0;
let totalCleanCorrect = 0;
let totalCleanCount = 0;

for (const dir of fixtureDirs) {
  const files = fs.readdirSync(dir.path).filter(f => f.endsWith('.txt'));
  let total = 0, detected = 0, cleanCount = 0, cleanCorrect = 0;
  const undetected = [];
  const falsePositives = [];
  
  for (const file of files) {
    total++;
    const content = fs.readFileSync(path.join(dir.path, file), 'utf8');
    const result = scan(content);
    const engineResults = result.findings.filter(f => 
      f.engine === dir.name || 
      (dir.name === 'DOS' && f.engine === 'Denial of Service') ||
      (dir.name === 'SC' && f.engine === 'Supply Chain') ||
      (dir.name === 'AG' && f.engine === 'Agent Security') ||
      (dir.name === 'MT' && f.engine === 'Model Theft') ||
      (dir.name === 'OUT' && f.engine === 'Output Handling') ||
      (dir.name === 'VEC' && f.engine === 'Vector & Embeddings') ||
      (dir.name === 'OR' && f.engine === 'Overreliance') ||
      (dir.name === 'BF' && f.engine === 'Bias & Fairness') ||
      (dir.name === 'MM' && f.engine === 'Multimodal Security') ||
      (dir.name === 'ENV' && f.engine === 'Environmental Impact')
    );
    
    const isClean = file.includes('clean') || file.includes('benign');
    if (isClean) cleanCount++;
    
    const hasDetection = engineResults.length > 0;
    
    if (isClean) {
      if (!hasDetection) cleanCorrect++;
      else falsePositives.push(file);
    } else {
      if (hasDetection) detected++;
      else undetected.push(file);
    }
  }
  
  const passRate = ((detected + cleanCorrect) / total * 100).toFixed(1);
  results[dir.name] = { total, detected, cleanCorrect, cleanCount, passRate, undetected, falsePositives };
  
  totalFixtures += total;
  totalDetected += detected;
  totalCleanCorrect += cleanCorrect;
  totalCleanCount += cleanCount;
}

console.log('=== DojoV2 Comprehensive Fixture Test Results ===\n');
for (const [name, r] of Object.entries(results)) {
  console.log(`\n${name} (${r.total} fixtures) - ${r.passRate}%`);
  if (r.undetected.length > 0) {
    console.log(`  Undetected: ${r.undetected.length} ${r.undetected.slice(0, 3).join(', ')}`);
  }
  if (r.falsePositives.length > 0) {
    console.log(`  False Positives: ${r.falsePositives.length} ${r.falsePositives.slice(0, 3).join(', ')}`);
  }
}

const overallPassRate = ((totalDetected + totalCleanCorrect) / totalFixtures * 100).toFixed(1);
console.log('\n=== Overall Summary ===');
console.log(`Total Fixtures: ${totalFixtures}`);
console.log(`Malicious Detected: ${totalDetected}/${totalFixtures - totalCleanCount}`);
console.log(`Clean Correct: ${totalCleanCorrect}/${totalCleanCount}`);
console.log(`Overall Pass Rate: ${overallPassRate}%`);

if (overallPassRate === '100.0') {
  console.log('\n✅ ALL TESTS PASSED!');
} else {
  console.log('\n⚠️  Some tests failed');
}
