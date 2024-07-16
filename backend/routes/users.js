const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const config = require('config');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Payment = require('../models/Payment')
const sendEmail = require('../utils/sendEmail');
const fs = require('fs');
const path = require('path');
const admin = require('../middleware/admin');
const advancedPayResults = require('../middleware/advancedPayResults');



const signToken = (id) => {
  return jwt.sign({ id }, config.get("jwtPrivateKey"), { expiresIn: '30d' });
};

const createSendToken = (status, user, req, res) => {
  const token = signToken(user._id);
  const options = {
    expiresIn: Date.now() + (30 * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }
  res.status(status).cookie("token", token, options);
  user.password = undefined;

  res.status(status).json({
    token,
    _id: user._id,
    id: user._id,
        name: user.name,
        email: user.email,
        house_number : user.houseNumber,
        dues: user.dues,
        type: user.houseType,
        mobileNumber:user.mobileNumber,
    isAdmin: user.isAdmin,
  });
};
// @route   POST api/users
// @desc    Register a new user
// @access  Public
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('houseNumber', 'House number is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 3 }),
    check('houseType', 'House type is required').not().isEmpty(),
    check('mobileNumber', 'Mobile number is required').isLength({ min: 10, max: 10 }),
    check('accessCode', 'Unique code is required').isLength({ min: 4, max: 4 })
  ],
  async (req, res) => {
    const { name, houseNumber, email, password, houseType, isAdmin, mobileNumber, accessCode } = req.body;
    
    // Check if there are validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array(),message:"You have not filled all the required fields" });
    }
    
    try {
      // Check if the unique code matches the last 4 digits of the mobile number
      const lastFourDigits = mobileNumber.slice(-4);
      if (accessCode !== lastFourDigits) {
        return res.status(400).json({ message: 'Unique code does not match' });
      }

      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Check if houseType and houseNumber pair is unique
      user = await User.findOne({ houseType, houseNumber });
      if (user) {
        return res.status(400).json({ message: 'House type and house number pair already exists' });
      }

      user = new User({
        name,
        houseNumber,
        email,
        password,
        houseType,
        mobileNumber,
        isAdmin: isAdmin || false
      });
      console.log("Register",user)
      // Encrypt password before saving
      // const salt = await bcrypt.genSalt(10);
      // user.password = await bcrypt.hash(password, salt);

      await user.save();

      const payload = {
        user: {
          id: user.id,
          isAdmin: user.isAdmin
        }
      };

      createSendToken(201, user, req, res);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({message:`Server error: ${err.message}`});
    }
  }
);

// @route   POST api/users/auth
// @desc    Authenticate user & get token (login)
// @access  Public
router.post('/auth',[
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array(),message:"You have not filled all the required fields" });
    }
  const {email,password} = req.body;
  
  try {
    console.log(email)
    const user = await User.findOne({ email });
    console.log(user)
    if (!user) {
      console.log("not user")
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    if (user.status === 'inactive') {
        return res.status(403).json({ message: 'Your account is not active' });
      }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    console.log(user)
    const payload = {
      user: {
        id: user.id,
        isAdmin: user.isAdmin
      }
    };
    createSendToken(200,user,req,res);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message:`Server error: ${err.message}`});
  }
});
router.get('/profile',auth, async (req, res) => {
  try {
    // Fetch user profile details
    
    const {email, password} = req.user
    
    const user = await User.findById(req.user.id);
    console.log(user)
    // Calculate dues
    const currentDate = new Date();
    const duePayments = [];

    // for (let i = 0; i < 12; i++) {
    //   const month = new Date(currentDate.getFullYear(), i);
    //   const paymentForMonth = user.payments.find(payment => {
    //     const paymentDate = new Date(payment.date);
    //     return (
    //       paymentDate.getMonth() === month.getMonth() &&
    //       paymentDate.getFullYear() === month.getFullYear()
    //     );
    //   });

    //   if (!paymentForMonth) {
    //     duePayments.push(month.toLocaleString('default', { month: 'long' }));
    //   }
    // }
   
    //Return user profile details and dues
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        houseNumber : user.houseNumber,
        houseType: user.houseType,
        dues: user.dues,
        // Add other profile details as needed
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message: `Server Error: ${err.message}`});
  }
});

