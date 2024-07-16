// const mongoose = require('mongoose');
// const User = require('../models/User');
// const connectDB = require('../config/db');

// const accumulateDues = async () => {
//   await connectDB();

//   try {
//     const users = await User.find();
//     for (const user of users) {
//       // console.log(user.name)
//       // console.log(user.houseType)
//       if (user.houseType === '2') {
//         //console.log(user.dues)
//         user.dues += 700;
//         //console.log(user.dues)
//       } else if (user.houseType === '3') {
//         user.dues += 1000;
//       }
      
//       await user.save();
//     }
//     console.log('Dues updated for all users');
//   } catch (err) {
//     console.error('Error updating dues:', err.message);
//   } 
// };

// accumulateDues();
const JobLog = require('../models/JobLog'); // Update the path as needed
const User = require('../models/User');

const accumulateDues = async () => {
  const jobName = 'accumulateDues';
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  try {
    const jobLog = await JobLog.findOne({ jobName });
    
    if (jobLog) {
      const lastRun = jobLog.lastRun;
      const lastRunMonth = lastRun.getMonth();
      const lastRunYear = lastRun.getFullYear();

      if (currentMonth === lastRunMonth && currentYear === lastRunYear) {
        console.log('accumulateDues job has already run this month.');
        return;
      }
    }
    const users = await User.find();
    for (const user of users) {
      // console.log(user.name)
      // console.log(user.houseType)
      if (user.houseType === '2') {
        //console.log(user.dues)
        user.dues += 700;
        //console.log(user.dues)
      } else if (user.houseType === '3') {
        user.dues += 1000;
      }
      
      await user.save();
    // Your logic to accumulate dues goes here
    console.log('Running accumulateDues job...');

    if (jobLog) {
      jobLog.lastRun = now;
      await jobLog.save();
    } else {
      const newJobLog = new JobLog({ jobName, lastRun: now });
      await newJobLog.save();
    }
  }} catch (err) {
    console.error('Error running accumulateDues job:', err);
  }
};

module.exports = accumulateDues;
