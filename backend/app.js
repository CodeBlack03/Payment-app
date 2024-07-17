require('dotenv').config();
const express = require('express');

const mongoose = require('mongoose');
const config = require('config');
const cron = require('node-cron');
const path = require('path');
const accumulateDues = require('./scripts/accumulateDues');
const app = express();
const cors = require('cors');
app.use(cors({
  origin: "*",
  credentials: true
}));
const connectDB = require('./db');
// Bodyparser Middleware
app.use(express.json());

// DB Config
connectDB();

// Init Middleware
app.use(express.json({ extended: false }));

// Static folder for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Define Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/expenditures', require('./routes/expenditures'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/announcements',require('./routes/announcements'));
app.use('/api/earnings', require('./routes/earnings'));
app.use('/api/logout',require('./routes/logout'));

// Allow requests from localhost:3000

// Schedule the accumulateDues job to run on the first day of every month at midnight
cron.schedule('0 0 1 * *', () => {
  console.log('Scheduling accumulateDues job...');
  accumulateDues();
});
// Serve static assets in production
// if (process.env.NODE_ENV === 'production') {
//   // Set static folder
//   app.use(express.static('frontend/build'));

//   app.get('*', (req, res) => {
//     res.sendFile(path.resolve(__dirname, 'frontend', 'build', 'index.html'));
//   });
// }


const port = process.env.PORT || 5001;
app.listen(port, () => console.log(`Server started on port ${port}`));
