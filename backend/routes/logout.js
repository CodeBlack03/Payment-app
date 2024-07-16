const express = require('express');
const router = express.Router();

// Logout route
router.post('/', (req, res) => {
  // Here, you would invalidate the token if using a blacklist strategy.
  // For simplicity, we are just sending a message to the client to delete the token.
  res.json({message: 'Logout successful'});
});

module.exports = router;