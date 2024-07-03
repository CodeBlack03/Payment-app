const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Expenditure = require('../models/Expenditure');
const { check, validationResult } = require('express-validator');
const multer  = require('multer');
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
      return res.status(400).json({ errors: errors.array() });
    }

    const { description, amount, category, date } = req.body;
    let file;
    if(req.file){file = `/uploads/${req.file.filename}`;}

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
      res.status(500).send('Server error');
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
      return res.status(400).json({ errors: errors.array() });
    }

    const { description, amount, category, date } = req.body;
    let file;
    if(req.file){file = `/uploads/${req.file.filename}`;}
    const expenditureFields = { description, amount, category, date,filePath:file };

    try {
      let expenditure = await Expenditure.findById(req.params.id);

      if (!expenditure) {
        return res.status(404).json({ msg: 'Expenditure not found' });
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
      res.status(500).send('Server error');
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
router.get('/', auth,advancedResults(Expenditure), async (req, res) => {
  try {
    const { month, year } = req.query;

    let expenditures;

    if (month && year) {
      // If month and year are provided, filter by month and year
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      expenditures = await Expenditure.find({
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }).sort({ date: -1 });
    } else {
      // If no month and year are provided, return the latest month expenditures
      expenditures = await Expenditure.find().sort({ date: -1 });

      if (expenditures.length > 0) {
        const latestDate = expenditures[0].date;
        const latestMonth = latestDate.getMonth();
        const latestYear = latestDate.getFullYear();

        const startDate = new Date(latestYear, latestMonth, 1);
        const endDate = new Date(latestYear, latestMonth + 1, 0, 23, 59, 59, 999);

        expenditures = await Expenditure.find({
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }).sort({ date: -1 });
      }
    }
    res.status(200).json(res.advancedResults)
    //res.json(expenditures);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// DELETE method to delete an expenditure by ID
router.delete('/expenditures/:id', auth, admin, async (req, res) => {
  try {
    const expenditure = await Expenditure.findById(req.params.id);

    if (!expenditure) {
      return res.status(404).json({ msg: 'Expenditure not found' });
    }

    //Delete associated file in 'uploads/' (if applicable)
    if (expenditure.filePath) {
      const filePath = path.join(__dirname, '..', expenditure.filePath);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Failed to delete file ${filePath}:`, err);
        } else {
          console.log(`File ${filePath} deleted successfully`);
        }
      });
    }

    await expenditure.remove();

    res.json({ msg: 'Expenditure and associated file deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get a specific expenditure by ID
router.get('/expenditures/:id', auth, async (req, res) => {
  try {
    const expenditure = await Expenditure.findById(req.params.id);

    if (!expenditure) {
      return res.status(404).json({ msg: 'Expenditure not found' });
    }

    res.json(expenditure);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Download file associated with a specific expenditure
router.get('/expenditures/:id/download', auth, async (req, res) => {
  try {
    const expenditure = await Expenditure.findById(req.params.id);

    if (!expenditure || !expenditure.filePath) {
      return res.status(404).json({ msg: 'File not found' });
    }

    const filePath = path.join(__dirname, '..', expenditure.filePath);
    res.download(filePath);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
