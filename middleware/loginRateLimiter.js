const rateLimit = require("express-rate-limit");

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP + User to 5 login attempts per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { status: 429, error: "Too many login attempts. Try again after 15 minutes." },
  keyGenerator: (req) => {
    // Key = IP + Email/Username
    const email = (req.body.email || req.body.username || "").toLowerCase().trim();
    return `${req.ip}:${email || "no-identity"}`;
  }
});

module.exports = { loginRateLimiter };
