const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');

// Load .env variables manually if .env file exists
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envData = fs.readFileSync(envPath, 'utf8');
    envData.split(/\r?\n/).forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        if (key && !key.startsWith('#')) {
          process.env[key] = value;
        }
      }
    });
    console.log("[dotenv] Loaded environment variables from .env file successfully.");
  }
} catch (e) {
  console.warn("[dotenv] Warning loading .env file:", e.message);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3001;
const JWT_SECRET = 'skillswap-super-secret-key-13579';
const DB_PATH = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware to authenticate socket connections with JWT
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing.'));
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error: Invalid token.'));
    }
    socket.userId = decoded.id;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`[Socket.io] User connected: ${socket.userId} (${socket.id})`);
  socket.join(socket.userId);

  // Auto-join community rooms
  try {
    const db = readDatabase();
    const user = db.users.find(u => u.id === socket.userId);
    if (user && user.joinedCircles) {
      user.joinedCircles.forEach(circleName => {
        socket.join(circleName);
        console.log(`[Socket.io] User ${socket.userId} auto-joined circle room: ${circleName}`);
      });
    }
  } catch (err) {
    console.error("Error auto-joining circle rooms:", err);
  }

  socket.on('join-circle', (data) => {
    if (data && data.circleName) {
      socket.join(data.circleName);
      console.log(`[Socket.io] User ${socket.userId} dynamically joined circle room: ${data.circleName}`);
    }
  });

  // WebRTC Call Signaling events
  socket.on('call-user', (data) => {
    // data: { to, callerName, callerPicture }
    console.log(`[Socket.io] User ${socket.userId} is calling ${data.to}`);
    io.to(data.to).emit('incoming-call', { 
      from: socket.userId, 
      callerName: data.callerName,
      callerPicture: data.callerPicture 
    });
  });

  socket.on('call-decline', (data) => {
    // data: { to }
    console.log(`[Socket.io] Call declined by ${socket.userId} to ${data.to}`);
    io.to(data.to).emit('call-declined');
  });

  socket.on('call-accept', (data) => {
    // data: { to }
    console.log(`[Socket.io] Call accepted by ${socket.userId} from ${data.to}`);
    io.to(data.to).emit('call-accepted', { peerId: socket.userId });
  });

  socket.on('webrtc-offer', (data) => {
    // data: { to, offer }
    console.log(`[Socket.io] WebRTC offer from ${socket.userId} to ${data.to}`);
    io.to(data.to).emit('webrtc-offer', { offer: data.offer, from: socket.userId });
  });

  socket.on('webrtc-answer', (data) => {
    // data: { to, answer }
    console.log(`[Socket.io] WebRTC answer from ${socket.userId} to ${data.to}`);
    io.to(data.to).emit('webrtc-answer', { answer: data.answer });
  });

  socket.on('ice-candidate', (data) => {
    // data: { to, candidate }
    io.to(data.to).emit('ice-candidate', { candidate: data.candidate, from: socket.userId });
  });

  socket.on('call-end', (data) => {
    // data: { to }
    console.log(`[Socket.io] Call ended by ${socket.userId} with ${data.to}`);
    io.to(data.to).emit('call-ended');
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] User disconnected: ${socket.userId} (${socket.id})`);
  });
});

const MOCK_USERS = [
  {
    id: "mock_1",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    password: "$2a$10$YJBQmLrUTtdxy/w88JmsZOzLAHzQ0UsHLfqOdSftjq3axFLR9RpZ.", // 'password123'
    trustScore: "99%",
    swapsCount: "12",
    ratingValue: "4.9",
    communitiesCount: "3",
    bio: "Senior UI/UX Designer at a fintech startup. Passionate about beautiful interfaces and user research.",
    about: "I have been designing mobile apps for 5+ years. I can teach you Figma, design tokens, responsive layouts, and how to build clickable mockups.",
    teaches: ["UI/UX Design", "Figma", "Mobile Design"],
    wants: ["React Native", "Javascript", "Web Development"],
    joinedCircles: ["UI/UX Designers", "Figma Wizards"],
    profilePicture: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    title: "Lead Product Designer",
    availability: "Weekends, Flexible Timings",
    language: "English",
    experience: "5+ Years",
    skillScores: { "UI/UX Design": 95, "Figma": 98 },
    isVerified: true
  }
];

// Helper helper utilities to read and write database
function readDatabase() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed.users) parsed.users = [];
    
    // Automatic seeding: if database has less than 2 users, seed mock users to enrich Discover and testing experience
    if (parsed.users.length < 2) {
      console.log("[Database Seeding] Seeding mock users to enrich Discover and testing experience...");
      const existingMockIds = new Set(parsed.users.map(u => u.id));
      MOCK_USERS.forEach(mockUser => {
        if (!existingMockIds.has(mockUser.id)) {
          parsed.users.push(mockUser);
        }
      });
      fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf8');
    }

    if (!parsed.sessions) parsed.sessions = [];
    if (!parsed.chats) parsed.chats = [];
    if (!parsed.notifications) parsed.notifications = [];
    return parsed;
  } catch (err) {
    const initialDb = {
      users: [...MOCK_USERS],
      sessions: [],
      chats: [],
      notifications: []
    };
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2), 'utf8');
    } catch (wErr) {
      console.error("[Database] Error seeding new database file:", wErr);
    }
    return initialDb;
  }
}

function writeDatabase(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// =========================================================================
// 🔐 AUTHENTICATION ENDPOINTS
// =========================================================================

// Sign Up Endpoint
app.post('/api/auth/signup', (req, finalRes) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return finalRes.status(400).json({ error: 'All fields are required.' });
  }

  const db = readDatabase();
  const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (existingUser) {
    return finalRes.status(400).json({ error: 'An account with this email already exists.' });
  }

  // Hash Password securely
  const hashedPassword = bcrypt.hashSync(password, 10);

  // Initialize new explorer profile with default mock values matching John Doe's spec
  const newUser = {
    id: Date.now().toString(),
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    trustScore: '0%',
    swapsCount: '0',
    ratingValue: '0.0',
    communitiesCount: '0',
    bio: 'Passionate about learning and sharing knowledge. Let\'s grow together!',
    about: 'I am a new Explorer on the SkillSwap platform! Let\'s swap some cool skills.',
    teaches: ['General / Academics'],
    wants: ['Programming / Coding'],
    joinedCircles: [],
    profilePicture: '',
    profileImage: '',
    avatarUrl: '',
    isVerified: true,
    verificationOtp: null,
    otpExpiresAt: null
  };

  db.users.push(newUser);

  // Create Welcome Notification
  const welcomeNotification = {
    id: "notif_" + Date.now(),
    userId: newUser.id,
    title: "Welcome to SkillSwap! 🚀",
    message: `Welcome, ${newUser.name}! Add skills on your Profile to verify your expertise via AI MCQ assessments and boost your Trust Score.`,
    type: "system",
    timestamp: Date.now(),
    read: false
  };
  
  if (!db.notifications) db.notifications = [];
  db.notifications.push(welcomeNotification);

  writeDatabase(db);

  // OTP Verification completely disabled

  // Generate JWT Token
  const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

  // Exclude password in response
  const { password: _, ...userWithoutPassword } = newUser;

  return finalRes.status(201).json({
    token,
    user: userWithoutPassword
  });
});

// Google Authentication / Quick Signup Endpoint
app.post('/api/auth/google', async (req, finalRes) => {
  let { email, name, idToken, password, imageUrl } = req.body;

  if (idToken) {
    try {
      console.log("[Google Auth] Verifying secure ID Token...");
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      if (response.ok) {
        const ticket = await response.json();
        email = ticket.email;
        name = ticket.name || ticket.given_name || "Google User";
        if (ticket.picture) {
          imageUrl = ticket.picture;
        }
        console.log(`[Google Auth] Successfully verified token for: ${email}`);
      } else {
        const errorText = await response.text();
        console.error("[Google Auth] Verification endpoint error response:", errorText);
        return finalRes.status(400).json({ error: 'Failed to verify secure Google ID Token.' });
      }
    } catch (e) {
      console.error("[Google Auth] Network error verifying secure token:", e);
      return finalRes.status(500).json({ error: 'Google authentication service unreachable.' });
    }
  }

  if (!email || !name) {
    return finalRes.status(400).json({ error: 'Email and name are required.' });
  }

  const db = readDatabase();
  let user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  let status = 200;

  if (user) {
    if (password) {
      const passwordMatch = bcrypt.compareSync(password, user.password);
      if (!passwordMatch) {
        return finalRes.status(400).json({ error: 'Incorrect password for this account.' });
      }
    }
  }

  if (!user) {
    const userPassword = password ? bcrypt.hashSync(password, 10) : bcrypt.hashSync(Math.random().toString(36).substring(2, 10), 10);
    // Automatically create a new user profile with Google credentials
    user = {
      id: Date.now().toString(),
      name,
      email: email.toLowerCase(),
      password: userPassword,
      trustScore: '0%',
      swapsCount: '0',
      ratingValue: '0.0',
      communitiesCount: '0',
      bio: 'Signed in with Google. Let\'s swap some cool skills!',
      about: 'I am a new Explorer on the SkillSwap platform! Let\'s swap some cool skills.',
      teaches: ['General / Academics'],
      wants: ['Programming / Coding'],
      joinedCircles: [],
      profilePicture: imageUrl || '',
      profileImage: imageUrl || '',
      avatarUrl: imageUrl || '',
      isVerified: true,
      verificationOtp: null,
      otpExpiresAt: null
    };

    db.users.push(user);
 
    // Create Welcome Notification
    const welcomeNotification = {
      id: "notif_" + Date.now(),
      userId: user.id,
      title: "Welcome to SkillSwap via Google! 🚀",
      message: `Welcome, ${user.name}! Add skills on your Profile to verify your expertise via AI MCQ assessments and boost your Trust Score.`,
      type: "system",
      timestamp: Date.now(),
      read: false
    };
     
    if (!db.notifications) db.notifications = [];
    db.notifications.push(welcomeNotification);
 
    writeDatabase(db);
    status = 201;
  }
 
  // OTP Verification completely disabled
 
  // Generate JWT Token
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
 
  // Exclude password in response
  const { password: _, ...userWithoutPassword } = user;
 
  return finalRes.status(status).json({
    token,
    user: userWithoutPassword
  });
});

// Sign In / Log In Endpoint
app.post('/api/auth/login', (req, finalRes) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return finalRes.status(400).json({ error: 'Email and password are required.' });
  }

  const db = readDatabase();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return finalRes.status(400).json({ error: 'Invalid email or password.' });
  }

  // Compare hashed password
  const passwordMatch = bcrypt.compareSync(password, user.password);
  
  if (!passwordMatch) {
    return finalRes.status(400).json({ error: 'Invalid email or password.' });
  }

  // OTP Verification completely disabled

  // Generate JWT Token
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

  // Exclude password in response
  const { password: _, ...userWithoutPassword } = user;

  return finalRes.json({
    token,
    user: userWithoutPassword
  });
});

// OTP Verification Endpoint
app.post('/api/auth/verify-otp', (req, finalRes) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return finalRes.status(400).json({ error: 'Email and OTP are required.' });
  }

  const db = readDatabase();
  const userIndex = db.users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

  if (userIndex === -1) {
    return finalRes.status(400).json({ error: 'User not found.' });
  }

  const user = db.users[userIndex];
  if (user.isVerified) {
    return finalRes.status(400).json({ error: 'Account is already verified.' });
  }

  if (user.verificationOtp !== otp) {
    return finalRes.status(400).json({ error: 'Incorrect 4-digit OTP. Please check your email.' });
  }

  if (Date.now() > user.otpExpiresAt) {
    return finalRes.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  // Update verified status
  user.isVerified = true;
  user.verificationOtp = null;
  user.otpExpiresAt = null;
  db.users[userIndex] = user;
  
  try {
    writeDatabase(db);
  } catch (err) {
    return finalRes.status(500).json({ error: 'Failed to update database.' });
  }

  // Generate JWT Token
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

  // Exclude password in response
  const { password: _, ...userWithoutPassword } = user;

  return finalRes.json({
    token,
    user: userWithoutPassword,
    message: 'Account verified successfully!'
  });
});

// Resend OTP Endpoint
app.post('/api/auth/resend-otp', (req, finalRes) => {
  const { email } = req.body;
  if (!email) {
    return finalRes.status(400).json({ error: 'Email is required.' });
  }

  const db = readDatabase();
  const userIndex = db.users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

  if (userIndex === -1) {
    return finalRes.status(400).json({ error: 'User not found.' });
  }

  const user = db.users[userIndex];
  if (user.isVerified) {
    return finalRes.status(400).json({ error: 'Account is already verified.' });
  }

  // Generate new OTP
  const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
  user.verificationOtp = newOtp;
  user.otpExpiresAt = Date.now() + 10 * 60 * 1000;
  db.users[userIndex] = user;
  writeDatabase(db);

  sendOtpEmail(user.email, user.name, newOtp);

  return finalRes.json({ message: 'A new 4-digit OTP has been sent to your email.' });
});

// Secure Change Password Endpoint
app.post('/api/users/change-password', authenticateToken, (req, finalRes) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return finalRes.status(400).json({ error: 'Current password and new password are required.' });
  }

  const db = readDatabase();
  const userIndex = db.users.findIndex(u => u.id === req.user.id);

  if (userIndex === -1) {
    return finalRes.status(404).json({ error: 'User not found.' });
  }

  const user = db.users[userIndex];

  // Verify current password match
  const passwordMatch = bcrypt.compareSync(currentPassword, user.password);
  if (!passwordMatch) {
    return finalRes.status(400).json({ error: 'Incorrect current password.' });
  }

  // Encrypt new password
  user.password = bcrypt.hashSync(newPassword, 10);
  db.users[userIndex] = user;
  
  try {
    writeDatabase(db);
    console.log(`[Backend] Password successfully updated for user: ${req.user.id}`);
  } catch (err) {
    return finalRes.status(500).json({ error: 'Failed to update database.' });
  }

  return finalRes.json({ success: true, message: 'Password changed successfully.' });
});

// =========================================================================
// 📧 SMTP EMAIL DISPATCHER UTILITIES
// =========================================================================
let mailTransporter = null;

async function getMailTransporter() {
  if (mailTransporter) return mailTransporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  
  if (smtpHost && smtpUser && smtpPass) {
    console.log(`[Email OTP] Using custom SMTP server: ${smtpHost}:${smtpPort}`);
    mailTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465,
      auth: { user: smtpUser, pass: smtpPass }
    });
  } else {
    console.log("[Email OTP] No SMTP credentials provided. Creating test Ethereal SMTP account...");
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log(`[Email OTP] Created Ethereal account! User: ${testAccount.user}, Pass: ${testAccount.pass}`);
      mailTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
    } catch (e) {
      console.error("[Email OTP] Error creating Ethereal account, falling back to local mock logger:", e);
      mailTransporter = {
        sendMail: async (options) => {
          console.log("\n================ MOCK EMAIL SENT ================");
          console.log(`To: ${options.to}`);
          console.log(`Subject: ${options.subject}`);
          console.log(`Body:\n${options.text}`);
          console.log("=================================================\n");
          return { messageId: "mock_id_" + Date.now() };
        }
      };
    }
  }
  return mailTransporter;
}

async function sendOtpEmail(email, name, otp) {
  try {
    const transporter = await getMailTransporter();
    const mailOptions = {
      from: process.env.SMTP_FROM || '"SkillSwap Verification" <noreply@skillswap.com>',
      to: email,
      subject: 'Verify Your SkillSwap Account 🚀',
      text: `Hello ${name},\n\nWelcome to SkillSwap! To complete your registration and verify your email, please enter the following 4-digit One-Time Password (OTP):\n\n👉 ${otp}\n\nThis OTP is valid for 10 minutes. If you did not sign up for a SkillSwap account, please ignore this email.\n\nHappy Swapping,\nThe SkillSwap Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #fafafa;">
          <h2 style="color: #6366F1; text-align: center;">Verify Your SkillSwap Account 🚀</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Welcome to SkillSwap! To complete your registration and verify your email, please enter the following 4-digit One-Time Password (OTP):</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: 900; color: #fff; background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 12px 36px; border-radius: 12px; letter-spacing: 4px; display: inline-block; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);">${otp}</span>
          </div>
          <p style="color: #666; font-size: 13px;">This OTP is valid for <strong>10 minutes</strong>. If you did not sign up for a SkillSwap account, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">Happy Swapping,<br/>The SkillSwap Team</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email OTP] Verification email successfully sent to ${email}. Message ID: ${info.messageId}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`\n📬 [TEST EMAIL PREVIEW] View OTP email online at: ${previewUrl}\n`);
    }
  } catch (err) {
    console.error("[Email OTP] Error sending verification email:", err);
  }
}

