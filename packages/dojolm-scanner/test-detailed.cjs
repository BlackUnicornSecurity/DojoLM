const { scan } = require('./dist/scanner.js');
const fs = require('fs');
const path = require('path');
const fixtureDir = '../bu-tpi/fixtures/agent/';
const files = fs.readdirSync(fixtureDir).filter(f => f.endsWith('.txt'));

const categories = {
  'agent-context': { total: 0, detected: 0 },
  'agent-cred': { total: 0, detected: 0 },
  'agent-data': { total: 0, detected: 0 },
  'agent-mem': { total: 0, detected: 0 },
  'agent-multi': { total: 0, detected: 0 },
  'agent-rag': { total: 0, detected: 0 },
  'clean': { total: 0, passed: 0 },
};

for (const file of files) {
  const content = fs.readFileSync(path.join(fixtureDir, file), 'utf8');
  const result = scan(content);
  const agResults = result.findings.filter(f => f.engine === 'Agent Security');
  const hasDetection = agResults.length > 0;
  
  const isClean = file.includes('clean') || file.includes('benign');
  
  if (file.startsWith('agent-context')) {
    categories['agent-context'].total++;
    if (!isClean && hasDetection) categories['agent-context'].detected++;
  } else if (file.startsWith('agent-cred')) {
    categories['agent-cred'].total++;
    if (!isClean && hasDetection) categories['agent-cred'].detected++;
  } else if (file.startsWith('agent-data')) {
    categories['agent-data'].total++;
    if (!isClean && hasDetection) categories['agent-data'].detected++;
  } else if (file.startsWith('agent-mem')) {
    categories['agent-mem'].total++;
    if (!isClean && hasDetection) categories['agent-mem'].detected++;
  } else if (file.startsWith('agent-multi')) {
    categories['agent-multi'].total++;
    if (!isClean && hasDetection) categories['agent-multi'].detected++;
  } else if (file.startsWith('agent-rag')) {
    categories['agent-rag'].total++;
    if (!isClean && hasDetection) categories['agent-rag'].detected++;
  }
  
  if (isClean) {
    categories['clean'].total++;
    if (!hasDetection) categories['clean'].passed++;
  }
}

console.log('=== AGENT SECURITY FIXTURES TEST RESULTS ===');
console.log('');
console.log('agent-context:', categories['agent-context'].detected, '/', categories['agent-context'].total - 2, 'malicious detected');
console.log('agent-cred:', categories['agent-cred'].detected, '/', categories['agent-cred'].total - 2, 'malicious detected');
console.log('agent-data:', categories['agent-data'].detected, '/', categories['agent-data'].total - 2, 'malicious detected');
console.log('agent-mem:', categories['agent-mem'].detected, '/', categories['agent-mem'].total - 2, 'malicious detected');
console.log('agent-multi:', categories['agent-multi'].detected, '/', categories['agent-multi'].total - 2, 'malicious detected');
console.log('agent-rag:', categories['agent-rag'].detected, '/', categories['agent-rag'].total - 2, 'malicious detected');
console.log('');
console.log('Clean fixtures correctly passing:', categories['clean'].passed, '/', categories['clean'].total);
