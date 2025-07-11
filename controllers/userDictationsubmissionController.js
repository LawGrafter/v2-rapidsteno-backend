const UserDictationSubmission = require("../models/UserDictationSubmission");
const User = require("../models/userModel");
const Dictation = require("../models/Dictation");

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
