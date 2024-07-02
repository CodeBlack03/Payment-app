const mongoose = require('mongoose');

const TotalMoneyCollectedSchema = new mongoose.Schema({
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
   updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TotalMoneyCollected', TotalMoneyCollectedSchema);
