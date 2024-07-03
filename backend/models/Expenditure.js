const mongoose = require('mongoose');

const ExpenditureSchema = new mongoose.Schema({
  category: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  filePath:{  type:String}
}); 

const Expenditure = mongoose.model('Expenditure', ExpenditureSchema);
module.exports = Expenditure;
