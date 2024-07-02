const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  fileURL: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '30d' // Automatically delete the document after 30 days
  }
});

module.exports = mongoose.model('Announcement', AnnouncementSchema);
