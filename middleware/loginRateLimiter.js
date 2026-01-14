const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 429, error: "Too many login attempts. Try again after 15 minutes." },
  keyGenerator: (req) => {
    const email = (req.body.email || req.body.username || "").toLowerCase().trim();
    const ipKey = ipKeyGenerator(req);
    return `${ipKey}:${email || "no-identity"}`;
  }
});

module.exports = { loginRateLimiter };
