const TopicLog = require('../models/TopicLog');

// Unified progress dashboard data: overall, exam-wise, subject-wise, and topic details
exports.getProgressDashboard = async (req, res) => {
  try {
    const userId = (req.user && (req.user._id || req.user.id)) || req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: user not resolved from token' });
    }

    // Thresholds per requirements:
    // Weak: < 75, Medium: 75–84, Strong: >= 85
    const WEAK_THRESHOLD = 75;
    const STRONG_THRESHOLD = 85;
    const getStrength = (pct) => {
      const p = pct || 0;
      if (p < WEAK_THRESHOLD) return 'weak';
      if (p >= STRONG_THRESHOLD) return 'strong';
      return 'medium';
    };

    // Emoji categorization
    const CONSISTENT_EMOJIS = new Set(['😊','😁','🙂','😄','😃','👍','😌','😎']);
    const NEUTRAL_EMOJIS = new Set(['😐','😶','🤔','🫤']);
    const STRUGGLED_EMOJIS = new Set(['😟','😞','😣','😫','☹️','🙁','😭','😖','😔']);
    const getEmojiCategory = (emoji) => {
      const e = String(emoji || '').trim();
      if (CONSISTENT_EMOJIS.has(e)) return 'consistent';
      if (NEUTRAL_EMOJIS.has(e)) return 'neutral';
      if (STRUGGLED_EMOJIS.has(e)) return 'struggled';
      return 'neutral';
    };

    // Fetch all logs for user
    const logs = await TopicLog.find({ user_id: userId }).sort({ date_learned: -1 });

    // If no data
    if (!logs.length) {
      return res.status(200).json({
        user_id: userId,
        overall: {
          total_topics: 0,
          completed_topics: 0,
          average_percentage: 0,
          total_time_spent_min: 0,
          weak_topics: [],
          strong_topics: []
        },
        exams: []
      });
    }

    // Overall stats
    const totalTopics = logs.length;
    const completedTopics = logs.filter(l => (l.learning_percentage || 0) >= STRONG_THRESHOLD).length;
    const averagePercentage = Math.round(
      logs.reduce((acc, l) => acc + (l.learning_percentage || 0), 0) / totalTopics
    );
    const totalTimeSpent = logs.reduce((acc, l) => acc + (l.time_spent_min || 0), 0);

    const weakTopics = logs
      .filter(l => getStrength(l.learning_percentage) === 'weak')
      .map(l => ({
        id: l._id,
        exam_name: l.exam_name,
        subject_name: l.subject_name,
        topic_name: l.topic_name,
        learning_percentage: l.learning_percentage,
        time_spent_min: l.time_spent_min,
        emoji_category: getEmojiCategory(l.emoji_reaction)
      }));

    const mediumTopics = logs
      .filter(l => getStrength(l.learning_percentage) === 'medium')
      .map(l => ({
        id: l._id,
        exam_name: l.exam_name,
        subject_name: l.subject_name,
        topic_name: l.topic_name,
        learning_percentage: l.learning_percentage,
        time_spent_min: l.time_spent_min,
        emoji_category: getEmojiCategory(l.emoji_reaction)
      }));

    const strongTopics = logs
      .filter(l => getStrength(l.learning_percentage) === 'strong')
      .map(l => ({
        id: l._id,
        exam_name: l.exam_name,
        subject_name: l.subject_name,
        topic_name: l.topic_name,
        learning_percentage: l.learning_percentage,
        time_spent_min: l.time_spent_min,
        emoji_category: getEmojiCategory(l.emoji_reaction)
      }));

    // Overall emoji summary
    const emojiSummary = logs.reduce((acc, l) => {
      const cat = getEmojiCategory(l.emoji_reaction);
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, { consistent: 0, neutral: 0, struggled: 0 });

    // Group by exam
    const examNames = [...new Set(logs.map(l => l.exam_name))];
    const exams = [];

    for (const examName of examNames) {
      const examLogs = logs.filter(l => l.exam_name === examName);
      const examTotal = examLogs.length;
      const examAvg = Math.round(
        examLogs.reduce((acc, l) => acc + (l.learning_percentage || 0), 0) / (examTotal || 1)
      );
      const examCompleted = examLogs.filter(l => (l.learning_percentage || 0) >= STRONG_THRESHOLD).length;

      const subjectNames = [...new Set(examLogs.map(l => l.subject_name))];
      const subjects = [];

      let weakSubjectCount = 0;
      let mediumSubjectCount = 0;
      let strongSubjectCount = 0;

      for (const subjectName of subjectNames) {
        const subjectLogs = examLogs.filter(l => l.subject_name === subjectName);
        const subjTotal = subjectLogs.length;
        const subjCompleted = subjectLogs.filter(l => (l.learning_percentage || 0) >= STRONG_THRESHOLD).length;
        const subjAvg = Math.round(
          subjectLogs.reduce((acc, l) => acc + (l.learning_percentage || 0), 0) / (subjTotal || 1)
        );
        const subjTime = subjectLogs.reduce((acc, l) => acc + (l.time_spent_min || 0), 0);

        // Weak / strong classification for subject
        const subjectStrength = getStrength(subjAvg);
        if (subjectStrength === 'weak') weakSubjectCount += 1;
        if (subjectStrength === 'medium') mediumSubjectCount += 1;
        if (subjectStrength === 'strong') strongSubjectCount += 1;

        // Topic extremes and categorization
        const sortedByPct = [...subjectLogs].sort((a, b) => (a.learning_percentage || 0) - (b.learning_percentage || 0));
        const lowest = sortedByPct[0];
        const highest = sortedByPct[sortedByPct.length - 1];

        const weakTopicsSubj = subjectLogs
          .filter(l => getStrength(l.learning_percentage) === 'weak')
          .map(l => ({ id: l._id, topic_name: l.topic_name, learning_percentage: l.learning_percentage }));
        const mediumTopicsSubj = subjectLogs
          .filter(l => getStrength(l.learning_percentage) === 'medium')
          .map(l => ({ id: l._id, topic_name: l.topic_name, learning_percentage: l.learning_percentage }));
        const strongTopicsSubj = subjectLogs
          .filter(l => getStrength(l.learning_percentage) === 'strong')
          .map(l => ({ id: l._id, topic_name: l.topic_name, learning_percentage: l.learning_percentage }));

        // Emoji distribution at subject level
        const emojiDistribution = subjectLogs.reduce((acc, l) => {
          const cat = getEmojiCategory(l.emoji_reaction);
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, { consistent: 0, neutral: 0, struggled: 0 });

        const topics = subjectLogs.map(l => ({
          id: l._id,
          topic_name: l.topic_name,
          learning_percentage: l.learning_percentage,
          time_spent_min: l.time_spent_min,
          emoji_reaction: l.emoji_reaction,
          learning_source: l.learning_source,
          importance_level: l.importance_level,
          pyq_practice_status: l.pyq_practice_status,
          date_learned: l.date_learned,
          notes: l.notes
        }));

        subjects.push({
          subject_name: subjectName,
          stats: {
            total_topics: subjTotal,
            completed_topics: subjCompleted,
            average_percentage: subjAvg,
            total_time_spent_min: subjTime,
            strength: subjectStrength
          },
          extremes: {
            lowest_percentage_topic: lowest ? { id: lowest._id, topic_name: lowest.topic_name, percentage: lowest.learning_percentage } : null,
            highest_percentage_topic: highest ? { id: highest._id, topic_name: highest.topic_name, percentage: highest.learning_percentage } : null
          },
          categories: {
            weak_topics: weakTopicsSubj,
            medium_topics: mediumTopicsSubj,
            strong_topics: strongTopicsSubj
          },
          emoji_distribution: emojiDistribution,
          topics
        });
      }

      // Exam-level weak/strong subjects summary
      const examStrength = getStrength(examAvg);

      exams.push({
        exam_name: examName,
        stats: {
          total_topics: examTotal,
          completed_topics: examCompleted,
          average_percentage: examAvg,
          strength: examStrength,
          weak_subject_count: weakSubjectCount,
          medium_subject_count: mediumSubjectCount,
          strong_subject_count: strongSubjectCount
        },
        subject_count: subjects.length,
        subjects
      });
    }

    return res.status(200).json({
      user_id: userId,
      overall: {
        total_topics: totalTopics,
        completed_topics: completedTopics,
        average_percentage: averagePercentage,
        total_time_spent_min: totalTimeSpent,
        weak_topics: weakTopics,
        medium_topics: mediumTopics,
        strong_topics: strongTopics
      },
      emoji_summary: emojiSummary,
      exams
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error computing progress dashboard', error: error.message });
  }
};

// Get all exam data with logs for a user
exports.getAllExamDataWithLogs = async (req, res) => {
  try {
    const userId = (req.user && (req.user._id || req.user.id)) || req.headers['x-user-id'];
    
    // Get all logs for the user
    const allLogs = await TopicLog.find({ user_id: userId }).sort({ date_learned: -1 });
    
    // Get unique exam names
    const examNames = [...new Set(allLogs.map(log => log.exam_name))];
    
    const examData = [];
    
    // For each exam, organize data
    for (const examName of examNames) {
      const examLogs = allLogs.filter(log => log.exam_name === examName);
      
      // Get unique subjects for this exam
      const subjectNames = [...new Set(examLogs.map(log => log.subject_name))];
      
      const subjects = [];
      
      // For each subject, organize data
      for (const subjectName of subjectNames) {
        const subjectLogs = examLogs.filter(log => log.subject_name === subjectName);
        
        // Count total topics and completed topics
        const totalTopics = subjectLogs.length;
        const completedTopics = subjectLogs.filter(log => log.learning_percentage > 60).length;
        const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
        
        // Format topic logs
        const topicLogs = subjectLogs.map(log => ({
          id: log._id,
          topic_name: log.topic_name,
          learning_percentage: log.learning_percentage,
          time_spent_min: log.time_spent_min,
          emoji_reaction: log.emoji_reaction,
          learning_source: log.learning_source,
          importance_level: log.importance_level,
          pyq_practice_status: log.pyq_practice_status,
          date_learned: log.date_learned,
          notes: log.notes
        }));
        
        subjects.push({
          subject_name: subjectName,
          total_topics: totalTopics,
          completed_topics: completedTopics,
          progress_percentage: progress,
          topics: topicLogs
        });
      }
      
      examData.push({
        exam_name: examName,
        subject_count: subjects.length,
        subjects: subjects
      });
    }
    
    return res.status(200).json({
      user_id: userId,
      exam_count: examData.length,
      exams: examData
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching exam data with logs",
      error: error.message
    });
  }
};

// Get all exams for a user
exports.getAllExams = async (req, res) => {
  try {
    const userId = (req.user && (req.user._id || req.user.id)) || req.headers['x-user-id'];
    
    // Find all unique exam names for this user
    const exams = await TopicLog.distinct('exam_name', { user_id: userId });
    
    return res.status(200).json({
      count: exams.length,
      exams: exams
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching exams",
      error: error.message
    });
  }
};

// Get exam-wise data for a user
exports.getExamWiseData = async (req, res) => {
  try {
    const userId = (req.user && (req.user._id || req.user.id)) || req.headers['x-user-id'];
    const { exam_name } = req.params;
    
    if (!exam_name) {
      return res.status(400).json({ message: "Exam name is required" });
    }
    
    // Find all subjects for this exam
    const subjects = await TopicLog.distinct('subject_name', { 
      user_id: userId,
      exam_name: exam_name
    });
    
    // Get topic count and progress for each subject
    const subjectsData = [];
    
    for (const subject of subjects) {
      const topics = await TopicLog.find({
        user_id: userId,
        exam_name: exam_name,
        subject_name: subject
      });
      
      const totalTopics = topics.length;
      const completedTopics = topics.filter(topic => topic.learning_percentage > 60).length;
      const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
      
      subjectsData.push({
        subject_name: subject,
        total_topics: totalTopics,
        completed_topics: completedTopics,
        progress_percentage: progress
      });
    }
    
    return res.status(200).json({
      exam_name: exam_name,
      subject_count: subjects.length,
      subjects: subjectsData
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching exam data",
      error: error.message
    });
  }
};

// Get subject-wise data for a user
exports.getSubjectWiseData = async (req, res) => {
  try {
    const userId = req.user._id;
    const { exam_name, subject_name } = req.params;
    
    if (!exam_name || !subject_name) {
      return res.status(400).json({ message: "Exam name and subject name are required" });
    }
    
    // Find all topics for this subject in this exam
    const topics = await TopicLog.find({
      user_id: userId,
      exam_name: exam_name,
      subject_name: subject_name
    }).sort({ date_learned: -1 });
    
    // Calculate subject statistics
    const totalTopics = topics.length;
    const completedTopics = topics.filter(topic => topic.learning_percentage > 60).length;
    const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    const totalTimeSpent = topics.reduce((sum, topic) => sum + topic.time_spent_min, 0);
    
    // Format topic data
    const topicsData = topics.map(topic => ({
      id: topic._id,
      topic_name: topic.topic_name,
      learning_percentage: topic.learning_percentage,
      time_spent_min: topic.time_spent_min,
      emoji_reaction: topic.emoji_reaction,
      learning_source: topic.learning_source,
      importance_level: topic.importance_level,
      pyq_practice_status: topic.pyq_practice_status,
      date_learned: topic.date_learned,
      notes: topic.notes
    }));
    
    return res.status(200).json({
      exam_name: exam_name,
      subject_name: subject_name,
      statistics: {
        total_topics: totalTopics,
        completed_topics: completedTopics,
        progress_percentage: progress,
        total_time_spent_min: totalTimeSpent
      },
      topics: topicsData
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching subject data",
      error: error.message
    });
  }
};

// Create a new topic log
exports.createTopicLog = async (req, res) => {
  try {
    const {
      exam_name,
      subject_name,
      topic_name,
      learning_percentage,
      time_spent_min,
      emoji_reaction,
      learning_source,
      notes,
      importance_level,
      pyq_practice_status,
      date_learned
    } = req.body;

    // Create new topic log
    const topicLog = new TopicLog({
      // user_id: req.user._id,
      user_id: req.user.id || req.user._id,
      exam_name,
      subject_name,
      topic_name,
      learning_percentage,
      time_spent_min,
      emoji_reaction,
      learning_source,
      notes,
      importance_level,
      pyq_practice_status,
      date_learned: date_learned || new Date()
    });

    await topicLog.save();

    return res.status(201).json({
      message: "Topic log saved successfully",
      // data: {
      //   log_id: topicLog._id,
      //   exam_name: topicLog.exam_name,
      //   subject_name: topicLog.subject_name,
      //   topic_name: topicLog.topic_name,
      //   learning_percentage: topicLog.learning_percentage
      // }
        data: {
    log_id: topicLog._id,
    exam_name: topicLog.exam_name,
    subject_name: topicLog.subject_name,
    topic_name: topicLog.topic_name,
    learning_percentage: topicLog.learning_percentage,
    time_spent_min: topicLog.time_spent_min,
    emoji_reaction: topicLog.emoji_reaction,
    learning_source: topicLog.learning_source,
    notes: topicLog.notes,
    importance_level: topicLog.importance_level,
    pyq_practice_status: topicLog.pyq_practice_status,
    date_learned: topicLog.date_learned
  }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error creating topic log",
      error: error.message
    });
  }
};

// Get all topic logs for a user with optional filters
exports.getTopicLogs = async (req, res) => {
  try {
    // Get parameters from query, params, or headers
    const exam_name = req.query.exam_name || req.params.exam_name || req.headers.exam_name;
    const subject_name = req.query.subject_name || req.params.subject_name || req.headers.subject_name;
    
    // Build filter object - only filter by user if authenticated
    const filter = {};
    
    // Check if user is authenticated
    if (req.user && req.user._id) {
      filter.user_id = req.user._id;
      console.log("Filtering logs with user:", req.user._id);
    } else {
      console.log("Warning: User not authenticated, returning all matching logs");
    }
    
    if (exam_name) filter.exam_name = exam_name;
    if (subject_name) filter.subject_name = subject_name;
    
    console.log("Final filter:", filter);
    
    const topicLogs = await TopicLog.find(filter).sort({ date_learned: -1 });
    
    // Format response
    const formattedLogs = topicLogs.map(log => ({
      id: log._id,
      topic_name: log.topic_name,
      learning_percentage: log.learning_percentage,
      emoji_reaction: log.emoji_reaction,
      time_spent_min: log.time_spent_min,
      importance_level: log.importance_level,
      pyq_practice_status: log.pyq_practice_status,
      date_learned: log.date_learned,
      exam_name: log.exam_name,
      subject_name: log.subject_name,
      learning_source: log.learning_source,
      notes: log.notes
    }));
    
    return res.status(200).json(formattedLogs);
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching topic logs",
      error: error.message
    });
  }
};

// Get progress summary for exams and subjects
exports.getProgressSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get all logs for the user
    const allLogs = await TopicLog.find({ user_id: userId });
    
    // Get unique exam names
    const examNames = [...new Set(allLogs.map(log => log.exam_name))];
    
    const examSummaries = [];
    
    // For each exam, calculate progress
    for (const examName of examNames) {
      const examLogs = allLogs.filter(log => log.exam_name === examName);
      
      // Get unique subjects for this exam
      const subjectNames = [...new Set(examLogs.map(log => log.subject_name))];
      
      const subjects = [];
      let totalTopics = 0;
      let totalCompleted = 0;
      
      // For each subject, calculate progress
      for (const subjectName of subjectNames) {
        const subjectLogs = examLogs.filter(log => log.subject_name === subjectName);
        
        // Count total topics and completed topics (learning_percentage > 60)
        const subjectTotalTopics = subjectLogs.length;
        const subjectCompletedTopics = subjectLogs.filter(log => log.learning_percentage > 60).length;
        
        subjects.push({
          subject_name: subjectName,
          total_topics: subjectTotalTopics,
          completed_topics: subjectCompletedTopics,
          progress_percent: subjectTotalTopics > 0 ? Math.round((subjectCompletedTopics / subjectTotalTopics) * 100) : 0
        });
        
        totalTopics += subjectTotalTopics;
        totalCompleted += subjectCompletedTopics;
      }
      
      examSummaries.push({
        exam_name: examName,
        subjects,
        overall_progress: totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0
      });
    }
    
    return res.status(200).json(examSummaries);
  } catch (error) {
    return res.status(500).json({
      message: "Error generating progress summary",
      error: error.message
    });
  }
};

