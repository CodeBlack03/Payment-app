const mongoose = require('mongoose');
const config = require('config'); // Using config module for configuration

// MongoDB URI from configuration (you can set this in your environment variables or a separate config file)
const dbURI = process.env.mongoURI
let count = 1;
let isConnectedBefore = false;

// Function to connect to MongoDB
const connectDB = () => {
  // Event listeners
  mongoose.connection.on('connected', () => {
    isConnectedBefore = true;
    console.log(`MongoDB connected (attempt ${count})`);
    count += 1;
  });

  mongoose.connection.on('error', (err) => {
    console.error(`MongoDB connection error (attempt ${count}):`, err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Attempting to reconnect...');
    if (!isConnectedBefore) {
      process.exit(1); // Exit process with failure if it was never connected before
    } else {
      setTimeout(connectDB, 5000); // Wait 5 seconds before retrying connection
    }
  });

  // Attempt to connect
  mongoose.connect(dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};

// Call connectDB to initiate the connection process
connectDB();

module.exports = connectDB;
