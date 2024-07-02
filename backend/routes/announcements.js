const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Announcement = require('../models/Announcement');

// @route   GET api/announcements
// @desc    Get all announcements
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/announcements/download/:filename
// @desc    Download the announcement file
// @access  Private
router.get('/download/:filename', auth, (req, res) => {
  const filePath = path.join(__dirname, '../uploads', req.params.filename);
  res.download(filePath, (err) => {
    if (err) {
      console.error(err);
      res.status(500).send('File download error');
    }
  });
});

module.exports = router;