// =========================================================================
// 🧭 PROTECTED USER PROFILE ENDPOINTS
// =========================================================================

// Middleware to authenticate JWT token
function authenticateToken(req, finalRes, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return finalRes.status(401).json({ error: 'Access token missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return finalRes.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = decoded;
    next();
  });
}

// Get User Profile details
app.get('/api/users/profile', authenticateToken, (req, finalRes) => {
  const db = readDatabase();
  const user = db.users.find(u => u.id === req.user.id);

  if (!user) {
    return finalRes.status(404).json({ error: 'User not found.' });
  }

  const { password: _, ...userWithoutPassword } = user;
  return finalRes.json(userWithoutPassword);
});

// Update Profile details
app.put('/api/users/profile', authenticateToken, (req, finalRes) => {
  const db = readDatabase();
  const userIndex = db.users.findIndex(u => u.id === req.user.id);

  console.log(`[Backend] PUT /api/users/profile triggered for user ID: ${req.user.id}`);
  console.log(`[Backend] Request body fields:`, Object.keys(req.body));

  if (userIndex === -1) {
    console.error(`[Backend] User ${req.user.id} not found in database.`);
    return finalRes.status(404).json({ error: 'User not found.' });
  }

  const { bio, about, teaches, wants, skillScores, skillRatings, skillLearners, profilePicture, profileImage, avatarUrl, password } = req.body;
  const user = db.users[userIndex];

  if (password !== undefined) {
    user.password = bcrypt.hashSync(password, 10);
    console.log(`[Backend] Password successfully updated in profile PUT for user: ${req.user.id}`);
  }

  if (bio !== undefined) user.bio = bio;
  if (about !== undefined) user.about = about;
  if (teaches !== undefined) user.teaches = teaches;
  if (wants !== undefined) user.wants = wants;
  
  const imgVal = profilePicture || profileImage || avatarUrl;
  if (imgVal !== undefined) {
    console.log(`[Backend] profilePicture is defined in request. Length: ${imgVal ? imgVal.length : 0} chars.`);
    user.profilePicture = imgVal;
    user.profileImage = imgVal;
    user.avatarUrl = imgVal;
  } else {
    console.log(`[Backend] profilePicture is UNDEFINED in request. Preserving existing value.`);
  }
  
  if (skillScores !== undefined) {
    // Automatically generate notification for newly verified skill
    const oldScores = user.skillScores || {};
    Object.keys(skillScores).forEach(skill => {
      if (skillScores[skill] !== oldScores[skill]) {
        const scoreVal = skillScores[skill];
        const newNotif = {
          id: "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
          userId: req.user.id,
          title: "Skill Verified! 🎓",
          message: `Congratulations! Your "${skill}" skill has been successfully verified with a score of ${scoreVal}% and added to your profile.`,
          type: "verified",
          timestamp: Date.now(),
          read: false
        };
        db.notifications.push(newNotif);
        io.to(req.user.id).emit('notification', newNotif);
      }
    });
    user.skillScores = skillScores;
  }
  
  if (skillRatings !== undefined) user.skillRatings = skillRatings;
  if (skillLearners !== undefined) user.skillLearners = skillLearners;

  // Update profile fields
  const { title, availability, language, experience, ratingValue, swapsCount, trustScore } = req.body;
  if (title !== undefined) user.title = title;
  if (availability !== undefined) user.availability = availability;
  if (language !== undefined) user.language = language;
  if (experience !== undefined) user.experience = experience;
  if (ratingValue !== undefined) user.ratingValue = ratingValue;
  if (swapsCount !== undefined) user.swapsCount = swapsCount;
  if (trustScore !== undefined) user.trustScore = trustScore;

  db.users[userIndex] = user;
  
  try {
    writeDatabase(db);
    console.log(`[Backend] Successfully saved updated profile details for user: ${req.user.id} (Picture Length: ${user.profilePicture ? user.profilePicture.length : 0})`);
  } catch (writeErr) {
    console.error(`[Backend] ERROR writing database update:`, writeErr);
    return finalRes.status(500).json({ error: 'Database write failed. Profile data could not be saved permanently.' });
  }

  const { password: _, ...userWithoutPassword } = user;
  return finalRes.json(userWithoutPassword);
});

