const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Expenditure = require('../models/Expenditure');
const { check, validationResult } = require('express-validator');

// @route   POST api/expenditures
// @desc    Add a new expenditure
// @access  Private (Admin only)
router.post(
  '/',
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

    try {
      const expenditure = new Expenditure({
        description,
        amount,
        category,
        date
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
    const expenditureFields = { description, amount, category, date };

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
router.get('/', auth, async (req, res) => {
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

    res.json(expenditures);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
