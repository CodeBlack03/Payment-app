const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

const accumulateDues = async () => {
  await connectDB();

  try {
    const users = await User.find();
    for (const user of users) {
      if (user.houseType === 2) {
        user.dues += 700;
      } else if (user.houseType === 3) {
        user.dues += 1000;
      }
      await user.save();
    }
    console.log('Dues updated for all users');
  } catch (err) {
    console.error('Error updating dues:', err.message);
  } 
};

accumulateDues();
