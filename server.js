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
  const { username } = req.body;

  if (!username) return res.redirect('/');

  req.session.username = username;
  res.redirect('/chat');
});

// handle request to chat page and render chat view with username from session
app.get('/chat', (req, res) => {
  if (!req.session.username) return res.redirect('/');
  res.render('chat', { username: req.session.username });
});

// socket.io connection and event handling
io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);
  // disconnect event handler
  socket.on('disconnect', () => {
    console.log(`A user disconnected: ${socket.id}`);
  });
  // chat message event handler
  socket.on('chatmessage', async (msgData) => {
    // create a new message document using the chatroom schema and save it to the database
    const newMessage = new Message({
      username: msgData.username,
      message: msgData.message
    });
    await newMessage.save();
    // emit the chat message to all connected clients
    io.emit('chatmessage', msgData);
  });
});


(async () => {
  // connect to the database before starting the server
  await connectToDatabase();
  // start the server and log the port number being used
  server.listen(port, () => {
      console.log(`Server is running on port: ${port}`);
  });
})();