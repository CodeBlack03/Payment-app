const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    
    
    default: () => {
      const now = new Date();
      const offset = now.getTimezoneOffset();
      return new Date(now.getTime() - (offset * 60 * 1000));
    },
  }
});

module.exports = mongoose.model('Document', DocumentSchema);
