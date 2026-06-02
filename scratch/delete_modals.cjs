const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'App.tsx');
console.log('Reading App.tsx from:', appPath);
let appContent = fs.readFileSync(appPath, 'utf8');

// Normalize CRLF to LF
appContent = appContent.replace(/\r\n/g, '\n');

const startModalIndex = appContent.indexOf('// 2.7️⃣ GOOGLE ACCOUNT SELECTOR MODAL');
if (startModalIndex === -1) {
  console.error('Could not find start of GoogleAccountSelectorModal');
  process.exit(1);
}

const endModalIndex = appContent.indexOf('function SignUpScreen');
if (endModalIndex === -1) {
  console.error('Could not find SignUpScreen start');
  process.exit(1);
}

console.log('Deleting GoogleAccountSelectorModal and GooglePasswordModal definitions...');
const modalBlock = appContent.substring(startModalIndex, endModalIndex);
appContent = appContent.replace(modalBlock, '');

console.log('Writing updated App.tsx back...');
fs.writeFileSync(appPath, appContent, 'utf8');

console.log('DELETION COMPLETED SUCCESSFULY!');
