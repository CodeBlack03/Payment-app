const User = require('../models/User');
module.exports = async function (req, res, next) {
  const user = await User.findById(req.user.id);
  if (!user.isAdmin) {
    return res.status(403).json({ message: 'Access denied. Your are not ADMIN' });
  }
  next();
};
