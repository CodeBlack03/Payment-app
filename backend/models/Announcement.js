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
    required: false
  },
  createdAt: {
    type: Date,
    
    default: () => {
      const now = new Date();
      const offset = now.getTimezoneOffset();
      return new Date(now.getTime() - (offset * 60 * 1000));
    },
    expires: '30d' // Automatically delete the document after 30 days
  }
});

module.exports = mongoose.model('Announcement', AnnouncementSchema);
