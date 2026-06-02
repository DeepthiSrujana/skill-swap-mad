import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import {
  Zap,
  Users,
  Compass,
  MessageSquare,
  Calendar,
  User,
  CheckCircle,
  ChevronRight,
  Send,
  X,
  Video,
  Mic,
  Paperclip,
  Bell,
  MapPin,
  HelpCircle,
  Shield,
  LogOut,
  Sparkles,
  ArrowRight,
  RefreshCw,
  PhoneOff,
  Phone,
  MicOff,
  VideoOff,
  Settings,
  Search
} from 'lucide-react';

const localStorage = window.localStorage;

const getBackendUrls = () => {
  const productionUrl = 'https://skill-swap-mad.onrender.com';
  
  // @ts-ignore
  const isCapacitor = typeof window !== 'undefined' && (window.Capacitor || (window.parent && window.parent.Capacitor));

  // @ts-ignore
  const devHostIp = typeof __DEV_HOST_IP__ !== 'undefined' ? __DEV_HOST_IP__ : '';

  if (isCapacitor) {
    const devIpUrl = devHostIp ? `http://${devHostIp}:3001` : '';
    const emulatorUrl = `http://10.0.2.2:3001`;

    return {
      API_BASE: devIpUrl ? `${devIpUrl}/api` : `${emulatorUrl}/api`,
      SOCKET_URL: devIpUrl || emulatorUrl,
      FALLBACK_API_BASE: devIpUrl ? `${emulatorUrl}/api` : `${productionUrl}/api`,
      FALLBACK_SOCKET_URL: devIpUrl ? emulatorUrl : productionUrl
    };
  }

  // Detect if running locally (development or localhost loopback)
  const isLocal = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname.startsWith('192.168.') || 
    window.location.hostname.startsWith('10.') || 
    window.location.hostname.startsWith('172.')
  );

  let localHost = 'localhost';
  if (typeof window !== 'undefined') {
    localHost = window.location.hostname;
  }

  const localUrl = `http://${localHost}:3001`;
  const devIpUrl = devHostIp ? `http://${devHostIp}:3001` : localUrl;

  if (isLocal) {
    console.log(`[SkillSwap] Connecting to LOCAL backend: ${localUrl}`);
    return {
      API_BASE: `${localUrl}/api`,
      SOCKET_URL: localUrl,
      FALLBACK_API_BASE: `${devIpUrl}/api`,
      FALLBACK_SOCKET_URL: devIpUrl
    };
  }

  console.log(`[SkillSwap] Connecting to PRODUCTION backend: ${productionUrl}`);
  return {
    API_BASE: `${productionUrl}/api`,
    SOCKET_URL: productionUrl,
    FALLBACK_API_BASE: `${devIpUrl}/api`,
    FALLBACK_SOCKET_URL: devIpUrl
  };
};

const defaultUrls = getBackendUrls();
let API_BASE = defaultUrls.API_BASE;
let SOCKET_URL = defaultUrls.SOCKET_URL;
// @ts-ignore
const FALLBACK_API_BASE = defaultUrls.FALLBACK_API_BASE || '';
// @ts-ignore
const FALLBACK_SOCKET_URL = defaultUrls.FALLBACK_SOCKET_URL || '';

interface AssessmentQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const SKILL_QUESTIONS: Record<string, AssessmentQuestion[]> = {
  python: [
    {
      question: "Which of the following data types is mutable in Python?",
      options: ["List", "Tuple", "String", "Integer"],
      correctIndex: 0,
      explanation: "Lists can be modified after creation, unlike tuples, strings, and integers which are immutable."
    },
    {
      question: "What is the output of print(2 ** 3) in Python?",
      options: ["5", "6", "8", "9"],
      correctIndex: 2,
      explanation: "The double asterisk (**) operator represents exponentiation in Python, so 2 raised to the power of 3 is 8."
    },
    {
      question: "Which keyword is used to define a function in Python?",
      options: ["function", "def", "func", "define"],
      correctIndex: 1,
      explanation: "Functions are declared using the 'def' keyword."
    },
    {
      question: "How do you create an empty set in Python?",
      options: ["{}", "set()", "[]", "empty_set()"],
      correctIndex: 1,
      explanation: "{} creates an empty dictionary. To create an empty set, you must use set()."
    },
    {
      question: "What is the output of print('hello'[1:4])?",
      options: ["hel", "ell", "llo", "he"],
      correctIndex: 1,
      explanation: "Slicing [1:4] extracts characters from index 1 (inclusive) to 4 (exclusive). For 'hello', index 1 is 'e', 2 is 'l', 3 is 'l', resulting in 'ell'."
    },
    {
      question: "What is the purpose of the '__init__' method in a Python class?",
      options: ["To delete an object", "To inherit from a parent class", "To initialize class variables (constructor)", "To import external modules"],
      correctIndex: 2,
      explanation: "The '__init__' method acts as the class constructor, initializing state variables upon object instantiation."
    },
    {
      question: "Which exception handler block catches errors in Python?",
      options: ["try-catch", "try-except", "catch-block", "error-handle"],
      correctIndex: 1,
      explanation: "Python uses 'try' and 'except' blocks to handle exceptions gracefully."
    },
    {
      question: "What does list comprehension do in Python?",
      options: ["Compresses lists to save storage", "Generates lists using a concise syntax", "Finds the maximum value in a list", "Validates item types inside a list"],
      correctIndex: 1,
      explanation: "List comprehension is a syntactically concise way to create lists based on existing iterables."
    },
    {
      question: "Which library is standard for scientific computing and array handling?",
      options: ["requests", "numpy", "matplotlib", "beautifulsoup"],
      correctIndex: 1,
      explanation: "NumPy is the foundational library for array math and multidimensional scientific processing."
    },
    {
      question: "How is global scope variables declared in a function?",
      options: ["using global keyword", "using var keyword", "using default declarations", "using extern keyword"],
      correctIndex: 0,
      explanation: "To write to a global variable inside a local scope function, declare it with the 'global' keyword."
    }
  ],
  flutter: [
    {
      question: "Which programming language is used to write Flutter apps?",
      options: ["Kotlin", "Swift", "Dart", "TypeScript"],
      correctIndex: 2,
      explanation: "Flutter is built on the Dart programming language."
    },
    {
      question: "What is the difference between StatelessWidget and StatefulWidget?",
      options: [
        "StatelessWidget has no interface", 
        "StatefulWidget can dynamically re-build when state variables mutate", 
        "StatelessWidget cannot be built in release environments", 
        "StatefulWidget compiles strictly on web environments"
      ],
      correctIndex: 1,
      explanation: "StatefulWidgets track internal active mutable state and trigger build updates when using setState()."
    },
    {
      question: "What function must be called inside main() to launch a Flutter app?",
      options: ["startApp()", "runApp()", "launchApp()", "initialize()"],
      correctIndex: 1,
      explanation: "runApp() is called in main to render the primary widget structure on the screen."
    },
    {
      question: "What is the purpose of Pubspec.yaml in a Flutter project?",
      options: ["Contains native android layout parameters", "Configures third-party dependencies, assets, and assets routing", "Stores hashed API key credentials", "Manages device hardware drivers"],
      correctIndex: 1,
      explanation: "Pubspec.yaml manages external packages, image directories, font overrides, and dependencies."
    },
    {
      question: "Which layout widget is used to align items vertically?",
      options: ["Row", "Column", "Stack", "ListView"],
      correctIndex: 1,
      explanation: "Column places children in a vertical array configuration."
    },
    {
      question: "What does hot reload accomplish in Flutter?",
      options: ["Compiles code into release binary", "Injects updated source files into the VM instantly while preserving state", "Re-initializes native system hardware", "Resets local SQLite storage databases"],
      correctIndex: 1,
      explanation: "Hot reload updates Dart files in the virtual machine without destroying user state or navigation paths."
    },
    {
      question: "What is the role of BuildContext?",
      options: ["Handles platform file system inputs", "Represents the location of a widget in the widget tree structure", "Compiles the graphics engine manually", "Checks local security scopes"],
      correctIndex: 1,
      explanation: "BuildContext holds references to a widget's specific node placement within the wider tree structure."
    },
    {
      question: "Which class is the base for all state management architectures in Flutter?",
      options: ["Listenable / ChangeNotifier", "StateController", "WidgetBuilder", "AsyncNotifier"],
      correctIndex: 0,
      explanation: "ChangeNotifier (and Listenable) notifies listeners when dynamic updates are invoked."
    },
    {
      question: "Which widget is ideal for overlaying items on top of each other?",
      options: ["Column", "Row", "Stack", "Grid"],
      correctIndex: 2,
      explanation: "Stack places items in overlapping absolute alignments from top to bottom index layers."
    },
    {
      question: "How do you fetch asynchronous future data in a UI builder safely?",
      options: ["FutureBuilder", "StreamBuilder", "AsyncContainer", "CompleterBuilder"],
      correctIndex: 0,
      explanation: "FutureBuilder listens to a Future object and builds widgets based on its snapshot state transitions."
    }
  ],
  figma: [
    {
      question: "What is the shortcut to create a Frame in Figma?",
      options: ["F", "A", "R", "Both F and A"],
      correctIndex: 3,
      explanation: "Pressing 'F' or 'A' activates the Frame design tool in Figma."
    },
    {
      question: "What is Auto Layout in Figma?",
      options: ["A plugin that automatically saves backups", "A feature that builds dynamic structural containers responsive to padding and content scales", "An AI translation service", "A code exporter command"],
      correctIndex: 1,
      explanation: "Auto Layout builds responsive parent containers that align child objects automatically as text wraps or elements expand."
    },
    {
      question: "Which of the following constraints specifies how frames resize with parents?",
      options: ["Top and Left", "Scale", "Left and Right (Stretch)", "All of the above"],
      correctIndex: 3,
      explanation: "All these constraint presets direct Figma on how to scale coordinates proportionally with parent windows."
    },
    {
      question: "What is a Component in Figma?",
      options: ["A pixel design format", "A master reusable design element that synchronizes style instances when updated", "An external Javascript module", "A background rendering worker"],
      correctIndex: 1,
      explanation: "Components are reusable design building blocks that duplicate styles. Changes to the Master Component instantly affect all instances."
    },
    {
      question: "How do you create a Prototype link between two frames?",
      options: ["Right-click and press Link", "Navigate to Prototype tab, click the blue plus icon on the edge of a frame, and drag it to the target frame", "Use command+P", "Write standard CSS styling rules"],
      correctIndex: 1,
      explanation: "Prototyping wires frames by dragging connector handles from nodes/boundaries to target pages under the Prototype tab panel."
    },
    {
      question: "What is a Component Variant in Figma?",
      options: ["An export file compression format", "Variations of a single component grouped together (like sizes, disabled/active states)", "An obsolete layer model", "A third-party plugin extension"],
      correctIndex: 1,
      explanation: "Variants organize related component styles (e.g. Primary, Secondary, Hover, Disabled buttons) inside a single component boundary."
    },
    {
      question: "How do you access absolute styles shared across a team in Figma?",
      options: ["Team Libraries", "Export Panels", "Canvas Inspector", "Variables Settings"],
      correctIndex: 0,
      explanation: "Team Libraries publish components and styles, allowing teams to share assets globally across projects."
    },
    {
      question: "What is smart animate in Figma?",
      options: ["An AI code compiler", "A prototyping transition that matches identical layer names across frames and animates their differences automatically", "A standard GIF player", "A command-line script tool"],
      correctIndex: 1,
      explanation: "Smart Animate recognizes matching elements in different states across screens, rendering fluid, automatic interpolations."
    },
    {
      question: "Which file format preserves full editability when exporting from Figma?",
      options: [".png", ".jpg", ".fig", ".pdf"],
      correctIndex: 2,
      explanation: "The native .fig file format carries all vector assets, component structures, and historical steps."
    },
    {
      question: "What is the shortcut to group selected layers together?",
      options: ["Ctrl/Cmd + G", "Ctrl/Cmd + Shift + G", "Ctrl/Cmd + Alt + G", "Ctrl/Cmd + K"],
      correctIndex: 0,
      explanation: "Grouping binds selected items under a single folder group via Ctrl/Cmd + G."
    }
  ],
  javascript: [
    {
      question: "What is the difference between 'let' and 'var' in JavaScript?",
      options: [
        "var is block-scoped, let is function-scoped",
        "let is block-scoped, var is function-scoped",
        "let variables cannot be reassigned",
        "var variables are only compiled in Node.js"
      ],
      correctIndex: 1,
      explanation: "'let' provides block scoping, limiting access to variables within matching brackets {}, whereas 'var' variables leak into parent functions."
    },
    {
      question: "What does the strict equality (===) operator do?",
      options: [
        "Compares value after converting type",
        "Compares both value and type without converting types",
        "Assigns a variable strictly in background compilers",
        "Forces garbage collection on memory nodes"
      ],
      correctIndex: 1,
      explanation: "The '===' operator checks if operands are equal in both value and runtime data type without implicit conversion."
    },
    {
      question: "Which function parses a string parameter and returns an integer?",
      options: ["parseInt()", "Math.floor()", "Number.parse()", "toInteger()"],
      correctIndex: 0,
      explanation: "parseInt() parses a string argument and returns an integer of the specified radix."
    },
    {
      question: "What is the output of print typeof NaN in JavaScript?",
      options: ["'nan'", "'undefined'", "'number'", "'object'"],
      correctIndex: 2,
      explanation: "Although representing 'Not-a-Number', NaN's underlying programmatic primitive type is actually 'number'."
    },
    {
      question: "Which keyword references the active executing object execution context?",
      options: ["super", "this", "parent", "self"],
      correctIndex: 1,
      explanation: "'this' refers to the object environment context in which the active execution thread is executing."
    },
    {
      question: "What is a Closure in JavaScript?",
      options: [
        "A command that shuts down the event loop",
        "A function that retains access to its outer lexical scope variables even after execution finishes",
        "A block statement that terminates exception flows",
        "A method to secure local server ports"
      ],
      correctIndex: 1,
      explanation: "Closures enable nested functions to 'remember' variable bindings from outer environments even when executed outside their original context."
    },
    {
      question: "How do you declare a new Promise object?",
      options: ["Promise.create()", "new Promise((resolve, reject) => {})", "Promise.init()", "new Promise.resolve()"],
      correctIndex: 1,
      explanation: "Promises are instantiated using 'new Promise()' passing an executor callback that resolves or rejects values."
    },
    {
      question: "What does the 'Array.map()' method do?",
      options: [
        "Reorders array items ascendingly",
        "Creates a new array by applying a callback function to every item in the original array",
        "Flattens multi-dimensional nested arrays",
        "Filters out unwanted items based on boolean logic"
      ],
      correctIndex: 1,
      explanation: "Array.prototype.map() constructs a new transformed array containing the mapped results of its executed callbacks."
    },
    {
      question: "Which keyword resolves asynchronous future values inside async functions?",
      options: ["wait", "await", "defer", "promise"],
      correctIndex: 1,
      explanation: "'await' pauses async function threads until Promises resolve, returning the resolved results."
    },
    {
      question: "What is the primary role of the JavaScript Event Loop?",
      options: [
        "Compiles scripts into binary assembler systems",
        "Monitors execution stacks and callback queues to process async handlers sequentially",
        "Validates DOM node layouts",
        "Restricts illegal memory pointer allocations"
      ],
      correctIndex: 1,
      explanation: "The Event Loop continuously executes macrotasks and microtasks from message buffers once call stacks empty."
    }
  ],
  react: [
    {
      question: "What is the primary benefit of React's Virtual DOM?",
      options: [
        "It stores application logs in indexed databases",
        "It optimizes UI rendering by comparing changes in memory and updating only modified real DOM nodes",
        "It allows building native mobile screens with HTML markup",
        "It enforces strict security protocols on client ports"
      ],
      correctIndex: 1,
      explanation: "The Virtual DOM reduces expensive browser layout passes by batching and executing calculated visual diffs."
    },
    {
      question: "Which hook manages mutable component states in functional components?",
      options: ["useRef", "useState", "useReducer", "useContext"],
      correctIndex: 1,
      explanation: "useState is the core hook designed to declare component-level state variables and re-trigger render cycles."
    },
    {
      question: "What does the 'useEffect' hook accomplish in React?",
      options: [
        "Memoizes expensive computational calculations",
        "Synchronizes components with external systems by running side effects (fetches, triggers, listeners)",
        "Acts as a custom constructor method inside functional components",
        "Controls user authentication routing configurations"
      ],
      correctIndex: 1,
      explanation: "useEffect mounts, updates, and cleans up side-effect listeners and data tasks outside pure render paths."
    },
    {
      question: "How are properties passed down from parent to child React components?",
      options: ["Via Context", "Via Props", "Via State variables", "Via Local Storage"],
      correctIndex: 1,
      explanation: "Props pass read-only parameters from parent nodes down to child nodes in the component tree."
    },
    {
      question: "Why is a unique 'key' prop required when rendering dynamic lists in JSX?",
      options: [
        "To apply custom CSS animation rules",
        "To help React identify which items have changed, been added, or removed during diffing",
        "To save item arrays inside indexed browser storage",
        "To convert items into numeric indices automatically"
      ],
      correctIndex: 1,
      explanation: "Keys provide stable identities for item tags, enabling optimal node recycling during reconciliation cycles."
    },
    {
      question: "What is the purpose of React Context?",
      options: [
        "To optimize graphic performance metrics",
        "To share global state variables across components without manually passing props through intermediate layers",
        "To access direct file system APIs on servers",
        "To establish websocket channels between users"
      ],
      correctIndex: 1,
      explanation: "Context publishes global parameters (like color themes or user sessions) directly to subscriber components."
    },
    {
      question: "Which hook memoizes expensive, computation-heavy values?",
      options: ["useCallback", "useMemo", "useRef", "useReducer"],
      correctIndex: 1,
      explanation: "useMemo caches calculated values, updating only when dependency lists mutate."
    },
    {
      question: "How is 'useRef' different from 'useState'?",
      options: [
        "useRef triggers page re-renders on mutation, useState does not",
        "useState triggers page re-renders on mutation, useRef does not",
        "useRef is only accessible on class structures",
        "useState stores read-only parameters"
      ],
      correctIndex: 1,
      explanation: "useRef objects retain persistent references across render frames without re-triggering component re-renders."
    },
    {
      question: "What represents conditional rendering syntax in JSX?",
      options: [
        "Logical && operator and ternary ?: conditionals",
        "Standard if-else blocks nested inside elements",
        "Using switch-case declarations directly in markup",
        "Applying dynamic template functions inline"
      ],
      correctIndex: 0,
      explanation: "React components use inline JavaScript expressions like ternary operators or `&&` logic to direct renders dynamically."
    },
    {
      question: "What is the correct way to update state values in React?",
      options: [
        "Directly assign values: state = newValue",
        "Call the designated state updater function returned by the useState hook",
        "Reload the window location context",
        "Re-declare the component block using class overrides"
      ],
      correctIndex: 1,
      explanation: "React states are read-only. Calling the setState callback registers modifications and queues optimal UI updates."
    }
  ]
};

