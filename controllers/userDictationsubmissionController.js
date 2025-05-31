// const UserDictationSubmission = require("../models/UserDictationSubmission");
// const User = require("../models/userModel");
// const Dictation = require("../models/Dictation");

// exports.submitDictation = async (req, res) => {
//   try {
//     const {
//       userId,
//       dictationId,
//       totalMistakes,
//       capitalMistakes,
//       spellingMistakes,
//       extraWords,
//       missingWords,
//       userTypeParagraph,
//     } = req.body;

//     const user = await User.findById(userId);
//     const dictation = await Dictation.findById(dictationId);

//     if (!user || !dictation) {
//       return res.status(404).json({ message: "User or Dictation not found" });
//     }

//     const newSubmission = new UserDictationSubmission({
//       user: userId,
//       dictation: dictationId,
//       dictationTitle: dictation.title || "Untitled",
//       dictationType: dictation.category || "General",
//       userTypeParagraph,
//       totalMistakes,
//       capitalMistakes,
//       spellingMistakes,
//       extraWords,
//       missingWords,
//     });

//     await newSubmission.save();

//     res.status(201).json({
//       message: "Submission saved successfully",
//       data: newSubmission,
//     });
//   } catch (error) {
//     console.error("Submission Error:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// exports.getCompletedDictationsByUser = async (req, res) => {
//     try {
//       const { userId } = req.params;
  
//       const submissions = await UserDictationSubmission.find({ user: userId }).select('dictation');
  
//       const completedDictationIds = submissions.map(sub => sub.dictation.toString());
  
//       res.status(200).json({
//         success: true,
//         userId,
//         completedDictations: completedDictationIds
//       });
//     } catch (error) {
//       console.error("Fetch Error:", error);
//       res.status(500).json({ message: "Failed to fetch completed dictations", error: error.message });
//     }
//   };

  
//   exports.deleteUserSubmission = async (req, res) => {
//     try {
//       const { userId, dictationId } = req.params;
  
//       const submission = await UserDictationSubmission.findOneAndDelete({
//         user: userId,
//         dictation: dictationId,
//       });
  
//       if (!submission) {
//         return res.status(404).json({ message: "Submission not found" });
//       }
  
//       res.status(200).json({ message: "Submission deleted. User can retake the dictation." });
//     } catch (error) {
//       console.error("Delete Error:", error);
//       res.status(500).json({ message: "Failed to delete submission", error: error.message });
//     }
//   };
  

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
      typingTimer     // ✅
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
      playbackSpeed,   // ✅
      typingTimer      // ✅
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

exports.getCompletedDictationsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const submissions = await UserDictationSubmission.find({ user: userId }).select('dictation');

    const completedDictationIds = submissions.map(sub => sub.dictation.toString());

    res.status(200).json({
      success: true,
      userId,
      completedDictations: completedDictationIds
    });
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ message: "Failed to fetch completed dictations", error: error.message });
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
