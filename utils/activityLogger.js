const axios = require('axios');
const requestIp = require('request-ip');
const UAParser = require('ua-parser-js');
const UserActivityLog = require('../models/UserActivityLog');

/**
 * Extract Real IP Address
 * @param {Object} req - Express request object
 * @returns {String} IP Address
 */
const extractIP = (req) => {
  const clientIp = requestIp.getClientIp(req); 
  // Handle localhost/IPv6 loopback
  if (clientIp === '::1' || clientIp === '127.0.0.1') {
    return '127.0.0.1';
  }
  // Remove IPv6 prefix if present (e.g. ::ffff:192.168.1.1)
  if (clientIp && clientIp.includes('::ffff:')) {
    return clientIp.split('::ffff:')[1];
  }
  return clientIp;
};

/**
 * Parse User Agent for Device/OS/Browser
 * @param {String} userAgentString 
 * @returns {Object} { deviceType, browser, os }
 */
const parseDevice = (userAgentString) => {
  const parser = new UAParser(userAgentString);
  const result = parser.getResult();

  let deviceType = 'desktop';
  if (result.device.type === 'mobile' || result.device.type === 'tablet') {
    deviceType = result.device.type;
  }

  return {
    deviceType,
    browser: `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim(),
    os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
    userAgent: userAgentString
  };
};

/**
 * Fetch Location from IP using ip-api.com
 * @param {String} ip 
 * @returns {Object} { country, city }
 */
const fetchLocation = async (ip) => {
  if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
    return { country: 'Localhost/Private', city: 'Local Network' };
  }

  try {
    // ip-api.com free endpoint (HTTP only, non-commercial)
    // For production with HTTPS/High volume, a paid key or different provider is recommended.
    // Using http endpoint as requested by common free usage patterns, but check rate limits (45/min).
    const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,city`);
    if (response.data && response.data.status === 'success') {
      return {
        country: response.data.country,
        city: response.data.city
      };
    }
  } catch (error) {
    // Fail silently for location fetch to avoid breaking the main flow
    // console.error('GeoIP Fetch Error:', error.message);
  }
  return { country: 'Unknown', city: 'Unknown' };
};

/**
 * Check if IP or Device is new for the user
 * @param {String} userId 
 * @param {String} ip 
 * @param {String} deviceType 
 * @returns {Promise<Boolean>}
 */
const isNewDeviceOrIp = async (userId, ip, deviceType) => {
  const existing = await UserActivityLog.findOne({
    user: userId,
    $or: [{ ipAddress: ip }, { deviceType: deviceType }]
  });
  return !existing;
};

/**
 * Main Logging Function
 * @param {Object} req - Express Request
 * @param {String} userId - User ID
 */
const logActivity = async (req, userId) => {
  try {
    const ip = extractIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const { deviceType, browser, os } = parseDevice(userAgent);
    
    // Check for existing log for this IP to save API calls to ip-api
    // If we have seen this IP recently, we might reuse the location data
    // For now, we will fetch every time or rely on the previous log if we want to optimize.
    // Optimization: Check if we logged this IP for any user recently? 
    // Simple approach: Fetch location.
    
    const location = await fetchLocation(ip);

    // Extract session token (optional, from header)
    const sessionToken = req.headers['x-session-token'] || req.headers['authorization']?.split(' ')[1] || null;

    const log = new UserActivityLog({
      user: userId,
      ipAddress: ip,
      country: location.country,
      city: location.city,
      deviceType,
      browser,
      os,
      userAgent,
      sessionToken,
      method: req.method,
      url: req.originalUrl
    });

    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to log user activity:', error.message);
  }
};

module.exports = {
  extractIP,
  parseDevice,
  fetchLocation,
  isNewDeviceOrIp,
  logActivity
};
