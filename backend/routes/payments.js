const express = require('express');
const router = express.Router();
const multer = require('multer');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Payment = require('../models/Payment');
const Earning = require('../models/Earning')
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail')
const fs = require('fs');
const path = require('path');
const advancedResults = require('../middleware/advancedResults');
const admin = require('../middleware/admin')

const moment = require('moment-timezone');


// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/payments/');
  },
   filename: (req, file, cb) => {
    const {category} = req.body
    console.log(req.body)
    const nowIST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD_HH-mm-ss');
    const fileName = `${nowIST}${file.originalname.substring(file.originalname.lastIndexOf('.'))}`;
    cb(null, fileName);
  }
});

const upload = multer({ storage: storage });



// @route   POST api/payments
// @desc    Record a new payment
// @access  Private
router.post(
  '/',
  [
    [auth,
    upload.single('file')],
    [
      check('amount', 'Amount is required').not().isEmpty(),
      check('category','Category is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() ,message:"You have not filled all the required fields"});
    }

     const { amount, category, description,file } = req.body;
    let screenshotURL = '';
    //console.log("Server Payment",req.file)

    if (req.file) {
      screenshotURL = `/uploads/payments/${req.file.filename}`;
    }
    
    try {
      const user = await User.findById(req.user.id);

      let newPaymentData = {
        user: req.user.id,
        amount,
        category,
        description,
        screenshotURL,
        status: 'pending'
      };

      // If category is 'other', include otherCategoryType
      if (category === 'other' && req.body.otherCategoryType) {
        newPaymentData.otherCategoryType = req.body.otherCategoryType;
      }
      const paymentUser = await User.findById(req.user.id);
      const newPayment = new Payment(newPaymentData);
      const payment = await newPayment.save();
    
      user.payments.push(payment._id);
      await user.save();
      // let earningCategory = payment.category;
      // if(category==='other'  && req.body.otherCategoryType){
      //   earningCategory = req.body.otherCategoryType;
      // }
      // // Save the same information as Earning
      // let newEarningData = {
      //   name: paymentUser.name,
      //   category: earningCategory,
      //   description: payment.description,
      //   amount: payment.amount,
      //   date: payment.createdAt,
      //   fileURL: payment.screenshotURL,
      // };

      // const newEarning = new Earning(newEarningData);
      // await newEarning.save();


      // Notify admin
      const admin = await User.findOne({ isAdmin: true });
      const message = `You have a new payment approval request by: ${user.name}`;
      await sendEmail(admin.email, "Approval request", message);

      res.json(payment);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({message:`Server error: ${err.message}`});
    }
  }
);



// @route   GET api/payments
// @desc    Get all payments
// @access  Private (requires authentication)
router.get('/', auth,admin,advancedResults(Payment,'user',null), async (req, res) => {
  try {
    // Find all payments and populate the 'user' field with user details
    const payments = await Payment.find({}).populate('user', ['name', 'email','dues','houseNumber','houseType']);
    res.status(200).json(res.advancedResults);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message:`Server Error: ${err.message}`});
  }
});


// DELETE method to delete a payment by ID
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Delete associated file in 'uploads/' (if applicable)
    if (payment.screenshotURL) {
      const filePath = path.join(__dirname, '..', payment.screenshotURL);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log({message:`Failed to delete file ${filePath},  error message: ${err.message}`});
        } else {
          console.log({message:`File ${filePath} deleted successfully`});
        }
      });
    }

    await Payment.deleteOne({_id:payment._id});

    res.json({ message: 'Payment and associated file deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message:`Server error: ${err.message}`});
  }
});




module.exports = router;