const generateFallbackQuestions = (skill: string): AssessmentQuestion[] => {
  return [
    {
      question: `What is a primary best practice when managing ${skill} projects?`,
      options: [
        "Failing to write documentation",
        "Structuring modular, readable, and highly reusable logic/assets",
        "Keeping all code inside a single global layout block",
        "Avoiding code-review sessions entirely"
      ],
      correctIndex: 1,
      explanation: "Modularity and reuse are universal standards across modern technical domains."
    },
    {
      question: `Which of the following is commonly associated with compilation or optimization in ${skill}?`,
      options: [
        "A proper build compiler/interpreter toolchain or testing framework",
        "Using simple text editor extensions with no configuration",
        "Avoiding compiler errors by ignoring types completely",
        "Writing infinite loop routines in main scripts"
      ],
      correctIndex: 0,
      explanation: "Build systems or proper test suites represent key steps in optimizing production environments."
    },
    {
      question: `What is the role of structured variables/components in ${skill}?`,
      options: [
        "They make the codebase slow and hard to read",
        "They encapsulate behavior, isolate dependencies, and reduce state corruption",
        "They are obsolete models replaced by raw text labels",
        "They prevent code from executing on standard servers"
      ],
      correctIndex: 1,
      explanation: "Components isolate concerns, minimizing side effects and improving maintainability."
    },
    {
      question: `How do professional developers scale a ${skill} architecture?`,
      options: [
        "By duplicating duplicate assets in multiple files",
        "By implementing solid design principles, caching, and writing unit tests",
        "By deleting historical version control branches",
        "By disabling network firewalls completely"
      ],
      correctIndex: 1,
      explanation: "Applying architecture design patterns and tests ensures systems scale reliably under load."
    },
    {
      question: `What represents the main lifecycle challenge in ${skill} environments?`,
      options: [
        "Dealing with outdated libraries and breaking API upgrades",
        "Developing software that has no dependencies",
        "Compiling binary builds on hardware that has no GPU",
        "Running tasks that do not write logs"
      ],
      correctIndex: 0,
      explanation: "Dependency deprecation and breaking changes represent common software lifecycle hurdles."
    },
    {
      question: `Which standard is essential for collaborative teamwork in ${skill}?`,
      options: [
        "Sharing absolute file directories via email links",
        "Git version control branches and standardized formatting constraints",
        "Working on a single shared account simultaneous sessions",
        "Avoiding code commits until the project is fully completed"
      ],
      correctIndex: 1,
      explanation: "Git versioning and standard formats allow developer teams to collaborate without conflict."
    },
    {
      question: `What is a primary security vulnerability to watch out for in ${skill}?`,
      options: [
        "Writing too many comments",
        "Injecting unverified inputs, leading to data leaks or script execution exploits",
        "Compiling with high optimization settings",
        "Using local environment variable settings files"
      ],
      correctIndex: 1,
      explanation: "Input serialization failure remains a primary avenue for remote code executes or SQL inject bugs."
    },
    {
      question: `What represents the main goal of debugging in ${skill}?`,
      options: [
        "Renaming variable labels randomly",
        "Isolating stack trace failures, running assertions, and fixing root exceptions",
        "Hiding runtime warnings from console buffers",
        "Deleting testing classes before distribution"
      ],
      correctIndex: 1,
      explanation: "Debugging analyzes logs and assertions to locate and eliminate base system bugs."
    },
    {
      question: `Which methodology is ideal for verifying code updates in ${skill}?`,
      options: [
        "Deploying instantly to production environments without reviewing",
        "Continuous integration (CI) pipelines running automated tests",
        "Running manual builds only on local developer environments",
        "Avoiding automated regression suites entirely"
      ],
      correctIndex: 1,
      explanation: "CI pipelines execute complete builds and checks automatically to prevent regressions."
    },
    {
      question: `Why is active community interaction beneficial for learning ${skill}?`,
      options: [
        "It slows down technical progression by confusing patterns",
        "It accelerates discovery of design patterns, shared tooling, and open-source packages",
        "It is only useful for non-technical practitioners",
        "It introduces insecure, unvalidated dependencies into local workspaces"
      ],
      correctIndex: 1,
      explanation: "Community groups share verified modules and frameworks, speeding up development and problem-solving."
    }
  ];
};

