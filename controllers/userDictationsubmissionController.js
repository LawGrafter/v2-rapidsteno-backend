const UserDictationSubmission = require("../models/UserDictationSubmission");
const User = require("../models/userModel");
const Dictation = require("../models/Dictation");
const mongoose = require('mongoose');

exports.submitDictation = async (req, res) => {
  try {
    const {
      userId,
      dictationId,
      totalMistakes,
      capitalMistakes,
      spellingMistakes,
      extraWords,
      missingWords,
      userTypeParagraph,
      playbackSpeed,  // ✅
      typingTimer,     // ✅
      accuracy,
      mistakeSummary         
    } = req.body;

    const user = await User.findById(userId);
    const dictation = await Dictation.findById(dictationId);

    if (!user || !dictation) {
      return res.status(404).json({ message: "User or Dictation not found" });
    }

    const newSubmission = new UserDictationSubmission({
      user: userId,
      dictation: dictationId,
      dictationTitle: dictation.title || "Untitled",
      dictationType: dictation.category || "General",
      userTypeParagraph,
      totalMistakes,
      capitalMistakes,
      spellingMistakes,
      extraWords,
      missingWords,
      accuracy,
      playbackSpeed,   // ✅
      typingTimer,      // ✅
      mistakeSummary,
    });

    await newSubmission.save();

    res.status(201).json({
      message: "Submission saved successfully",
      data: newSubmission,
    });
  } catch (error) {
    console.error("Submission Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// exports.getCompletedDictationsByUser = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     const submissions = await UserDictationSubmission.find({ user: userId }).select('dictation');

//     const completedDictationIds = submissions.map(sub => sub.dictation.toString());

//     res.status(200).json({
//       success: true,
//       userId,
//       completedDictations: completedDictationIds
//     });
//   } catch (error) {
//     console.error("Fetch Error:", error);
//     res.status(500).json({ message: "Failed to fetch completed dictations", error: error.message });
//   }
// };

exports.getCompletedDictationSubmissionsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const submissions = await UserDictationSubmission.find({ user: userId })
      // .populate("dictation", "title category audioUrl duration")
      .populate("dictation", "title category paragraphText audioUrl duration")

      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      userId,
      submissions,
    });
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({
      message: "Failed to fetch full dictation submissions",
      error: error.message,
    });
  }
};


exports.deleteUserSubmission = async (req, res) => {
  try {
    const { userId, dictationId } = req.params;

    const submission = await UserDictationSubmission.findOneAndDelete({
      user: userId,
      dictation: dictationId,
    });

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    res.status(200).json({ message: "Submission deleted. User can retake the dictation." });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ message: "Failed to delete submission", error: error.message });
  }
};

// Update a dictation submission by userId and dictationId
// exports.updateUserSubmission = async (req, res) => {
//   try {
//     const { userId, dictationId } = req.params;
//     const updateData = req.body;

//       // Optional: Ensure mistakeSummary is structured correctly
//     if (updateData.mistakeSummary) {
//       const summary = updateData.mistakeSummary;
//       updateData.mistakeSummary = {
//         capitalSpellingMistakes: summary.capitalSpellingMistakes || [],
//         spellingMistakes: summary.spellingMistakes || [],
//         extraWords: summary.extraWords || [],
//         missingWords: summary.missingWords || [],
//         punctuationMistakes: summary.punctuationMistakes || [],
//       };
//     }

//     const updatedSubmission = await UserDictationSubmission.findOneAndUpdate(
//       { user: userId, dictation: dictationId },
//       { $set: updateData },
//       { new: true, runValidators: true }
//     );

//     if (!updatedSubmission) {
//       return res.status(404).json({ message: "Submission not found" });
//     }

//     res.status(200).json({
//       message: "Submission updated successfully",
//       data: updatedSubmission,
//     });
//   } catch (error) {
//     console.error("Update Error:", error);
//     res.status(500).json({ message: "Failed to update submission", error: error.message });
//   }
// };

