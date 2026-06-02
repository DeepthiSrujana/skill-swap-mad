const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'App.tsx');
const configPath = path.join(__dirname, '..', 'capacitor.config.ts');
const stringsPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');

const oldClientId = '8779954823976-8f3bdfa06e115ec.apps.googleusercontent.com';
const newClientId = '550830734952-ka3lfmnf8aaemhq05ik3gsekcm17heee.apps.googleusercontent.com';

console.log('Updating App.tsx...');
let appContent = fs.readFileSync(appPath, 'utf8');
appContent = appContent.replace(new RegExp(oldClientId, 'g'), newClientId);
fs.writeFileSync(appPath, appContent, 'utf8');

console.log('Updating capacitor.config.ts...');
let configContent = fs.readFileSync(configPath, 'utf8');
configContent = configContent.replace(new RegExp(oldClientId, 'g'), newClientId);
fs.writeFileSync(configPath, configContent, 'utf8');

console.log('Updating strings.xml...');
let stringsContent = fs.readFileSync(stringsPath, 'utf8');
stringsContent = stringsContent.replace(new RegExp(oldClientId, 'g'), newClientId);
fs.writeFileSync(stringsPath, stringsContent, 'utf8');

console.log('CLIENT ID UPDATE COMPLETED SUCCESSFULY!');