// Rate a User / Swapper
app.post('/api/users/rate', authenticateToken, (req, finalRes) => {
  const { targetUserId, rating, trustScore } = req.body;
  if (!targetUserId || rating === undefined) {
    return finalRes.status(400).json({ error: 'Target User ID and rating are required.' });
  }

  const db = readDatabase();
  const user = db.users.find(u => u.id === targetUserId);
  if (!user) {
    return finalRes.status(404).json({ error: 'User not found.' });
  }

  const newRatingValue = parseFloat(rating);
  if (isNaN(newRatingValue) || newRatingValue < 1 || newRatingValue > 5) {
    return finalRes.status(400).json({ error: 'Rating must be a number between 1 and 5.' });
  }

  if (!user.ratingsReceived) {
    user.ratingsReceived = [];
  }
  user.ratingsReceived.push(newRatingValue);
  
  const sum = user.ratingsReceived.reduce((acc, r) => acc + r, 0);
  const avg = sum / user.ratingsReceived.length;
  user.ratingValue = avg.toFixed(1);

  if (trustScore !== undefined) {
    user.trustScore = trustScore;
  } else {
    // Dynamic trust score based on received ratings (avg * 20)
    const trustScoreNum = Math.min(100, Math.round(avg * 20));
    user.trustScore = `${trustScoreNum}%`;
  }

  writeDatabase(db);
  
  console.log(`[Backend] User ${targetUserId} received a rating of ${newRatingValue}. New average: ${user.ratingValue}, New Trust Score: ${user.trustScore}`);

  return finalRes.json({ ratingValue: user.ratingValue });
});