exports.updateUserSubmission = async (req, res) => {
  try {
    const { userId, dictationId } = req.params;
    const updateData = req.body;

    // ✅ Extract mistake details from request body if provided
    const {
      accuracy,
      mistakes,
      comparisonDetails = {} // ← from frontend WordComparison.jsx
    } = updateData;

    // ✅ Destructure mistake arrays safely
    const {
      capital = [],
      spelling = [],
      extra = [],
      missing = [],
      punctuation = [],
      spacing = []
    } = comparisonDetails;

    // ✅ Prepare final update object
    const finalUpdate = {
      accuracy,
      totalMistakes: mistakes,
      capitalMistakes: capital.length,
      spellingMistakes: spelling.length,
      extraWords: extra.length,
      missingWords: missing.length,
      punctuationMistakes: punctuation.length, 
      mistakeSummary: {
        capitalSpellingMistakes: capital,
        spellingMistakes: spelling,
        extraWords: extra,
        missingWords: missing,
        punctuationMistakes: punctuation,
      }
    };

    const updatedSubmission = await UserDictationSubmission.findOneAndUpdate(
      { user: userId, dictation: dictationId },
      { $set: finalUpdate },
      { new: true, runValidators: true }
    );

    if (!updatedSubmission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    res.status(200).json({
      message: "Submission updated successfully",
      data: updatedSubmission,
    });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ message: "Failed to update submission", error: error.message });
  }
};


