const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'App.tsx');
console.log('Reading App.tsx from:', appPath);
let appContent = fs.readFileSync(appPath, 'utf8');

// Normalize CRLF to LF
console.log('Normalizing newlines to LF...');
appContent = appContent.replace(/\r\n/g, '\n');

// 1. Rewrite SignUpScreen
console.log('Processing SignUpScreen...');

const signUpStart = appContent.indexOf('function SignUpScreen');
const signInStart = appContent.indexOf('function SignInScreen');

if (signUpStart === -1 || signInStart === -1) {
  console.error('Could not find SignUpScreen or SignInScreen start');
  process.exit(1);
}

// Extract SignUpScreen block
let signUpBlock = appContent.substring(signUpStart, signInStart);

// Remove the states
signUpBlock = signUpBlock.replace(
  `  const [isGoogleOpen, setIsGoogleOpen] = useState(false);\n  const [selectedGoogleEmail, setSelectedGoogleEmail] = useState('');\n  const [selectedGoogleName, setSelectedGoogleName] = useState('');\n  const [selectedGoogleIdToken, setSelectedGoogleIdToken] = useState('');\n  const [isGooglePasswordOpen, setIsGooglePasswordOpen] = useState(false);`,
  ''
);

// Replace methods
const signUpGoogleClickTarget = `  const handleGoogleClick = async () => {
    const isCapacitor = typeof window !== 'undefined' && ((window as any).Capacitor || ((window as any).parent && (window as any).parent.Capacitor));
    if (isCapacitor) {
      try {
        setErrorMsg('');
        setIsSubmitting(true);
        console.log("[Google Auth] Initializing native signIn...");
        const googleUser = (await GoogleAuth.signIn()) as any;
        console.log("[Google Auth] Received native user:", googleUser);
        
        if (googleUser && googleUser.idToken) {
          setSelectedGoogleEmail(googleUser.email || '');
          setSelectedGoogleName(googleUser.name || 'Google User');
          setSelectedGoogleIdToken(googleUser.idToken || '');
          setIsGooglePasswordOpen(true);
        } else {
          setErrorMsg('Failed to obtain Google login credentials.');
        }
      } catch (err: any) {
        console.error("[Google Auth] Native error:", err);
        // Automatically fallback to mock Google account chooser on native signature failure
        setIsGoogleOpen(true);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsGoogleOpen(true);
    }
  };

  const handleGoogleSelect = async (gEmail: string, gName: string) => {
    setSelectedGoogleEmail(gEmail);
    setSelectedGoogleName(gName);
    setSelectedGoogleIdToken('');
    setIsGooglePasswordOpen(true);
  };

  const handleGoogleSubmitWithPassword = async (newName: string, pwd: string) => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await fetch(\`\${API_BASE}/auth/google\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedGoogleEmail,
          name: newName,
          idToken: selectedGoogleIdToken || undefined,
          password: pwd
        })
      });
      const data = await res.json();
      if (res.ok) {
        setIsGooglePasswordOpen(false);
        onSignUpComplete(data.token, data.user);
      } else {
        setErrorMsg(data.error || 'Google login failed.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };`;