// Update an existing topic log
exports.updateTopicLog = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the topic log and verify ownership
    const topicLog = await TopicLog.findById(id);
    
    if (!topicLog) {
      return res.status(404).json({ message: "Topic log not found" });
    }
    
    // Verify that the log belongs to the user
    if (topicLog.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this topic log" });
    }
    
    // Update only the fields that are provided
    const updateFields = {};
    const allowedFields = [
      'learning_percentage', 'time_spent_min', 'emoji_reaction',
      'learning_source', 'notes', 'importance_level', 'pyq_practice_status',
      'date_learned'
    ];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });
    
    // Update the topic log
    const updatedLog = await TopicLog.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );
    
    return res.status(200).json({
      message: "Topic log updated successfully",
      data: {
        log_id: updatedLog._id,
        topic_name: updatedLog.topic_name,
        learning_percentage: updatedLog.learning_percentage
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating topic log",
      error: error.message
    });
  }
};

// Delete a topic log
exports.deleteTopicLog = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the topic log and verify ownership
    const topicLog = await TopicLog.findById(id);
    
    if (!topicLog) {
      return res.status(404).json({ message: "Topic log not found" });
    }
    
    // Verify that the log belongs to the user
    if (topicLog.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this topic log" });
    }
    
    // Delete the topic log
    await TopicLog.findByIdAndDelete(id);
    
    return res.status(200).json({
      message: "Topic log deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting topic log",
      error: error.message
    });
  }
};