export default function App() {
  const [currentFlowState, setCurrentFlowState] = useState<'splash' | 'onboarding' | 'signup' | 'signin' | 'verify-otp' | 'setup-profile' | 'app'>('splash');
  // @ts-ignore
  const [otpEmail, setOtpEmail] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<number>(0); // 0: Home, 1: Discover, 2: Chat, 3: Sessions, 4: Profile, 5: Community
  const [activeUser, setActiveUser] = useState<any>(null);
  const [appInitializing, setAppInitializing] = useState<boolean>(true);
  const [activeAssessment, setActiveAssessment] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // WebSocket connection lifecycle
  useEffect(() => {
    if (currentFlowState === 'app') {
      const token = localStorage.getItem('skillswap_token');
      if (token) {
        console.log("[Socket.io] Connecting to server...");
        const newSocket = io(SOCKET_URL, {
          auth: {
            token
          }
        });
        
        newSocket.on('connect', () => {
          console.log("[Socket.io] Connected successfully with ID:", newSocket.id);
        });

        newSocket.on('connect_error', (err) => {
          console.error("[Socket.io] Connection error:", err.message);
        });

        setSocket(newSocket);

        return () => {
          console.log("[Socket.io] Disconnecting socket...");
          newSocket.disconnect();
          setSocket(null);
        };
      }
    } else {
      setSocket(null);
    }
  }, [currentFlowState]);

  // Auto-login check on mount
  useEffect(() => {
    async function checkAutoLogin() {
      // Clear legacy custom server configuration to enforce permanent production backend
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('skillswap_backend_url');
      }

      // @ts-ignore
      const isCapacitor = typeof window !== 'undefined' && (window.Capacitor || (window.parent && window.parent.Capacitor));
      
      if (isCapacitor) {
        try {
          console.log("[Google Auth] Initializing native plugin options at startup...");
          await GoogleAuth.initialize({
            clientId: '550830734952-ka3lfmnf8aaemhq05ik3gsekcm17heee.apps.googleusercontent.com',
            scopes: ['profile', 'email'],
            grantOfflineAccess: true
          });
          console.log("[Google Auth] Native plugin initialized successfully.");
        } catch (e) {
          console.error("[Google Auth] Error during native plugin initialization:", e);
        }
      }

      if (isCapacitor) {
        // @ts-ignore
        const devHostIp = typeof __DEV_HOST_IP__ !== 'undefined' ? __DEV_HOST_IP__ : '';
        const potentialUrls = [
          `http://localhost:3001`,
          devHostIp ? `http://${devHostIp}:3001` : '',
          `http://10.0.2.2:3001`,
          `https://skill-swap-mad.onrender.com`
        ].filter(Boolean);

        console.log("[SkillSwap] Probing backend URLs in sequence:", potentialUrls);
        
        let successfulUrl = '';
        for (const url of potentialUrls) {
          try {
            console.log(`[SkillSwap] Probing network health on: ${url}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 seconds fast probe
            await fetch(`${url}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: '', password: '' }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            successfulUrl = url;
            console.log(`[SkillSwap] Connection verified successfully on: ${url}`);
            break;
          } catch (e) {
            console.log(`[SkillSwap] Probe failed on: ${url}`);
          }
        }

        if (successfulUrl) {
          API_BASE = `${successfulUrl}/api`;
          SOCKET_URL = successfulUrl;
          console.log("[SkillSwap] Network configured to:", API_BASE);
        } else {
          console.warn("[SkillSwap] All local probes failed. Falling back to production cloud.");
          API_BASE = `https://skill-swap-mad.onrender.com/api`;
          SOCKET_URL = `https://skill-swap-mad.onrender.com`;
        }
      }

      const token = localStorage.getItem('skillswap_token');
      if (token) {
        try {
          const res = await fetch(`${API_BASE}/users/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            setActiveUser(data);
            if (data && data.title) {
              setCurrentFlowState('app');
            } else {
              console.log("[SkillSwap] Profile incomplete, directing to Setup Profile Screen");
              setCurrentFlowState('setup-profile');
            }
          } else {
            localStorage.removeItem('skillswap_token');
            setCurrentFlowState('onboarding');
          }
        } catch (err) {
          // Keep offline access or redirect to onboarding
          setCurrentFlowState('onboarding');
        }
      } else {
        // No token, redirect to onboarding after splash
        setTimeout(() => {
          setCurrentFlowState('onboarding');
        }, 2500);
      }
      setAppInitializing(false);
    }
    checkAutoLogin();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('skillswap_token');
    setActiveUser(null);
    setCurrentFlowState('onboarding');
    setCurrentTab(0);
  };

  const handleAuthSuccess = (token: string, user: any) => {
    localStorage.setItem('skillswap_token', token);
    setActiveUser(user);
    if (user && user.title) {
      setCurrentFlowState('app');
    } else {
      console.log("[SkillSwap] Profile incomplete on login, directing to Setup Profile Screen");
      setCurrentFlowState('setup-profile');
    }
  };

  if (currentFlowState === 'splash' || appInitializing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#09080e', minHeight: '100vh' }}>
        <div className="phone-viewport">
          <SplashScreen />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#09080e', minHeight: '100vh' }}>
      <div className="phone-viewport" style={{ position: 'relative' }}>
        {activeAssessment ? (
          <AssessmentScreen 
            assessment={activeAssessment}
            setAssessment={setActiveAssessment}
            activeUser={activeUser}
            setActiveUser={setActiveUser}
            onComplete={() => setActiveAssessment(null)}
          />
        ) : (
          <>
            {currentFlowState === 'onboarding' && (
              <OnboardingScreen 
                onGetStarted={() => setCurrentFlowState('signup')} 
                onLoginRoute={() => setCurrentFlowState('signin')}
              />
            )}
            {currentFlowState === 'signup' && (
              <SignUpScreen 
                onSignUpComplete={handleAuthSuccess} 
                onLoginRoute={() => setCurrentFlowState('signin')}
              />
            )}
            {currentFlowState === 'signin' && (
              <SignInScreen 
                onSignInComplete={handleAuthSuccess} 
                onSignUpRoute={() => setCurrentFlowState('signup')}
              />
            )}
            {currentFlowState === 'verify-otp' && (
              <VerifyOtpScreen 
                email={otpEmail}
                onVerificationSuccess={handleAuthSuccess}
                onBackToLogin={() => setCurrentFlowState('signin')}
              />
            )}
            {currentFlowState === 'setup-profile' && (
              <SetupProfileScreen 
                activeUser={activeUser}
                setActiveUser={setActiveUser}
                onComplete={() => setCurrentFlowState('app')}
              />
            )}
            {currentFlowState === 'app' && (
              <MainAppShell 
                activeUser={activeUser}
                setActiveUser={setActiveUser}
                currentTab={currentTab} 
                setCurrentTab={setCurrentTab} 
                onLogout={handleLogout}
                socket={socket}
                onStartAssessment={(skillName: string, category: 'teaches' | 'wants') => {
                  const query = skillName.toLowerCase().trim();
                  const questions = SKILL_QUESTIONS[query] || generateFallbackQuestions(skillName);
                  setActiveAssessment({
                    skillName,
                    category,
                    currentQuestionIndex: 0,
                    selectedAnswers: Array(10).fill(-1),
                    questions: questions.slice(0, 10),
                    status: 'generating',
                    score: 0
                  });
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// 1️⃣ SPLASH SCREEN
// =========================================================================
function SplashScreen() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px',
      height: '100%',
      background: 'linear-gradient(180deg, #0F0E17 0%, #1B1437 100%)',
      animation: 'fade-in 0.8s ease'
    }}>
      <div style={{
        padding: '24px',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderRadius: '50%',
        border: '2px solid rgba(99, 102, 241, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        boxShadow: '0 0 30px rgba(99, 102, 241, 0.2)',
        animation: 'bounce-gentle 2.5s infinite ease-in-out'
      }}>
        <RefreshCw size={72} className="rotate-icon" style={{ color: '#6366F1', animation: 'spin-slow 8s linear infinite' }} />
      </div>
      <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '1.5px', color: '#fff', marginBottom: '8px' }}>
        SkillSwap
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 500, marginBottom: '48px' }}>
        Knowledge is the real currency
      </p>
      <div style={{ width: '28px', height: '28px', border: '3px solid rgba(99, 102, 241, 0.15)', borderTop: '3px solid #6366F1', borderRadius: '50%', animation: 'spin-slow 1s linear infinite' }} />
    </div>
  );
}

// =========================================================================
// 2️⃣ ONBOARDING SCREEN
// =========================================================================
function OnboardingScreen({ onGetStarted, onLoginRoute }: { onGetStarted: () => void; onLoginRoute: () => void }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '32px',
      position: 'relative',
      overflow: 'hidden',
      height: '100%',
      animation: 'fade-in 0.6s ease'
    }}>
      {/* Decorative Aura Ring */}
      <div style={{
        position: 'absolute',
        top: '-120px',
        right: '-120px',
        width: '260px',
        height: '260px',
        borderRadius: '50%',
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        filter: 'blur(30px)'
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{
          backgroundColor: 'rgba(139, 92, 246, 0.12)',
          borderRadius: '24px',
          padding: '20px',
          marginBottom: '40px',
          boxShadow: '0 0 25px rgba(139, 92, 246, 0.15)'
        }}>
          <Zap size={64} style={{ color: '#8B5CF6' }} />
        </div>
        
        <h2 style={{ fontSize: '28px', fontWeight: 900, lineHeight: 1.25, color: '#fff', marginBottom: '16px' }}>
          Learn and Teach<br /><span style={{ color: '#8B5CF6' }}>Without Spending.</span>
        </h2>
        
        <p style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '14px', lineHeight: 1.6, maxWidth: '290px' }}>
          Swap your existing expertise for new skills. Connect with thousands of makers, coders, and artists worldwide.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 10 }}>
        <button onClick={onGetStarted} className="btn-primary" style={{ width: '100%' }}>
          Get Started <ArrowRight size={18} />
        </button>
        <button onClick={onLoginRoute} style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '13px',
          fontWeight: 600,
          padding: '12px',
          cursor: 'pointer'
        }}>
          Already have an account? Log In
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// 3️⃣ SIGN UP SCREEN
// =========================================================================
// =========================================================================
// 2.5️⃣ SERVER CONFIGURATION MODAL
// =========================================================================
// =========================================================================
// 2.7️⃣ GOOGLE ACCOUNT SELECTOR MODAL
// =========================================================================
interface GoogleAccountSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (email: string, name: string) => void;
}

function GoogleAccountSelectorModal({ isOpen, onClose, onSelectAccount }: GoogleAccountSelectorModalProps) {
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail || !customName) return;
    if (!customEmail.includes('@') || !customEmail.includes('.')) {
      setErrorMsg('Please enter a valid Google email address.');
      return;
    }
    onSelectAccount(customEmail.trim().toLowerCase(), customName.trim());
    onClose();
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(9, 8, 14, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      animation: 'fade-in 0.3s ease'
    }}>
      <div style={{
        backgroundColor: '#161426',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '24px',
        width: '100%',
        maxWidth: '320px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>Sign in with Google</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ color: '#F87171', fontSize: '11px', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleCustomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Google Name</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Jahnavi"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              style={{
                height: '40px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                color: '#fff',
                padding: '0 12px',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Google Email</label>
            <input 
              required
              type="email" 
              placeholder="e.g. jahnavi@gmail.com"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              style={{
                height: '40px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                color: '#fff',
                padding: '0 12px',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                flex: 1,
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              style={{
                flex: 1,
                height: '40px',
                fontSize: '13px',
                boxShadow: 'none'
              }}
            >
              Next
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// 3️⃣ SIGN UP SCREEN
// =========================================================================

interface GooglePasswordModalProps {
  isOpen: boolean;
  email: string;
  initialName: string;
  onClose: () => void;
  onSubmitDetails: (name: string, password: string) => void;
  isSubmitting: boolean;
}

function GooglePasswordModal({ isOpen, email, initialName, onClose, onSubmitDetails, isSubmitting }: GooglePasswordModalProps) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(initialName || '');
      setPassword('');
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password) return;
    onSubmitDetails(name.trim(), password);
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(9, 8, 14, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      animation: 'fade-in 0.3s ease'
    }}>
      <div style={{
        backgroundColor: '#161426',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '24px',
        width: '100%',
        maxWidth: '320px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>Create Google Account</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Selected Email</label>
            <input 
              disabled
              type="text" 
              value={email}
              style={{
                height: '40px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: '10px',
                color: 'rgba(255,255,255,0.5)',
                padding: '0 12px',
                fontSize: '13px',
                outline: 'none',
                cursor: 'not-allowed'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Full Name</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Jahnavi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                height: '40px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                color: '#fff',
                padding: '0 12px',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Choose Password</label>
            <input 
              required
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                height: '40px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                color: '#fff',
                padding: '0 12px',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="btn-primary"
            style={{
              height: '40px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '6px',
              width: '100%',
              boxShadow: 'none'
            }}
          >
            {isSubmitting ? 'Creating Account...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

function SignUpScreen({ onSignUpComplete, onLoginRoute }: { onSignUpComplete: (token: string, user: any) => void; onLoginRoute: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleOpen, setIsGoogleOpen] = useState(false);
  const [selectedGoogleEmail, setSelectedGoogleEmail] = useState('');
  const [selectedGoogleName, setSelectedGoogleName] = useState('');
  const [selectedGoogleIdToken, setSelectedGoogleIdToken] = useState('');
  const [isGooglePasswordOpen, setIsGooglePasswordOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (res.ok) {
        onSignUpComplete(data.token, data.user);
      } else {
        setErrorMsg(data.error || 'Signup failed.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleClick = async () => {
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
      const res = await fetch(`${API_BASE}/auth/google`, {
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
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '32px 24px',
      justifyContent: 'center',
      height: '100%',
      position: 'relative',
      animation: 'fade-in 0.6s ease'
    }}>
      <GoogleAccountSelectorModal isOpen={isGoogleOpen} onClose={() => setIsGoogleOpen(false)} onSelectAccount={handleGoogleSelect} />
      <GooglePasswordModal 
        isOpen={isGooglePasswordOpen} 
        email={selectedGoogleEmail} 
        initialName={selectedGoogleName}
        onClose={() => setIsGooglePasswordOpen(false)} 
        onSubmitDetails={handleGoogleSubmitWithPassword} 
        isSubmitting={isSubmitting} 
      />

      <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', textAlign: 'center', marginBottom: '8px' }}>
        Create Account
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textAlign: 'center', marginBottom: '24px' }}>
        Join SkillSwap to start trading knowledge
      </p>

      {errorMsg && (
        <div style={{
          backgroundColor: 'rgba(248, 113, 113, 0.1)',
          border: '1px solid rgba(248, 113, 113, 0.3)',
          color: '#F87171',
          padding: '12px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 500,
          marginBottom: '16px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⚠️ {errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Full Name</label>
          <input
            required
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '0 16px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Email Address</label>
          <input
            required
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '0 16px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Password</label>
          <input
            required
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '0 16px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: '12px', width: '100%', opacity: isSubmitting ? 0.7 : 1 }}>
          {isSubmitting ? 'Registering account...' : 'Sign Up'}
        </button>
      </form>

      <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>or register with</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <button 
          type="button"
          onClick={handleGoogleClick}
          style={{
            flex: 1,
            height: '48px',
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            gap: '8px'
          }}
        >
          Google
        </button>
      </div>

      <button onClick={onLoginRoute} style={{
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.4)',
        fontSize: '13px',
        fontWeight: 600,
        padding: '12px',
        cursor: 'pointer',
        alignSelf: 'center'
      }}>
        Already have an account? Log In
      </button>
    </div>
  );
}

// =========================================================================
// 🗝️ SIGN IN / LOG IN SCREEN
// =========================================================================
function SignInScreen({ onSignInComplete, onSignUpRoute }: { onSignInComplete: (token: string, user: any) => void; onSignUpRoute: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleOpen, setIsGoogleOpen] = useState(false);
  const [selectedGoogleEmail, setSelectedGoogleEmail] = useState('');
  const [selectedGoogleName, setSelectedGoogleName] = useState('');
  const [selectedGoogleIdToken, setSelectedGoogleIdToken] = useState('');
  const [isGooglePasswordOpen, setIsGooglePasswordOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        onSignInComplete(data.token, data.user);
      } else {
        setErrorMsg(data.error || 'Authentication failed.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleClick = async () => {
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
      const res = await fetch(`${API_BASE}/auth/google`, {
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
        onSignInComplete(data.token, data.user);
      } else {
        setErrorMsg(data.error || 'Google login failed.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '32px 24px',
      justifyContent: 'center',
      height: '100%',
      position: 'relative',
      animation: 'fade-in 0.6s ease'
    }}>
      <GoogleAccountSelectorModal isOpen={isGoogleOpen} onClose={() => setIsGoogleOpen(false)} onSelectAccount={handleGoogleSelect} />
      <GooglePasswordModal 
        isOpen={isGooglePasswordOpen} 
        email={selectedGoogleEmail} 
        initialName={selectedGoogleName}
        onClose={() => setIsGooglePasswordOpen(false)} 
        onSubmitDetails={handleGoogleSubmitWithPassword} 
        isSubmitting={isSubmitting} 
      />

      <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', textAlign: 'center', marginBottom: '8px' }}>
        Welcome Back
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textAlign: 'center', marginBottom: '24px' }}>
        Log in to continue trading knowledge
      </p>

      {errorMsg && (
        <div style={{
          backgroundColor: 'rgba(248, 113, 113, 0.1)',
          border: '1px solid rgba(248, 113, 113, 0.3)',
          color: '#F87171',
          padding: '12px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 500,
          marginBottom: '16px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⚠️ {errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Email Address</label>
          <input
            required
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '0 16px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Password</label>
          <input
            required
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '0 16px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: '12px', width: '100%', opacity: isSubmitting ? 0.7 : 1 }}>
          {isSubmitting ? 'Verifying access...' : 'Sign In'}
        </button>
      </form>

      <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>or connect with</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <button 
          type="button"
          onClick={handleGoogleClick}
          style={{
            flex: 1,
            height: '48px',
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            gap: '8px'
          }}
        >
          Google
        </button>
      </div>

      <button onClick={onSignUpRoute} style={{
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.4)',
        fontSize: '13px',
        fontWeight: 600,
        padding: '12px',
        cursor: 'pointer',
        alignSelf: 'center'
      }}>
        Don't have an account? Sign Up
      </button>
    </div>
  );
}

// =========================================================================
// ✉️ OTP VERIFICATION SCREEN
// =========================================================================
interface VerifyOtpScreenProps {
  email: string;
  onVerificationSuccess: (token: string, user: any) => void;
  onBackToLogin: () => void;
}

function VerifyOtpScreen({ email, onVerificationSuccess, onBackToLogin }: VerifyOtpScreenProps) {
  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  useEffect(() => {
    // Focus first input on mount
    inputRefs[0].current?.focus();
  }, []);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Allow only numbers
    const newOtp = [...otp];
    // Take only the last character if pasted or typed
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{4}$/.test(pastedData)) return; // Ensure exactly 4 digits
    const digits = pastedData.split('');
    setOtp(digits);
    inputRefs[3].current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 4) {
      setErrorMsg('Please enter a 4-digit OTP.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Account verified successfully!');
        setTimeout(() => {
          onVerificationSuccess(data.token, data.user);
        }, 1200);
      } else {
        setErrorMsg(data.error || 'OTP verification failed.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsResending(true);

    try {
      const res = await fetch(`${API_BASE}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'A new 4-digit OTP has been sent.');
        setCountdown(59); // Start 60-second cooldown
      } else {
        setErrorMsg(data.error || 'Failed to resend OTP.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to backend server.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '32px 24px',
      justifyContent: 'center',
      height: '100%',
      position: 'relative',
      animation: 'fade-in 0.6s ease'
    }}>
      <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', textAlign: 'center', marginBottom: '8px' }}>
        Verify Email
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textAlign: 'center', marginBottom: '8px' }}>
        We have sent a 4-digit One-Time Password (OTP) to:
      </p>
      <p style={{ color: '#6366F1', fontSize: '14px', fontWeight: 700, textAlign: 'center', marginBottom: '32px', wordBreak: 'break-all' }}>
        {email}
      </p>

      {errorMsg && (
        <div style={{
          backgroundColor: 'rgba(248, 113, 113, 0.1)',
          border: '1px solid rgba(248, 113, 113, 0.3)',
          color: '#F87171',
          padding: '12px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 500,
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{
          backgroundColor: 'rgba(74, 222, 128, 0.1)',
          border: '1px solid rgba(74, 222, 128, 0.3)',
          color: '#4ADE80',
          padding: '12px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 500,
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          ✓ {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }} onPaste={handlePaste}>
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={inputRefs[idx]}
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              required
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              style={{
                width: '56px',
                height: '56px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '14px',
                textAlign: 'center',
                color: '#fff',
                fontSize: '24px',
                fontWeight: 800,
                outline: 'none',
                transition: 'all 0.2s ease',
                boxShadow: digit ? '0 0 15px rgba(99, 102, 241, 0.15)' : 'none',
                borderColor: digit ? '#6366F1' : 'rgba(255,255,255,0.06)'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366F1'}
              onBlur={(e) => e.target.style.borderColor = digit ? '#6366F1' : 'rgba(255,255,255,0.06)'}
            />
          ))}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ width: '100%', opacity: isSubmitting ? 0.7 : 1 }}>
          {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '32px' }}>
        <button 
          onClick={handleResendOtp} 
          disabled={isResending || countdown > 0}
          style={{
            background: 'none',
            border: 'none',
            color: (isResending || countdown > 0) ? 'rgba(255,255,255,0.25)' : '#8B5CF6',
            fontSize: '13px',
            fontWeight: 700,
            cursor: (isResending || countdown > 0) ? 'not-allowed' : 'pointer'
          }}
        >
          {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
        </button>

        <button onClick={onBackToLogin} style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer'
        }}>
          Back to Log In
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// 🧭 MAIN APPLICATION TAB CONTROLLER SHELL
// =========================================================================
function MainAppShell({ 
  activeUser, 
  setActiveUser, 
  currentTab, 
  setCurrentTab, 
  onLogout,
  onStartAssessment,
  socket
}: { 
  activeUser: any; 
  setActiveUser: (user: any) => void; 
  currentTab: number; 
  setCurrentTab: (tab: number) => void; 
  onLogout: () => void; 
  onStartAssessment: (skillName: string, category: 'teaches' | 'wants') => void;
  socket: Socket | null;
}) {

  const [notifications, setNotifications] = useState<any[]>([]);
  const [discoverSearchQuery, setDiscoverSearchQuery] = useState('');

  // Active Session Room & Star Rating States
  const [activeSessionRoom, setActiveSessionRoom] = useState<any | null>(null);
  const [ratingTarget, setRatingTarget] = useState<{ userId: string; userName: string } | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [selectedTrustScore, setSelectedTrustScore] = useState<number>(100);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSessionId, setRatingSessionId] = useState<string | null>(null);
  const [sessionRefreshTrigger, setSessionRefreshTrigger] = useState(0);

  // Camera Facing Mode States
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const facingModeRef = useRef<'user' | 'environment'>('user');

  useEffect(() => {
    facingModeRef.current = facingMode;
  }, [facingMode]);

  const handleSubmitRating = async () => {
    if (!ratingTarget) return;
    const token = localStorage.getItem('skillswap_token');
    if (!token) return;

    setIsSubmittingRating(true);
    try {
      const res = await fetch(`${API_BASE}/users/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: ratingTarget.userId,
          rating: selectedRating,
          trustScore: `${selectedTrustScore}%`
        })
      });
      
      if (res.ok && ratingSessionId) {
        // Calculate IST completed time
        const formatIST = () => {
          try {
            const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true };
            const timeString = new Date().toLocaleTimeString('en-US', options).toLowerCase();
            return `completed at ${timeString} IST`;
          } catch (e) {
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const istTime = new Date(utc + (3600000 * 5.5));
            let hours = istTime.getHours();
            const minutes = String(istTime.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12;
            return `completed at ${hours}:${minutes} ${ampm} IST`;
          }
        };
        const completedAtIST = formatIST();

        await fetch(`${API_BASE}/sessions/${ratingSessionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            status: 'completed',
            isDone: true,
            isRated: true,
            completedAt: completedAtIST
          })
        });
      }

      if (res.ok) {
        setRatingTarget(null);
        setRatingSessionId(null);
        setSessionRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Call States: 'idle' | 'outgoing' | 'incoming' | 'connected'
  const [callStatus, setCallStatus] = useState<'idle' | 'outgoing' | 'incoming' | 'connected'>('idle');
  const [callPeerId, setCallPeerId] = useState<string>('');
  const [callPeerName, setCallPeerName] = useState<string>('');
  const [callPeerPicture, setCallPeerPicture] = useState<string>('');
  const [micMuted, setMicMuted] = useState(false);
  const [videoDisabled, setVideoDisabled] = useState(false);
  const [isUsingVirtualStream, setIsUsingVirtualStream] = useState(false);
  const [isLocalEnlarged, setIsLocalEnlarged] = useState(false);

  // Sync refs to avoid stale closure bugs in Socket.io event listeners
  const callStatusRef = useRef(callStatus);
  const callPeerIdRef = useRef(callPeerId);
  const isUsingVirtualStreamRef = useRef(isUsingVirtualStream);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    callPeerIdRef.current = callPeerId;
  }, [callPeerId]);

  useEffect(() => {
    isUsingVirtualStreamRef.current = isUsingVirtualStream;
  }, [isUsingVirtualStream]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoElRef = useRef<HTMLVideoElement | null>(null);

  // Swap video sources when enlarged state changes
  useEffect(() => {
    if (localVideoElRef.current) {
      localVideoElRef.current.srcObject = isLocalEnlarged ? remoteStreamRef.current : localStreamRef.current;
    }
    if (remoteVideoElRef.current) {
      remoteVideoElRef.current.srcObject = isLocalEnlarged ? localStreamRef.current : remoteStreamRef.current;
    }
  }, [isLocalEnlarged]);

  const cleanupCall = () => {
    console.log("[WebRTC] Executing cleanupCall. Hanging up...");
    setCallStatus('idle');
    setCallPeerId('');
    setCallPeerName('');
    setCallPeerPicture('');
    setMicMuted(false);
    setVideoDisabled(false);
    setIsUsingVirtualStream(false);
    setIsLocalEnlarged(false);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      remoteStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localVideoElRef.current) localVideoElRef.current.srcObject = null;
    if (remoteVideoElRef.current) remoteVideoElRef.current.srcObject = null;
  };

  const localVideoCallbackRef = (el: HTMLVideoElement | null) => {
    localVideoElRef.current = el;
    if (el) {
      el.srcObject = isLocalEnlarged ? remoteStreamRef.current : localStreamRef.current;
      console.log("[WebRTC] Attached stream to local video element via callback ref, isLocalEnlarged:", isLocalEnlarged);
    }
  };

  const remoteVideoCallbackRef = (el: HTMLVideoElement | null) => {
    remoteVideoElRef.current = el;
    if (el) {
      el.srcObject = isLocalEnlarged ? localStreamRef.current : remoteStreamRef.current;
      console.log("[WebRTC] Attached stream to remote video element via callback ref, isLocalEnlarged:", isLocalEnlarged);
    }
  };

  const getSilentAudioTrack = (): MediaStreamTrack | null => {
    try {
      // @ts-ignore
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const dst = audioCtx.createMediaStreamDestination();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(dst);
        osc.start();
        return dst.stream.getAudioTracks()[0] || null;
      }
    } catch (e) {
      console.error("Web Audio API error creating silent audio track:", e);
    }
    return null;
  };

  const getVirtualCanvasStream = (): MediaStream => {
    console.log("[WebRTC] Generating virtual canvas animated stream...");
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    let angle = 0;
    const draw = () => {
      if (!ctx) return;
      
      // Animated gradient background matching app theme (dark indigo)
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#161426');
      grad.addColorStop(1, '#251B4F');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Pulsing glow circle in center
      const radius = 90 + Math.sin(angle) * 12;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Orbiting particle
      const orbitX = canvas.width / 2 + Math.cos(angle * 1.2) * (radius + 25);
      const orbitY = canvas.height / 2 + Math.sin(angle * 1.2) * (radius + 25);
      ctx.beginPath();
      ctx.arc(orbitX, orbitY, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#8B5CF6';
      ctx.fill();

      // Active user text label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 26px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(activeUser?.name || 'SkillSwapper', canvas.width / 2, canvas.height / 2 - 15);
      
      ctx.fillStyle = '#4ADE80';
      ctx.font = '16px monospace';
      ctx.fillText('Live WebRTC Stream', canvas.width / 2, canvas.height / 2 + 25);

      angle += 0.04;
      // Keep looping while call is active
      if (callStatusRef.current === 'connected') {
        requestAnimationFrame(draw);
      }
    };
    
    draw();

    // Capture canvas stream at 30 fps
    // @ts-ignore
    const canvasStream = canvas.captureStream ? canvas.captureStream(30) : (canvas as any).mozCaptureStream ? (canvas as any).mozCaptureStream(30) : new MediaStream();
    
    const silentAudioTrack = getSilentAudioTrack();

    const tracks = [...canvasStream.getVideoTracks()];
    if (silentAudioTrack) {
      tracks.push(silentAudioTrack);
    }
    
    return new MediaStream(tracks);
  };

  const getUserMediaWithFallback = async (currentFacingMode: 'user' | 'environment'): Promise<{ stream: MediaStream; isVirtual: boolean }> => {
    // 1. Try camera and microphone
    try {
      console.log(`[WebRTC] Fallback Chain - Stage 1: Requesting camera (${currentFacingMode}) + mic...`);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentFacingMode },
        audio: true
      });
      console.log("[WebRTC] Fallback Chain - Stage 1: Success!");
      return { stream, isVirtual: false };
    } catch (err) {
      console.warn("[WebRTC] Fallback Chain - Stage 1 failed (camera + mic):", err);
    }

    // 2. Try camera only
    try {
      console.log(`[WebRTC] Fallback Chain - Stage 2: Requesting camera (${currentFacingMode}) only...`);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentFacingMode },
        audio: false
      });
      console.log("[WebRTC] Fallback Chain - Stage 2: Success! Adding silent audio track.");
      const silentAudio = getSilentAudioTrack();
      if (silentAudio) {
        stream.addTrack(silentAudio);
      }
      return { stream, isVirtual: false };
    } catch (err) {
      console.warn("[WebRTC] Fallback Chain - Stage 2 failed (camera only):", err);
    }

    // 3. Try microphone only
    try {
      console.log("[WebRTC] Fallback Chain - Stage 3: Requesting mic only...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      console.log("[WebRTC] Fallback Chain - Stage 3: Success! Mixing with virtual canvas video stream.");
      const virtualStream = getVirtualCanvasStream();
      const videoTrack = virtualStream.getVideoTracks()[0];
      if (videoTrack) {
        stream.addTrack(videoTrack);
      }
      return { stream, isVirtual: false }; // We have voice, so we can run call, video track is virtual
    } catch (err) {
      console.warn("[WebRTC] Fallback Chain - Stage 3 failed (mic only):", err);
    }

    // 4. Ultimate fallback: complete virtual stream
    console.warn("[WebRTC] Fallback Chain - Stage 4: Falling back to completely virtual stream.");
    return { stream: getVirtualCanvasStream(), isVirtual: true };
  };

  const getMediaStream = async (): Promise<MediaStream> => {
    const { stream } = await getUserMediaWithFallback(facingModeRef.current);
    return stream;
  };

  const handleFlipCamera = async () => {
    const nextFacingMode = facingModeRef.current === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacingMode);
    facingModeRef.current = nextFacingMode;
    console.log("[WebRTC] Flipping camera. Next facingMode:", nextFacingMode);

    const { stream: newStream } = await getUserMediaWithFallback(nextFacingMode);
    const newVideoTrack = newStream.getVideoTracks()[0];
    if (!newVideoTrack) return;

    // 1. Update localStreamRef
    if (localStreamRef.current) {
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldVideoTrack) {
        oldVideoTrack.stop();
        localStreamRef.current.removeTrack(oldVideoTrack);
      }
      localStreamRef.current.addTrack(newVideoTrack);
    } else {
      localStreamRef.current = newStream;
    }

    // 2. Update local video element
    if (localVideoElRef.current) {
      localVideoElRef.current.srcObject = localStreamRef.current;
    }

    // 3. Replace track in RTCPeerConnection sender
    if (peerConnectionRef.current) {
      const senders = peerConnectionRef.current.getSenders();
      const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
      if (videoSender) {
        try {
          await videoSender.replaceTrack(newVideoTrack);
          console.log("[WebRTC] Successfully replaced sender track for flipped camera!");
        } catch (e) {
          console.error("[WebRTC] Failed to replace track on flip:", e);
        }
      }
    }
  };



  const setupWebRTCPeer = async (isInitiator: boolean, offerData?: any, peerIdOverride?: string) => {
    const targetPeerId = peerIdOverride || callPeerIdRef.current;

    console.log(`[WebRTC] Setting up peer. Initiator: ${isInitiator}, Peer: ${targetPeerId}`);

    const localStream = await getMediaStream();
    localStreamRef.current = localStream;
    
    setTimeout(() => {
      if (localVideoElRef.current && localStream) {
        localVideoElRef.current.srcObject = localStream;
      }
    }, 150);

    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream!));
    }

    pc.ontrack = (event) => {
      console.log("[WebRTC] Remote track received", event.streams[0]);
      if (event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        if (remoteVideoElRef.current) {
          remoteVideoElRef.current.srcObject = event.streams[0];
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state changed:", pc.connectionState);
      if (pc.connectionState === 'closed' || pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.log("[WebRTC] Peer dropped or connection closed, ending call...");
        cleanupCall();
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', { to: targetPeerId, candidate: event.candidate });
      }
    };

    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (socket) {
          socket.emit('webrtc-offer', { to: targetPeerId, offer });
        }
      } catch (e) {
        console.error("Failed to create offer:", e);
      }
    } else if (offerData) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offerData));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (socket) {
          socket.emit('webrtc-answer', { to: targetPeerId, answer });
        }
      } catch (e) {
        console.error("Failed to handle offer / create answer:", e);
      }
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data: { from: string; callerName: string; callerPicture?: string }) => {
      console.log("[Socket.io] Incoming call from:", data.callerName, "Current status:", callStatusRef.current);
      if (callStatusRef.current !== 'idle') {
        socket.emit('call-decline', { to: data.from });
        return;
      }
      setCallStatus('incoming');
      setCallPeerId(data.from);
      setCallPeerName(data.callerName);
      setCallPeerPicture(data.callerPicture || '');

      // Trigger native browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Incoming Video Call! 📞`, {
          body: `${data.callerName} is calling you on SkillSwap. Tap to accept!`,
          icon: '/favicon.ico',
          tag: 'incoming-call',
          requireInteraction: true
        });
      }
    };

    const handleCallDeclined = () => {
      console.log("[Socket.io] Outgoing call was declined");
      cleanupCall();
    };

    const handleCallAccepted = async (data: { peerId: string }) => {
      console.log("[Socket.io] Call accepted by peer:", data.peerId);
      setCallStatus('connected');
      setCallPeerId(data.peerId);
      await setupWebRTCPeer(true, undefined, data.peerId);
    };

    const handleWebRTCOffer = async (data: { offer: any; from: string }) => {
      console.log("[Socket.io] WebRTC offer received from:", data.from);
      setCallPeerId(data.from);
      await setupWebRTCPeer(false, data.offer, data.from);
    };

    const handleWebRTCAnswer = async (data: { answer: any }) => {
      console.log("[Socket.io] WebRTC answer received");
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (e) {
          console.error("Error setting remote description:", e);
        }
      }
    };

    const handleIceCandidate = async (data: { candidate: any }) => {
      console.log("[Socket.io] ICE candidate received");
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error("Error adding ICE candidate:", e);
        }
      }
    };

    const handleCallEnded = () => {
      console.log("[Socket.io] Call was ended by peer");
      cleanupCall();
    };

    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-declined', handleCallDeclined);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('webrtc-offer', handleWebRTCOffer);
    socket.on('webrtc-answer', handleWebRTCAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('call-ended', handleCallEnded);

    return () => {
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-declined', handleCallDeclined);
      socket.off('call-accepted', handleCallAccepted);
      socket.off('webrtc-offer', handleWebRTCOffer);
      socket.off('webrtc-answer', handleWebRTCAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('call-ended', handleCallEnded);
    };
  }, [socket]);

  const handleInitiateCall = (partnerId: string, partnerName: string, partnerPicture?: string) => {
    if (!socket) return;
    setCallStatus('outgoing');
    setCallPeerId(partnerId);
    setCallPeerName(partnerName);
    setCallPeerPicture(partnerPicture || '');
    socket.emit('call-user', { 
      to: partnerId, 
      callerName: activeUser?.name || 'A SkillSwapper', 
      callerPicture: activeUser?.profilePicture || activeUser?.profileImage || activeUser?.avatarUrl || '' 
    });
  };

  const handleAcceptCall = () => {
    if (!socket) return;
    setCallStatus('connected');
    socket.emit('call-accept', { to: callPeerIdRef.current });
    setupWebRTCPeer(false, undefined, callPeerIdRef.current);
  };

  const handleDeclineCall = () => {
    if (!socket) return;
    socket.emit('call-decline', { to: callPeerIdRef.current });
    cleanupCall();
  };

  const handleEndCall = () => {
    if (!socket) return;
    socket.emit('call-end', { to: callPeerIdRef.current });
    cleanupCall();
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
      }
    } else {
      setMicMuted(!micMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoDisabled(!videoTrack.enabled);
      }
    } else {
      setVideoDisabled(!videoDisabled);
    }
  };



  // 1. Native browser Notification Permission request
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 2. Native notification permission trigger when activeUser updates
  useEffect(() => {
    if (activeUser && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [activeUser]);

  // 3. Keep track of already notified session IDs to avoid spamming
  const notifiedSessionsRef = useRef<Set<string>>(new Set());

  // 4. Background checker for upcoming session alarms (every 30 seconds)
  useEffect(() => {
    const parseSessionDate = (dateStr: string): Date | null => {
      if (!dateStr || dateStr.includes('Pending') || dateStr.includes('completed') || dateStr.includes('Completed')) {
        return null;
      }
      
      const now = new Date();
      let targetDate = new Date();
      
      if (dateStr.toLowerCase().startsWith('today')) {
        // Format: "Today, 5:30 PM"
        const parts = dateStr.split(',');
        if (parts.length < 2) return null;
        const timePart = parts[1].trim();
        
        const timeMatch = timePart.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!timeMatch) return null;
        
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const ampm = timeMatch[3];
        
        if (ampm) {
          if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
          if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
        }
        
        targetDate.setHours(hours, minutes, 0, 0);
        return targetDate;
      } else {
        // Format: "May 29, 2:00 PM"
        const currentYear = now.getFullYear();
        const cleanStr = dateStr.replace(/(\w+)\s+(\d+),/, `$1 $2, ${currentYear}`);
        const parsed = Date.parse(cleanStr);
        if (!isNaN(parsed)) {
          return new Date(parsed);
        }
      }
      return null;
    };

    const checkUpcomingSessions = async () => {
      const token = localStorage.getItem('skillswap_token');
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/sessions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const sessions = await res.json();
          const now = new Date();
          sessions.forEach((s: any) => {
            if (s.status === 'accepted' && !s.isDone) {
              const sessDate = parseSessionDate(s.date);
              if (sessDate) {
                const diffMs = sessDate.getTime() - now.getTime();
                const diffMins = diffMs / 60000;
                
                // Alert if session starts in <= 10 mins and has not been notified yet
                if (diffMins > -5 && diffMins <= 10 && !notifiedSessionsRef.current.has(s.id)) {
                  notifiedSessionsRef.current.add(s.id);
                  
                  if ('Notification' in window && Notification.permission === 'granted') {
                    let alertMsg = `Your session "${s.title}" is starting soon at ${s.date}!`;
                    if (diffMins <= 0) {
                      alertMsg = `Your session "${s.title}" is starting now!`;
                    }
                    new Notification("Session Alert! 📅", {
                      body: alertMsg,
                      icon: '/favicon.ico'
                    });
                  }
                }
              }
            }
          });
        }
      } catch (err) {
        console.error("Error parsing upcoming sessions alarm:", err);
      }
    };

    // Run immediately on activeUser change/mount, then every 30 seconds
    checkUpcomingSessions();
    const timer = setInterval(checkUpcomingSessions, 30000);
    return () => clearInterval(timer);
  }, [activeUser]);

  // 5. Global socket message listener for community group chats
  useEffect(() => {
    if (!socket || !activeUser) return;

    const handleGlobalMessageNotification = (msg: any) => {
      // Avoid showing alert for messages sent by the logged-in user
      if (msg.senderId === activeUser.id) return;

      const COMMUNITY_CIRCLES = [
        "Bengaluru Guitar Circle",
        "Python Learners India",
        "Design & Figma Swappers",
        "Wellness & Yoga Exchange"
      ];
      
      const isGroup = COMMUNITY_CIRCLES.includes(msg.receiverId);

      if ('Notification' in window && Notification.permission === 'granted') {
        if (isGroup) {
          new Notification(`Group: ${msg.receiverId} 👥`, {
            body: `${msg.senderName || 'Someone'}: ${msg.text}`,
            icon: '/favicon.ico'
          });
        } else {
          new Notification(`Message from ${msg.senderName || 'Someone'} 💬`, {
            body: msg.text,
            icon: '/favicon.ico'
          });
        }
      }
    };

    socket.on('message', handleGlobalMessageNotification);
    return () => {
      socket.off('message', handleGlobalMessageNotification);
    };
  }, [socket, activeUser]);

  // 6. Listen to real-time socket notification events and display native system alerts
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notif: any) => {
      console.log("[Socket.io] Real-time notification received:", notif);
      setNotifications(prev => {
        if (prev.some(n => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });

      // Show native system browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notif.title || "New Notification! 🚀", {
          body: notif.message || "",
          icon: '/favicon.ico'
        });
      }
    };

    socket.on('notification', handleNewNotification);

    return () => {
      socket.off('notification', handleNewNotification);
    };
  }, [socket]);

  // Fetch updated profile data on mount or tab focus
  useEffect(() => {
    async function fetchFreshProfile() {
      const token = localStorage.getItem('skillswap_token');
      if (token) {
        try {
          const res = await fetch(`${API_BASE}/users/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setActiveUser(data);
          }
        } catch (e) {}
      }
    }
    fetchFreshProfile();
  }, [currentTab, setActiveUser]);

  // Fetch notifications
  const fetchNotifications = async () => {
    const token = localStorage.getItem('skillswap_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchNotifications();
  }, [currentTab]);

  const handleMarkNotificationsRead = async () => {
    const token = localStorage.getItem('skillswap_token');
    if (!token) return;
    try {
      await fetch(`${API_BASE}/notifications/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (e) {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', height: '100%' }}>
      
      {/* Content Stack */}
      <div className="scrollable-content">
        {currentTab === 0 && (
          <HomeScreenView 
            activeUser={activeUser} 
            notifications={notifications}
            onMarkNotificationsRead={handleMarkNotificationsRead}
            onExplore={(search) => {
              if (search) {
                setDiscoverSearchQuery(search);
              } else {
                setDiscoverSearchQuery('');
              }
              setCurrentTab(1);
            }} 
          />
        )}
        {currentTab === 1 && <DiscoverScreenView initialSearch={discoverSearchQuery} />}
        {currentTab === 2 && (
          <ChatScreenView 
            socket={socket} 
            activeUserId={activeUser?.id} 
            activeUser={activeUser} 
            onInitiateCall={handleInitiateCall} 
            onOpenCommunity={() => {
              setCurrentTab(5);
            }} 
          />
        )}
        {currentTab === 3 && (
          <SessionsScreenView 
            onJoinSessionRoom={(s) => setActiveSessionRoom(s)}
            onRateSession={(target, sessionId) => {
              setRatingTarget(target);
              setRatingSessionId(sessionId);
            }}
            refreshTrigger={sessionRefreshTrigger}
          />
        )}
        {currentTab === 4 && (
          <ProfileScreenView 
            activeUser={activeUser} 
            setActiveUser={setActiveUser} 
            onLogout={onLogout} 
            onStartAssessment={onStartAssessment} 
            onDeleteAccount={() => {
              localStorage.removeItem('skillswap_token');
              setActiveUser(null);
              onLogout();
            }}
          />
        )}
        {currentTab === 5 && (
          <CommunityScreenView 
            activeUser={activeUser} 
            setActiveUser={setActiveUser} 
            onClose={() => setCurrentTab(2)} 
          />
        )}
      </div>

      {/* Navigation Bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 72,
        backgroundColor: '#161426',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 12px',
        zIndex: 50
      }}>
        <NavBarItem icon={currentTab === 0 ? <Compass size={22} style={{ color: '#6366F1' }} /> : <Compass size={22} />} active={currentTab === 0} label="Home" onClick={() => setCurrentTab(0)} />
        <NavBarItem icon={currentTab === 1 ? <Compass size={22} style={{ color: '#6366F1' }} /> : <Compass size={22} />} active={currentTab === 1} label="Discover" onClick={() => { setDiscoverSearchQuery(''); setCurrentTab(1); }} />
        <NavBarItem icon={currentTab === 2 ? <MessageSquare size={22} style={{ color: '#6366F1' }} /> : <MessageSquare size={22} />} active={currentTab === 2} label="Chat" onClick={() => setCurrentTab(2)} />
        <NavBarItem icon={currentTab === 3 ? <Calendar size={22} style={{ color: '#6366F1' }} /> : <Calendar size={22} />} active={currentTab === 3} label="Sessions" onClick={() => setCurrentTab(3)} />
        <NavBarItem icon={currentTab === 4 ? <User size={22} style={{ color: '#6366F1' }} /> : <User size={22} />} active={currentTab === 4} label="Profile" onClick={() => setCurrentTab(4)} />
      </div>

      {/* Active Session Room Overlay Container */}
      {activeSessionRoom && (
        <ActiveSessionRoom 
          session={activeSessionRoom}
          onLeave={() => setActiveSessionRoom(null)}
          onInitiateCall={handleInitiateCall}
          socket={socket}
          activeUserId={activeUser?.id || ''}
          onCompleteSession={async (ratingTargetObj) => {
            const token = localStorage.getItem('skillswap_token');
            if (token) {
              try {
                await fetch(`${API_BASE}/sessions/${activeSessionRoom.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ status: 'completed', isDone: false, isRated: false })
                });
              } catch (e) {
                console.error(e);
              }
            }
            setRatingTarget(ratingTargetObj);
            setRatingSessionId(activeSessionRoom.id);
            setActiveSessionRoom(null);
            setSessionRefreshTrigger(prev => prev + 1);
          }}
        />
      )}

      {/* Interactive Star Rating Modal */}
      {ratingTarget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(9, 8, 14, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          animation: 'fade-in 0.3s ease'
        }}>
          <div style={{
            backgroundColor: '#161426',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '24px',
            width: '100%',
            maxWidth: '320px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
              Rate Your Partner
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
              How was your learning experience with {ratingTarget.userName}?
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '10px 0' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setSelectedRating(star)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '28px',
                    color: star <= selectedRating ? '#F59E0B' : 'rgba(255,255,255,0.15)',
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease'
                  }}
                >
                  ★
                </button>
              ))}
            </div>

            <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
                Rate Trustworthiness
              </h4>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '10px' }}>
                Select their trust score based on session reliability:
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                {[0, 25, 50, 75, 100].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setSelectedTrustScore(score)}
                    style={{
                      padding: '8px 0',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: selectedTrustScore === score ? '#6366F1' : 'rgba(255,255,255,0.02)',
                      border: '1px solid',
                      borderColor: selectedTrustScore === score ? '#6366F1' : 'rgba(255,255,255,0.08)',
                      color: selectedTrustScore === score ? '#fff' : 'rgba(255,255,255,0.6)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      flex: 1
                    }}
                  >
                    {score}%
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button 
                onClick={() => setRatingTarget(null)}
                style={{
                  flex: 1,
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmitRating}
                disabled={isSubmittingRating}
                className="btn-primary"
                style={{
                  flex: 1,
                  height: '40px',
                  fontSize: '13px'
                }}
              >
                {isSubmittingRating ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📞 WEBTRC REAL-TIME CALL OVERLAYS */}
      {/* ========================================================================= */}
      {callStatus !== 'idle' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#09080E',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '60px 24px',
          animation: 'fade-in 0.4s ease',
          backgroundImage: 'radial-gradient(circle at center, #1E1A3C 0%, #09080E 100%)'
        }}>
          {/* Header info */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '40px' }}>
            {callStatus !== 'connected' && (
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: getAvatarColor(callPeerId || 'default'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '44px',
                color: 'white',
                fontWeight: 900,
                boxShadow: '0 0 50px rgba(99, 102, 241, 0.4)',
                animation: 'bounce-gentle 2.5s infinite ease-in-out',
                border: '3px solid rgba(255,255,255,0.1)',
                overflow: 'hidden'
              }}>
                {callPeerPicture ? (
                  <img src={callPeerPicture} alt={callPeerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  callPeerName.substring(0, 1).toUpperCase()
                )}
              </div>
            )}

            <div>
              {callStatus === 'outgoing' && (
                <>
                  <h3 style={{ fontSize: '26px', fontWeight: 900, margin: 0, color: '#fff' }}>{callPeerName}</h3>
                  <p style={{ color: '#6366F1', fontSize: '13px', fontWeight: 700, marginTop: '8px', letterSpacing: '2px', animation: 'pulse 1.5s infinite' }}>
                    CALLING...
                  </p>
                </>
              )}
              {callStatus === 'incoming' && (
                <>
                  <h3 style={{ fontSize: '26px', fontWeight: 900, margin: 0, color: '#fff' }}>{callPeerName}</h3>
                  <p style={{ color: '#10B981', fontSize: '13px', fontWeight: 700, marginTop: '8px', letterSpacing: '2px', animation: 'pulse 1.5s infinite' }}>
                    INCOMING CALL...
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Connected Call Space */}
          {callStatus === 'connected' && (
            <div style={{
              flex: 1,
              width: '100%',
              position: 'relative',
              borderRadius: '20px',
              overflow: 'hidden',
              backgroundColor: '#131121',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              margin: '20px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Main Enlarged Video Frame */}
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                {isLocalEnlarged ? (
                  // Local user is enlarged
                  videoDisabled ? (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#1E1A3C',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: '#6366F1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        color: 'white',
                        fontWeight: 800,
                        boxShadow: '0 0 30px rgba(99, 102, 241, 0.3)'
                      }}>
                        {activeUser?.name?.substring(0, 1).toUpperCase() || 'U'}
                      </div>
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Your camera is off</span>
                    </div>
                  ) : (
                    <video 
                      ref={remoteVideoCallbackRef} 
                      autoPlay 
                      playsInline 
                      muted={true} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  )
                ) : (
                  // Remote user is enlarged (default)
                  <video 
                    ref={remoteVideoCallbackRef} 
                    autoPlay 
                    playsInline 
                    muted={false} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                )}

                {/* Call Badge label overlay */}
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  backgroundColor: 'rgba(9, 8, 14, 0.75)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  zIndex: 10
                }}>
                  <div style={{ width: '6px', height: '6px', backgroundColor: '#EF4444', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>
                    {isLocalEnlarged ? 'YOU (PREVIEW)' : 'LIVE'}
                  </span>
                </div>
              </div>

              {/* Small PIP (Picture in Picture) Frame */}
              <div 
                onClick={() => setIsLocalEnlarged(prev => !prev)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '90px',
                  height: '130px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backgroundColor: '#09080E',
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  zIndex: 15,
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
              >
                {isLocalEnlarged ? (
                  // Remote user stream is in PIP
                  <video 
                    ref={localVideoCallbackRef} 
                    autoPlay 
                    playsInline 
                    muted={false} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  // Local user stream is in PIP
                  videoDisabled ? (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#1E1A3C',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#6366F1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        color: 'white',
                        fontWeight: 800
                      }}>
                        {activeUser?.name?.substring(0, 1).toUpperCase() || 'U'}
                      </div>
                      <VideoOff size={12} style={{ color: '#EF4444' }} />
                    </div>
                  ) : (
                    <video 
                      ref={localVideoCallbackRef} 
                      autoPlay 
                      playsInline 
                      muted={true} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  )
                )}
              </div>
            </div>
          )}

          {/* Call Controls Button Groups */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center', zIndex: 10 }}>
            {callStatus === 'connected' && (
              <>
                <button 
                  onClick={toggleMic}
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: micMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.06)',
                    border: micMuted ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
                    color: micMuted ? '#EF4444' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {micMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                <button 
                  onClick={handleEndCall}
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    backgroundColor: '#EF4444',
                    border: 'none',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 6px 20px rgba(239, 68, 68, 0.4)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <PhoneOff size={26} />
                </button>

                <button 
                  onClick={toggleVideo}
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: videoDisabled ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.06)',
                    border: videoDisabled ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
                    color: videoDisabled ? '#EF4444' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {videoDisabled ? <VideoOff size={20} /> : <Video size={20} />}
                </button>

                <button 
                  onClick={handleFlipCamera}
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title="Flip Camera"
                >
                  <RefreshCw size={20} />
                </button>
              </>
            )}

            {callStatus === 'outgoing' && (
              <button 
                onClick={handleEndCall}
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  backgroundColor: '#EF4444',
                  border: 'none',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 20px rgba(239, 68, 68, 0.4)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <PhoneOff size={26} />
              </button>
            )}

            {callStatus === 'incoming' && (
              <div style={{ display: 'flex', gap: '30px' }}>
                <button 
                  onClick={handleDeclineCall}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#EF4444',
                    border: 'none',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 6px 20px rgba(239, 68, 68, 0.4)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <PhoneOff size={24} />
                </button>

                <button 
                  onClick={handleAcceptCall}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    border: 'none',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Phone size={24} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NavBarItem({ icon, active, label, onClick }: { icon: React.ReactNode; active: boolean; label: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        color: active ? '#6366F1' : 'rgba(255,255,255,0.38)',
        cursor: 'pointer',
        flex: 1
      }}
    >
      {icon}
      <span style={{ fontSize: '10px', fontWeight: active ? 700 : 500 }}>{label}</span>
    </button>
  );
}

// =========================================================================
// 4️⃣ HOME SCREEN VIEW
// =========================================================================
function HomeScreenView({ 
  activeUser, 
  notifications,
  onMarkNotificationsRead,
  onExplore 
}: { 
  activeUser: any; 
  notifications: any[];
  onMarkNotificationsRead: () => void;
  onExplore: (search?: string) => void;
}) {
  const [showNotifOverlay, setShowNotifOverlay] = useState(false);
  const [upcomingSession, setUpcomingSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [swapperCount, setSwapperCount] = useState<number | null>(null);

  const userName = activeUser?.name || 'John Doe';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

  const hasUnread = notifications.some(n => !n.read);

  const handleOpenNotifications = () => {
    setShowNotifOverlay(true);
    onMarkNotificationsRead();
  };

  useEffect(() => {
    const fetchUpcoming = async () => {
      const token = localStorage.getItem('skillswap_token');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/sessions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const sessions = await res.json();
          // Find the first upcoming session (status: accepted, not done)
          const nextSess = sessions.find((s: any) => s.status === 'accepted' && !s.isDone);
          setUpcomingSession(nextSess || null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSession(false);
      }
    };

    const fetchSwappersCount = async () => {
      const token = localStorage.getItem('skillswap_token');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/users/discover`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const swappers = await res.json();
          setSwapperCount(swappers.length);
        }
      } catch (e) {}
    };

    fetchUpcoming();
    fetchSwappersCount();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', animation: 'fade-in 0.4s ease', position: 'relative' }}>
      
      {/* Welcome Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#8B5CF6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 0 15px rgba(139, 92, 246, 0.15)',
            border: '1.5px solid #8B5CF6'
          }}>
            {activeUser?.profilePicture || activeUser?.profileImage || activeUser?.avatarUrl ? (
              <img 
                src={activeUser.profilePicture || activeUser.profileImage || activeUser.avatarUrl} 
                alt={userName} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{userInitials}</span>
            )}
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px', fontWeight: 500 }}>Welcome back,</p>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>{userName}</h3>
          </div>
        </div>
        
        {/* Notification Icon */}
        <div 
          onClick={handleOpenNotifications}
          style={{ 
            position: 'relative', 
            cursor: 'pointer',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'}
        >
          <Bell size={20} style={{ color: 'rgba(255,255,255,0.7)' }} />
          {hasUnread && (
            <span style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#4ADE80',
              boxShadow: '0 0 10px #4ADE80'
            }} />
          )}
        </div>
      </div>

      {/* Promo banner */}
      <div style={{
        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '6px', alignItems: 'flex-start' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>Find Your Match</h4>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.4, marginBottom: '8px' }}>
            {swapperCount !== null 
              ? `Discover ${swapperCount} active swappers looking to exchange skills today.` 
              : "Discover active swappers looking to exchange skills today."}
          </p>
          <button 
            onClick={() => onExplore()}
            style={{
              backgroundColor: '#fff',
              color: '#6366F1',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Explore Now
          </button>
        </div>
        <MapPin size={56} style={{ color: 'rgba(255,255,255,0.18)', marginLeft: '12px' }} />
      </div>

      {/* Upcoming Session */}
      <div>
        <h4 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px' }}>Upcoming Session</h4>
        {loadingSession ? (
          <div className="glass-card" style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
            Loading session...
          </div>
        ) : upcomingSession ? (
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(74, 222, 128, 0.1)',
              borderRadius: '12px',
              color: '#4ADE80'
            }}>
              <Video size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h5 style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{upcomingSession.title}</h5>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                With {upcomingSession.partnerName} • {upcomingSession.date}
              </p>
            </div>
            <ChevronRight size={18} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
        ) : (
          <div className="glass-card" style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: 'rgba(255,255,255,0.4)', 
            fontSize: '13px',
            border: '1px dashed rgba(255,255,255,0.1)',
            borderRadius: '16px'
          }}>
            No upcoming swap sessions. Find a partner in Discover!
          </div>
        )}
      </div>

      {/* Trending Swaps */}
      <div>
        <h4 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px' }}>Trending Swaps</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <TrendingChip label="Flutter Framework" color="#6366F1" onClick={() => onExplore("Flutter Framework")} />
          <TrendingChip label="Figma UI Design" color="#8B5CF6" onClick={() => onExplore("Figma UI Design")} />
          <TrendingChip label="Python Deep Learning" color="#A1A1AA" onClick={() => onExplore("Python Deep Learning")} />
          <TrendingChip label="Digital Marketing" color="#2DD4BF" onClick={() => onExplore("Digital Marketing")} />
        </div>
      </div>

      {/* Dynamic Notification Drawer Overlay */}
      {showNotifOverlay && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(9, 8, 14, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          animation: 'fade-in 0.25s ease',
          borderRadius: '24px'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            backgroundColor: '#161426',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative',
            maxHeight: '80%',
            overflowY: 'auto',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Modal Close Button */}
            <button 
              onClick={() => setShowNotifOverlay(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Bell size={20} style={{ color: '#6366F1' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                Notifications
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notifications.length > 0 ? (
                notifications.map((notif) => {
                  let NotifIcon = Zap;
                  let iconColor = '#8B5CF6';
                  let iconBg = 'rgba(139, 92, 246, 0.1)';
                  
                  if (notif.type === 'verified') {
                    NotifIcon = CheckCircle;
                    iconColor = '#4ADE80';
                    iconBg = 'rgba(74, 222, 128, 0.1)';
                  } else if (notif.type === 'session') {
                    NotifIcon = Calendar;
                    iconColor = '#6366F1';
                    iconBg = 'rgba(99, 102, 241, 0.1)';
                  }

                  return (
                    <div 
                      key={notif.id}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '12px',
                        backgroundColor: notif.read ? 'rgba(255, 255, 255, 0.01)' : 'rgba(99, 102, 241, 0.04)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: '14px',
                        alignItems: 'flex-start',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: iconColor,
                        flexShrink: 0
                      }}>
                        <NotifIcon size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', margin: 0 }}>{notif.title}</h4>
                          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: 1.4, margin: '4px 0 0 0' }}>
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: '8px', color: 'rgba(255,255,255,0.3)' }}>
                  <Bell size={32} />
                  <span style={{ fontSize: '13px' }}>No notifications yet.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function TrendingChip({ label, color, onClick }: { label: string; color: string; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      style={{
        padding: '8px 14px',
        backgroundColor: `${color}1A`,
        border: `1px solid ${color}4D`,
        borderRadius: '20px',
        color: color,
        fontSize: '12px',
        fontWeight: 600,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        transition: 'transform 0.15s ease'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1.04)';
          e.currentTarget.style.backgroundColor = `${color}2B`;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.backgroundColor = `${color}1A`;
        }
      }}
    >
      {label}
    </div>
  );
}

// =========================================================================
// 5️⃣ DISCOVER SCREEN VIEW (Tinder-Swipe Mockup)
// =========================================================================
function DiscoverScreenView({ initialSearch = '' }: { initialSearch?: string }) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isSearchVisible, setIsSearchVisible] = useState(!!initialSearch);
  const [requestSentTo, setRequestSentTo] = useState<string | null>(null);
  const [swappers, setSwappers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSwappers = async () => {
    const token = localStorage.getItem('skillswap_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/users/discover`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSwappers(data);
      }
    } catch (err) {
      console.error("Failed to fetch swappers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSwappers();
  }, []);

  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch);
      setIsSearchVisible(true);
    }
  }, [initialSearch]);

  const filteredSwappers = swappers.filter(s => {
    const teaches = s.teaches ? String(s.teaches).toLowerCase() : '';
    const wants = s.wants ? String(s.wants).toLowerCase() : '';
    const name = s.name ? String(s.name).toLowerCase() : '';
    const query = searchQuery.toLowerCase();
    return teaches.includes(query) || wants.includes(query) || name.includes(query);
  });

  const handleRequestSwap = async (swapper: any) => {
    const token = localStorage.getItem('skillswap_token');
    if (token) {
      try {
        await fetch(`${API_BASE}/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            partnerId: swapper.id,
            partnerName: swapper.name,
            teaches: swapper.teaches.split(',')[0].trim(),
            wants: swapper.wants.split(',')[0].trim()
          })
        });
      } catch (err) {
        console.error("Failed to request swap session:", err);
      }
    }
    setRequestSentTo(swapper.name);
    setTimeout(() => {
      setRequestSentTo(null);
    }, 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px', animation: 'fade-in 0.4s ease' }}>
      
      {/* Premium Header with dynamic Search Input Toggle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: 0 }}>
            Discover Swappers
          </h3>
          {/* Beautiful glowing Search button replacing the sort/settings button */}
          <button 
            onClick={() => setIsSearchVisible(!isSearchVisible)}
            style={{
              background: isSearchVisible ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: isSearchVisible ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '12px',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isSearchVisible ? '#6366F1' : '#fff',
              boxShadow: isSearchVisible ? '0 0 12px rgba(99, 102, 241, 0.3)' : 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={(e) => {
              if (!isSearchVisible) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSearchVisible) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
              }
            }}
          >
            <Search size={18} />
          </button>
        </div>

        {/* Dynamic Skill Search Bar with smooth height transition */}
        <div style={{
          maxHeight: isSearchVisible ? '50px' : '0px',
          opacity: isSearchVisible ? 1 : 0,
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '14px',
            padding: '10px 14px',
            gap: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
          }}>
            <Search size={18} style={{ color: 'rgba(255, 255, 255, 0.38)' }} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skill (e.g. Flutter, Figma, Python...)"
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'white',
                fontSize: '13px'
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Request Alert Notification Toast */}
      {requestSentTo && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 48px)',
          maxWidth: '372px',
          backgroundColor: '#161426',
          border: '1px solid rgba(74, 222, 128, 0.4)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 15px rgba(74, 222, 128, 0.1)',
          color: '#4ADE80',
          padding: '14px 16px',
          borderRadius: '14px',
          fontSize: '13px',
          fontWeight: 600,
          textAlign: 'center',
          animation: 'fade-in 0.3s ease',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <CheckCircle size={18} style={{ color: '#4ADE80', flexShrink: 0 }} />
          <span>Swap request sent to {requestSentTo}!</span>
        </div>
      )}

      {/* Scrolling available swappers list */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        overflowY: 'auto',
        paddingBottom: '80px'
      }}>
        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>Loading swappers...</p>
        ) : filteredSwappers.length > 0 ? (
          filteredSwappers.map((swapper) => (
            <div 
              key={swapper.id}
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '20px',
                padding: '16px',
                animation: 'fade-in 0.3s ease',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
              }}
            >
              {/* Header profile row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Circular Avatar */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: swapper.id === '1' || swapper.id === '4' ? '#8B5CF6' : '#6366F1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    color: '#fff',
                    fontSize: '14px',
                    overflow: 'hidden'
                  }}>
                    {swapper.profilePicture || swapper.profileImage || swapper.avatarUrl ? (
                      <img src={swapper.profilePicture || swapper.profileImage || swapper.avatarUrl} alt={swapper.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      swapper.avatar
                    )}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>{swapper.name}</h4>
                      <CheckCircle size={14} style={{ color: '#4ADE80' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{swapper.title}</span>
                  </div>
                </div>

                {/* Match percentage badge */}
                <span style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#6366F1',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(99, 102, 241, 0.2)'
                }}>
                  {swapper.matchScore} Match
                </span>
              </div>

              {/* Teaches and Wants labels with score, rating, and learners */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="badge-tag" style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)', color: '#4ADE80', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      🎓 Teaches: {swapper.teaches}
                    </span>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>
                      <span style={{ color: '#4ADE80', fontWeight: 600 }}>Score: {swapper.score}</span>
                      <span style={{ color: '#FBBF24', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        ★ {swapper.rating} ({swapper.learnersCount} learnt)
                      </span>
                    </div>
                  </div>
                  
                  <span className="badge-tag" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)', color: '#60A5FA', fontSize: '11px', alignSelf: 'flex-start' }}>
                    🚀 Wants: {swapper.wants}
                  </span>
                </div>
              </div>

              <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }} />

              {/* Timings, Language and Experience Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '18px', textAlign: 'center' }}>📅</span>
                  <span><strong>Availability:</strong> {swapper.availability}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '18px', textAlign: 'center' }}>🗣️</span>
                  <span><strong>Languages:</strong> {swapper.language}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '18px', textAlign: 'center' }}>💼</span>
                  <span><strong>Experience:</strong> {swapper.experience}</span>
                </div>
              </div>

              {/* Action Request Button */}
              <button 
                onClick={() => handleRequestSwap(swapper)}
                className="btn-primary"
                style={{
                  width: '100%',
                  height: '38px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  marginTop: '4px'
                }}
              >
                Request Swap Session
              </button>

            </div>
          ))
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            backgroundColor: '#161426',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '40px 24px',
            gap: '16px',
            marginTop: '20px'
          }}>
            <Search size={40} style={{ color: 'rgba(255,255,255,0.2)' }} />
            <h4 style={{ fontSize: '16px', fontWeight: 800 }}>No Swappers Found</h4>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', maxWidth: '220px', lineHeight: 1.5 }}>
              No swappers found teaching or wanting "{searchQuery}". Try searching another skill!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function getAvatarColor(id: string) {
  const colors = ['#6366F1', '#8B5CF6', '#3B82F6', '#10B981', '#EC4899', '#F59E0B'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// =========================================================================
// 6️⃣ CHAT SCREEN VIEW (Detailed Chat Bubble flow with Simulated calling)
// =========================================================================
function ChatScreenView({ 
  socket, 
  activeUserId, 
  activeUser,
  onInitiateCall,
  onOpenCommunity
}: { 
  socket: Socket | null; 
  activeUserId: string; 
  activeUser: any;
  onInitiateCall: (partnerId: string, partnerName: string, partnerPicture?: string) => void; 
  onOpenCommunity: () => void;
}) {
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(true);

  // Connect to joined circle socket rooms
  useEffect(() => {
    if (socket && activeUser?.joinedCircles) {
      activeUser.joinedCircles.forEach((circleName: string) => {
        socket.emit('join-circle', { circleName });
        console.log(`[Socket.io] Joined circle room: ${circleName}`);
      });
    }
  }, [socket, activeUser?.joinedCircles]);

  // Fetch active conversations list
  const fetchConversations = async () => {
    const token = localStorage.getItem('skillswap_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/chats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        
        // Prepend joined communities
        const COMMUNITY_INFOS = {
          "Bengaluru Guitar Circle": { emoji: "🎸", color: "#F59E0B" },
          "Python Learners India": { emoji: "🐍", color: "#10B981" },
          "Design & Figma Swappers": { emoji: "🎨", color: "#EC4899" },
          "Wellness & Yoga Exchange": { emoji: "🧘", color: "#8B5CF6" }
        };
        
        const circleConvs = (activeUser?.joinedCircles || []).map((circleName: string) => {
          const info = (COMMUNITY_INFOS as any)[circleName] || { emoji: "👥", color: "#6366F1" };
          return {
            partnerId: circleName,
            partnerName: circleName,
            lastMessage: "Group chat room",
            isGroup: true,
            emoji: info.emoji,
            color: info.color
          };
        });
        
        setConversations([...circleConvs, ...data]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch active message thread
  const fetchMessages = async () => {
    if (!activePartnerId) return;

    const token = localStorage.getItem('skillswap_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/chats/${activePartnerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Listen to socket message events in real-time
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      console.log("[Socket.io] Real-time message received:", msg);
      
      // Update active thread if open
      if (activePartnerId) {
        const isMsgForActiveThread = 
          (msg.senderId === activePartnerId && msg.receiverId === activeUserId) ||
          (msg.senderId === activeUserId && msg.receiverId === activePartnerId) ||
          (msg.receiverId === activePartnerId);

        if (isMsgForActiveThread) {
          const clientMsg = {
            text: msg.text,
            isMe: msg.senderId === activeUserId,
            senderId: msg.senderId,
            senderName: msg.senderName
          };
          setMessages(prev => {
            const isDuplicate = prev.some(m => m.text === clientMsg.text && m.isMe === clientMsg.isMe && (Date.now() - (msg.timestamp || 0) < 5000));
            if (isDuplicate) return prev;
            return [...prev, clientMsg];
          });
        }
      }

      // Update conversations sidebar/list dynamically
      setConversations(prev => {
        const partnerId = msg.senderId === activeUserId ? msg.receiverId : msg.senderId;
        const existingConv = prev.find(c => c.partnerId === partnerId);
        
        if (existingConv) {
          const updatedConv = { ...existingConv, lastMessage: msg.text };
          const filtered = prev.filter(c => c.partnerId !== partnerId);
          return [updatedConv, ...filtered];
        } else {
          fetchConversations();
          return prev;
        }
      });
    };

    socket.on('message', handleNewMessage);

    return () => {
      socket.off('message', handleNewMessage);
    };
  }, [socket, activePartnerId, activeUserId]);

  // Fetch conversations directory on load
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch active thread on selection change
  useEffect(() => {
    if (activePartnerId) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [activePartnerId]);

  const handleSend = async () => {
    if (!inputVal.trim() || !activePartnerId) return;

    const token = localStorage.getItem('skillswap_token');
    if (!token) return;

    // Optimistically update
    const tempMsg = { text: inputVal, isMe: true };
    setMessages(prev => [...prev, tempMsg]);
    const sentText = inputVal;
    setInputVal("");

    try {
      const res = await fetch(`${API_BASE}/chats/${activePartnerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: sentText })
      });
      if (res.ok) {
        fetchMessages();
        fetchConversations();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // Find active partner details
  const activePartner = conversations.find(c => c.partnerId === activePartnerId) || {
    partnerName: 'SkillSwap Explorer',
    partnerId: activePartnerId
  };

  // Render Inbox Connections Directory List
  if (!activePartnerId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px', animation: 'fade-in 0.4s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: 0 }}>
            Messages
          </h3>
          <button
            onClick={onOpenCommunity}
            style={{
              backgroundColor: '#8B5CF6',
              border: 'none',
              color: 'white',
              borderRadius: '12px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            <Users size={16} />
            Community
          </button>
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflowY: 'auto',
          paddingBottom: '80px'
        }}>
          {loading ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>Loading conversations...</p>
          ) : conversations.length > 0 ? (
            conversations.map((chat) => (
              <div 
                key={chat.partnerId}
                onClick={() => {
                  setActivePartnerId(chat.partnerId);
                  fetchMessages();
                }}
                className="glass-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                  gap: '14px',
                  transition: 'all 0.25s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                }}
              >
                {/* Contact Circular Avatar */}
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: chat.isGroup ? `${chat.color}15` : getAvatarColor(chat.partnerId || ''),
                  border: chat.isGroup ? `1.5px solid ${chat.color}` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  color: '#fff',
                  fontSize: '14px',
                  position: 'relative'
                }}>
                  {chat.isGroup ? (
                    chat.emoji
                  ) : chat.partnerPicture || chat.partnerImage ? (
                    <img src={chat.partnerPicture || chat.partnerImage} alt={chat.partnerName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    chat.partnerName.substring(0, 1).toUpperCase()
                  )}
                  <span style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: chat.isGroup ? chat.color : '#4ADE80',
                    border: '2px solid #161426'
                  }} />
                </div>

                {/* Connection details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {chat.partnerName}
                    </h4>
                    {chat.isGroup && (
                      <span style={{
                        fontSize: '8px',
                        fontWeight: 800,
                        color: chat.color,
                        backgroundColor: `${chat.color}15`,
                        border: `1.5px solid ${chat.color}35`,
                        borderRadius: '6px',
                        padding: '1px 5px',
                        textTransform: 'uppercase'
                      }}>
                        Community
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.45)',
                    marginTop: '4px',
                    margin: '4px 0 0 0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {chat.lastMessage}
                  </p>
                </div>
                
                <ChevronRight size={18} style={{ color: 'rgba(255,255,255,0.2)' }} />
              </div>
            ))
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '60px 24px',
              gap: '16px',
              backgroundColor: '#161426',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <MessageSquare size={40} style={{ color: 'rgba(255,255,255,0.15)' }} />
              <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: 0 }}>No Connections Yet</h4>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', maxWidth: '200px', lineHeight: 1.5, margin: 0 }}>
                Request a swap session on the Discover tab to connect and start chatting!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', position: 'relative', animation: 'fade-in 0.4s ease' }}>
      
      {/* Direct Chat Header bar with Back button navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: '#161426',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Back button */}
          <button 
            onClick={() => setActivePartnerId(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              marginRight: '2px',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
          >
            <X size={18} />
          </button>

          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: activePartner.isGroup ? `${activePartner.color}15` : getAvatarColor(activePartnerId || ''),
            border: activePartner.isGroup ? `1px solid ${activePartner.color}` : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '13px'
          }}>
            {activePartner.isGroup ? (
              activePartner.emoji
            ) : activePartner.partnerPicture || activePartner.partnerImage ? (
              <img src={activePartner.partnerPicture || activePartner.partnerImage} alt={activePartner.partnerName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              activePartner.partnerName.substring(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'white', margin: 0 }}>{activePartner.partnerName}</h4>
            <span style={{ fontSize: '10px', color: activePartner.isGroup ? activePartner.color : '#4ADE80', fontWeight: 600 }}>
              {activePartner.isGroup ? 'Community Room' : 'Active Now'}
            </span>
          </div>
        </div>
        
        {/* Launch Video button call */}
        {!activePartner.isGroup && (
          <button 
            onClick={() => onInitiateCall(activePartnerId || '', activePartner.partnerName, activePartner.partnerPicture || activePartner.partnerImage)}
            style={{ background: 'none', border: 'none', color: '#6366F1', cursor: 'pointer' }}
          >
            <Video size={20} />
          </button>
        )}
      </div>

      {/* Bubble view panel */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px 4px'
      }}>
        {messages.length > 0 ? (
          messages.map((msg, i) => (
            <div 
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.isMe ? 'flex-end' : 'flex-start',
                alignSelf: msg.isMe ? 'flex-end' : 'flex-start',
                gap: '4px'
              }}
            >
              {activePartner.isGroup && !msg.isMe && msg.senderName && (
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>
                  {msg.senderName}
                </span>
              )}
              <div 
                style={{
                  maxWidth: '270px',
                  padding: '14px',
                  borderRadius: '16px',
                  backgroundColor: msg.isMe ? '#6366F1' : '#161426',
                  border: msg.isMe ? 'none' : '1px solid rgba(255,255,255,0.04)',
                  color: '#fff',
                  fontSize: '13px',
                  lineHeight: 1.4,
                  borderBottomLeftRadius: msg.isMe ? '16px' : '0px',
                  borderBottomRightRadius: msg.isMe ? '0px' : '16px',
                  animation: 'fade-in 0.3s ease'
                }}
              >
                {msg.text}
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', textAlign: 'center', marginTop: '40px' }}>No messages exchanged yet.</p>
        )}
      </div>

      {/* Input tray */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#161426',
        borderRadius: '20px',
        padding: '8px 12px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <button style={{ background: 'none', border: 'none', color: '#6366F1', cursor: 'pointer', padding: '4px' }}>
          <Paperclip size={18} />
        </button>
        <input 
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Type your message..."
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: 'white',
            fontSize: '13px',
            padding: '0 12px'
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button 
          onClick={handleSend}
          style={{ background: 'none', border: 'none', color: '#6366F1', cursor: 'pointer', padding: '4px' }}
        >
          <Send size={18} />
        </button>
      </div>

    </div>
  );
}

// =========================================================================
// 7️⃣ SESSIONS SCREEN VIEW
// =========================================================================
function SessionsScreenView({ 
  onJoinSessionRoom,
  onRateSession,
  refreshTrigger
}: { 
  onJoinSessionRoom: (s: any) => void;
  onRateSession: (target: { userId: string; userName: string }, sessionId: string) => void;
  refreshTrigger?: number;
}) {
  const [activeSubTab, setActiveSubTab] = useState(0); // 0: Pending, 1: Upcoming, 2: Completed
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    const token = localStorage.getItem('skillswap_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [refreshTrigger]);

  const handleAcceptSession = async (sessionId: string) => {
    const token = localStorage.getItem('skillswap_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'accepted' })
      });
      if (res.ok) {
        fetchSessions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    const token = localStorage.getItem('skillswap_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchSessions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pendingSessions = sessions.filter(s => s.status === 'pending' && !s.isDone);
  const upcomingSessions = sessions.filter(s => s.status === 'accepted' || (s.status === 'completed' && !s.isRated));
  const completedSessions = sessions.filter(s => s.status === 'completed' && s.isRated);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fade-in 0.4s ease' }}>
      <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Your Sessions</h3>

      {/* Tab Selectors */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button 
          onClick={() => setActiveSubTab(0)}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 0 ? '2px solid #6366F1' : 'none',
            color: activeSubTab === 0 ? '#6366F1' : 'rgba(255,255,255,0.4)',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Pending
        </button>
        <button 
          onClick={() => setActiveSubTab(1)}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 1 ? '2px solid #6366F1' : 'none',
            color: activeSubTab === 1 ? '#6366F1' : 'rgba(255,255,255,0.4)',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Upcoming
        </button>
        <button 
          onClick={() => setActiveSubTab(2)}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 2 ? '2px solid #6366F1' : 'none',
            color: activeSubTab === 2 ? '#6366F1' : 'rgba(255,255,255,0.4)',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Completed
        </button>
      </div>

      {/* Tab Panels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center' }}>Loading sessions...</p>
        ) : activeSubTab === 0 ? (
          pendingSessions.length > 0 ? (
            pendingSessions.map(s => (
              <SessionInfoCard 
                key={s.id}
                title={s.title} 
                partner={s.partnerName} 
                date={s.date} 
                liveSoon={s.liveSoon} 
                status={s.status}
                isInbound={s.isInbound}
                partnerPicture={s.partnerPicture}
                onAccept={() => handleAcceptSession(s.id)}
                onCancel={() => handleCancelSession(s.id)}
              />
            ))
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center' }}>No pending requests.</p>
          )
        ) : activeSubTab === 1 ? (
          upcomingSessions.length > 0 ? (
            upcomingSessions.map(s => (
              <SessionInfoCard 
                key={s.id}
                title={s.title} 
                partner={s.partnerName} 
                date={s.date} 
                liveSoon={s.liveSoon} 
                status={s.status}
                partnerPicture={s.partnerPicture}
                onJoin={() => onJoinSessionRoom(s)}
                onRate={() => onRateSession({ userId: s.partnerId, userName: s.partnerName }, s.id)}
              />
            ))
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center' }}>No upcoming sessions scheduled.</p>
          )
        ) : (
          completedSessions.length > 0 ? (
            completedSessions.map(s => (
              <SessionInfoCard 
                key={s.id}
                title={s.title} 
                partner={s.partnerName} 
                date={s.completedAt ? s.completedAt : s.date} 
                liveSoon={s.liveSoon} 
                status="completed"
                isDone={true} 
                partnerPicture={s.partnerPicture}
                onRate={() => onRateSession({ userId: s.partnerId, userName: s.partnerName }, s.id)}
              />
            ))
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center' }}>No completed sessions found.</p>
          )
        )}
      </div>
    </div>
  );
}

function SessionInfoCard({ 
  title, 
  partner, 
  date, 
  liveSoon, 
  isDone,
  status,
  isInbound,
  partnerPicture,
  onJoin,
  onAccept,
  onCancel,
  onRate
}: { 
  title: string; 
  partner: string; 
  date: string; 
  liveSoon: boolean; 
  isDone?: boolean;
  status?: 'pending' | 'accepted' | 'completed';
  isInbound?: boolean;
  partnerPicture?: string;
  onJoin?: () => void;
  onAccept?: () => void;
  onCancel?: () => void;
  onRate?: () => void;
}) {
  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h4 style={{ fontSize: '15px', fontWeight: 800 }}>{title}</h4>
        
        {/* Status badges */}
        {status === 'pending' && (
          <span style={{
            fontSize: '9px',
            fontWeight: 800,
            color: isInbound ? '#FBBF24' : '#60A5FA',
            backgroundColor: isInbound ? 'rgba(251, 191, 36, 0.15)' : 'rgba(96, 165, 250, 0.15)',
            padding: '3px 8px',
            borderRadius: '6px',
            letterSpacing: '0.5px'
          }}>
            {isInbound ? 'INBOUND REQUEST' : 'SENT REQUEST'}
          </span>
        )}
        {status === 'accepted' && liveSoon && (
          <span style={{
            fontSize: '9px',
            fontWeight: 800,
            color: '#4ADE80',
            backgroundColor: 'rgba(74, 222, 128, 0.15)',
            padding: '3px 8px',
            borderRadius: '6px',
            letterSpacing: '0.5px'
          }}>
            LIVE SOON
          </span>
        )}
        {status === 'completed' && (
          <span style={{
            fontSize: '9px',
            fontWeight: 800,
            color: '#9CA3AF',
            backgroundColor: 'rgba(156, 163, 175, 0.15)',
            padding: '3px 8px',
            borderRadius: '6px',
            letterSpacing: '0.5px'
          }}>
            COMPLETED
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: '#6366F1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 800,
          color: '#fff',
          overflow: 'hidden'
        }}>
          {partnerPicture ? (
            <img src={partnerPicture} alt={partner} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            partner.substring(0, 1).toUpperCase()
          )}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', margin: 0 }}>With {partner}</p>
      </div>
      
      <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          📅 {date}
        </span>
        
        {/* Dynamic actions based on status and direction */}
        {status === 'pending' ? (
          isInbound ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={onCancel} // Decline uses cancel callback
                style={{
                  backgroundColor: 'transparent',
                  color: '#EF4444',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Decline
              </button>
              <button 
                onClick={onAccept}
                style={{
                  backgroundColor: '#4ADE80',
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 0 10px rgba(74, 222, 128, 0.3)'
                }}
              >
                Accept Swap
              </button>
            </div>
          ) : (
            <button 
              onClick={onCancel}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancel Request
            </button>
          )
        ) : status === 'completed' ? (
          <button 
            onClick={onRate}
            style={{
              backgroundColor: '#F59E0B',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.25)'
            }}
          >
            ★ Rate Partner
          </button>
        ) : !isDone && (
          <button 
            onClick={onJoin}
            style={{
              backgroundColor: '#6366F1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Join Room
          </button>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// 8️⃣ PROFILE SCREEN VIEW
// =========================================================================
function ProfileScreenView({ 
  activeUser, 
  setActiveUser, 
  onLogout, 
  onStartAssessment,
  onDeleteAccount
}: { 
  activeUser: any; 
  setActiveUser: (u: any) => void;
  onLogout: () => void;
  onStartAssessment: (skillName: string, category: 'teaches' | 'wants') => void;
  onDeleteAccount: () => void;
}) {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isAddingTeach, setIsAddingTeach] = useState(false);
  const [newTeachInput, setNewTeachInput] = useState('');
  const [isAddingWant, setIsAddingWant] = useState(false);
  const [newWantInput, setNewWantInput] = useState('');
  
  // AI Support Chat & Security Settings States
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<any[]>([
    { text: "Hello! I am your SkillSwap AI Support Assistant. How can I help you today?", isMe: false }
  ]);
  const [aiChatInput, setAiChatInput] = useState("");
  const [aiIsTyping, setAiIsTyping] = useState(false);

  const handleSendAiMessage = async () => {
    const txt = aiChatInput.trim();
    if (!txt) return;

    const userMsg = { text: txt, isMe: true };
    setAiChatMessages(prev => [...prev, userMsg]);
    setAiChatInput("");
    setAiIsTyping(true);

    try {
      const res = await fetch(`${API_BASE}/support/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: txt })
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setAiChatMessages(prev => [...prev, { text: data.reply, isMe: false }]);
      } else {
        setAiChatMessages(prev => [...prev, { text: "Sorry, I am having trouble connecting to my support servers right now. Please try again.", isMe: false }]);
      }
    } catch (e) {
      setAiChatMessages(prev => [...prev, { text: "Connection error. Please check your internet connection or server status.", isMe: false }]);
    } finally {
      setAiIsTyping(false);
    }
  };

  const sendFaqMessage = async (question: string) => {
    const userMsg = { text: question, isMe: true };
    setAiChatMessages(prev => [...prev, userMsg]);
    setAiIsTyping(true);

    try {
      const res = await fetch(`${API_BASE}/support/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question })
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setAiChatMessages(prev => [...prev, { text: data.reply, isMe: false }]);
      } else {
        setAiChatMessages(prev => [...prev, { text: "Sorry, I am having trouble connecting to my support servers right now. Please try again.", isMe: false }]);
      }
    } catch (e) {
      setAiChatMessages(prev => [...prev, { text: "Connection error. Please check your internet connection or server status.", isMe: false }]);
    } finally {
      setAiIsTyping(false);
    }
  };
  
  // Password Change States
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 4) {
      setPasswordError('New password must be at least 4 characters long.');
      return;
    }

    const token = localStorage.getItem('skillswap_token');
    if (!token) {
      setPasswordError('Session expired. Please log in again.');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/users/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordSuccess('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsChangingPassword(false);
          setPasswordSuccess('');
        }, 1500);
      } else {
        setPasswordError(data.error || 'Failed to change password.');
      }
    } catch (err: any) {
      setPasswordError(`Connection error (${API_BASE}): ${err.message || err}`);
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(activeUser?.title || '');
  const [editBio, setEditBio] = useState(activeUser?.bio || '');
  const [editAbout, setEditAbout] = useState(activeUser?.about || '');
  const [editAvailability, setEditAvailability] = useState(activeUser?.availability || '');
  const [editLanguage, setEditLanguage] = useState(activeUser?.language || '');
  const [editExperience, setEditExperience] = useState(activeUser?.experience || '');
  const [editProfilePicture, setEditProfilePicture] = useState(activeUser?.profilePicture || '');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize edit fields when edit mode opens
  const handleStartEdit = () => {
    setEditTitle(activeUser?.title || '');
    setEditBio(activeUser?.bio || '');
    setEditAbout(activeUser?.about || '');
    setEditAvailability(activeUser?.availability || '');
    setEditLanguage(activeUser?.language || '');
    setEditExperience(activeUser?.experience || '');
    setEditProfilePicture(activeUser?.profilePicture || '');
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    const token = localStorage.getItem('skillswap_token');
    if (!token) return;

    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTitle,
          bio: editBio,
          about: editAbout,
          availability: editAvailability,
          language: editLanguage,
          experience: editExperience,
          profilePicture: editProfilePicture
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveUser(data);
        setIsEditing(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const userName = activeUser?.name || 'John Doe';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  const userEmail = activeUser?.email || 'john@example.com';
  const trustScore = activeUser?.trustScore || '0%';
  const swapsDone = activeUser?.swapsCount || '0';
  const rating = activeUser?.ratingValue || '0.0';
  const communities = activeUser?.joinedCircles?.length || 0;

  const teachesList = activeUser?.teaches || [];
  const wantsList = activeUser?.wants || [];

  const updateProfileSkills = async (updatedTeaches: string[], updatedWants: string[]) => {
    const token = localStorage.getItem('skillswap_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          teaches: updatedTeaches,
          wants: updatedWants
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveUser(data);
      }
    } catch (err) {
      console.error("Failed to update profile skills:", err);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("Are you absolutely sure you want to permanently delete your account? This action is irreversible.");
    if (!confirmDelete) return;
    
    const token = localStorage.getItem('skillswap_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/users/profile`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setShowSettingsModal(false);
        onDeleteAccount();
      } else {
        alert("Failed to delete account.");
      }
    } catch (e) {
      console.error(e);
      alert("Error connecting to server.");
    }
  };

  const handleAddTeachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = newTeachInput.trim();
    if (val && !teachesList.includes(val)) {
      onStartAssessment(val, 'teaches');
    }
    setNewTeachInput('');
    setIsAddingTeach(false);
  };

  const handleRemoveTeach = async (skillToRemove: string) => {
    const updatedTeaches = teachesList.filter((s: string) => s !== skillToRemove);
    await updateProfileSkills(updatedTeaches, wantsList);
  };

  const handleAddWantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = newWantInput.trim();
    if (val && !wantsList.includes(val)) {
      await updateProfileSkills(teachesList, [...wantsList, val]);
    }
    setNewWantInput('');
    setIsAddingWant(false);
  };

  const handleRemoveWant = async (skillToRemove: string) => {
    const updatedWants = wantsList.filter((s: string) => s !== skillToRemove);
    await updateProfileSkills(teachesList, updatedWants);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fade-in 0.4s ease', position: 'relative' }}>
      
      {/* Top Header Settings Control */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '-20px' }}>
        <button 
          onClick={isEditing ? () => setIsEditing(false) : handleStartEdit}
          style={{
            background: isEditing ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
            border: isEditing ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            color: isEditing ? '#EF4444' : '#6366F1',
            transition: 'all 0.2s ease'
          }}
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
        <button 
          onClick={() => setShowSettingsModal(true)}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Profile summary card */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#8B5CF6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            fontWeight: 800,
            color: '#fff',
            overflow: 'hidden'
          }}>
            {activeUser?.profilePicture || activeUser?.profileImage || activeUser?.avatarUrl ? (
              <img src={activeUser.profilePicture || activeUser.profileImage || activeUser.avatarUrl} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              userInitials
            )}
          </div>
          <span style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: '#4ADE80',
            border: '2px solid #0F0E17',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '11px',
            fontWeight: 'bold'
          }}>
            ✓
          </span>
        </div>

        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', textAlign: 'center' }}>
          {userName}
        </h3>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '-8px' }}>{userEmail}</span>
        <span style={{ color: '#4ADE80', fontSize: '13px', fontWeight: 600 }}>Trust Score: {trustScore}</span>
      </div>

      {/* Stats counter strip */}
      <div style={{ display: 'flex', justifyContent: 'space-around', backgroundColor: '#161426', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ textAlign: 'center' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 800 }}>{swapsDone}</h4>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)' }}>Swaps Done</span>
        </div>
        <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <div style={{ textAlign: 'center' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 800 }}>{rating}</h4>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)' }}>Rating</span>
        </div>
        <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <div style={{ textAlign: 'center' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 800 }}>{communities}</h4>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)' }}>Communities</span>
        </div>
      </div>

      {/* Joined Communities Section */}
      {activeUser?.joinedCircles && activeUser.joinedCircles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px', marginTop: '4px' }}>
            Joined Communities
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeUser.joinedCircles.map((circleName: string) => {
              const COMMUNITY_INFOS = {
                "Bengaluru Guitar Circle": { emoji: "🎸", color: "#F59E0B" },
                "Python Learners India": { emoji: "🐍", color: "#10B981" },
                "Design & Figma Swappers": { emoji: "🎨", color: "#EC4899" },
                "Wellness & Yoga Exchange": { emoji: "🧘", color: "#8B5CF6" }
              };
              const info = (COMMUNITY_INFOS as any)[circleName] || { emoji: "👥", color: "#6366F1" };
              return (
                <div 
                  key={circleName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: '#161426',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.04)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontSize: '20px',
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {info.emoji}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{circleName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: info.color,
                      backgroundColor: `${info.color}15`,
                      border: `1px solid ${info.color}35`,
                      borderRadius: '8px',
                      padding: '2px 8px',
                      textTransform: 'uppercase'
                    }}>
                      Active
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isEditing ? (
        // EDIT MODE LAYOUT
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#161426', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 4px 0' }}>Edit Profile Details</h4>
          
          {/* Edit Profile Picture Row */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '16px' }}>
            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Profile Picture</label>
            
            {/* Main preview circle */}
            <div style={{
              position: 'relative',
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              border: '2px solid #8B5CF6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1E1B4B',
              overflow: 'hidden'
            }}>
              {editProfilePicture ? (
                <img src={editProfilePicture} alt="Selected Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={30} style={{ color: 'rgba(255,255,255,0.4)' }} />
              )}
            </div>

            {/* Custom file input */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const base64Str = event.target?.result as string;
                      if (base64Str) {
                        setEditProfilePicture(base64Str);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '10px',
                  padding: '6px 14px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#6366F1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.12)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
                }}
              >
                📷 Choose Photo from Device
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Professional Title</label>
            <input 
              type="text" 
              value={editTitle} 
              onChange={(e) => setEditTitle(e.target.value)}
              style={{ width: '100%', height: '38px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0 12px', color: 'white', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Short Bio</label>
            <input 
              type="text" 
              value={editBio} 
              onChange={(e) => setEditBio(e.target.value)}
              style={{ width: '100%', height: '38px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0 12px', color: 'white', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>About Me</label>
            <textarea 
              rows={3} 
              value={editAbout} 
              onChange={(e) => setEditAbout(e.target.value)}
              style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px', color: 'white', fontSize: '13px', resize: 'none', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Experience Level</label>
            <input 
              type="text" 
              value={editExperience} 
              onChange={(e) => setEditExperience(e.target.value)}
              style={{ width: '100%', height: '38px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0 12px', color: 'white', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Languages</label>
            <input 
              type="text" 
              value={editLanguage} 
              onChange={(e) => setEditLanguage(e.target.value)}
              style={{ width: '100%', height: '38px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0 12px', color: 'white', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Availability</label>
            <input 
              type="text" 
              value={editAvailability} 
              onChange={(e) => setEditAvailability(e.target.value)}
              style={{ width: '100%', height: '38px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0 12px', color: 'white', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <button 
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="btn-primary"
            style={{ width: '100%', height: '38px', fontSize: '12px', fontWeight: 700, marginTop: '8px', opacity: isSaving ? 0.7 : 1 }}
          >
            {isSaving ? 'Saving...' : 'Save Profile Details'}
          </button>
        </div>
      ) : (
        // STATIC VIEWER MODE
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>About Me</h4>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: 1.5 }}>
              {activeUser?.about || 'No details specified.'}
            </p>
          </div>

          {/* Details strip */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.04)', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Title:</span>
              <span>{activeUser?.title || 'SkillSwap Explorer'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Bio:</span>
              <span>{activeUser?.bio || 'Passionate explorer'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Experience:</span>
              <span>{activeUser?.experience || '1+ Years'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Languages:</span>
              <span>{activeUser?.language || 'English'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Availability:</span>
              <span>{activeUser?.availability || 'Weekends, Flexible'}</span>
            </div>
          </div>

          {/* Teaches Section */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              What Skills Can I Teach 🎓
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {teachesList.map((skill: string, index: number) => {
                const skillScore = activeUser?.skillScores?.[skill];
                const skillRating = activeUser?.skillRatings?.[skill] || (skillScore !== undefined ? '4.9' : undefined);
                const skillLearners = activeUser?.skillLearners?.[skill] || (skillScore !== undefined ? '12' : undefined);
                return (
                  <div 
                    key={index}
                    style={{
                      display: 'inline-flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      margin: '4px 0'
                    }}
                  >
                    <div 
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '20px',
                        color: '#6366F1',
                        fontSize: '12px',
                        fontWeight: 600,
                        animation: 'fade-in 0.2s ease'
                      }}
                    >
                      {skill}
                      <button 
                        onClick={() => handleRemoveTeach(skill)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(99, 102, 241, 0.6)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 0
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                    {skillScore !== undefined && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span style={{ fontSize: '10px', color: '#4ADE80', fontWeight: 700 }}>
                          Score: {skillScore}%
                        </span>
                        {skillRating && (
                          <span style={{ fontSize: '9px', color: '#FBBF24', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            ★ {skillRating} ({skillLearners} learnt)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {isAddingTeach ? (
                <form onSubmit={handleAddTeachSubmit} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <input 
                    autoFocus
                    type="text"
                    value={newTeachInput}
                    onChange={(e) => setNewTeachInput(e.target.value)}
                    onBlur={() => {
                      setTimeout(() => {
                        setIsAddingTeach(false);
                        setNewTeachInput('');
                      }, 200);
                    }}
                    placeholder="Press Enter..."
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      borderRadius: '20px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      color: '#fff',
                      outline: 'none',
                      width: '100px'
                    }}
                  />
                </form>
              ) : (
                <button 
                  onClick={() => setIsAddingTeach(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '20px',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                    e.currentTarget.style.color = '#6366F1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                  }}
                >
                  + Add Skill
                </button>
              )}
            </div>
          </div>

          {/* Wants/Learning Section */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              What I Am Learning 🚀
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {wantsList.map((skill: string, index: number) => {
                const skillScore = activeUser?.skillScores?.[skill];
                const skillRating = activeUser?.skillRatings?.[skill] || (skillScore !== undefined ? '4.9' : undefined);
                const skillLearners = activeUser?.skillLearners?.[skill] || (skillScore !== undefined ? '12' : undefined);
                return (
                  <div 
                    key={index}
                    style={{
                      display: 'inline-flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      margin: '4px 0'
                    }}
                  >
                    <div 
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '20px',
                        color: '#8B5CF6',
                        fontSize: '12px',
                        fontWeight: 600,
                        animation: 'fade-in 0.2s ease'
                      }}
                    >
                      {skill}
                      <button 
                        onClick={() => handleRemoveWant(skill)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(139, 92, 246, 0.6)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 0
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                    {skillScore !== undefined && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span style={{ fontSize: '10px', color: '#4ADE80', fontWeight: 700 }}>
                          Score: {skillScore}%
                        </span>
                        {skillRating && (
                          <span style={{ fontSize: '9px', color: '#FBBF24', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            ★ {skillRating} ({skillLearners} learnt)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {isAddingWant ? (
                <form onSubmit={handleAddWantSubmit} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <input 
                    autoFocus
                    type="text"
                    value={newWantInput}
                    onChange={(e) => setNewWantInput(e.target.value)}
                    onBlur={() => {
                      setTimeout(() => {
                        setIsAddingWant(false);
                        setNewWantInput('');
                      }, 200);
                    }}
                    placeholder="Press Enter..."
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      borderRadius: '20px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      color: '#fff',
                      outline: 'none',
                      width: '100px'
                    }}
                  />
                </form>
              ) : (
                <button 
                  onClick={() => setIsAddingWant(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '20px',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)';
                    e.currentTarget.style.color = '#8B5CF6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                  }}
                >
                  + Add Skill
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal Overlay */}
      {showSettingsModal && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(9, 8, 14, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          animation: 'fade-in 0.25s ease',
          borderRadius: '24px'
        }}>
          {showAiChat ? (
            /* AI Chat View */
            <div className="glass-card" style={{
              width: '100%',
              maxWidth: '300px',
              height: '470px',
              backgroundColor: '#161426',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
            }}>
              {/* Back Button */}
              <button 
                onClick={() => setShowAiChat(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                ←
              </button>
              
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', textAlign: 'center', margin: '6px 0 16px 0' }}>
                AI Chat Support
              </h3>
              
              {/* Messages Area */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingBottom: '8px',
                fontSize: '12px'
              }}>
                {aiChatMessages.map((m, idx) => (
                  <div 
                    key={idx}
                    style={{
                      alignSelf: m.isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      backgroundColor: m.isMe ? '#6366F1' : 'rgba(255,255,255,0.05)',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      borderBottomLeftRadius: m.isMe ? '12px' : '0px',
                      borderBottomRightRadius: m.isMe ? '0px' : '12px',
                      color: '#fff',
                      lineHeight: 1.4
                    }}
                  >
                    {m.text}
                  </div>
                ))}
                {aiIsTyping && (
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', marginLeft: '4px' }}>
                    AI is typing...
                  </span>
                )}
              </div>
              
              {/* FAQ Suggestions */}
              <div style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                padding: '8px 0',
                margin: '6px 0 4px 0',
                whiteSpace: 'nowrap',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }} className="no-scrollbar">
                {[
                  { text: '⚙️ Profile Setup', q: 'How do I set up my profile and add skills?' },
                  { text: '🤝 Skill Swaps', q: 'How do skill swaps work?' },
                  { text: '📅 Sessions', q: 'How do I schedule and run swap sessions?' },
                  { text: '🔔 Notifications', q: 'Where do I view my notifications?' },
                  { text: '🔒 Account Issues', q: 'How do I change my password or delete my account?' },
                  { text: '⚠️ Reporting Users', q: 'How do I report a user for safety issues?' }
                ].map((faq, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendFaqMessage(faq.q)}
                    style={{
                      display: 'inline-block',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      borderRadius: '12px',
                      padding: '5px 10px',
                      fontSize: '9.5px',
                      fontWeight: 800,
                      color: '#a5b4fc',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.25)';
                      e.currentTarget.style.color = '#a5b4fc';
                    }}
                  >
                    {faq.text}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <input 
                  type="text"
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendAiMessage(); }}
                  placeholder="Type support query..."
                  style={{
                    flex: 1,
                    height: '36px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '0 12px',
                    color: '#fff',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
                <button 
                  onClick={handleSendAiMessage}
                  style={{
                    backgroundColor: '#6366F1',
                    border: 'none',
                    borderRadius: '10px',
                    width: '36px',
                    height: '36px',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          ) : showSecuritySettings ? (
            /* Account Settings View (Security & Password) */
            <div className="glass-card" style={{
              width: '100%',
              maxWidth: '300px',
              backgroundColor: '#161426',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
            }}>
              {/* Back Button */}
              <button 
                onClick={() => setShowSecuritySettings(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                ←
              </button>
              
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', textAlign: 'center', margin: '6px 0 0 0' }}>
                Security & Password
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>
                {isChangingPassword ? (
                  <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Current Password</label>
                      <input 
                        type="password" 
                        required
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        style={{
                          height: '34px',
                          backgroundColor: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          padding: '0 10px',
                          color: '#fff',
                          fontSize: '11px',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>New Password</label>
                      <input 
                        type="password" 
                        required
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={{
                          height: '34px',
                          backgroundColor: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          padding: '0 10px',
                          color: '#fff',
                          fontSize: '11px',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Confirm New Password</label>
                      <input 
                        type="password" 
                        required
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={{
                          height: '34px',
                          backgroundColor: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          padding: '0 10px',
                          color: '#fff',
                          fontSize: '11px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {passwordError && (
                      <span style={{ fontSize: '10px', color: '#F87171', textAlign: 'center' }}>⚠️ {passwordError}</span>
                    )}
                    {passwordSuccess && (
                      <span style={{ fontSize: '10px', color: '#4ADE80', textAlign: 'center' }}>✓ {passwordSuccess}</span>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button 
                        type="button"
                        onClick={() => {
                          setIsChangingPassword(false);
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                          setPasswordError('');
                          setPasswordSuccess('');
                        }}
                        style={{
                          flex: 1,
                          height: '32px',
                          backgroundColor: 'transparent',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          color: 'rgba(255,255,255,0.6)',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmittingPassword}
                        style={{
                          flex: 1,
                          height: '32px',
                          backgroundColor: '#6366F1',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          opacity: isSubmittingPassword ? 0.7 : 1
                        }}
                      >
                        {isSubmittingPassword ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Password status</label>
                    <div style={{ padding: '10px 12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>••••••••</span>
                      <span 
                        onClick={() => {
                          setIsChangingPassword(true);
                          setPasswordError('');
                          setPasswordSuccess('');
                        }}
                        style={{ color: '#6366F1', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Change
                      </span>
                    </div>
                    {passwordSuccess && (
                      <span style={{ fontSize: '10px', color: '#4ADE80', display: 'block', marginTop: '4px', textAlign: 'center' }}>✓ {passwordSuccess}</span>
                    )}
                  </div>
                )}
                
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>App Version</label>
                  <div style={{ padding: '10px 12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>SkillSwap Client</span>
                    <span style={{ color: '#6366F1', fontWeight: 700 }}>v1.0.4</span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Login Locations</label>
                  <div style={{ padding: '10px 12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#fff', fontWeight: 600 }}>Windows Laptop</span>
                      <span style={{ fontSize: '9px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', borderRadius: '4px', padding: '1px 4px' }}>Active</span>
                    </div>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>India, May 2026</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Main Settings Menu View */
            <div className="glass-card" style={{
              width: '100%',
              maxWidth: '300px',
              backgroundColor: '#161426',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
            }}>
              {/* Modal Close Button */}
              <button 
                onClick={() => setShowSettingsModal(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>

              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
                Settings
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <ProfileTile 
                  icon={<Shield size={18} />} 
                  title="Account Settings" 
                  onClick={() => setShowSecuritySettings(true)}
                />
                <ProfileTile 
                  icon={<HelpCircle size={18} />} 
                  title="Help & Support" 
                  onClick={() => setShowAiChat(true)}
                />
                
                <ProfileTile 
                  icon={<X size={18} style={{ color: '#EF4444' }} />} 
                  title="Delete Account" 
                  isDanger={true} 
                  onClick={handleDeleteAccount} 
                />
                
                <div style={{ height: '8px' }} />
                <ProfileTile 
                  icon={<LogOut size={18} style={{ color: '#F87171' }} />} 
                  title="Log Out" 
                  isDanger={true} 
                  onClick={() => {
                    setShowSettingsModal(false);
                    onLogout();
                  }} 
                />
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

function ProfileTile({ 
  icon, 
  title, 
  isDanger, 
  onClick 
}: { 
  icon: React.ReactNode; 
  title: string; 
  isDanger?: boolean; 
  onClick?: () => void; 
}) {
  return (
    <div 
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        backgroundColor: '#161426',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.04)',
        cursor: 'pointer'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: isDanger ? '#F87171' : '#6366F1' }}>
        {icon}
        <span style={{ fontSize: '13px', color: isDanger ? '#F87171' : '#fff', fontWeight: 600 }}>{title}</span>
      </div>
      <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />
    </div>
  );
}

// =========================================================================
// 9️⃣ COMMUNITY SCREEN VIEW (FAB Popup)
// =========================================================================
function CommunityScreenView({ 
  activeUser, 
  setActiveUser,
  onClose
}: { 
  activeUser: any; 
  setActiveUser: (u: any) => void;
  onClose: () => void;
}) {
  const joinedCircles = activeUser?.joinedCircles || [];

  const handleToggleJoin = async (title: string, shouldJoin: boolean) => {
    const token = localStorage.getItem('skillswap_token');
    if (!token) return;

    try {
      const endpoint = shouldJoin ? 'join' : 'leave';
      const res = await fetch(`${API_BASE}/circles/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ circleName: title })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveUser(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const SUGGESTED_CIRCLES = [
    { emoji: "🎸", title: "Bengaluru Guitar Circle", subtitle: "Weekly meetups, tabs & jams", members: "234 members" },
    { emoji: "🐍", title: "Python Learners India", subtitle: "Projects, code reviews & mentorship", members: "1.2k members" },
    { emoji: "🎨", title: "Design & Figma Swappers", subtitle: "UI/UX skills exchange community", members: "876 members" },
    { emoji: "🧘", title: "Wellness & Yoga Exchange", subtitle: "Swap wellness skills & routines", members: "512 members" }
  ];

  const myCircles = SUGGESTED_CIRCLES.filter(c => joinedCircles.includes(c.title));
  const suggestedCircles = SUGGESTED_CIRCLES.filter(c => !joinedCircles.includes(c.title));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fade-in 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Community Groups</h3>
        <button 
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'white',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
          YOUR GROUPS
        </h4>
        {myCircles.length > 0 ? (
          myCircles.map(c => (
            <CommunityGroupCard 
              key={c.title}
              emoji={c.emoji} 
              title={c.title} 
              subtitle={c.subtitle} 
              members={c.members} 
              joined={true} 
              onToggle={() => handleToggleJoin(c.title, false)}
            />
          ))
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textAlign: 'center' }}>You haven't joined any groups yet.</p>
        )}
        
        <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', margin: '12px 0 4px 0' }}>
          SUGGESTED FOR YOU
        </h4>
        {suggestedCircles.length > 0 ? (
          suggestedCircles.map(c => (
            <CommunityGroupCard 
              key={c.title}
              emoji={c.emoji} 
              title={c.title} 
              subtitle={c.subtitle} 
              members={c.members} 
              joined={false} 
              onToggle={() => handleToggleJoin(c.title, true)}
            />
          ))
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textAlign: 'center' }}>You have joined all suggestions!</p>
        )}
      </div>
    </div>
  );
}

function CommunityGroupCard({ 
  emoji, 
  title, 
  subtitle, 
  members, 
  joined,
  onToggle
}: { 
  emoji: string; 
  title: string; 
  subtitle: string; 
  members: string; 
  joined: boolean; 
  onToggle: () => void;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '16px',
      backgroundColor: '#161426',
      borderRadius: '14px',
      border: '1px solid rgba(255,255,255,0.06)',
      gap: '16px'
    }}>
      <span style={{ fontSize: '32px' }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </h4>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subtitle}
        </p>
        <span style={{ fontSize: '11px', color: '#6366F1', fontWeight: 600, display: 'block', marginTop: '6px' }}>
          {members}
        </span>
      </div>
      <button 
        onClick={onToggle}
        style={{
          padding: '6px 14px',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: 700,
          border: 'none',
          backgroundColor: joined ? 'rgba(255,255,255,0.1)' : '#8B5CF6',
          color: 'white',
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }}
      >
        {joined ? 'Joined' : 'Join'}
      </button>
    </div>
  );
}

// =========================================================================
// 🔟 AI SKILL ASSESSMENT SCREEN (10 MCQs with dynamic AI reporting)
// =========================================================================
function AssessmentScreen({
  assessment,
  setAssessment,
  activeUser,
  setActiveUser,
  onComplete
}: {
  assessment: any;
  setAssessment: (a: any) => void;
  activeUser: any;
  setActiveUser: (u: any) => void;
  onComplete: () => void;
}) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loadingText, setLoadingText] = useState('Initializing AI Assessment Generator...');

  const { status, skillName, currentQuestionIndex, questions, selectedAnswers, score } = assessment;

  // 1. Generation Simulator loader loops
  useEffect(() => {
    if (status === 'generating') {
      const texts = [
        "Scanning community skill standards...",
        "Selecting verified multiple-choice cognitive models...",
        "Crafting 10 custom questions with explanation paths...",
        "Finalizing customized exam container..."
      ];
      let i = 0;
      const interval = setInterval(() => {
        if (i < texts.length) {
          setLoadingText(texts[i]);
          i++;
        }
      }, 700);

      const timeout = setTimeout(() => {
        setAssessment({
          ...assessment,
          status: 'answering'
        });
      }, 3000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [status]);

  // 2. Grading Simulator loader loops
  useEffect(() => {
    if (status === 'grading') {
      setLoadingText("Reviewing responses...");
      const texts = [
        "Analyzing answer keys against verified templates...",
        "Compiling correctness metrics...",
        "Applying Bayesian adjustments to Trust Rating...",
        "Finalizing assessment report card..."
      ];
      let i = 0;
      const interval = setInterval(() => {
        if (i < texts.length) {
          setLoadingText(texts[i]);
          i++;
        }
      }, 600);

      const timeout = setTimeout(() => {
        // Calculate score
        let computedScore = 0;
        selectedAnswers.forEach((ans: number, idx: number) => {
          if (ans === questions[idx].correctIndex) {
            computedScore++;
          }
        });

        setAssessment({
          ...assessment,
          status: 'results',
          score: computedScore
        });
      }, 2500);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [status]);

  // Option selection
  const handleSelectOption = (index: number) => {
    setSelectedOption(index);
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = index;
    setAssessment({
      ...assessment,
      selectedAnswers: newAnswers
    });
  };

  const handleNext = () => {
    if (selectedOption === null) return;

    if (currentQuestionIndex < 9) {
      setAssessment({
        ...assessment,
        currentQuestionIndex: currentQuestionIndex + 1
      });
      // Restore previous choice or clear
      const nextAnswer = selectedAnswers[currentQuestionIndex + 1];
      setSelectedOption(nextAnswer !== -1 ? nextAnswer : null);
    } else {
      setAssessment({
        ...assessment,
        status: 'grading'
      });
    }
  };

  const handleSaveVerifiedSkill = async () => {
    const token = localStorage.getItem('skillswap_token');
    if (!token) return;

    const teachesList = activeUser.teaches || [];
    const wantsList = activeUser.wants || [];

    const updatedTeaches = assessment.category === 'teaches' 
      ? [...teachesList.filter((s: string) => s !== skillName), skillName]
      : teachesList;
      
    const updatedWants = assessment.category === 'wants' 
      ? [...wantsList.filter((s: string) => s !== skillName), skillName]
      : wantsList;

    // Save the score in skillScores object
    const currentScores = activeUser.skillScores || {};
    const updatedScores = {
      ...currentScores,
      [skillName]: score * 10
    };

    const currentRatings = activeUser.skillRatings || {};
    const updatedRatings = {
      ...currentRatings,
      [skillName]: 4.9
    };

    const currentLearners = activeUser.skillLearners || {};
    const updatedLearners = {
      ...currentLearners,
      [skillName]: 3
    };

    // Boost trust score by +2% if they pass (up to 100%)
    let currentScoreVal = parseInt(activeUser.trustScore || '0');
    let boostedTrust = Math.min(100, currentScoreVal + 2) + '%';

    try {
      const res = await fetch(`${API_BASE}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          teaches: updatedTeaches,
          wants: updatedWants,
          skillScores: updatedScores,
          skillRatings: updatedRatings,
          skillLearners: updatedLearners
        })
      });
      if (res.ok) {
        const data = await res.json();
        // Also update local trust score on response
        data.trustScore = boostedTrust;
        setActiveUser(data);
      }
    } catch (e) {
      console.error(e);
    }
    onComplete();
  };

  // UI Render Options based on status
  if (status === 'generating' || status === 'grading') {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '32px 24px',
        height: '100%',
        background: 'linear-gradient(180deg, #0F0E17 0%, #1B1437 100%)',
        textAlign: 'center',
        animation: 'fade-in 0.4s ease'
      }}>
        <div style={{
          padding: '24px',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderRadius: '50%',
          border: '2px solid rgba(139, 92, 246, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: '0 0 35px rgba(139, 92, 246, 0.2)',
          animation: 'spin-slow 6s linear infinite'
        }}>
          <Sparkles size={56} style={{ color: '#8B5CF6' }} />
        </div>
        
        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
          {status === 'generating' ? 'AI Assessment Engine' : 'AI Verification System'}
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', maxWidth: '240px', lineHeight: 1.5, animation: 'bounce-gentle 2.5s infinite ease-in-out' }}>
          {loadingText}
        </p>
      </div>
    );
  }

  if (status === 'results') {
    const passed = (score * 10) >= 75; // 75 percent or above passing rate (which resolves to score >= 8)
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '32px 24px',
        height: '100%',
        background: 'linear-gradient(180deg, #0F0E17 0%, #17122E 100%)',
        animation: 'fade-in 0.5s ease-out'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px', marginTop: '20px', flex: 1, justifyContent: 'center' }}>
          
          {/* Score ring */}
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: passed 
              ? 'radial-gradient(circle, rgba(74,222,128,0.15) 0%, rgba(74,222,128,0.02) 100%)'
              : 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.02) 100%)',
            border: passed ? '4px solid #4ADE80' : '4px solid #EF4444',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: passed ? '0 0 30px rgba(74, 222, 128, 0.2)' : '0 0 30px rgba(239, 68, 68, 0.2)',
            animation: 'bounce-gentle 3s infinite ease-in-out'
          }}>
            <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#fff', margin: 0 }}>
              {score * 10}%
            </h2>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>
              {score}/10 Correct
            </span>
          </div>

          <div>
            <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>
              {passed ? 'Skill Verified! 🎉' : 'Assessment Incomplete'}
            </h3>
            <span className="badge-tag" style={{
              backgroundColor: passed ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: passed ? '#4ADE80' : '#EF4444',
              fontSize: '12px',
              fontWeight: 700,
              padding: '6px 16px',
              borderRadius: '20px'
            }}>
              {skillName} • {assessment.category === 'teaches' ? 'Teaches' : 'Learning'}
            </span>
          </div>

          <p style={{
            color: 'rgba(255, 255, 255, 0.65)',
            fontSize: '13px',
            lineHeight: 1.6,
            maxWidth: '280px',
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
            padding: '16px',
            borderRadius: '16px'
          }}>
            {passed 
              ? `Outstanding! You successfully scored ${score * 10}% on our AI Assessment. We have verified your expertise in ${skillName} with a score of ${score * 10}%, added it to your profile, and boosted your profile Trust Score by +2%!`
              : `You scored ${score * 10}%. To ensure high-quality skill swaps across the community, we require a passing score of 75% (at least 8 correct answers). Take some time to review, then try again!`
            }
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 10 }}>
          {passed ? (
            <button 
              onClick={handleSaveVerifiedSkill} 
              className="btn-primary" 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              Add Verified Skill <ArrowRight size={18} />
            </button>
          ) : (
            <button 
              onClick={onComplete} 
              className="btn-primary" 
              style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}
            >
              Back to Profile
            </button>
          )}
        </div>
      </div>
    );
  }

  // Answering / Question flow view
  const currentQuestion = questions[currentQuestionIndex];
  
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '24px 20px',
      height: '100%',
      background: 'linear-gradient(180deg, #0F0E17 0%, #161426 100%)',
      animation: 'fade-in 0.4s ease'
    }}>
      
      {/* Header Info */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#8B5CF6', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              AI Skill Verification
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
              {skillName} Exam
            </h3>
          </div>
          <button 
            onClick={onComplete}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress gauge */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '12px 0 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
            <span>PROGRESS</span>
            <span>QUESTION {currentQuestionIndex + 1} OF 10</span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{
              width: `${(currentQuestionIndex + 1) * 10}%`,
              height: '100%',
              backgroundColor: '#8B5CF6',
              borderRadius: '10px',
              transition: 'width 0.3s ease-out'
            }} />
          </div>
        </div>
      </div>

      {/* Main Question Card Slider */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center' }}>
        <div className="glass-card" style={{
          padding: '24px 20px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'fade-in 0.3s ease'
        }}>
          <p style={{
            fontSize: '15px',
            fontWeight: 700,
            lineHeight: 1.5,
            color: 'white',
            margin: 0
          }}>
            {currentQuestion?.question}
          </p>
        </div>

        {/* Options container list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {currentQuestion?.options.map((opt: string, idx: number) => {
            const isSelected = selectedOption === idx;
            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(idx)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: isSelected ? '1px solid #8B5CF6' : '1px solid rgba(255,255,255,0.04)',
                  backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.02)',
                  color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 0 15px rgba(139, 92, 246, 0.1)' : 'none'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: isSelected ? '2px solid #8B5CF6' : '2px solid rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: '#8B5CF6',
                  backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                  flexShrink: 0
                }}>
                  {isSelected && "✓"}
                </div>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer next action button */}
      <button
        onClick={handleNext}
        disabled={selectedOption === null}
        className="btn-primary"
        style={{
          width: '100%',
          marginTop: '20px',
          opacity: selectedOption === null ? 0.5 : 1,
          cursor: selectedOption === null ? 'not-allowed' : 'pointer'
        }}
      >
        {currentQuestionIndex < 9 ? 'Next Question' : 'Submit & Grade Exam'}
      </button>

    </div>
  );
}

function SetupProfileScreen({ 
  activeUser,
  setActiveUser, 
  onComplete 
}: { 
  activeUser: any;
  setActiveUser: (u: any) => void; 
  onComplete: () => void; 
}) {
  const [profilePicture, setProfilePicture] = useState(activeUser?.profilePicture || activeUser?.profileImage || activeUser?.avatarUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [about, setAbout] = useState('');
  const [availability, setAvailability] = useState('Weekdays, 6:00 PM - 9:00 PM');
  const [language, setLanguage] = useState('English');
  const [experience, setExperience] = useState('2+ Years');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !bio || !about) {
      setErrorMsg('Please fill in your Title, Bio, and About fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const token = localStorage.getItem('skillswap_token');
    if (!token) return;

    const teachesList = activeUser?.teaches || ['General / Academics'];
    const wantsList = activeUser?.wants || ['Programming / Coding'];

    try {
      const res = await fetch(`${API_BASE}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          bio,
          about,
          teaches: teachesList,
          wants: wantsList,
          availability,
          language,
          experience,
          profilePicture,
          trustScore: '0%',
          swapsCount: '0',
          ratingValue: '0.0'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveUser(data);
        onComplete();
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to update profile.');
      }
    } catch (err) {
      setErrorMsg('Error communicating with backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '32px 24px',
      justifyContent: 'center',
      minHeight: '100%',
      animation: 'fade-in 0.6s ease',
      overflowY: 'auto'
    }}>
      <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', textAlign: 'center', marginBottom: '8px' }}>
        Setup Your Profile
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textAlign: 'center', marginBottom: '24px' }}>
        Configure your details to connect with swappers
      </p>

      {errorMsg && (
        <div style={{
          backgroundColor: 'rgba(248, 113, 113, 0.1)',
          border: '1px solid rgba(248, 113, 113, 0.3)',
          color: '#F87171',
          padding: '12px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 500,
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '30px' }}>
        {/* Profile Picture Picker Row */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profile Picture</label>
          
          {/* Main preview circle */}
          <div style={{
            position: 'relative',
            width: '86px',
            height: '86px',
            borderRadius: '50%',
            border: '2.5px solid #8B5CF6',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1E1B4B',
            overflow: 'hidden'
          }}>
            {profilePicture ? (
              <img src={profilePicture} alt="Selected Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={36} style={{ color: 'rgba(255,255,255,0.4)' }} />
            )}
          </div>

          {/* Custom Upload Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const base64Str = event.target?.result as string;
                    if (base64Str) {
                      setProfilePicture(base64Str);
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '12px',
                padding: '8px 18px',
                fontSize: '12px',
                fontWeight: 800,
                color: '#6366F1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
              }}
            >
              📷 Choose Photo from Device
            </button>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Select an image file from your device</span>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Professional Title</label>
          <input
            required
            type="text"
            placeholder="e.g. Mobile Developer, Illustrator"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              height: '44px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '0 16px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Short Bio</label>
          <input
            required
            type="text"
            placeholder="e.g. Passionate about interfaces and grid systems"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            style={{
              width: '100%',
              height: '44px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '0 16px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>About Me</label>
          <textarea
            required
            rows={3}
            placeholder="Introduce yourself and specify what matches you want to make..."
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              resize: 'none'
            }}
          />
        </div>



        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Experience</label>
            <input
              type="text"
              placeholder="e.g. 2+ Years"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '0 16px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Languages</label>
            <input
              type="text"
              placeholder="e.g. English, French"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '0 16px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Availability</label>
          <input
            type="text"
            placeholder="e.g. Weekends, Flexible"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            style={{
              width: '100%',
              height: '44px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '0 16px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: '12px', width: '100%', opacity: isSubmitting ? 0.7 : 1 }}>
          {isSubmitting ? 'Saving Profile details...' : 'Complete Registration'}
        </button>
      </form>
    </div>
  );
}

// =========================================================================
// 🔟 FULLSCREEN ACTIVE SESSION ROOM OVERLAY
// =========================================================================
function ActiveSessionRoom({ 
  session, 
  onLeave, 
  onInitiateCall,
  socket,
  activeUserId,
  onCompleteSession
}: { 
  session: any; 
  onLeave: () => void; 
  onInitiateCall: (partnerId: string, partnerName: string, partnerPicture?: string) => void;
  socket: Socket | null;
  activeUserId: string;
  onCompleteSession: (ratingTarget: { userId: string; userName: string }) => void;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!socket) return;
    
    const handleIncomingMessage = (msg: any) => {
      if (msg.senderId === session.partnerId || msg.receiverId === session.partnerId) {
        setMessages(prev => [...prev, msg]);
      }
    };

    socket.on('message', handleIncomingMessage);
    return () => {
      socket.off('message', handleIncomingMessage);
    };
  }, [socket, session.partnerId]);

  const fetchMessages = async () => {
    const token = window.localStorage.getItem('skillswap_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/chats/${session.partnerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [session.partnerId]);

  const handleSend = async () => {
    if (!inputVal.trim()) return;
    const token = window.localStorage.getItem('skillswap_token');
    if (!token) return;

    const tempMsg = { text: inputVal, isMe: true, senderId: activeUserId, receiverId: session.partnerId, timestamp: Date.now() };
    setMessages(prev => [...prev, tempMsg]);
    const sentText = inputVal;
    setInputVal("");

    try {
      await fetch(`${API_BASE}/chats/${session.partnerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: sentText })
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: '#09080E',
      zIndex: 500,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      backgroundImage: 'radial-gradient(circle at top, #1A1635 0%, #09080E 100%)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button 
          onClick={onLeave}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'white',
            borderRadius: '10px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          ← Leave Session
        </button>
        <span style={{
          fontSize: '10px',
          fontWeight: 800,
          color: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.15)',
          padding: '4px 10px',
          borderRadius: '8px',
          letterSpacing: '1px'
        }}>
          ACTIVE SESSION
        </span>
      </div>

      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: '0 0 4px 0' }}>{session.title}</h3>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 16px 0' }}>Partner: {session.partnerName}</p>

      <div className="glass-card" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: '16px',
        background: 'rgba(99, 102, 241, 0.08)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>Audio & Video call</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Initiate WebRTC calling in real-time</span>
        </div>
        <button 
          onClick={() => onInitiateCall(session.partnerId, session.partnerName, session.partnerPicture)}
          style={{
            backgroundColor: '#10B981',
            color: '#000',
            border: 'none',
            borderRadius: '12px',
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}
        >
          📞 Start Call
        </button>
      </div>

      <div className="glass-card" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '16px',
        padding: '14px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.04)',
        backgroundColor: 'rgba(255,255,255,0.01)',
        marginBottom: '16px'
      }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
          Session Chat
        </span>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          paddingBottom: '10px'
        }}>
          {loading ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>Loading chat...</p>
          ) : messages.length > 0 ? (
            messages.map((m, idx) => {
              const isMe = m.isMe || m.senderId === activeUserId;
              return (
                <div 
                  key={idx}
                  style={{
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    backgroundColor: isMe ? '#6366F1' : 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    maxWidth: '80%',
                    fontSize: '13px',
                    lineHeight: '1.4'
                  }}
                >
                  {m.text}
                </div>
              );
            })
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>No messages exchanged yet.</p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '6px' }}>
          <input 
            type="text" 
            placeholder="Type message..." 
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            style={{
              flex: 1,
              height: '38px',
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px',
              padding: '0 12px',
              color: '#fff',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          <button 
            onClick={handleSend}
            style={{
              backgroundColor: '#6366F1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <button 
        onClick={() => onCompleteSession({ userId: session.partnerId, userName: session.partnerName })}
        style={{
          backgroundColor: '#F59E0B',
          color: '#000',
          border: 'none',
          borderRadius: '14px',
          height: '46px',
          fontSize: '13px',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}
      >
        ★ Complete Session & Rate Partner
      </button>
    </div>
  );
}
