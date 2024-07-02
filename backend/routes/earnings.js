const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Earnings = require('../models/Earnings');
const TotalMoneyCollected = require('../models/TotalMoneyCollected');

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
    [
      check('name', 'Name is required').not().isEmpty(),
      check('amount', 'Amount is required').isNumeric(),
      check('date', 'Date is required').isISO8601().toDate()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, amount } = req.body;

    try {
      const newEarning = new Earnings({ name, amount,date });

      await newEarning.save();
      await updateTotalMoneyCollected();

      res.json(newEarning);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
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
    [
      check('name', 'Name is required').not().isEmpty(),
      check('amount', 'Amount is required').isNumeric(),
      check('date', 'Date is required').isISO8601().toDate()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, amount,date } = req.body;

    try {
      let earning = await Earnings.findById(req.params.id);

      if (!earning) return res.status(404).json({ msg: 'Earning not found' });

      earning.name = name;
      earning.amount = amount;
      earning.date = date;

      await earning.save();
      await updateTotalMoneyCollected();

      res.json(earning);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
