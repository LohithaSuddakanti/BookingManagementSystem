const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = process.env.MONGODB_URI || 'mongodb+srv://admin:admin@cluster0.ingh8uz.mongodb.net/studentDB?retryWrites=true&w=majority';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB', error);
    process.exit(1); // Exit the process if unable to connect to MongoDB
  }
}

connectDB();

// User Model
const userCollection = client.db('studentDB').collection('users');
const feedbackCollection = client.db('studentDB').collection('feedback');

// Get all feedback endpoint
app.get('/api/feedbacks', async (req, res) => {
  try {
    const feedbacks = await feedbackCollection.find().toArray();
    res.status(200).json(feedbacks);
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    res.status(500).json({ message: 'Error fetching feedbacks', error: error.message });
  }
});

// Feedback Submission Endpoint
app.post('/api/feedback', async (req, res) => {
  try {
    const feedback = req.body;
    if (!feedback) {
      return res.status(400).json({ message: 'Feedback data is missing' });
    }
    const result = await feedbackCollection.insertOne(feedback);
    res.status(201).json({ message: 'Feedback submitted successfully', feedback: result.ops[0] });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ message: 'Error submitting feedback', error: error.message });
  }
});

// Address Model and Endpoint
const addressCollection = client.db('studentDB').collection('addresses');

app.post('/api/address', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      address1,
      address2,
      city,
      state,
      zip,
      country,
      saveAddress,
    } = req.body;

    const address = {
      firstName,
      lastName,
      address1,
      address2,
      city,
      state,
      zip,
      country,
      saveAddress,
    };

    await addressCollection.insertOne(address);
    res.status(200).json({ message: 'Address saved successfully', address });
  } catch (error) {
    console.error('Error saving address:', error);
    res.status(500).json({ message: 'Error saving address', error: error.message });
  }
});

// Register a new user
app.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const existingUser = await userCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
    await userCollection.insertOne({ name, email, password: hashedPassword, role });
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user', error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userCollection.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'jwtsecret');
    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Reset password endpoint
app.post('/resetpassword', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the new password
    await userCollection.updateOne({ email }, { $set: { password: hashedPassword } });
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(Server is running on port ${PORT});
});