// Import necessary packages
require('dotenv').config(); // Loads variables from .env file
console.log('The MONGODB_URI variable is:', process.env.MONGODB_URI);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your-super-secret-key-that-is-long-and-random';
const http = require('http');
const { Server } = require("socket.io");

// --- AUTHENTICATION MIDDLEWARE ---
const auth = (req, res, next) => {
  // Get the token from the request header
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // The header format is "Bearer TOKEN"
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
      return res.status(401).json({ message: 'Malformed token, authorization denied' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    // Add the user's info (from the token payload) to the request object
    req.user = decoded;
    next(); // Proceed to the next step (the actual route handler)
  } catch (err) {
    res.status(400).json({ message: 'Token is not valid' });
  }
};

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allows cross-origin requests
app.use(express.json()); // Parses incoming JSON requests

// --- Connect to MongoDB Atlas ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB Atlas!'))
  .catch(err => console.error('Connection error', err));

// --- Define the Note Schema (UPDATED) ---
const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  // ADD THIS LINE:
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const Note = mongoose.model('Note', noteSchema);

// --- Define the User Schema ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// --- API Routes (Endpoints) ---

// GET: Fetch all notes
app.get('/api/notes', auth ,async (req, res) => {
  try {
   const notes = await Note.find({ user: req.user.id }).sort({ createdAt: -1 }); // Get newest first
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET: Fetch a single note by its ID (for sharing)
app.get('/api/notes/:id', async (req, res) => { // <-- Remove 'auth'
    try {
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ message: 'Note not found' });
        res.json(note);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST: Create a new note
app.post('/api/notes', auth, async (req, res) => {
  const note = new Note({
    title: req.body.title,
    content: req.body.content,
    user: req.user.id // <-- ADD THIS LINE
  });

  try {
    const newNote = await note.save();
    res.status(201).json(newNote); // 201 = Successfully created
  } catch (err) {
    res.status(400).json({ message: err.message }); // 400 = Bad request
  }
});

// DELETE: Delete a note by its ID
app.delete('/api/notes/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- AUTHENTICATION ROUTES ---

// POST: Register a new user
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if username or password is provided
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    // Check if the username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken.' });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt round

    const newUser = new User({
      username,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({ message: 'User created successfully!' });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST: Login an existing user
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if username and password are provided
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    // Find the user in the database
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // If credentials are correct, create a JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username }, // This is the data we'll store in the token
      JWT_SECRET, // The secret key we defined earlier
      { expiresIn: '1h' } // The token will expire in 1 hour
    );

    res.json({ message: 'Logged in successfully!', token });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT: Update an existing note by its ID
app.put('/api/notes/:id',auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const updatedNote = await Note.findOneAndUpdate(
  { _id: req.params.id, user: req.user.id }, // Find a note with this ID AND this user
  { title, content },
  { new: true }
);

    if (!updatedNote) return res.status(404).json({ message: 'Note not found' });

    res.json(updatedNote);
 } catch (err) {
    console.error(err); // <-- ADD THIS LINE
    res.status(500).json({ message: err.message });
  }
});

// Start the server

// --- Create HTTP server and integrate Socket.IO ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://127.0.0.1:5500", // Allow our frontend to connect
    methods: ["GET", "POST"]
  }
});


// --- Socket.IO Connection Logic ---
io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  // 1. When a user opens a note, have them join a "room"
  // The client will send this event, providing the noteId.
  socket.on('joinNoteRoom', (noteId) => {
    socket.join(noteId); // Put this user in a room named after the note
    console.log(`User ${socket.id} joined room ${noteId}`);
  });

  // 2. When a user types, broadcast their changes to others
  // The client will send this event with the noteId and new content.
// REPLACE the old 'noteUpdate' listener with this new one
socket.on('noteUpdate', async (data) => {
  try {
    const { noteId, title, content } = data;

    // 1. Save the changes to the database
    await Note.findByIdAndUpdate(noteId, { title, content });

    // 2. Broadcast the changes to everyone else in the room
    socket.to(noteId).emit('receiveUpdate', { title, content });

  } catch (err) {
    console.error("Error updating note in real-time:", err);
  }
});

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// --- Start the server ---
// Note: We use server.listen() now, not app.listen()
server.listen(PORT, () => {
  console.log(`Server (and sockets) is running on http://localhost:${PORT}`);
});