// Get goal recap - summary of recent learning activity
exports.getGoalRecap = async (req, res) => {
  try {
    const userId = req.user._id;
    const { days = 7 } = req.query; // Default to last 7 days
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Get logs within date range
    const recentLogs = await TopicLog.find({
      user_id: userId,
      date_learned: { $gte: startDate, $lte: endDate }
    }).sort({ date_learned: -1 });
    
    // Calculate statistics
    const totalTimeSpent = recentLogs.reduce((sum, log) => sum + log.time_spent_min, 0);
    const avgLearningPercentage = recentLogs.length > 0 
      ? Math.round(recentLogs.reduce((sum, log) => sum + log.learning_percentage, 0) / recentLogs.length) 
      : 0;
    
    // Count topics by importance level
    const importanceCounts = {
      normal: recentLogs.filter(log => log.importance_level === 'normal').length,
      medium: recentLogs.filter(log => log.importance_level === 'medium').length,
      very_important: recentLogs.filter(log => log.importance_level === 'very_important').length
    };
    
    // Count PYQ practice status
    const pyqCounts = {
      done: recentLogs.filter(log => log.pyq_practice_status === 'done').length,
      not_yet: recentLogs.filter(log => log.pyq_practice_status === 'not_yet').length
    };
    
    // Group by exam and subject
    const examSubjectCounts = {};
    recentLogs.forEach(log => {
      const key = `${log.exam_name}|${log.subject_name}`;
      if (!examSubjectCounts[key]) {
        examSubjectCounts[key] = {
          exam_name: log.exam_name,
          subject_name: log.subject_name,
          count: 0
        };
      }
      examSubjectCounts[key].count++;
    });
    
    return res.status(200).json({
      period: {
        start_date: startDate,
        end_date: endDate,
        days: parseInt(days)
      },
      stats: {
        total_topics_studied: recentLogs.length,
        total_time_spent_min: totalTimeSpent,
        avg_learning_percentage: avgLearningPercentage,
        importance_level_counts: importanceCounts,
        pyq_practice_counts: pyqCounts
      },
      exam_subject_breakdown: Object.values(examSubjectCounts),
      recent_logs: recentLogs.slice(0, 5).map(log => ({
        id: log._id,
        topic_name: log.topic_name,
        exam_name: log.exam_name,
        subject_name: log.subject_name,
        learning_percentage: log.learning_percentage,
        date_learned: log.date_learned
      }))
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error generating goal recap",
      error: error.message
    });
  }
};