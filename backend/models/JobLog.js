const mongoose = require('mongoose');

const JobLogSchema = new mongoose.Schema({
  jobName: { type: String, required: true },
  lastRun: { type: Date, required: true },
});

module.exports = mongoose.model('JobLog', JobLogSchema);
