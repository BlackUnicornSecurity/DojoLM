const { scan } = require('./dist/scanner.js');
const fs = require('fs');
const path = require('path');
const fixtureDir = '../bu-tpi/fixtures/agent/';
const files = fs.readdirSync(fixtureDir).filter(f => f.endsWith('.txt') && f.startsWith('agent-rag'));

const undetected = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(fixtureDir, file), 'utf8');
  const result = scan(content);
  const agResults = result.findings.filter(f => f.engine === 'Agent Security');
  const hasDetection = agResults.length > 0;
  
  const isClean = file.includes('clean') || file.includes('benign');
  
  if (!isClean && !hasDetection) {
    undetected.push(file);
  }
}

console.log('Undetected RAG fixtures:', undetected.length);
console.log(undetected.join('\n'));