exports.getGlobalLeaderboard = async (req, res) => {
  try {
    // Group by user, calculate average accuracy and total submissions
    const leaderboard = await UserDictationSubmission.aggregate([
      {
        $group: {
          _id: "$user",
          averageAccuracy: { $avg: "$accuracy" },
          totalSubmissions: { $sum: 1 }
        }
      },
      {
        $sort: { averageAccuracy: -1 } // descending by accuracy
      },
      {
        $limit: 50 // top 50 users
      },
      {
        $lookup: {
          from: "users", // Make sure the collection name matches your actual MongoDB users collection
          localField: "_id",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      {
        $unwind: "$userInfo"
      },
      {
        $project: {
          _id: 0,
          userId: "$userInfo._id",
          name: { $concat: ["$userInfo.firstName", " ", "$userInfo.lastName"] },
          email: "$userInfo.email",
          averageAccuracy: { $round: ["$averageAccuracy", 2] },
          totalSubmissions: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      leaderboard
    });
  } catch (error) {
    console.error("Leaderboard Fetch Error:", error);
    res.status(500).json({ message: "Failed to generate leaderboard", error: error.message });
  }
};

exports.getDictationSubmissionCounts = async (req, res) => {
  try {
    const submissionCounts = await UserDictationSubmission.aggregate([
      {
        $group: {
          _id: "$dictation", // Group by dictation ID
          count: { $sum: 1 }, // Count submissions
        }
      },
      {
        $lookup: {
          from: "dictations", // Match your actual dictation collection name
          localField: "_id",
          foreignField: "_id",
          as: "dictationInfo"
        }
      },
      {
        $unwind: "$dictationInfo"
      },
      {
        $project: {
          _id: 0,
          dictationId: "$dictationInfo._id",
          dictationTitle: "$dictationInfo.title",
          dictationType: "$dictationInfo.category",
          submissionCount: "$count"
        }
      },
      {
        $sort: { submissionCount: -1 } // Optional: Sort by most attempted
      }
    ]);

    res.status(200).json({
      success: true,
      data: submissionCounts
    });
  } catch (error) {
    console.error("Error fetching dictation submission counts:", error);
    res.status(500).json({ message: "Failed to fetch dictation submission counts", error: error.message });
  }
};


// exports.getUserDictationStats = async (req, res) => {
//   try {
//     const stats = await UserDictationSubmission.aggregate([
//       {
//         $group: {
//           _id: { user: "$user", dictation: "$dictation" },
//           count: { $sum: 1 }
//         }
//       },
//       {
//         $group: {
//           _id: "$_id.user",
//           dictations: {
//             $push: {
//               dictationId: "$_id.dictation",
//               submissions: "$count"
//             }
//           },
//           totalSubmissions: { $sum: "$count" }
//         }
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "_id",
//           foreignField: "_id",
//           as: "userInfo"
//         }
//       },
//       {
//         $unwind: "$userInfo"
//       },
//       {
//         $lookup: {
//           from: "dictations",
//           localField: "dictations.dictationId",
//           foreignField: "_id",
//           as: "dictationInfo"
//         }
//       },
//       {
//         $project: {
//           userId: "$_id",
//           name: { $concat: ["$userInfo.firstName", " ", "$userInfo.lastName"] },
//           email: "$userInfo.email",
//           totalSubmissions: 1,
//           dictations: {
//             $map: {
//               input: "$dictations",
//               as: "d",
//               in: {
//                 dictationId: "$$d.dictationId",
//                 title: {
//                   $arrayElemAt: [
//                     {
//                       $filter: {
//                         input: "$dictationInfo",
//                         as: "di",
//                         cond: { $eq: ["$$di._id", "$$d.dictationId"] }
//                       }
//                     },
//                     0
//                   ]
//                 },
//                 submissions: "$$d.submissions"
//               }
//             }
//           }
//         }
//       },
//       {
//         $sort: { totalSubmissions: -1 }
//       }
//     ]);

//     res.status(200).json({ success: true, data: stats });
//   } catch (error) {
//     console.error("Error in getUserDictationStats:", error);
//     res.status(500).json({ message: "Failed to get user dictation stats", error: error.message });
//   }
// };
// exports.getUserDictationStats = async (req, res) => {
//   try {
//     const submissions = await UserDictationSubmission.find()
//       .populate("user", "firstName lastName email")
//       .populate("dictation", "title category") // optional: can also include paragraphText/audioUrl
//       .sort({ submittedAt: -1 });

//     const result = submissions.map((sub) => ({
//       submissionId: sub._id,
//       submittedAt: sub.submittedAt,
//       userId: sub.user?._id || null,
//       name: sub.user ? `${sub.user.firstName} ${sub.user.lastName}` : null,
//       email: sub.user?.email || null,
//       dictationId: sub.dictation?._id || null,
//       dictationTitle: sub.dictationTitle || sub.dictation?.title || "Untitled",
//       dictationType: sub.dictationType || sub.dictation?.category || "Unknown",
//       userTypeParagraph: sub.userTypeParagraph,
//       accuracy: sub.accuracy,
//       totalMistakes: sub.totalMistakes,
//       capitalMistakes: sub.capitalMistakes,
//       spellingMistakes: sub.spellingMistakes,
//       extraWords: sub.extraWords,
//       missingWords: sub.missingWords,
//       playbackSpeed: sub.playbackSpeed,
//       typingTimer: sub.typingTimer,
//       mistakeSummary: sub.mistakeSummary,
//     }));

//     res.status(200).json({
//       success: true,
//       count: result.length,
//       data: result
//     });
//   } catch (error) {
//     console.error("Error fetching detailed user submissions:", error);
//     res.status(500).json({
//       message: "Failed to fetch submissions",
//       error: error.message,
//     });
//   }
// };

exports.getUserDictationStats = async (req, res) => {
  try {
    const submissions = await UserDictationSubmission.find()
      .populate("user", "firstName lastName email")
      .populate("dictation", "title category")
      .sort({ submittedAt: -1 });

    const userMap = new Map();

    for (const sub of submissions) {
      const userId = sub.user?._id?.toString();
      const dictationId = sub.dictation?._id?.toString();

      if (!userId || !dictationId) continue;

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          name: `${sub.user.firstName} ${sub.user.lastName}`,
          email: sub.user.email,
          totalSubmissions: 0,
          totalDictations: 0,
          dictations: new Map()
        });
      }

      const userEntry = userMap.get(userId);
      userEntry.totalSubmissions += 1;

      if (!userEntry.dictations.has(dictationId)) {
        userEntry.dictations.set(dictationId, {
          dictationId,
          dictationTitle: sub.dictation?.title || sub.dictationTitle || "Untitled",
          dictationType: sub.dictation?.category || sub.dictationType || "Unknown",
          submissionCount: 0,
          submissions: []
        });
        userEntry.totalDictations += 1;
      }

      const dictationEntry = userEntry.dictations.get(dictationId);
      dictationEntry.submissionCount += 1;

      dictationEntry.submissions.push({
        submissionId: sub._id,
        submittedAt: sub.submittedAt,
        userTypeParagraph: sub.userTypeParagraph,
        accuracy: sub.accuracy,
        totalMistakes: sub.totalMistakes,
        capitalMistakes: sub.capitalMistakes,
        spellingMistakes: sub.spellingMistakes,
        extraWords: sub.extraWords,
        missingWords: sub.missingWords,
        playbackSpeed: sub.playbackSpeed,
        typingTimer: sub.typingTimer,
        mistakeSummary: sub.mistakeSummary
      });
    }

    const result = Array.from(userMap.values()).map(user => ({
      userId: user.userId,
      name: user.name,
      email: user.email,
      totalSubmissions: user.totalSubmissions,
      totalDictations: user.totalDictations,
      dictations: Array.from(user.dictations.values())
    }));

    res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error("Error building full user dictation stats:", error);
    res.status(500).json({
      message: "Failed to build user dictation stats",
      error: error.message,
    });
  }
};


exports.getUserDictationStatsSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    const submissions = await UserDictationSubmission.find({ user: userId });

    if (!submissions.length) {
      return res.status(404).json({
        success: false,
        message: "No submissions found for this user"
      });
    }

    // Unique dictations completed
    const totalDictations = new Set(submissions.map(s => s.dictation.toString())).size;

    // Accuracy stats
    const accuracies = submissions.map(s => s.accuracy || 0);
    const averageAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    const highestAccuracy = Math.max(...accuracies);
    const lowestAccuracy = Math.min(...accuracies);

    res.status(200).json({
      success: true,
      userId,
      totalDictations,
      averageAccuracy: Number(averageAccuracy.toFixed(2)),
      highestAccuracy,
      lowestAccuracy
    });
  } catch (error) {
    console.error("Error fetching user dictation stats summary:", error);
    res.status(500).json({
      message: "Failed to fetch user dictation stats summary",
      error: error.message
    });
  }
};


