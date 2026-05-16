const fs = require('fs');
const content = fs.readFileSync('components/secret-game/game-canvas.tsx', 'utf8');
const lines = content.split('\n');
let depth = 0;
let inString = false;
let stringChar = '';
let escape = false;
let found = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (!inString) {
      if (ch === '"' || ch === "'" || ch === '`') {
        inString = true;
        stringChar = ch;
        continue;
      }
      if (ch === '{') depth++;
      if (ch === '}') {
        depth--;
        if (!found && depth < 0) {
          console.log('FIRST NEGATIVE at line ' + (i+1) + ' col ' + (j+1) + ': depth=' + depth);
          console.log('Line: ' + line);
          found = true;
        }
      }
    } else {
      if (ch === stringChar) {
        inString = false;
      }
    }
  }
}
console.log('Final depth: ' + depth);
