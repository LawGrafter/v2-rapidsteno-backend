// const NewsFeed = require('../models/newsFeedModel');

// // Admin creates a news message
// exports.createNewsMessage = async (req, res) => {
//   try {
//     const { message } = req.body;

//     if (!message) return res.status(400).json({ message: 'Message content is required' });

//     const newFeed = new NewsFeed({ message });
//     await newFeed.save();

//     res.status(201).json({ message: 'News message sent successfully', data: newFeed });
//   } catch (error) {
//     res.status(500).json({ message: 'Error creating news message', error });
//   }
// };

// // All users fetch news feed (e.g., for their dashboard)
// exports.getNewsFeed = async (req, res) => {
//   try {
//     const feed = await NewsFeed.find().sort({ createdAt: -1 });
//     res.status(200).json(feed);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching news feed', error });
//   }
// };
const NewsFeed = require('../models/newsFeedModel');

// Admin creates a news message
exports.createNewsMessage = async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!title || !message)
      return res.status(400).json({ message: 'Title and message are required' });

    const newFeed = new NewsFeed({ title, message });
    await newFeed.save();

    res.status(201).json({ message: 'News message sent successfully', data: newFeed });
  } catch (error) {
    res.status(500).json({ message: 'Error creating news message', error });
  }
};
 
// exports.getNewsFeed = async (req, res) => {
//   try {
//     const feed = await NewsFeed.find().sort({ createdAt: -1 });
//     res.status(200).json(feed);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching news feed', error });
//   }
// };

// GET latest news feed
exports.getNewsFeed = async (req, res) => {
  try {
    const latest = await NewsFeed.findOne().sort({ createdAt: -1 });
    res.status(200).json(latest);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching latest news feed', error });
  }
};
