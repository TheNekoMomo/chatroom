require('dotenv').config()
const express = require('express');
const session = require('express-session');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const Message = require('./DB_Schema/chatroomSchema.js');

// set the port number for the server to listen on
const port = 3001;
// create an express app and a socket.io server that uses the express app
const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {}
});

const messageRateLimit = 5; // number of messages allowed per window
const messageRateLimitWindowMs = 5000; // time window in milliseconds (5 seconds)
const messageRateLimitMap = new Map(); // map to store rate limit data for each user

// set up express app with ejs view engine, static files, and session management
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.EXPRESS_SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// connect to the MongoDB database using mongoose and log the connection status
async function connectToDatabase() {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(process.env.MONGODB_URI, {});
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

// express routes
// handle request to root path and render index view
app.get('/', (req, res) => {
  res.render('index');
});

// handle login form submission and redirect to chat page if username is valid
app.post('/login', (req, res) => {
  const clientIp = req.headers['cf-connecting-ip'] || req.socket.remoteAddress;
  if (isRatelimited(clientIp, 1, 3000)) { // limit to 1 login attempts per 3 second
    return res.status(429).send('Rate limit exceeded. Please wait before trying again.');
  }
  const { username } = req.body;

  if (!username) return res.redirect('/');
  const trimmedUsername = username.trim();
  if (trimmedUsername.length === 0) return res.redirect('/');
  if (!checkUserInput(trimmedUsername, 10)) return res.redirect('/');

  req.session.username = trimmedUsername;
  res.redirect('/chat');
});

app.get('/messages', async (req, res) => {
  const beforeDate = req.query.before;
  const limit = 30; // number of messages to fetch

  let query = {};

  if (beforeDate) {
    query.createdAt = { $lt: new Date(beforeDate) };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: 1 })
    .limit(limit);

  const formattedMessages = messages.map(msg => ({
    username: msg.username,
    message: msg.message,
    createdAt: msg.createdAt
  }));
  res.json(formattedMessages);
});

// handle request to chat page and render chat view with username from session
app.get('/chat', (req, res) => {
  if (!req.session.username) return res.redirect('/');
  res.render('chat', { username: req.session.username });
});

// socket.io connection and event handling
io.on('connection', (socket) => {
  socket.emit('welcome', { message: 'Welcome to the chat room', socketId: socket.id });

  // chat message event handler
  socket.on('chatmessage', async (msgData) => {

    const clientIp = socket.handshake.headers['cf-connecting-ip'] || socket.handshake.address;
    if (isRatelimited(clientIp, messageRateLimit, messageRateLimitWindowMs)) {
      socket.emit('chaterror', { error: 'Rate limit exceeded. Please wait before sending more messages.' });
      return;
    }

    const username = msgData.username.trim();
    const message = msgData.message.trim();
    if (!username || !message) {
      socket.emit('chaterror', { error: 'Username and message are required' });
      return;
    }
    if (!checkUserInput(username, 10) || !checkUserInput(message, 200)) {
      socket.emit('chaterror', { error: 'Invalid input' });
      return;
    }
    try {
      const newMessage = new Message({
        username: username,
        message: message
      });
      await newMessage.save();
      io.emit('chatmessage', { username: username, message: message });
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('chaterror', { error: 'Unable to save message' });
    }
  });
});

function checkUserInput(stringInput, maxLength) {
  const pattern = new RegExp(`^[a-zA-Z0-9 ]{1,${maxLength}}$`);
  return pattern.test(stringInput);
}

function isRatelimited(key, limit, windowMs) {
  const now = Date.now();
  const entry = messageRateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    messageRateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return false; // not rate limited
  }

  if (entry.count >= limit) {
    return true; // rate limited
  }

  entry.count++;
  return false; // not rate limited
}

// immediately invoked async function to connect to the database and start the server in that order
(async () => {
  // connect to the database before starting the server
  await connectToDatabase();
  // start the server and log the port number being used
  server.listen(port, () => {
      console.log(`Server is running on port: ${port}`);
  });
})();