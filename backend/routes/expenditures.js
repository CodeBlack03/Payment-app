const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Expenditure = require('../models/Expenditure');
const { check, validationResult } = require('express-validator');
const multer  = require('multer');
const advancedExpResults = require('../middleware/advancedExpResults');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');


// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/expenditures/');
  },
   filename: (req, file, cb) => {
    const {category} = req.body
    const nowIST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD_HH-mm-ss');
    const fileName = `${nowIST}${file.originalname.substring(file.originalname.lastIndexOf('.'))}`;
    cb(null, fileName);
  }
});

const upload = multer({ storage: storage });




// @route   POST api/expenditures
// @desc    Add a new expenditure
// @access  Private (Admin only)
router.post(
  '/',
  [
    [auth,
    admin,upload.single('file')],
    [
      check('description', 'Description is required').not().isEmpty(),
      check('amount', 'Amount is required').isNumeric(),
      check('category', 'Category is required').not().isEmpty(),
      check('date', 'Date is required').isISO8601().toDate()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array(), message:"You have not filled all the required fields" });
    }

    const { description, amount, category, date } = req.body;
    let file;
    if(req.file){file = `/uploads/expenditures/${req.file.filename}`;}

    try {
      const expenditure = new Expenditure({
        description,
        amount,
        category,
        date,
        filePath: req.file ? file : null
      });

      await expenditure.save();
      res.json(expenditure);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({message:`Server error: ${err.message}`});
    }
  }
);

// PUT method to update an expenditure by ID
router.put(
  '/:id',
  [
    auth,
    admin,
    [
      check('description', 'Description is required').not().isEmpty(),
      check('amount', 'Amount is required').isNumeric(),
      check('category', 'Category is required').not().isEmpty(),
      check('date', 'Date is required').isISO8601().toDate()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() , message: "You have not filled all the required fields"});
    }

    const { description, amount, category, date } = req.body;
    let file;
    if(req.file){file = `/uploads/${req.file.filename}`;}
    const expenditureFields = { description, amount, category, date,filePath:file };

    try {
      let expenditure = await Expenditure.findById(req.params.id);

      if (!expenditure) {
        return res.status(404).json({ message: 'Expenditure not found' });
      }

      // Update the expenditure
      expenditure = await Expenditure.findByIdAndUpdate(
        req.params.id,
        { $set: expenditureFields },
        { new: true }
      );

      res.json(expenditure);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({message:`Server error: ${err.message}`});
    }
  }
);

// // @route   GET api/expenditures
// // @desc    Get all expenditures
// // @access  Private (User)
// router.get('/', auth, async (req, res) => {
//   try {
//     const expenditures = await Expenditure.find().sort({ date: -1 });
//     res.json(expenditures);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server error');
//   }
// });
// @route    GET api/expenditures
// @desc     Get expenditures for a particular month
// @access   Private
router.get('/', auth,advancedExpResults(Expenditure,null), async (req, res) => {
  try {
    res.status(200).json(res.advancedResults)
    //res.json(expenditures);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message:`Server error: ${err.message}`});
  }
});

// DELETE method to delete an expenditure by ID
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const expenditure = await Expenditure.findById(req.params.id);

    if (!expenditure) {
      return res.status(404).json({ message: 'Expenditure not found' });
    }

    //Delete associated file in 'uploads/' (if applicable)
    if (expenditure.filePath) {
      const filePath = path.join(__dirname, '..', expenditure.filePath);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log({message: `Failed to delete file ${filePath}:, error: ${err.message}`});
        } else {
          console.log({message: `File ${filePath} deleted successfully`});
        }
      });
    }

    await Expenditure.deleteOne({_id:expenditure._id})

    res.json({ message: 'Expenditure and associated file deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// Get a specific expenditure by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const expenditure = await Expenditure.findById(req.params.id);

    if (!expenditure) {
      return res.status(404).json({ message: 'Expenditure not found' });
    }

    res.json(expenditure);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// Download file associated with a specific expenditure
router.get('/:id/download', auth,admin, async (req, res) => {
  try {
    const expenditure = await Expenditure.findById(req.params.id);

    if (!expenditure || !expenditure.filePath) {
      return res.status(404).json({ message: 'File not found' });
    }
    const filePath = path.join(__dirname, '..', expenditure.filePath);
    res.download(filePath, expenditure.filePath, (err) => {
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

module.exports = router;