router.get('/payments', auth,advancedPayResults(Payment,'user',null), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('payments');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // console.log("_______________________________________")
    // console.log("Advanced Results",res.advancedResults)
    // console.log("_______________________________________")
    res.json(res.advancedResults);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// GET route to fetch JSON details of a payment
router.get('/payments/:id', auth, async (req, res) => {
  try {
    const paymentId = req.params.id;

    // Fetch payment details
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json(payment);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// GET route to download the file associated with a payment
router.get('/payments/:id/download', auth, async (req, res) => {
  try {
    const paymentId = req.params.id;

    // Fetch payment details including screenshotURL
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Construct file path (assuming 'uploads/' directory)
    const filePath = path.join(__dirname, '..', '', payment.screenshotURL);
    console.log("file Path",filePath)
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Download the file
    res.download(filePath, payment.screenshotURL, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({message:`Server error: ${err.message}`});
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message:`Server error: ${err.message}`});
  }
});


// @route   POST api/auth/forgot
// @desc    Forgot Password - Send Reset Link
// @access  Public
router.post(
  '/forgot-password',
  [check('email', 'Please include a valid email').isEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array(),message:"You have not filled all the required details"});
    }

    const { email } = req.body;

    try {
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.generatePasswordReset();
      await user.save();

      const resetLink = `http://localhost:3000/reset/${user.resetPasswordToken}`;

      await sendEmail(user.email, 'Password Reset Request', `Please click the following link to reset your password: ${resetLink}`);

      res.json({ message: 'Password reset link sent to email' });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({message:`Server error: ${err.message}`});
    }
  }
);

// @route   POST api/auth/reset/:token
// @desc    Reset Password
// @access  Public
router.post(
  '/reset/:token',
  [
    check('password', 'Password is required').not().isEmpty(),
    check('confirmPassword', 'Confirm Password is required').not().isEmpty()
  ],
  async (req, res) => {
    console.log(req.body)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array(), message:"You have not filled all the required fields" });
    }

    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    try {
      const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
      });
      console.log(user)
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token, please send token email again using forgot password' });
      }

      
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      await user.save();

      res.json({ message: 'Password has been reset' });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({message:`Server error: ${err.message}`});
    }
  }
);

// @route   POST api/auth/change-password
// @desc    Change Password
// @access  Private
router.post(
  '/change-password',
  [
    auth,
    [
      check('oldPassword', 'Old Password is required').not().isEmpty(),
      check('newPassword', 'New Password is required').not().isEmpty(),
      check('confirmNewPassword', 'Confirm your new password').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() , message:"You have not filled all the required fields"});
    }

    const { oldPassword, newPassword, confirmNewPassword } = req.body;

    try {
      const user = await User.findById(req.user.id);
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      const salt = await bcrypt.genSalt(10);
      const temp = await bcrypt.hash('123',salt);
      console.log('temp: ',temp);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect old password' });
      }
      if(newPassword!==confirmNewPassword){
        return res.status(400).json({message:"New Passwords doesn't Match"})
      }
      user.password = newPassword;
      await user.save();
      res.json({ message: 'Password has been changed' });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({message:`Server error: ${err.message}`});
    }
  }
);

// @route   PUT api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/update-profile',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('email', 'Please include a valid email').isEmail(),
      check('mobileNumber', 'Please include a valid mobile number').isMobilePhone()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array(), message:"You have not filled all the required fields" });
    }

    const { name, email, mobileNumber,houseNumber,houseType } = req.body;

    try {
      let user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update user details
      user.name = name;
      user.email = email;
      user.mobileNumber = mobileNumber;
      user.houseNumber = houseNumber;
      user.houseType = houseType;

      await user.save();

      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({message: `Server error: ${err.message}`});
    }
  }
);

// DELETE method to delete a user by ID
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    //console.log(user)
    // Find all payments associated with the user
    const payments = await Payment.find({ user: req.params.id });

    // Delete each payment and associated files (if applicable)
    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];

      // Check if the payment has a screenshotURL and delete the file
      if (payment.screenshotURL) {
        const filePath = path.join(__dirname, '..', payment.screenshotURL);
        fs.unlink(filePath, (err) => {
          if (err) {
            console.log("Failed to delete file ${filePath}:", err)
            // return res.status(400).json({message: `Failed to delete file ${filePath}: ${err.message}`});
          } else {
            console.log(`File ${filePath} deleted successfully`)
            // res.status(400).json({message: `File ${filePath} deleted successfully`});
          }
        });
      }
      console.log(payment)
      // Remove the payment document from the database
      await Payment.deleteOne({ _id: payment._id });
    }

    // Now remove the user
    await User.deleteOne({ _id: user._id });

    res.json({ message: 'User and associated payments deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message:`Server error: ${err.message}`});
  }
});


module.exports = router;

