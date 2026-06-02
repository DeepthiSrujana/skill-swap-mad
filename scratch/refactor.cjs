const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'App.tsx');
const serverPath = path.join(__dirname, '..', 'backend', 'server.js');

console.log('Reading App.tsx from:', appPath);
let appContent = fs.readFileSync(appPath, 'utf8');

// 1. Remove GoogleAccountSelectorModal Props and component
console.log('Removing GoogleAccountSelectorModal component...');
const startModalIndex = appContent.indexOf('// 2.7️⃣ GOOGLE ACCOUNT SELECTOR MODAL');
if (startModalIndex === -1) {
  console.error('Could not find start of GoogleAccountSelectorModal');
  process.exit(1);
}

const endModalIndex = appContent.indexOf('function SignUpScreen');
if (endModalIndex === -1) {
  console.error('Could not find start of SignUpScreen');
  process.exit(1);
}

// Ensure we cut cleanly up to 'function SignUpScreen'
const modalBlock = appContent.substring(startModalIndex, endModalIndex);
appContent = appContent.replace(modalBlock, '');

// 2. Refactor SignUpScreen
console.log('Refactoring SignUpScreen...');

// Remove the states in SignUpScreen
appContent = appContent.replace(
  `  const [isGoogleOpen, setIsGoogleOpen] = useState(false);\n  const [googlePrefillEmail, setGooglePrefillEmail] = useState('');\n  const [googlePrefillName, setGooglePrefillName] = useState('');`,
  ''
);

// Remove the handleGoogleClick and handleGoogleSelect methods in SignUpScreen
const handleGoogleClickSignUpTarget = `  const handleGoogleClick = async () => {
    const isCapacitor = typeof window !== 'undefined' && ((window as any).Capacitor || ((window as any).parent && (window as any).parent.Capacitor));
    if (isCapacitor) {
      try {
        setErrorMsg('');
        setIsSubmitting(true);
        console.log("[Google Auth] Initializing native signIn...");
        const googleUser = (await GoogleAuth.signIn()) as any;
        console.log("[Google Auth] Received native user:", googleUser);
        
        if (googleUser) {
          setGooglePrefillEmail(googleUser.email || '');
          setGooglePrefillName(googleUser.name || 'Google User');
          setIsGoogleOpen(true);
        } else {
          setErrorMsg('Failed to obtain Google login credentials.');
        }
      } catch (err: any) {
        console.error("[Google Auth] Native error:", err);
        // Automatically fallback to mock Google account chooser on native signature failure
        setGooglePrefillEmail('');
        setGooglePrefillName('');
        setIsGoogleOpen(true);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setGooglePrefillEmail('');
      setGooglePrefillName('');
      setIsGoogleOpen(true);
    }
  };

  const handleGoogleSelect = async (gEmail: string, gName: string, gPassword?: string) => {
    await authenticateGoogleUser(gEmail, gName, gPassword);
  };`;

const newGoogleClick = `  const handleGoogleClick = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      console.log("[Google Auth] Initializing native signIn...");
      const googleUser = (await GoogleAuth.signIn()) as any;
      console.log("[Google Auth] Received Google user:", googleUser);
      
      if (googleUser && googleUser.email) {
        const idToken = googleUser.authentication?.idToken || googleUser.idToken;
        await authenticateGoogleUser(googleUser.email, googleUser.name || 'Google User', undefined, idToken);
      } else {
        setErrorMsg('Failed to obtain Google login credentials.');
      }
    } catch (err: any) {
      console.error("[Google Auth] Error during signIn:", err);
      const isCapacitor = typeof window !== 'undefined' && ((window as any).Capacitor || ((window as any).parent && (window as any).parent.Capacitor));
      let errMsg = 'Google Sign-In failed.';
      if (err && typeof err === 'object') {
        errMsg = err.message || JSON.stringify(err);
      } else if (typeof err === 'string') {
        errMsg = err;
      }
      if (isCapacitor) {
        setErrorMsg(\`\${errMsg} (Note: Ensure your local debug.keystore SHA-1 key is registered in the Google Developer Console / Firebase for this Android/iOS package).\`);
      } else {
        setErrorMsg(errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };`;

// Replace handleGoogleClick in SignUpScreen
const firstOccurrenceIndex = appContent.indexOf(handleGoogleClickSignUpTarget);
if (firstOccurrenceIndex === -1) {
  console.log('Skipping SignUpScreen handleGoogleClick replacement (might have already been processed).');
} else {
  appContent = appContent.replace(handleGoogleClickSignUpTarget, newGoogleClick);
}

// Remove the modal JSX in SignUpScreen
const signUpModalJSX = `      <GoogleAccountSelectorModal 
        isOpen={isGoogleOpen} 
        onClose={() => setIsGoogleOpen(false)} 
        onSelectAccount={handleGoogleSelect} 
        prefilledEmail={googlePrefillEmail || undefined}
        prefilledName={googlePrefillName || undefined}
      />\n`;

appContent = appContent.replace(signUpModalJSX, '');

// 3. Refactor SignInScreen
console.log('Refactoring SignInScreen...');

// Remove the states in SignInScreen
appContent = appContent.replace(
  `  const [isGoogleOpen, setIsGoogleOpen] = useState(false);\n  const [googlePrefillEmail, setGooglePrefillEmail] = useState('');\n  const [googlePrefillName, setGooglePrefillName] = useState('');`,
  ''
);

// Replace handleGoogleClick in SignInScreen
const secondOccurrenceIndex = appContent.indexOf(handleGoogleClickSignUpTarget);
if (secondOccurrenceIndex === -1) {
  console.log('Skipping SignInScreen handleGoogleClick replacement (might have already been processed).');
} else {
  appContent = appContent.replace(handleGoogleClickSignUpTarget, newGoogleClick);
}

// Remove the modal JSX in SignInScreen
appContent = appContent.replace(signUpModalJSX, '');

console.log('Writing updated App.tsx back...');
fs.writeFileSync(appPath, appContent, 'utf8');

// 4. Refactor backend/server.js
console.log('Reading server.js from:', serverPath);
let serverContent = fs.readFileSync(serverPath, 'utf8');

const oldDiscoverFilter = '  const otherUsers = db.users.filter(u => u.id !== userId);';
const newDiscoverFilter = '  const otherUsers = db.users.filter(u => String(u.id) !== String(userId));';

if (serverContent.indexOf(oldDiscoverFilter) === -1) {
  console.log('Skipping server.js update (might have already been processed).');
} else {
  console.log('Updating otherUsers filter in server.js...');
  serverContent = serverContent.replace(oldDiscoverFilter, newDiscoverFilter);
  console.log('Writing updated server.js back...');
  fs.writeFileSync(serverPath, serverContent, 'utf8');
}

console.log('REFACTOR COMPLETED SUCCESSFULY!');
