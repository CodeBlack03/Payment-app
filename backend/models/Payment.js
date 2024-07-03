const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description:{
    type:String,
    required: false
  },
  amount: {
    type: Number,
    required: true
  },
  screenshotURL: {
    type: String,
    required: false
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  category:{
    type:String,
    enum: ['maintenance', 'NOC fund', 'other'],
    required:true,
  },
   user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  otherCategoryType: {
    type: String,
    required: function () {
      return this.category === 'other';
    }
  }

});

const Payment = mongoose.model('Payment', PaymentSchema);
module.exports = Payment;
