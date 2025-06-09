
// const jwt = require("jsonwebtoken");
// const User = require("../models/userModel");

// const userProtect = async (req, res, next) => {
//   let token = req.headers.authorization?.split(" ")[1];
//   const sessionToken = req.headers["x-session-token"];

//   if (!token || !sessionToken) {
//     return res.status(401).json({ message: "Not authorized: missing token or session" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.id);

//     if (!user || user.sessionToken !== sessionToken) {
//       return res.status(401).json({ message: "Session invalid. Please login again." });
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     return res.status(401).json({ message: "Token verification failed" });
//   }
// };

// module.exports = { userProtect };

const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const userProtect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const sessionToken = req.headers["x-session-token"];

    if (!authHeader || !authHeader.startsWith("Bearer ") || !sessionToken) {
      return res.status(401).json({ message: "Not authorized: Missing or invalid headers" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.sessionToken !== sessionToken) {
      return res.status(401).json({ message: "Session invalid. Please login again." });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Your account is deactivated. Contact support." });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token verification failed", error });
  }
};

module.exports = { userProtect };