exports.getUserDictationAnalysis = async (req, res) => {
  try {
    const { userId } = req.params;
    const submissions = await UserDictationSubmission.find({ user: userId });

    if (!submissions.length) {
      return res.status(404).json({ success: false, message: "No submissions found" });
    }

    let totalMistakesByType = {
      capitalMistakes: 0,
      spellingMistakes: 0,
      extraWords: 0,
      missingWords: 0,
      punctuationMistakes: 0
    };

    let mistakeWordFrequency = {};

    submissions.forEach(sub => {
      totalMistakesByType.capitalMistakes += sub.capitalMistakes || 0;
      totalMistakesByType.spellingMistakes += sub.spellingMistakes || 0;
      totalMistakesByType.extraWords += sub.extraWords || 0;
      totalMistakesByType.missingWords += sub.missingWords || 0;
      totalMistakesByType.punctuationMistakes += sub.mistakeSummary?.punctuationMistakes?.length || 0;

      // Track most frequent mistaken words
      ["capitalSpellingMistakes", "spellingMistakes", "missingWords"].forEach(type => {
        (sub.mistakeSummary?.[type] || []).forEach(word => {
          mistakeWordFrequency[word] = (mistakeWordFrequency[word] || 0) + 1;
        });
      });
    });

    // Find most common mistakes
    const mostCommonMistakes = Object.entries(mistakeWordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));

    // Suggestion logic
    let suggestions = [];
    if (totalMistakesByType.spellingMistakes > totalMistakesByType.capitalMistakes) {
      suggestions.push("Focus on spelling drills with commonly mistaken words.");
    }
    if (totalMistakesByType.capitalMistakes > 0) {
      suggestions.push("Practice capitalization rules in Rapid Steno sessions.");
    }
    if (totalMistakesByType.extraWords > 0) {
      suggestions.push("Work on typing precision — avoid adding extra words.");
    }
    if (totalMistakesByType.missingWords > 0) {
      suggestions.push("Slow down slightly to ensure no words are skipped.");
    }

    res.status(200).json({
      success: true,
      totalMistakesByType,
      mostCommonMistakes,
      suggestions
    });

  } catch (error) {
    console.error("Analysis Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDictationToppers = async (req, res) => {
  try {
    const { category } = req.query;
    const pipeline = [
      category ? { $match: { category } } : null,
      { $lookup: {
          from: 'submissions',
          let: { dictId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$dictation', '$$dictId'] } } },
            { $sort: { accuracy: -1, submittedAt: -1 } },
            { $limit: 1 }
          ],
          as: 'topSubmission'
        }
      },
      { $unwind: { path: '$topSubmission', preserveNullAndEmptyArrays: true } },
      { $lookup: {
          from: 'users',
          localField: 'topSubmission.user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
      { $project: {
          _id: 0,
          dictationId: '$_id',
          dictationTitle: '$title',
          dictationType: '$category',
          userId: '$userInfo._id',
          userName: { $cond: [{ $ifNull: ['$userInfo.firstName', false] }, { $concat: ['$userInfo.firstName', ' ', '$userInfo.lastName'] }, null] },
          accuracy: '$topSubmission.accuracy'
        }
      }
    ].filter(Boolean);

    const result = await Dictation.aggregate(pipeline).option({ allowDiskUse: true });

    return res.status(200).json({ success: true, count: result.length, data: result });
  } catch (error) {
    console.error('Error fetching dictation toppers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dictation toppers' });
  }
};

exports.getAllDictationsRanked = async (req, res) => {
  try {
    // Aggregation Pipeline to Calculate Average Accuracy per User and Rank Users
    const pipeline = [
      // 1. Group by User to calculate stats
      {
        $group: {
          _id: "$user",
          averageAccuracy: { $avg: "$accuracy" },
          averageSpeed: { $avg: "$playbackSpeed" },
          allSpeeds: { $push: "$playbackSpeed" }, // Collect all speeds to find mode
          totalDictations: { $sum: 1 },
          lastSubmittedAt: { $max: "$submittedAt" }
        }
      },
      // 2. Sort by Average Accuracy (Desc), then Speed (Desc), then Total Dictations (Desc)
      {
        $sort: { 
          averageAccuracy: -1, 
          averageSpeed: -1, 
          totalDictations: -1 
        }
      },
      // 3. Join with User collection to get names
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      // 4. Unwind user info (preserve if user deleted, though unlikely for submissions)
      {
        $unwind: "$userInfo"
      },
      // 5. Project final format
      {
        $project: {
          _id: 0,
          userId: "$userInfo._id",
          userName: { $concat: ["$userInfo.firstName", " ", "$userInfo.lastName"] },
          email: "$userInfo.email",
          averageAccuracy: { $round: ["$averageAccuracy", 2] },
          averageSpeed: { $round: ["$averageSpeed", 2] },
          allSpeeds: 1,
          totalDictations: 1,
          lastSubmittedAt: 1
        }
      }
    ];

    const leaderboard = await UserDictationSubmission.aggregate(pipeline);

    // Helper to calculate Mode (Most Frequent Value)
    const calculateMode = (arr) => {
      if (!arr || arr.length === 0) return 0;
      const frequency = {};
      let maxFreq = 0;
      let mode = arr[0];
      
      for (const item of arr) {
        frequency[item] = (frequency[item] || 0) + 1;
        if (frequency[item] > maxFreq) {
          maxFreq = frequency[item];
          mode = item;
        }
      }
      return mode;
    };

    // Add Rank (1-based index) and Calculate Most Frequent Speed
    const rankedLeaderboard = leaderboard.map((user, index) => {
      const mostFrequentSpeed = calculateMode(user.allSpeeds);
      const { allSpeeds, ...userData } = user; // Remove allSpeeds array from response
      
      return {
        rank: index + 1,
        ...userData,
        playbackSpeed: mostFrequentSpeed // "Most used speed"
      };
    });

    res.status(200).json({
      success: true,
      count: rankedLeaderboard.length,
      data: rankedLeaderboard
    });

  } catch (error) {
    console.error("Error fetching user leaderboard:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

exports.getDictationTopperByDictationId = async (req, res) => {
  try {
    const { dictationId } = req.params;
    if (!mongoose.isValidObjectId(dictationId)) {
      return res.status(400).json({ success: false, message: 'Invalid dictationId' });
    }

    const pipeline = [
      { $match: { dictation: new mongoose.Types.ObjectId(dictationId) } },
      { $sort: { accuracy: -1, submittedAt: -1 } },
      { $limit: 1 },
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userInfo' } },
      { $unwind: '$userInfo' },
      { $project: { _id: 0, userId: '$userInfo._id', userName: { $concat: ['$userInfo.firstName', ' ', '$userInfo.lastName'] }, accuracy: '$accuracy' } }
    ];

    const result = await UserDictationSubmission.aggregate(pipeline).option({ allowDiskUse: true });

    if (!result.length) return res.status(200).json({ success: true, data: null });
    return res.status(200).json({ success: true, data: result[0] });
  } catch (error) {
    console.error('Error fetching dictation topper by ID:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dictation topper', error: error.message });
  }
};

// NEW: Get Full Leaderboard for a Specific Dictation
exports.getDictationLeaderboard = async (req, res) => {
  try {
    const { dictationId } = req.params;
    if (!mongoose.isValidObjectId(dictationId)) {
      return res.status(400).json({ success: false, message: 'Invalid dictationId' });
    }

    // Pipeline to get all submissions, sorted by accuracy desc, then speed (optional logic), then date
    const pipeline = [
      { $match: { dictation: new mongoose.Types.ObjectId(dictationId) } },
      
      // Lookup User details
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },

      // Project necessary fields (including speed calculation if needed)
      // Note: UserDictationSubmission has `playbackSpeed` (dictation speed) and `typingTimer` (duration in seconds)
      // To calculate WPM (Words Per Minute) if not stored: (totalWords / (typingTimer / 60))
      // But we don't have `totalWords` directly here unless we lookup Dictation or rely on it being constant for this dictationId
      // However, usually we can just show `playbackSpeed` if that's what "speed" means in this context (e.g. 80wpm test)
      // Or if `wpm` was stored. The prompt says "take those data accuracy speed based".
      // Let's assume `playbackSpeed` is the dictation speed, but user typing speed might be different.
      // Let's check if we can calculate typing speed. We need `dictation.totalwords`.
      // For now, let's return `playbackSpeed` and `typingTimer`. 
      
      {
        $project: {
          _id: 0,
          userId: '$userInfo._id',
          userName: { $concat: ['$userInfo.firstName', ' ', '$userInfo.lastName'] },
          accuracy: 1,
          playbackSpeed: 1,
          typingTimer: 1, // seconds
          submittedAt: 1,
          // If we want to sort by speed as tie-breaker, we can use playbackSpeed or typingTimer
        }
      },

      // Sort by Accuracy (Desc)
      { $sort: { accuracy: -1, submittedAt: 1 } } 
    ];

    const submissions = await UserDictationSubmission.aggregate(pipeline);

    // Add Rank
    const leaderboard = submissions.map((sub, index) => ({
      rank: index + 1,
      userName: sub.userName,
      accuracy: sub.accuracy,
      speed: sub.playbackSpeed, // Returning playback speed as requested "speed"
      duration: sub.typingTimer,
      submittedAt: sub.submittedAt
    }));

    res.status(200).json({
      success: true,
      count: leaderboard.length,
      data: leaderboard
    });

  } catch (error) {
    console.error('Error fetching dictation leaderboard:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard', error: error.message });
  }
};

exports.getUserMistakeTrends = async (req, res) => {
  try {
    const { userId } = req.params;
    const submissions = await UserDictationSubmission.find({ user: userId }).sort({ submittedAt: 1 });
    if (!submissions.length) {
      return res.status(404).json({ success: false, message: 'No submissions found' });
    }

    const byCategory = new Map();
    const overallFreq = {};
    let totalAccSum = 0;

    for (const sub of submissions) {
      const cat = sub.dictationType || 'Unknown';
      if (!byCategory.has(cat)) {
        byCategory.set(cat, { list: [], freq: {}, accSum: 0 });
      }
      const catEntry = byCategory.get(cat);
      const counts = {
        capital: sub.capitalMistakes || 0,
        spelling: sub.spellingMistakes || 0,
        extra: sub.extraWords || 0,
        missing: sub.missingWords || 0,
        punctuation: (sub.mistakeSummary?.punctuationMistakes?.length || 0)
      };
      catEntry.list.push({
        submittedAt: sub.submittedAt || new Date(0),
        accuracy: sub.accuracy || 0,
        counts
      });
      catEntry.accSum += sub.accuracy || 0;
      totalAccSum += sub.accuracy || 0;

      const wordsSets = [
        ...(sub.mistakeSummary?.capitalSpellingMistakes || []),
        ...(sub.mistakeSummary?.spellingMistakes || []),
        ...(sub.mistakeSummary?.missingWords || []),
        ...(sub.mistakeSummary?.punctuationMistakes || [])
      ];
      for (const w of wordsSets) {
        overallFreq[w] = (overallFreq[w] || 0) + 1;
        catEntry.freq[w] = (catEntry.freq[w] || 0) + 1;
      }
    }

    const lastN = 5;
    const resultCategories = [];
    for (const [cat, data] of byCategory.entries()) {
      const totalSubs = data.list.length;
      const avgAcc = totalSubs ? +(data.accSum / totalSubs).toFixed(2) : 0;
      const totals = { capital: 0, spelling: 0, extra: 0, missing: 0, punctuation: 0 };
      for (const item of data.list) {
        totals.capital += item.counts.capital;
        totals.spelling += item.counts.spelling;
        totals.extra += item.counts.extra;
        totals.missing += item.counts.missing;
        totals.punctuation += item.counts.punctuation;
      }

      const lastItems = data.list.slice(-lastN);
      const prevItems = data.list.slice(-2 * lastN, -lastN);
      const series = {
        capital: lastItems.map(i => i.counts.capital),
        spelling: lastItems.map(i => i.counts.spelling),
        extra: lastItems.map(i => i.counts.extra),
        missing: lastItems.map(i => i.counts.missing),
        punctuation: lastItems.map(i => i.counts.punctuation),
        accuracy: lastItems.map(i => i.accuracy)
      };
      const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
      const trend = type => {
        const lastAvg = avg(lastItems.map(i => i.counts[type]));
        const prevAvg = avg(prevItems.map(i => i.counts[type]));
        const delta = +(lastAvg - prevAvg).toFixed(2);
        const status = delta > 0 ? 'increase' : delta < 0 ? 'decrease' : 'same';
        return { delta, status };
      };
      const accTrend = (() => {
        const lastAvg = avg(series.accuracy);
        const prevAvg = avg(prevItems.map(i => i.accuracy));
        const delta = +(lastAvg - prevAvg).toFixed(2);
        const status = delta > 0 ? 'improved' : delta < 0 ? 'declined' : 'same';
        return { delta, status };
      })();

      const topRepeated = Object.entries(data.freq)
        .sort((a,b)=>b[1]-a[1])
        .slice(0,5)
        .map(([term,count])=>({ term, count }));

      resultCategories.push({
        category: cat,
        totalSubmissions: totalSubs,
        averageAccuracy: avgAcc,
        accuracyTrend: accTrend,
        mistakeTotals: totals,
        mistakeSeriesLast5: series,
        mistakeTrend: {
          capital: trend('capital'),
          spelling: trend('spelling'),
          extra: trend('extra'),
          missing: trend('missing'),
          punctuation: trend('punctuation')
        },
        topRepeatedMistakes: topRepeated
      });
    }

    const overallTopRepeated = Object.entries(overallFreq)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,10)
      .map(([term,count])=>({ term, count }));

    const overall = {
      userId,
      totalSubmissions: submissions.length,
      averageAccuracy: +(totalAccSum / submissions.length).toFixed(2),
      topRepeatedMistakes: overallTopRepeated
    };

    return res.status(200).json({ success: true, overall, categories: resultCategories });
  } catch (error) {
    console.error('Error building user mistake trends:', error);
    return res.status(500).json({ success: false, message: 'Failed to build trends', error: error.message });
  }
};

// Admin: Usage analytics by dictation category and title (topic)
// Query params:
//   from: ISO date (optional)
//   to: ISO date (optional)
//   limit: number of top items to return (default 10)
exports.getDictationUsageAnalytics = async (req, res) => {
  try {
    const { from, to, limit = 10 } = req.query;

    const match = {};
    // Use createdAt (from timestamps) to filter by date range when provided
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const categoryPipeline = [
      Object.keys(match).length ? { $match: match } : null,
      {
        $group: {
          _id: "$dictationType",
          usageCount: { $sum: 1 }
        }
      },
      { $sort: { usageCount: -1 } },
      { $limit: Number(limit) },
      {
        $project: {
          _id: 0,
          category: "$_id",
          usageCount: 1
        }
      }
    ].filter(Boolean);

    const topicPipeline = [
      Object.keys(match).length ? { $match: match } : null,
      {
        $group: {
          _id: { title: "$dictationTitle", category: "$dictationType" },
          usageCount: { $sum: 1 }
        }
      },
      { $sort: { usageCount: -1 } },
      { $limit: Number(limit) },
      {
        $project: {
          _id: 0,
          title: "$_id.title",
          category: "$_id.category",
          usageCount: 1
        }
      }
    ].filter(Boolean);

    const [topCategories, topTopics] = await Promise.all([
      UserDictationSubmission.aggregate(categoryPipeline),
      UserDictationSubmission.aggregate(topicPipeline)
    ]);

    res.status(200).json({
      success: true,
      filters: { from: from || null, to: to || null, limit: Number(limit) },
      topCategories,
      topTopics
    });
  } catch (error) {
    console.error("Error in getDictationUsageAnalytics:", error);
    res.status(500).json({ message: "Failed to compute dictation usage analytics", error: error.message });
  }
};
