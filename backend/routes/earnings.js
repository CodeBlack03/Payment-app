const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Earnings = require('../models/Earning');
const TotalMoneyCollected = require('../models/TotalMoneyCollected');
const multer = require('multer');
const advancedExpResults = require('../middleware/advancedExpResults');
const Earning = require('../models/Earning');
const moment = require('moment-timezone');


// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/earnings/');
  },
   filename: (req, file, cb) => {
    const { name } = req.body;
    const {category} = req.body
    const nowIST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD_HH-mm-ss');
    const fileName = `${nowIST}${file.originalname.substring(file.originalname.lastIndexOf('.'))}`;
    cb(null, fileName);
  }
});

const upload = multer({ storage: storage });




// Function to update the total money collected
const updateTotalMoneyCollected = async () => {
  try {
    const earnings = await Earnings.find();
    const total = earnings.reduce((sum, earning) => sum + earning.amount, 0);

    let totalMoney = await TotalMoneyCollected.findOne();
    if (!totalMoney) {
      totalMoney = new TotalMoneyCollected({ total });
    } else {
      totalMoney.total = total;
      totalMoney.updatedAt = Date.now();
    }
    await totalMoney.save();
  } catch (err) {
    console.error('Error updating total money collected:', err);
  }
};

// @route   POST api/earnings
// @desc    Add new earnings
// @access  Private/Admin
router.post(
  '/',
  [
    auth,
    admin,
    upload.single('file'),
    [
      check('name', 'Name is required').not().isEmpty(),
      check('amount', 'Amount is required').isNumeric(),
      check('date', 'Date is required').isISO8601().toDate()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array(), message:"You have not filled all the required fields" });
    }

    const { name, amount,date,description,category } = req.body;
    let file;
    if(req.file){file = `/uploads/earnings/${req.file.filename}`;}
    try {
      const newEarning = new Earnings({ name, amount,date,description,category,filePath:file});
      
      await newEarning.save();
      await updateTotalMoneyCollected();

      res.json(newEarning);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({message: `Server error: ${err.message}`});
    }
  }
);

// @route   PUT api/earnings/:id
// @desc    Update earnings
// @access  Private/Admin
router.put(
  '/:id',
  [
    auth,
    admin,
    
  ],
  async (req, res) => {

    const { name, amount,date,category } = req.body;

    try {
      let earning = await Earnings.findById(req.params.id);

      if (!earning) return res.status(404).json({ message: 'Earning not found' });

      earning.name = name;
      earning.amount = amount;
      earning.date = date;
      earning.category = category;

      await earning.save();
      await updateTotalMoneyCollected();

      res.json(earning);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({message: `Server error: ${err.message}`});
    }
  }
);
// Get all earnings
router.get('/', auth,advancedExpResults(Earning,null), async (req, res) => {
  try {
    const earnings = await Earnings.find();
    res.status(200).json(res.advancedResults);
    //res.json(earnings);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// Get specific earnings by ID
router.get('/:id', auth,admin, async (req, res) => {
  try {
    const earnings = await Earnings.findById(req.params.id);

    if (!earnings) {
      return res.status(404).json({ message: 'Earnings not found' });
    }

    res.json(earnings);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message: `Server error: ${err.message}`});
  }
});


// Download file associated with specific earnings
router.get('/:id/download', auth,admin, async (req, res) => {
  try {
    const earnings = await Earnings.findById(req.params.id);

    if (!earnings || !earnings.filePath) {
      return res.status(404).json({ message: 'File not found' });
    }
    console.log(earnings)
    const filePath = path.join(__dirname, '..', earnings.filePath);
    console.log("File Path",earnings.filePath)
    res.download(filePath, earnings.filePath, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({message: `Server error: ${err}`});
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message: `Server error: ${err.message}`});
  }
});


// DELETE method to delete earnings by ID
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const earnings = await Earnings.findById(req.params.id);

    if (!earnings) {
      return res.status(404).json({ message: 'Earnings not found' });
    }

    // Adjust TotalMoneyCollected
    const totalMoneyCollected = await TotalMoneyCollected.findOne();
    if (totalMoneyCollected) {
      totalMoneyCollected.totalAmount -= earnings.amount;
      await totalMoneyCollected.save();
    } else {
      // If the total amount collected record does not exist, create one
      await TotalMoneyCollected.create({ totalAmount: -earnings.amount });
    }

    await Earnings.deleteOne({_id:earnings._id})

    res.json({ message: 'Earnings deleted and TotalMoneyCollected adjusted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message: `Server error: ${err.message}`});
  }
});

module.exports = router;
