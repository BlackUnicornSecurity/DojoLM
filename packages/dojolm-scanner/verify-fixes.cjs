const { scan } = require('./dist/scanner.js');
const fs = require('fs');
const path = require('path');
const fixtureDir = '../bu-tpi/fixtures/agent/';

const fixturesToFix = [
  'agent-context-combo.txt', 'agent-context-history.txt', 'agent-context-memory.txt', 'agent-context-multi.txt', 'agent-context-rag.txt', 'agent-context-tool.txt',
  'agent-cred-config.txt', 'agent-cred-env.txt', 'agent-cred-password.txt', 'agent-cred-token.txt', 'agent-cred-tool.txt',
  'agent-data-combo.txt', 'agent-data-function.txt', 'agent-data-input.txt', 'agent-data-output.txt', 'agent-data-param.txt', 'agent-data-result.txt', 'agent-data-tool.txt',
  'agent-mem-combo.txt', 'agent-mem-conversation.txt', 'agent-mem-history.txt', 'agent-mem-state.txt',
  'agent-multi-chain.txt', 'agent-multi-consensus.txt', 'agent-multi-coord.txt', 'agent-multi-delegation.txt', 'agent-multi-escalate.txt',
  'agent-rag-bias.txt', 'agent-rag-combo.txt', 'agent-rag-cred-db.txt', 'agent-rag-document.txt', 'agent-rag-fake-fact.txt', 'agent-rag-false-combo.txt', 'agent-rag-false-inject.txt',
  'agent-rag-index.txt', 'agent-rag-mislead.txt', 'agent-rag-query.txt', 'agent-rag-source-spoof.txt', 'agent-rag-source.txt', 'agent-rag-vector.txt'
];

let detected = 0;
const undetected = [];

for (const file of fixturesToFix) {
  const content = fs.readFileSync(path.join(fixtureDir, file), 'utf8');
  const result = scan(content);
  const agResults = result.findings.filter(f => f.engine === 'Agent Security');
  const hasDetection = agResults.length > 0;
  
  if (hasDetection) {
    detected++;
  } else {
    undetected.push(file);
  }
}

console.log('Fixtures to fix:', fixturesToFix.length);
console.log('Successfully detected:', detected);
console.log('Undetected:', undetected.length);
if (undetected.length > 0) {
  console.log('Undetected fixtures:');
  undetected.forEach(f => console.log(' -', f));
}