// Delete User Profile / Account
app.delete('/api/users/profile', authenticateToken, (req, finalRes) => {
  const db = readDatabase();
  const userId = req.user.id;

  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return finalRes.status(404).json({ error: 'User not found.' });
  }

  // Remove user from database
  db.users.splice(userIndex, 1);

  // Clean up any session rooms associated with this user
  db.sessions = db.sessions.filter(s => s.userId !== userId && s.partnerId !== userId);

  // Clean up notifications for this user
  db.notifications = db.notifications.filter(n => n.userId !== userId);

  // Clean up chats/messages associated with this user
  if (db.chats) {
    db.chats = db.chats.filter(c => c.senderId !== userId && c.receiverId !== userId);
  }

  writeDatabase(db);

  console.log(`[Backend] Permanently deleted account, sessions, chats, and notifications for user: ${userId}`);

  return finalRes.json({ success: true, message: 'Account deleted successfully and all your data has been completely cleared.' });
});

// Register FCM Push Token for active user
app.post('/api/users/push-token', authenticateToken, (req, finalRes) => {
  const { pushToken } = req.body;
  if (!pushToken) {
    return finalRes.status(400).json({ error: 'Push token is required.' });
  }

  const db = readDatabase();
  const userIndex = db.users.findIndex(u => u.id === req.user.id);

  if (userIndex === -1) {
    return finalRes.status(404).json({ error: 'User not found.' });
  }

  db.users[userIndex].pushToken = pushToken;
  writeDatabase(db);

  console.log(`[Backend FCM] Successfully registered push token for user ${req.user.id}`);
  return finalRes.json({ success: true, message: 'Push token registered successfully.' });
});

