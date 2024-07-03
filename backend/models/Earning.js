const mongoose = require('mongoose');

const EarningsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  description:{ 
    type: String,
    required: true
},
category:{
  type:String,
  required:true
},
filePath:{ 
type: String,
}

});

module.exports = mongoose.model('Earnings', EarningsSchema);
