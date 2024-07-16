const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;
const crypto = require('crypto');
const { stringify } = require('querystring');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index:true,
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  houseNumber: {
    type: String,
    required: true
  },
  houseType: {
    type: String,
    required: true,
    enum: ["2", "3"] // Only allow type 2 and type 3
  },
  dues: {
    type: Number,
    default: 0
  },
  mobileNumber:{
    type: String,
    required:true,
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  date: {
    type: Date,
    default: () => {
      const now = new Date();
      const offset = now.getTimezoneOffset();
      return new Date(now.getTime() - (offset * 60 * 1000));
    },
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  payments: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Payment'
    }
  ],
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

UserSchema.statics.findByCredentials = async (email, password) => {
  const user = await User.findOne({ email: email });

  if (!user) {
    throw new Error("Invalid email or Password");
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid email or Password");
  }
  return user;
};
UserSchema.methods.generatePasswordReset = function() {
  this.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const nowDate =  new Date(now.getTime() - (offset * 60 * 1000));
  const expires = new Date(nowDate.getTime()+3600000)
  this.resetPasswordExpires = expires; // 1 hour
};
// Hash password before saving the user
UserSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

const User = mongoose.model('User', UserSchema);
module.exports = User;