// AI Support Chat Assistant Endpoint
app.post('/api/support/chat', async (req, finalRes) => {
  const { message } = req.body;
  if (!message) {
    return finalRes.status(400).json({ error: 'Message is required.' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const systemPrompt = `You are SkillSwap AI Support Assistant, a professional, smart, and friendly AI chatbot integrated into the SkillSwap mobile application.
Answer the user's questions about the app.
Be concise (maximum 3 sentences per response).
Here is a list of app rules and features to guide you:
- SkillSwap is a platform for swapping skills (peer-to-peer exchange).
- Users can teach skills they are good at and learn skills they want.
- Profile: Add/remove skills from Teach or Want lists.
- AI MCQ Assessments: Users prove their expertise in a skill by taking a 5-question AI-generated multiple-choice quiz. Passing increases their skill score and starting trust score.
- Trust Score: Starts at 0% for new accounts. Increases when completing skill assessments or when highly rated by session partners (0%, 25%, 50%, 75%, 100%).
- Sessions: Users can schedule swap sessions, launch a live video/audio swap room, write code, chat, and rate the partner after the session completes.
- Account Settings: Accessible from the Profile tab via the Settings gear. Includes security configurations, changing passwords, and permanently deleting account (which purges all data: profile, sessions, direct messages, notifications).
- Security: All logins are secure. OTP verification is completely disabled by default for instant setup.
- Support: You are always here to help!`;

  if (geminiKey) {
    try {
      console.log("[Support Chat AI] Using Google Gemini API to answer support query...");
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nUser Question: ${message}\n\nAI Assistant Response:`
            }]
          }],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.7
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          console.log("[Support Chat AI] Gemini success response.");
          return finalRes.json({ reply: text.trim() });
        }
      }
      console.warn("[Support Chat AI] Gemini returned empty response or error status. Falling back to offline model...");
    } catch (e) {
      console.error("[Support Chat AI] Gemini network error. Falling back to offline model:", e);
    }
  }

  // Smart Offline Fallback Agent
  console.log("[Support Chat AI] Using offline simulated AI expert responder...");
  const lower = message.toLowerCase();
  let reply = "Hello! I am your SkillSwap AI Support Assistant. I'm here to help you get the most out of SkillSwap. Can you please clarify your request?";

  if (lower.includes("delete") || lower.includes("account") || lower.includes("clear") || lower.includes("purge")) {
    reply = "To permanently delete your account, click the 'Delete Account' button inside the Settings menu. This instantly wipes all your personal data, sessions, notifications, and chat history permanently from the database.";
  } else if (lower.includes("notification") || lower.includes("notif") || lower.includes("bell") || lower.includes("alert")) {
    reply = "You will receive push and in-app alerts in the Notifications tab whenever you receive a message, a swap request, a session confirmation, or pass an MCQ assessment.";
  } else if (lower.includes("report") || lower.includes("block") || lower.includes("abuse") || lower.includes("flag") || lower.includes("safety")) {
    reply = "To report a user, visit their profile via Discover or Chat, tap the Settings icon on their profile, and click 'Report User'. Our safety team will review their activity within 24 hours.";
  } else if (lower.includes("trust") || lower.includes("score") || lower.includes("rate") || lower.includes("rating")) {
    reply = "Your Trust Score starts at 0% and increases when you successfully pass MCQ skill assessments or receive good partner reviews (up to 100%) after finishing swap sessions.";
  } else if (lower.includes("assessment") || lower.includes("mcq") || lower.includes("quiz") || lower.includes("test")) {
    reply = "Skill assessments are 5-question AI quizzes designed to verify your skills. Tapping any skill you wish to teach or learn will trigger the assessment screen instantly.";
  } else if (lower.includes("session") || lower.includes("swap") || lower.includes("room") || lower.includes("video") || lower.includes("code")) {
    reply = "In the Sessions tab, you can schedule and launch active swap rooms where you can write code, video chat in real-time, and rate your swap partner once finished.";
  } else if (lower.includes("password") || lower.includes("change") || lower.includes("security")) {
    reply = "You can update your password securely inside Account Settings under the Profile settings tab. Simply enter your current password and your new password.";
  } else if (lower.includes("chat") || lower.includes("message") || lower.includes("partner")) {
    reply = "You can chat with potential partners by browsing profiles in the Discover tab and tapping 'Chat'. Active conversations are listed in your Chat tab.";
  } else if (lower.includes("skill") || lower.includes("teach") || lower.includes("want") || lower.includes("learn") || lower.includes("setup") || lower.includes("profile")) {
    reply = "To set up your profile or add skills, go to your Profile and tap '+ Add Skill'. You will be given a quick verification assessment to update your profile list.";
  } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    reply = "Hello! I am your SkillSwap AI Assistant. How can I help you navigate through skill swaps, assessments, or account settings today?";
  }

  return finalRes.json({ reply });
});

// FCM Push Notification dispatcher utility using standard Legacy REST API (high-compatibility fallback)
async function sendFcmNotification(targetUserId, title, body, dataPayload = {}) {
  const db = readDatabase();
  const user = db.users.find(u => u.id === targetUserId);
  
  if (!user || !user.pushToken) {
    console.log(`[Backend FCM] User ${targetUserId} has no registered push token. Skipping FCM push.`);
    return false;
  }

  console.log(`[Backend FCM] Dispatching FCM notification to user ${targetUserId} (${user.name}). Token: ${user.pushToken.substring(0, 15)}...`);

  // Developer can set the server key as an env variable or edit here
  const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || 'AAAAc9zS9wU:APA91bF97c5M2-nZ7bZ2Y4pT...'; // placeholder/fallback key

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`
      },
      body: JSON.stringify({
        to: user.pushToken,
        notification: {
          title: title,
          body: body,
          sound: 'default',
          badge: '1'
        },
        data: {
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          id: String(Date.now()),
          title: title,
          body: body,
          ...dataPayload
        },
        priority: 'high'
      })
    });

    if (response.ok) {
      console.log(`[Backend FCM] Push notification successfully dispatched to FCM gateway for user ${targetUserId}`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`[Backend FCM] FCM gateway returned error response:`, errorText);
      return false;
    }
  } catch (err) {
    console.error(`[Backend FCM] Network error dispatching push notification:`, err);
    return false;
  }
}

// Dynamic Match Score calculation helper
function calculateMatchScore(currentUser, targetUser) {
  if (!currentUser) return "85%";
  let matchPoints = 80;
  
  const currentWants = currentUser.wants || [];
  const targetTeaches = targetUser.teaches || [];
  const teachOverlap = targetTeaches.some(skill => 
    currentWants.some(want => want.toLowerCase().trim() === skill.toLowerCase().trim())
  );
  if (teachOverlap) matchPoints += 10;

  const currentTeaches = currentUser.teaches || [];
  const targetWants = targetUser.wants || [];
  const wantOverlap = targetWants.some(skill => 
    currentTeaches.some(teach => teach.toLowerCase().trim() === skill.toLowerCase().trim())
  );
  if (wantOverlap) matchPoints += 8;

  const finalScore = Math.min(matchPoints, 99);
  return `${finalScore}%`;
}

// Average verification score helper
function calculateAvgScore(u) {
  if (!u.skillScores) return "85%";
  const keys = Object.keys(u.skillScores);
  if (keys.length === 0) return "85%";
  const sum = keys.reduce((acc, key) => acc + u.skillScores[key], 0);
  const avg = Math.round(sum / keys.length);
  return `${avg}%`;
}

// Total learners count helper
function calculateLearnersCount(u) {
  if (!u.skillLearners) return "10";
  const keys = Object.keys(u.skillLearners);
  if (keys.length === 0) return "10";
  const sum = keys.reduce((acc, key) => acc + parseInt(u.skillLearners[key] || 0, 10), 0);
  return String(sum || 10);
}

// Discover dynamic users endpoint
app.get('/api/users/discover', authenticateToken, (req, finalRes) => {
  const db = readDatabase();
  const userId = req.user.id;
  const currentUser = db.users.find(u => u.id === userId);

  // Filter out the requesting user
  const otherUsers = db.users.filter(u => String(u.id) !== String(userId));

  const mappedSwappers = otherUsers.map(u => {
    // Generate initials avatar
    const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    return {
      id: u.id,
      name: u.name,
      avatar: initials,
      profilePicture: u.profilePicture || u.profileImage || u.avatarUrl || '',
      profileImage: u.profilePicture || u.profileImage || u.avatarUrl || '',
      avatarUrl: u.profilePicture || u.profileImage || u.avatarUrl || '',
      title: u.title || "SkillSwap Explorer",
      teaches: (Array.isArray(u.teaches) && u.teaches.length > 0) ? u.teaches.join(', ') : "General / Academics",
      wants: (Array.isArray(u.wants) && u.wants.length > 0) ? u.wants.join(', ') : "Programming / Coding",
      matchScore: calculateMatchScore(currentUser, u),
      availability: u.availability || "Weekends, Flexible Timings",
      language: u.language || "English",
      experience: u.experience || "1+ Years",
      score: calculateAvgScore(u),
      rating: u.ratingValue || "5.0",
      learnersCount: calculateLearnersCount(u)
    };
  });

  // Sort swappers by match score descending to show best matches based on learning/teaching skills first
  mappedSwappers.sort((a, b) => parseInt(b.matchScore, 10) - parseInt(a.matchScore, 10));

  return finalRes.json(mappedSwappers);
});

// =========================================================================
// 💬 CHATS & MESSAGES ENDPOINTS
// =========================================================================

// Get list of all message conversations / partners for active user
app.get('/api/chats', authenticateToken, (req, finalRes) => {
  const db = readDatabase();
  const userId = req.user.id;

  // Find all unique partner IDs that the user has chatted with
  const userMessages = db.chats.filter(m => m.senderId === userId || m.receiverId === userId);
  const partnerIds = new Set();
  userMessages.forEach(m => {
    partnerIds.add(m.senderId === userId ? m.receiverId : m.senderId);
  });

  const conversations = Array.from(partnerIds).map(pId => {
    const userInDb = db.users.find(u => u.id === pId);
    const pName = userInDb ? userInDb.name : "Unknown Swapper";

    const conversationMessages = userMessages.filter(m => 
      (m.senderId === userId && m.receiverId === pId) || 
      (m.senderId === pId && m.receiverId === userId)
    );

    const lastMessage = conversationMessages.length > 0 
      ? conversationMessages[conversationMessages.length - 1].text 
      : "No messages yet.";

    return {
      partnerId: pId,
      partnerName: pName,
      partnerPicture: userInDb ? userInDb.profilePicture : undefined,
      lastMessage
    };
  });

  return finalRes.json(conversations);
});

const COMMUNITY_CIRCLES = [
  "Bengaluru Guitar Circle",
  "Python Learners India",
  "Design & Figma Swappers",
  "Wellness & Yoga Exchange"
];

// Get chronological messages with a specific partner
app.get('/api/chats/:partnerId', authenticateToken, (req, finalRes) => {
  const db = readDatabase();
  const userId = req.user.id;
  const partnerId = req.params.partnerId;

  const isCommunityCircle = COMMUNITY_CIRCLES.includes(partnerId);

  let chatMessages = [];
  if (isCommunityCircle) {
    chatMessages = db.chats.filter(m => m.receiverId === partnerId);
  } else {
    chatMessages = db.chats.filter(m => 
      (m.senderId === userId && m.receiverId === partnerId) ||
      (m.senderId === partnerId && m.receiverId === userId)
    );
  }

  // Return formatted for client
  const formatted = chatMessages.map(m => {
    let senderName = "Unknown User";
    if (isCommunityCircle) {
      const senderObj = db.users.find(u => u.id === m.senderId);
      if (senderObj) {
        senderName = senderObj.name;
      }
    }
    return {
      id: m.id,
      text: m.text,
      isMe: m.senderId === userId,
      senderId: m.senderId,
      senderName: isCommunityCircle ? senderName : undefined,
      timestamp: m.timestamp
    };
  });

  return finalRes.json(formatted);
});

// Post a new message to a specific partner
app.post('/api/chats/:partnerId', authenticateToken, (req, finalRes) => {
  const { text } = req.body;
  if (!text) {
    return finalRes.status(400).json({ error: 'Message text is required.' });
  }

  const db = readDatabase();
  const userId = req.user.id;
  const partnerId = req.params.partnerId;

  const isCommunityCircle = COMMUNITY_CIRCLES.includes(partnerId);

  const newMessage = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    senderId: userId,
    receiverId: partnerId,
    text,
    timestamp: Date.now()
  };

  db.chats.push(newMessage);
  writeDatabase(db);

  const senderObj = db.users.find(u => u.id === userId);
  const senderName = senderObj ? senderObj.name : "Someone";
  const senderPicture = senderObj ? senderObj.profilePicture : undefined;

  // Emit real-time message event via Socket.io
  const socketMsg = {
    id: newMessage.id,
    senderId: userId,
    receiverId: partnerId,
    senderName,
    senderPicture,
    text: newMessage.text,
    timestamp: newMessage.timestamp
  };

  if (isCommunityCircle) {
    io.to(partnerId).emit('message', socketMsg);
  } else {
    io.to(partnerId).emit('message', socketMsg);
    io.to(userId).emit('message', socketMsg);
    
    // Dispatch native FCM push notification to direct chat partner
    sendFcmNotification(partnerId, `New message from ${senderName} 💬`, newMessage.text, {
      type: 'message',
      senderId: userId,
      senderName: senderName
    });
  }

  return finalRes.status(201).json({
    id: newMessage.id,
    text: newMessage.text,
    isMe: true,
    senderId: userId,
    senderName,
    senderPicture,
    timestamp: newMessage.timestamp
  });
});

// =========================================================================
// 📅 SWAP SESSIONS ENDPOINTS
// =========================================================================

// Get list of all sessions for active user
app.get('/api/sessions', authenticateToken, (req, finalRes) => {
  const db = readDatabase();
  const userId = req.user.id;

  const userSessions = db.sessions.filter(s => s.userId === userId);

  // Ensure all sessions have default status and isInbound values for compatibility
  const mappedSessions = userSessions.map(s => {
    if (!s.status) {
      if (s.isDone) s.status = 'completed';
      else if (s.date && s.date.includes('Pending')) s.status = 'pending';
      else s.status = 'accepted';
    }
    if (s.isInbound === undefined) {
      s.isInbound = false;
    }
    const partnerUser = db.users.find(u => u.id === s.partnerId);
    return {
      ...s,
      partnerPicture: partnerUser ? partnerUser.profilePicture : undefined
    };
  });

  return finalRes.json(mappedSessions);
});

// Post a new swap session request
app.post('/api/sessions', authenticateToken, (req, finalRes) => {
  const { partnerId, partnerName, teaches, wants } = req.body;

  if (!partnerId || !partnerName) {
    return finalRes.status(400).json({ error: 'Partner ID and Partner Name are required.' });
  }

  const db = readDatabase();
  const userId = req.user.id;

  // Avoid creating identical duplicate sessions that are pending
  const existing = db.sessions.find(s => s.userId === userId && s.partnerId === partnerId && !s.isDone);
  if (existing) {
    return finalRes.json(existing);
  }

  const requester = db.users.find(u => u.id === userId);
  const requesterName = requester ? requester.name : "Unknown Swapper";

  const sessionGroupId = "sess_group_" + Date.now();

  const requesterSession = {
    id: sessionGroupId + "_req",
    groupId: sessionGroupId,
    userId: userId,
    partnerId: partnerId,
    partnerName: partnerName,
    title: `${teaches || 'Skills Exchange'} with ${partnerName}`,
    date: "Scheduled (Pending Confirmation)",
    liveSoon: false,
    isDone: false,
    status: "pending",
    isInbound: false
  };

  const targetSession = {
    id: sessionGroupId + "_tgt",
    groupId: sessionGroupId,
    userId: partnerId,
    partnerId: userId,
    partnerName: requesterName,
    title: `${teaches || 'Skills Exchange'} with ${requesterName}`,
    date: "Pending Inbound Request",
    liveSoon: false,
    isDone: false,
    status: "pending",
    isInbound: true
  };

  db.sessions.push(requesterSession, targetSession);

  const partnerUser = db.users.find(u => u.id === partnerId);

  // Generate Session Requested Notification for target
  const targetNotif = {
    id: "notif_tgt_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    userId: partnerId,
    title: "Swap Requested! 📅",
    message: `${requesterName} requested a skill swap session with you for "${teaches}".`,
    type: "session",
    timestamp: Date.now(),
    read: false,
    senderPicture: requester ? requester.profilePicture : undefined
  };
  db.notifications.push(targetNotif);
  io.to(partnerId).emit('notification', targetNotif);

  // Generate Session Requested Notification for requester
  const requesterNotif = {
    id: "notif_req_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    userId: userId,
    title: "Swap Requested! 📅",
    message: `You requested a skill swap session with ${partnerName} for "${teaches}". They have been notified!`,
    type: "session",
    timestamp: Date.now(),
    read: false,
    senderPicture: partnerUser ? partnerUser.profilePicture : undefined
  };
  db.notifications.push(requesterNotif);
  io.to(userId).emit('notification', requesterNotif);

  // Seed a welcome/greeting chat message from the partner swapper
  const seedGreetingChat = {
    id: 'msg_seed_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    senderId: partnerId,
    receiverId: userId,
    text: `Hi! Thanks for the swap request. I can help you with "${teaches || 'our exchange'}". Let's align on a schedule here!`,
    timestamp: Date.now() + 500
  };
  if (!db.chats) db.chats = [];
  db.chats.push(seedGreetingChat);

  // Emit real-time message event via Socket.io
  const socketMsg = {
    id: seedGreetingChat.id,
    senderId: partnerId,
    receiverId: userId,
    text: seedGreetingChat.text,
    timestamp: seedGreetingChat.timestamp
  };
  io.to(partnerId).emit('message', socketMsg);
  io.to(userId).emit('message', socketMsg);

  // Dispatch native FCM push notification to target partner about swap request
  sendFcmNotification(partnerId, "Swap Requested! 📅", `${requesterName} requested a skill swap session with you for "${teaches || 'our exchange'}".`, {
    type: 'session',
    groupId: sessionGroupId,
    partnerId: userId
  });

  writeDatabase(db);

  return finalRes.status(201).json(requesterSession);
});

// Update swap session details or complete
app.put('/api/sessions/:id', authenticateToken, (req, finalRes) => {
  const db = readDatabase();
  const userId = req.user.id;
  const sessionIndex = db.sessions.findIndex(s => s.id === req.params.id && s.userId === userId);

  if (sessionIndex === -1) {
    return finalRes.status(404).json({ error: 'Session not found.' });
  }

  const session = db.sessions[sessionIndex];
  const { isDone, liveSoon, date, status, isInbound, isRated, completedAt } = req.body;

  const oldStatus = session.status;
  const groupId = session.groupId;

  // If session belongs to a group, update both sessions in the group!
  const relatedSessions = groupId ? db.sessions.filter(s => s.groupId === groupId) : [session];

  relatedSessions.forEach(s => {
    if (isDone !== undefined) s.isDone = isDone;
    if (liveSoon !== undefined) s.liveSoon = liveSoon;
    if (isRated !== undefined) s.isRated = isRated;
    if (completedAt !== undefined) s.completedAt = completedAt;
    
    if (status !== undefined) {
      s.status = status;
      if (status === 'accepted') {
        s.isInbound = false;
        if (s.date === 'Pending Inbound Request' || s.date.includes('Pending') || s.date === 'Scheduled (Pending Confirmation)') {
          s.date = date || "Tomorrow, 4:00 PM";
        }
      }
    } else {
      if (date !== undefined) s.date = date;
      if (isInbound !== undefined) s.isInbound = isInbound;
    }
  });

  // If session is newly accepted, handle triggers
  if (status === 'accepted' && oldStatus === 'pending') {
    // Increment swapsCount for both users!
    relatedSessions.forEach(s => {
      const userObj = db.users.find(u => u.id === s.userId);
      if (userObj) {
        const currentCount = parseInt(userObj.swapsCount || '0', 10);
        userObj.swapsCount = (currentCount + 1).toString();
        console.log(`[Backend] Incremented swapsCount for user ${userObj.id} to ${userObj.swapsCount} because swap was accepted.`);
      }
    });

    // Generate Accepted Notifications for both users
    relatedSessions.forEach(s => {
      const partnerUser = db.users.find(u => u.id === s.partnerId);
      const acceptNotif = {
        id: "notif_accept_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        userId: s.userId,
        title: "Swap Accepted! 🎉",
        message: s.userId === userId 
          ? `You accepted the skill swap request from ${s.partnerName}.`
          : `${db.users.find(u => u.id === userId)?.name || 'Your partner'} accepted your skill swap request!`,
        type: "session",
        timestamp: Date.now(),
        read: false,
        senderPicture: partnerUser ? partnerUser.profilePicture : undefined
      };
      db.notifications.push(acceptNotif);
      io.to(s.userId).emit('notification', acceptNotif);
    });

    // Seed chat greeting if none exists
    const otherSession = relatedSessions.find(s => s.userId !== userId);
    if (otherSession) {
      const hasMessages = db.chats.some(m => 
        (m.senderId === userId && m.receiverId === otherSession.userId) ||
        (m.senderId === otherSession.userId && m.receiverId === userId)
      );
      if (!hasMessages) {
        const seedChat = {
          id: 'msg_accept_' + Date.now(),
          senderId: userId,
          receiverId: otherSession.userId,
          text: `Awesome! Thanks for accepting my swap request. I'm excited to help you with ${session.title.split('with ')[0].trim()}! When are you free for our first video exchange?`,
          timestamp: Date.now()
        };
        db.chats.push(seedChat);

        // Emit real-time message to both
        const socketMsg = {
          id: seedChat.id,
          senderId: userId,
          receiverId: otherSession.userId,
          text: seedChat.text,
          timestamp: seedChat.timestamp
        };
        io.to(userId).emit('message', socketMsg);
        io.to(otherSession.userId).emit('message', socketMsg);
      }
    }

    // Dispatch native FCM push notification to the partner about swap acceptance
    const accepterName = db.users.find(u => u.id === userId)?.name || 'Your partner';
    if (otherSession) {
      sendFcmNotification(otherSession.userId, "Swap Accepted! 🎉", `${accepterName} accepted your skill swap request!`, {
        type: 'session_accepted',
        groupId: groupId,
        partnerId: userId
      });
    }
  }

  writeDatabase(db);

  return finalRes.json(session);
});

// Delete / Cancel a pending swap session request
app.delete('/api/sessions/:id', authenticateToken, (req, finalRes) => {
  const db = readDatabase();
  const userId = req.user.id;
  const sessionIndex = db.sessions.findIndex(s => s.id === req.params.id && s.userId === userId);

  if (sessionIndex === -1) {
    return finalRes.status(404).json({ error: 'Session not found.' });
  }

  const session = db.sessions[sessionIndex];
  const groupId = session.groupId;

  // Remove session(s) from array
  if (groupId) {
    db.sessions = db.sessions.filter(s => s.groupId !== groupId);
  } else {
    db.sessions.splice(sessionIndex, 1);
  }
  
  writeDatabase(db);

  return finalRes.json({ success: true });
});

// =========================================================================
// 🧘 COMMUNITY CIRCLES ENDPOINTS
// =========================================================================

// Join a Community Circle Group
app.post('/api/circles/join', authenticateToken, (req, finalRes) => {
  const { circleName } = req.body;
  if (!circleName) {
    return finalRes.status(400).json({ error: 'Circle Name is required.' });
  }

  const db = readDatabase();
  const userIndex = db.users.findIndex(u => u.id === req.user.id);

  if (userIndex === -1) {
    return finalRes.status(404).json({ error: 'User not found.' });
  }

  const user = db.users[userIndex];
  if (!user.joinedCircles) user.joinedCircles = [];

  if (!user.joinedCircles.includes(circleName)) {
    user.joinedCircles.push(circleName);
    db.users[userIndex] = user;
    writeDatabase(db);
  }

  return finalRes.json(user);
});

// Leave a Community Circle Group
app.post('/api/circles/leave', authenticateToken, (req, finalRes) => {
  const { circleName } = req.body;
  if (!circleName) {
    return finalRes.status(400).json({ error: 'Circle Name is required.' });
  }

  const db = readDatabase();
  const userIndex = db.users.findIndex(u => u.id === req.user.id);

  if (userIndex === -1) {
    return finalRes.status(404).json({ error: 'User not found.' });
  }

  const user = db.users[userIndex];
  if (!user.joinedCircles) user.joinedCircles = [];

  user.joinedCircles = user.joinedCircles.filter(name => name !== circleName);
  db.users[userIndex] = user;
  writeDatabase(db);

  return finalRes.json(user);
});

// =========================================================================
// 🔔 NOTIFICATIONS ENDPOINTS
// =========================================================================

// Get list of active user's notifications
app.get('/api/notifications', authenticateToken, (req, finalRes) => {
  const db = readDatabase();
  const userId = req.user.id;

  const userNotifs = db.notifications.filter(n => n.userId === userId);

  // Return sorted newest first
  userNotifs.sort((a, b) => b.timestamp - a.timestamp);
  return finalRes.json(userNotifs);
});

// Mark all notifications as read
app.post('/api/notifications/read', authenticateToken, (req, finalRes) => {
  const db = readDatabase();
  const userId = req.user.id;

  db.notifications.forEach(n => {
    if (n.userId === userId) {
      n.read = true;
    }
  });

  writeDatabase(db);
  return finalRes.json({ success: true });
});

server.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  let localIp = 'localhost';
  const networkInterfaces = os.networkInterfaces();
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    if (interfaces) {
      for (const iface of interfaces) {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIp = iface.address;
          break;
        }
      }
    }
    if (localIp !== 'localhost') break;
  }
  console.log(`[SkillSwap API Server] running dynamically on network at http://${localIp}:${PORT}`);
  console.log(`[SkillSwap API Server] also accessible locally at http://localhost:${PORT}`);
});
