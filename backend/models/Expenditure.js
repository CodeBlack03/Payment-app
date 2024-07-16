const mongoose = require('mongoose');

const ExpenditureSchema = new mongoose.Schema({
  category: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  date: {
    type: Date,
    default: () => {
      const now = new Date();
      const offset = now.getTimezoneOffset();
      return new Date(now.getTime() - (offset * 60 * 1000));
    },
  },
  filePath:{  type:String}
}); 

const Expenditure = mongoose.model('Expenditure', ExpenditureSchema);
module.exports = Expenditure;
