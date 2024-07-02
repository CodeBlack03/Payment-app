const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('../models/User');
module.exports = async function(req, res, next) {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookie && req.cookie.token) {
    token = req.cookie.token;
  }
  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }
 
  const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
  // console.log(decoded)
  req.user = decoded
  req.token = token
  //console.log(req)
  next();
};

// module.exports = function(req, res, next) {
//   // Get token from header
//   const token = req.header('x-auth-token');

//   // Check if not token
//   if (!token) {
//     return res.status(401).json({ msg: 'No token, authorization denied' });
//   }

//   try {
//     const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
//     req.user = decoded.user;
//     next();
//   } catch (err) {
//     res.status(401).json({ msg: 'Token is not valid' });
//   }
// };

// Middleware to check if user is an admin
module.exports.isAdmin = async function(req, res, next) {
  try {
    const user = await User.findById(req.user.id);

    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    next();
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};
