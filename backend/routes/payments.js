const express = require('express');
const router = express.Router();
const multer = require('multer');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Payment = require('../models/Payment');
const User = require('../models/User');
const sendSMS = require('../utils/sendSMS');
const sendEmail = require('../utils/sendEmail')
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
      check('amount', 'Amount is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount } = req.body;
    const screenshot = `/uploads/${req.file.filename}`;

    try {
      const user = await User.findById(req.user.id);

      const newPayment = new Payment({
        user: req.user.id,
        amount,
        screenshot,
        status: 'pending'
      });

      const payment = await newPayment.save();
      user.payments.push(payment._id);
      await user.save();

      // Notify admin
      const admin = await User.findOne({ role: 'admin' });
      const message = `You have a new payment approval request by: ${user.name}`;
      
      await sendEmail(admin.email, "Approval request",message)


      res.json(payment);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);





module.exports = router;
