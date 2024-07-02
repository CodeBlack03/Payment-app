const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin')
const { isAdmin } = require('../middleware/auth');
const User = require('../models/User')
const Payment = require('../models/Payment')
const sendSMS = require('../utils/sendSMS');
const sendEmail = require('../utils/sendEmail')
const TotalMoneyCollected = require('../models/TotalMoneyCollected');
const Announcement = require('../models/Announcement');


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





// @route    GET api/admin
// @desc     Admin dashboard
// @access   Private/Admin
router.get('/', [auth,admin], async (req, res) => {
  try {
    // Admin specific logic
    res.json({ msg: 'Welcome to the admin dashboard' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
router.get('/users',[ auth, admin], async (req, res) => {
  try {
    const users = await User.find().select('-password'); // Exclude the password field
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});



//method to get the details of a particular user along with payments /users/:id
//route to get the payment details of a particular user   /users/:id/payments
//route to get a particular payment   /payments/:id
//create the filters of payments by user, date and sort by asc and desc
//create such filters for earnings, expenditures
//Implementing Delete functionality of user, payments, announcements, documents, earnings, expenditures and also the files associated with them





module.exports = router;
router.put(
  '/users/:id',
  [
    auth,
    admin,
    
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, role, dues, mobileNumber,status } = req.body;

    // Build user object
    const userFields = {};
    if (name) userFields.name = name;
    if (email) userFields.email = email;
    if (role) userFields.role = role;
    if (dues) userFields.dues = dues;
    if(mobileNumber) userFields.mobileNumber = mobileNumber
    if(status) userFields.status = status;
    
    // Add other fields as necessary

    try {
      let user = await User.findById(req.params.id);

      if (!user) return res.status(404).json({ msg: 'User not found' });

      user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: userFields },
        { new: true }
      );

      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);
router.put('/payments/:id/approve', [auth,admin], async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ msg: 'Payment not found' });
    }

    payment.status = 'approved';
    await payment.save();

    const user = await User.findById(payment.user);
    user.dues -= payment.amount;

    // Update the total money collected
    let totalMoneyCollected = await TotalMoneyCollected.findOne();
    if (!totalMoneyCollected) {
      totalMoneyCollected = new TotalMoneyCollected();
    }

    totalMoneyCollected.totalAmount += payment.amount;
    await totalMoneyCollected.save();
    const message = 'Your payment for Rail Vihar maintenance has been approved.';
    await sendEmail(user.email,"Payment Approved",message);
    if (user.dues < 0) user.dues = 0;
    await user.save();

    res.json(payment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/payments/:id/reject
// @desc    Reject a payment
// @access  Private/Admin
router.put('/payments/:id/reject', [auth,admin], async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ msg: 'Payment not found' });
    }

    payment.status = 'rejected';
    await payment.save();
    const user = await User.findById(payment.user);
    const message = 'Your payment Rail Vihar maintenance has been rejected, please reupload the payment details.';
     await sendEmail(user.email,"Payment Rejected",message);
    res.json(payment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
router.get('/payments/pending', auth, async (req, res) => {
  try {
    // Find all pending payments
    const pendingPayments = await Payment.find({ status: 'pending' }).populate('user');

    // Extract user information from pending payments
    const usersWithPendingPayments = pendingPayments.map(payment => ({
      userId: payment.user._id,
      name: payment.user.name,
      email: payment.user.email,
      paymentId: payment._id,
      amount: payment.amount,
      screenshot: payment.screenshot,
      date: payment.date
    }));

    res.json(usersWithPendingPayments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
// Route to get the total money collected
router.get('/total-money-collected', [auth, admin], async (req, res) => {
  try {
    const totalMoneyCollected = await TotalMoneyCollected.findOne();

    if (!totalMoneyCollected) {
      return res.status(404).json({ msg: 'Total money collected not found' });
    }

    res.json(totalMoneyCollected);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/admin/user/:id/status
// @desc    Update user status
// @access  Private (Admin only)
router.put('/users/:id/status', [auth, adminAuth], async (req, res) => {
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ msg: 'Invalid status' });
  }

  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.status = status;
    await user.save();

    res.json({ msg: 'User status updated' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


// @route   POST api/admin/announcements
// @desc    Post an announcement
// @access  Private (Admin only)
router.post(
  '/announcements',
  [
    auth,
    admin,
    upload.single('file'),
    [
      check('name', 'Name is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;
    const fileURL = `/uploads/${req.file.filename}`;

    try {
      const newAnnouncement = new Announcement({
        name,
        description,
        fileURL
      });

      const announcement = await newAnnouncement.save();
      res.json(announcement);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
