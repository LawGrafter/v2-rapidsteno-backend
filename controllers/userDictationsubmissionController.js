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
      accuracy        
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
exports.updateUserSubmission = async (req, res) => {
  try {
    const { userId, dictationId } = req.params;
    const updateData = req.body;

    const updatedSubmission = await UserDictationSubmission.findOneAndUpdate(
      { user: userId, dictation: dictationId },
      { $set: updateData },
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
