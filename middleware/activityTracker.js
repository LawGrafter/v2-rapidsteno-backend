const { logActivity } = require('../utils/activityLogger');

const trackActivity = async (req, res, next) => {
  // Ensure we have a user (middleware must be placed after auth middleware)
  if (req.user && req.user._id) {
    // Fire and forget - do not await to avoid blocking the response
    // Or await if strict logging is required. 
    // Given external API call (ip-api) might take time, it's better to not await it for UX speed,
    // BUT usually logging middleware might want to ensure it's logged. 
    // Compromise: We await it but handle errors gracefully. 
    // Actually, ip-api might take 100-500ms. 
    // For "every request", this is too slow.
    // I should probably run it in background.
    
    logActivity(req, req.user._id).catch(err => {
      console.error('Background Activity Log Error:', err.message);
    });
  }
  next();
};

module.exports = { trackActivity };
