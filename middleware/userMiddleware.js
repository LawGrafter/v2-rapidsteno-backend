// const jwt = require("jsonwebtoken");
// const User = require("../models/userModel");

// const userProtect = async (req, res, next) => {
//   let token;

//   if (
//     req.headers.authorization &&
//     req.headers.authorization.startsWith("Bearer")
//   ) {
//     try {
//       token = req.headers.authorization.split(" ")[1];
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       req.user = await User.findById(decoded.id).select("-password");
//       next();
//     } catch (error) {
//       return res.status(401).json({ message: "Not authorized, invalid token" });
//     }
//   }

//   if (!token) {
//     return res.status(401).json({ message: "Not authorized, no token provided" });
//   }
// };

// module.exports = { userProtect }; // ✅ This is the name you import in the route

const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const userProtect = async (req, res, next) => {
  let token = req.headers.authorization?.split(" ")[1];
  const sessionToken = req.headers["x-session-token"];

  if (!token || !sessionToken) {
    return res.status(401).json({ message: "Not authorized: missing token or session" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.sessionToken !== sessionToken) {
      return res.status(401).json({ message: "Session invalid. Please login again." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token verification failed" });
  }
};

module.exports = { userProtect };
