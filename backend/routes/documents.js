const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/admin');
const Document = require('../models/Document');

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

// @route   POST api/documents
// @desc    Admin upload document
// @access  Private (Admin only)
router.post('/', [auth, admin, upload.single('file')], async (req, res) => {
  const { name, description } = req.body;

  if (!req.file) {
    return res.status(400).json({ msg: 'No file uploaded' });
  }

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
    res.status(500).send('Server error');
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
    res.status(500).send('Server error');
  }
});

// @route   GET api/documents/:id/download
// @desc    Download a document
// @access  Private
router.get('/:id/download',async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    res.download(document.filePath);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
