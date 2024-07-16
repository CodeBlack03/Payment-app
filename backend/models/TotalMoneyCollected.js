const mongoose = require('mongoose');

const TotalMoneyCollectedSchema = new mongoose.Schema({
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
   updatedAt: {
    type: Date,
   
    default: () => {
      const now = new Date();
      const offset = now.getTimezoneOffset();
      return new Date(now.getTime() - (offset * 60 * 1000));
    },
  
  }
});

module.exports = mongoose.model('TotalMoneyCollected', TotalMoneyCollectedSchema);
