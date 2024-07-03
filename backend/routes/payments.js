const express = require('express');
const router = express.Router();
const multer = require('multer');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Payment = require('../models/Payment');
const User = require('../models/User');
const sendSMS = require('../utils/sendSMS');
const sendEmail = require('../utils/sendEmail')
const fs = require('fs');
const path = require('path');
const advancedResults = require('../middleware/advancedResults');





// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });




// @route   POST api/payments
// @desc    Record a new payment
// @access  Private
router.post(
  '/',
  [
    auth,
    upload.single('screenshot'),
    [
      check('amount', 'Amount is required').not().isEmpty(),
      check('category','Category is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

     const { amount, category, description } = req.body;
    let screenshotURL = '';

    if (req.file) {
      screenshotURL = `/uploads/${req.file.filename}`;
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

      const newPayment = new Payment(newPaymentData);
      const payment = await newPayment.save();

      user.payments.push(payment._id);
      await user.save();

      // Notify admin
      const admin = await User.findOne({ role: 'admin' });
      const message = `You have a new payment approval request by: ${user.name}`;
      await sendEmail(admin.email, "Approval request", message);

      res.json(payment);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);



// @route   GET api/payments
// @desc    Get all payments
// @access  Private (requires authentication)
router.get('/', auth,admin,advancedResults(Payment,'user'), async (req, res) => {
  try {
    // Find all payments and populate the 'user' field with user details
    const payments = await Payment.find({}).populate('user', ['name', 'email','dues','houseNumber','houseType']);
    res.status(200).json(res.advancedResults);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// DELETE method to delete a payment by ID
router.delete('/payments/:id', auth, admin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ msg: 'Payment not found' });
    }

    // Delete associated file in 'uploads/' (if applicable)
    if (payment.screenshotURL) {
      const filePath = path.join(__dirname, '..', payment.screenshotURL);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Failed to delete file ${filePath}:`, err);
        } else {
          console.log(`File ${filePath} deleted successfully`);
        }
      });
    }

    await payment.remove();

    res.json({ msg: 'Payment and associated file deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});




module.exports = router;
