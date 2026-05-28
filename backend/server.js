const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');

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
app.use(express.json());

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
    // data: { to, callerName }
    console.log(`[Socket.io] User ${socket.userId} is calling ${data.to}`);
    io.to(data.to).emit('incoming-call', { from: socket.userId, callerName: data.callerName });
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

// Helper helper utilities to read and write database
function readDatabase() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed.users) parsed.users = [];
    if (!parsed.sessions) parsed.sessions = [];
    if (!parsed.chats) parsed.chats = [];
    if (!parsed.notifications) parsed.notifications = [];
    return parsed;
  } catch (err) {
    return { users: [], sessions: [], chats: [], notifications: [] };
  }
}

function writeDatabase(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// Database seeding has been removed to allow pure user-defined profiles

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
    trustScore: '98%',
    swapsCount: '0',
    ratingValue: '0.0',
    communitiesCount: '0',
    bio: 'Passionate about learning and sharing knowledge. Let\'s grow together!',
    about: 'I am a new Explorer on the SkillSwap platform! Let\'s swap some cool skills.',
    teaches: ['General / Academics'],
    wants: ['Programming / Coding'],
    joinedCircles: []
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
  let { email, name, idToken } = req.body;

  if (idToken) {
    try {
      console.log("[Google Auth] Verifying secure ID Token...");
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      if (response.ok) {
        const ticket = await response.json();
        email = ticket.email;
        name = ticket.name || ticket.given_name || "Google User";
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

  if (!user) {
    // Automatically create a new user profile with Google credentials
    user = {
      id: Date.now().toString(),
      name,
      email: email.toLowerCase(),
      password: bcrypt.hashSync(Math.random().toString(36).substring(2, 10), 10), // secure random password
      trustScore: '98%',
      swapsCount: '0',
      ratingValue: '0.0',
      communitiesCount: '0',
      bio: 'Signed in with Google. Let\'s swap some cool skills!',
      about: 'I am a new Explorer on the SkillSwap platform! Let\'s swap some cool skills.',
      teaches: ['General / Academics'],
      wants: ['Programming / Coding'],
      joinedCircles: []
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

  // Generate JWT Token
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

  // Exclude password in response
  const { password: _, ...userWithoutPassword } = user;

  return finalRes.json({
    token,
    user: userWithoutPassword
  });
});

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

  if (userIndex === -1) {
    return finalRes.status(404).json({ error: 'User not found.' });
  }

  const { bio, about, teaches, wants, skillScores, skillRatings, skillLearners } = req.body;
  const user = db.users[userIndex];

  if (bio !== undefined) user.bio = bio;
  if (about !== undefined) user.about = about;
  if (teaches !== undefined) user.teaches = teaches;
  if (wants !== undefined) user.wants = wants;
  
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
  writeDatabase(db);

  const { password: _, ...userWithoutPassword } = user;
  return finalRes.json(userWithoutPassword);
});

// Rate a User / Swapper
app.post('/api/users/rate', authenticateToken, (req, finalRes) => {
  const { targetUserId, rating } = req.body;
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

  writeDatabase(db);
  
  console.log(`[Backend] User ${targetUserId} received a rating of ${newRatingValue}. New average: ${user.ratingValue}`);

  return finalRes.json({ ratingValue: user.ratingValue });
});

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
  const otherUsers = db.users.filter(u => u.id !== userId);

  const mappedSwappers = otherUsers.map(u => {
    // Generate initials avatar
    const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    return {
      id: u.id,
      name: u.name,
      avatar: initials,
      title: u.title || "SkillSwap Explorer",
      teaches: u.teaches && u.teaches.length > 0 ? u.teaches.join(', ') : "General / Academics",
      wants: u.wants && u.wants.length > 0 ? u.wants.join(', ') : "Programming / Coding",
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

  let senderName = undefined;
  if (isCommunityCircle) {
    const senderObj = db.users.find(u => u.id === userId);
    if (senderObj) {
      senderName = senderObj.name;
    }
  }

  // Emit real-time message event via Socket.io
  const socketMsg = {
    id: newMessage.id,
    senderId: userId,
    receiverId: partnerId,
    senderName,
    text: newMessage.text,
    timestamp: newMessage.timestamp
  };

  if (isCommunityCircle) {
    io.to(partnerId).emit('message', socketMsg);
  } else {
    io.to(partnerId).emit('message', socketMsg);
    io.to(userId).emit('message', socketMsg);
  }

  return finalRes.status(201).json({
    id: newMessage.id,
    text: newMessage.text,
    isMe: true,
    senderId: userId,
    senderName: isCommunityCircle ? senderName : undefined,
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
    return s;
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

  // Generate Session Requested Notification for target
  const targetNotif = {
    id: "notif_tgt_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    userId: partnerId,
    title: "Swap Requested! 📅",
    message: `${requesterName} requested a skill swap session with you for "${teaches}".`,
    type: "session",
    timestamp: Date.now(),
    read: false
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
    read: false
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
  const { isDone, liveSoon, date, status, isInbound } = req.body;

  const oldStatus = session.status;
  const groupId = session.groupId;

  // If session belongs to a group, update both sessions in the group!
  const relatedSessions = groupId ? db.sessions.filter(s => s.groupId === groupId) : [session];

  relatedSessions.forEach(s => {
    if (isDone !== undefined) s.isDone = isDone;
    if (liveSoon !== undefined) s.liveSoon = liveSoon;
    
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
      const acceptNotif = {
        id: "notif_accept_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        userId: s.userId,
        title: "Swap Accepted! 🎉",
        message: s.userId === userId 
          ? `You accepted the skill swap request from ${s.partnerName}.`
          : `${db.users.find(u => u.id === userId)?.name || 'Your partner'} accepted your skill swap request!`,
        type: "session",
        timestamp: Date.now(),
        read: false
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
