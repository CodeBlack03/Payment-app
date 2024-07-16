const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Announcement = require('../models/Announcement');
const fs = require('fs-extra');
const admin = require('../middleware/admin')

const path = require('path');
// @route   GET api/announcements
// @desc    Get all announcements
// @access  Private
router.get('/', async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message: `Server error: ${err.message}`});
  }
});

router.get('/:id', async (req, res) => {
  try {
    const announcement= await Announcement.findById(req.params.id);
    res.json(announcement);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// @route   GET api/announcements/download/:filename
// @desc    Download the announcement file
// @access  Private
router.get('/:id/download', async(req, res) => {
  const announcement = await Announcement.findById(req.params.id);

       if (!announcement) {
      return res.status(404).json({ message: 'File not found' });
    }
    // Construct file path (assuming 'uploads/' directory)
    const filePath = path.join(__dirname, '..', '', announcement.fileURL);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Download the file
    res.download(filePath, announcement.fileURL, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({message: `Server error: ${err}`});
      }
    });
});

// DELETE method to delete an announcement by ID
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Delete associated file in 'uploads/'
    const filePath = path.join(__dirname, '..',  announcement.fileURL);
    await fs.remove(filePath);

    await Announcement.deleteOne({_id:announcement._id})

    res.json({ message: 'Announcement and associated file deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message: `Server error: ${err.message}`});
  }
});

module.exports = router;