const signUpGoogleClickReplacement = `  const handleGoogleClick = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      console.log("[Google Auth] Initializing native signIn...");
      const googleUser = (await GoogleAuth.signIn()) as any;
      console.log("[Google Auth] Received Google user:", googleUser);
      
      if (googleUser && googleUser.email) {
        const idToken = googleUser.authentication?.idToken || googleUser.idToken;
        const res = await fetch(\`\${API_BASE}/auth/google\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: googleUser.email,
            name: googleUser.name || 'Google User',
            idToken: idToken || undefined
          })
        });
        const data = await res.json();
        if (res.ok) {
          onSignUpComplete(data.token, data.user);
        } else {
          setErrorMsg(data.error || 'Google login failed.');
        }
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

if (signUpBlock.indexOf(signUpGoogleClickTarget) === -1) {
  console.error('Could not find handleGoogleClick in SignUpScreen');
  process.exit(1);
}
signUpBlock = signUpBlock.replace(signUpGoogleClickTarget, signUpGoogleClickReplacement);

// Remove JSX modals
const signUpModalJSX = `      <GoogleAccountSelectorModal isOpen={isGoogleOpen} onClose={() => setIsGoogleOpen(false)} onSelectAccount={handleGoogleSelect} />
      <GooglePasswordModal 
        isOpen={isGooglePasswordOpen} 
        email={selectedGoogleEmail} 
        initialName={selectedGoogleName}
        onClose={() => setIsGooglePasswordOpen(false)} 
        onSubmitDetails={handleGoogleSubmitWithPassword} 
        isSubmitting={isSubmitting} 
      />\n`;

if (signUpBlock.indexOf(signUpModalJSX) === -1) {
  console.error('Could not find signUpModalJSX in SignUpScreen');
  process.exit(1);
}
signUpBlock = signUpBlock.replace(signUpModalJSX, '');

// Re-integrate SignUpScreen block
appContent = appContent.substring(0, signUpStart) + signUpBlock + appContent.substring(signInStart);

// 2. Rewrite SignInScreen
console.log('Processing SignInScreen...');

const updatedSignInStart = appContent.indexOf('function SignInScreen');
if (updatedSignInStart === -1) {
  console.error('Could not find updated SignInScreen start');
  process.exit(1);
}

let signInBlock = appContent.substring(updatedSignInStart);

// Remove the states
signInBlock = signInBlock.replace(
  `  const [isGoogleOpen, setIsGoogleOpen] = useState(false);\n  const [selectedGoogleEmail, setSelectedGoogleEmail] = useState('');\n  const [selectedGoogleName, setSelectedGoogleName] = useState('');\n  const [selectedGoogleIdToken, setSelectedGoogleIdToken] = useState('');\n  const [isGooglePasswordOpen, setIsGooglePasswordOpen] = useState(false);`,
  ''
);

// Define SignIn specific target
const signInGoogleClickTarget = signUpGoogleClickTarget.replace('onSignUpComplete', 'onSignInComplete');

const signInGoogleClickReplacement = `  const handleGoogleClick = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      console.log("[Google Auth] Initializing native signIn...");
      const googleUser = (await GoogleAuth.signIn()) as any;
      console.log("[Google Auth] Received Google user:", googleUser);
      
      if (googleUser && googleUser.email) {
        const idToken = googleUser.authentication?.idToken || googleUser.idToken;
        const res = await fetch(\`\${API_BASE}/auth/google\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: googleUser.email,
            name: googleUser.name || 'Google User',
            idToken: idToken || undefined
          })
        });
        const data = await res.json();
        if (res.ok) {
          onSignInComplete(data.token, data.user);
        } else {
          setErrorMsg(data.error || 'Google login failed.');
        }
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

if (signInBlock.indexOf(signInGoogleClickTarget) === -1) {
  console.error('Could not find handleGoogleClick in SignInScreen');
  process.exit(1);
}
signInBlock = signInBlock.replace(signInGoogleClickTarget, signInGoogleClickReplacement);

// Remove JSX modals
const signInModalJSX = signUpModalJSX.replace('handleGoogleSubmitWithPassword', 'handleGoogleSubmitWithPassword'); // wait, it has the same method name

if (signInBlock.indexOf(signInModalJSX) === -1) {
  console.error('Could not find signInModalJSX in SignInScreen');
  process.exit(1);
}
signInBlock = signInBlock.replace(signInModalJSX, '');

// Re-integrate SignInScreen block
appContent = appContent.substring(0, updatedSignInStart) + signInBlock;

console.log('Writing updated App.tsx back...');
fs.writeFileSync(appPath, appContent, 'utf8');

console.log('CLEANUP AUTH COMPLETED SUCCESSFULY!');
