const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const Document = require('../models/Document');
const fs = require('fs-extra');
const path = require('path');
const admin = require('../middleware/admin')
const moment = require('moment-timezone');


// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
   filename: (req, file, cb) => {
    
    const nowIST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD_HH-mm-ss');
    const fileName = `${nowIST}${file.originalname.substring(file.originalname.lastIndexOf('.'))}`;
    cb(null, fileName);
  }
});

const upload = multer({ storage: storage });

// @route   POST api/documents
// @desc    Admin upload document
// @access  Private (Admin only)
router.post('/', [auth, admin, upload.single('file')], async (req, res) => {
  const { name, description } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  console.log("server doc",req.file)
  try {
    const newDocument = new Document({
      name,
      description,
      filePath: `/uploads/${req.file.filename}`
    });

    const document = await newDocument.save();

    res.json(document);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message:`Server error: ${err.message}`});
  }
});

// @route   GET api/documents
// @desc    Get all documents
// @access  Private
router.get('/', async (req, res) => {
  try {
    const documents = await Document.find().sort({ uploadedAt: -1 });
    res.json(documents);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message: `Server error: ${err.message}`});
  }
});


router.get('/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    res.json(document);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message: `Server error: ${err.message}`});
  }
});

// @route   GET api/documents/:id/download
// @desc    Download a document
// @access  Private
router.get('/:id/download',async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

       if (!document) {
      return res.status(404).json({ message: 'File not found' });
    }
    // Construct file path (assuming 'uploads/' directory)
    const filePath = path.join(__dirname, '..', '', document.filePath);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Download the file
    res.download(filePath, document.filePath, (err) => {
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

// DELETE method to delete a document by ID
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete associated file in 'uploads/'
    const filePath = path.join(__dirname, '..', document.fileURL);
    await fs.remove(filePath);

    await Document.deleteOne({_id:document._id})

    res.json({ msg: 'Document and associated file deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message: `Server error: ${err.message}`});
  }
});

module.exports = router;
