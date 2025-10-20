const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET;
const User = require('../models/userModel');
const admin = require('../models/adminModel');
const { sendAdminOtp } = require('../utils/sendAdminOtp');
const { computeNextCycle, validatePlanAndMonths, computeCycleWithMonths, validatePlanAndDays, computeCycleWithDays } = require('../utils/subscriptionUtils');

const otpStore = {}; // In-memory OTP store

// Step 1: Email & password check, then send OTP
exports.adminLoginRequestOtp = async (req, res) => {
  const { email, password } = req.body;

  if (email === admin.adminEmail && password === admin.adminPassword) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    otpStore[email] = { otp, expiresAt };

    try {
      await sendAdminOtp(email, otp);
      return res.status(200).json({ message: 'OTP sent to your email' });
    } catch (err) {
      console.error('❌ Error sending admin OTP:', err);
      return res.status(500).json({ message: 'Failed to send OTP' });
    }
  }

  return res.status(401).json({ message: 'Invalid credentials' });
};

// Step 2: Verify OTP and issue JWT
exports.adminVerifyOtp = (req, res) => {
  const { email, otp } = req.body;
  const stored = otpStore[email];

  if (!stored) return res.status(400).json({ message: 'No OTP requested' });
  if (stored.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });
  if (stored.otp !== otp) return res.status(401).json({ message: 'Invalid OTP' });

  // OTP valid, clear from memory
  delete otpStore[email];

  const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '7h' });

  return res.status(200).json({
    message: 'Login successful',
    token,
    admin: { email }
  });
};


// exports.adminLogin = (req, res) => {
//   const { email, password } = req.body;

//   // Ensure email and password match the hardcoded admin credentials
//   if (email === admin.adminEmail && password === admin.adminPassword) {
//     // Sign the token with email (NOT id) so your middleware can validate admin identity
//     const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '1h' });

//     return res.status(200).json({
//       message: 'Login successful',
//       token,
//       admin: {
//         email: admin.adminEmail,
//       }
//     });
//   }

//   return res.status(401).json({ message: 'Invalid credentials' });
// };

exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;

  // Validate admin credentials
  if (email === admin.adminEmail && password === admin.adminPassword) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    otpStore[email] = { otp, expiresAt };

    try {
      await sendAdminOtp(email, otp);
      return res.status(200).json({
        message: 'OTP sent to your email. Please verify to complete login.',
      });
    } catch (err) {
      console.error('❌ Error sending admin OTP:', err);
      return res.status(500).json({ message: 'Failed to send OTP' });
    }
  }

  return res.status(401).json({ message: 'Invalid credentials' });
};


exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error });
  }
};

// PUT /api/admin/users/:id/crm
// Updates only CRM/Admin fields safely
exports.updateUserCrmFields = async (req, res) => {
  try {
    const userId = req.params.id;

    // Whitelisted CRM fields
    const allowed = ['DNC', 'Comment', 'SubscriptionPlanType', 'AmountPaid', 'LeadType'];
    const updates = {};

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = key === 'AmountPaid' && req.body[key] !== undefined
          ? Number(req.body[key])
          : req.body[key];
      }
    }

    const user = await User.findByIdAndUpdate(userId, updates, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.status(200).json({ message: 'CRM fields updated successfully', user });
  } catch (error) {
    console.error('Admin CRM update error:', error);
    return res.status(500).json({ message: 'Failed to update CRM fields', error });
  }
};

// ✅ Delete User by ID — Admin Only
exports.deleteUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.deleteOne();
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error("Admin Delete Error:", error);
    res.status(500).json({ message: 'Failed to delete user', error });
  }
};


// ✅ Admin marks user as paid (for 30 days)
// exports.markUserAsPaid = async (req, res) => {
//   try {
//     const { userId } = req.body;

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     user.subscriptionType = 'Paid';
//     user.paidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
//     await user.save();

//     res.status(200).json({ message: 'User subscription updated to Paid for 30 days.' });
//   } catch (error) {
//     console.error('Admin update error:', error);
//     res.status(500).json({ message: 'Failed to update subscription', error });
//   }
// };
// ✅ Admin marks user as Paid (⏱ 5-minute access)
exports.markUserAsPaid = async (req, res) => {
  try {
    const { userId, planType } = req.body; // optional planType override: 'Gold' | 'Silver'
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Compute next cycle using user's SubscriptionPlanType or override
    const { startDate, endDate, days } = computeNextCycle(user, planType);

    user.subscriptionType = 'Paid';
    user.paidUntil = endDate;

    // ⏳ Log history for future reference
    user.subscriptionHistory.push({
      type: 'Paid',
      startDate: startDate,
      endDate: endDate,
    });

    await user.save();

    res.status(200).json({
      message: `User marked as Paid for ${days} days. Access valid until ${endDate.toISOString()}`,
    });

  } catch (error) {
    console.error('Admin update error:', error);
    res.status(500).json({ message: 'Failed to update subscription', error });
  }
};

// GET /api/admin/online-users
exports.getOnlineUsers = async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 1 * 60 * 1000);

    const onlineUsers = await User.find({
      lastActiveDate: { $gte: fiveMinutesAgo },
      isActive: true,
    }).select('firstName lastName email lastActiveDate subscriptionType');

    res.status(200).json({
      count: onlineUsers.length,
      users: onlineUsers
    });
  } catch (error) {
    console.error("Error fetching online users:", error);
    res.status(500).json({ message: 'Server Error', error });
  }
};

// PUT /api/admin/edit-user/:id
exports.editUserByAdmin = async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;

    const user = await User.findByIdAndUpdate(userId, updates, { new: true });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Admin edit error:", error);
    res.status(500).json({ message: "Failed to update user", error });
  }
};

// ✅ Admin: Set user subscription plan and duration
exports.adminSetUserSubscription = async (req, res) => {
  try {
    const userId = req.params.id;
    const { planType, months, startDate, days } = req.body;

    let validation;
    let durationDays;

    if (days !== undefined) {
      validation = validatePlanAndDays(planType, days);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.reason });
      }
      durationDays = validation.days;
    } else {
      validation = validatePlanAndMonths(planType, months);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.reason });
      }
      durationDays = validation.days;
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const cycle = days !== undefined
      ? computeCycleWithDays(startDate, durationDays)
      : computeCycleWithMonths(startDate, months);

    user.subscriptionType = 'Paid';
    user.SubscriptionPlanType = validation.plan; // store normalized
    user.paidUntil = cycle.endDate;

    user.subscriptionHistory.push({
      type: 'Paid',
      startDate: cycle.startDate,
      endDate: cycle.endDate,
    });

    await user.save();

    return res.status(200).json({
      message: 'Subscription updated successfully',
      user: {
        id: user._id,
        email: user.email,
        subscriptionType: user.subscriptionType,
        planType: user.SubscriptionPlanType,
        paidUntil: user.paidUntil,
      }
    });
  } catch (error) {
    console.error('Admin set subscription error:', error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// ✅ Admin: Update user subscription start/end dates (flexible)
exports.adminUpdateUserSubscriptionDates = async (req, res) => {
  try {
    const userId = req.params.id;
    const { startDate, endDate, months, days } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let start = startDate ? new Date(startDate) : null;
    let end = endDate ? new Date(endDate) : null;

    if (!end) {
      if (days !== undefined) {
        const cycle = computeCycleWithDays(start || new Date(), Number(days));
        start = cycle.startDate;
        end = cycle.endDate;
      } else {
        const monthsNum = months ? Number(months) : 1;
        const cycle = computeCycleWithMonths(start || new Date(), monthsNum);
        start = cycle.startDate;
        end = cycle.endDate;
      }
    }

    if (start) {
      user.subscriptionHistory.push({ type: 'Paid', startDate: start, endDate: end });
    }
    user.subscriptionType = 'Paid';
    user.paidUntil = end;

    await user.save();

    return res.status(200).json({
      message: 'Subscription dates updated successfully',
      user: {
        id: user._id,
        email: user.email,
        paidUntil: user.paidUntil,
        lastHistory: user.subscriptionHistory[user.subscriptionHistory.length - 1]
      }
    });
  } catch (error) {
    console.error('Admin update subscription dates error:', error);
    return res.status(500).json({ message: 'Server Error', error });
  }
};

// Weekly User Report for Admin (by userId)
exports.adminWeeklyUserReport = async (req, res) => {
  try {
    const userId = req.params.id;
    const { start, end } = req.query;

    let startDate;
    if (start) {
      startDate = new Date(start);
    } else {
      const today = new Date();
      const day = today.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      startDate = new Date(today);
      startDate.setDate(today.getDate() + diffToMonday);
      startDate.setHours(0,0,0,0);
    }
    if (isNaN(startDate)) return res.status(400).json({ message: 'Invalid start date' });

    let endDate = end ? new Date(end) : new Date(startDate);
    if (!end) { endDate.setDate(startDate.getDate() + 6); }
    endDate.setHours(23,59,59,999);

    const toYmd = (d) => {
      const dd = new Date(d);
      const y = dd.getFullYear();
      const m = String(dd.getMonth()+1).padStart(2,'0');
      const day = String(dd.getDate()).padStart(2,'0');
      return `${y}-${m}-${day}`;
    };

    const days = [];
    const daysCount = Math.max(1, Math.floor((endDate - startDate) / (24*60*60*1000)) + 1);
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push({
        date: toYmd(d),
        attendance: { status: 'Absent', punctual: false, totalActiveTimeSeconds: 0, totalPagesViewed: 0, pages: [] },
        typing: { attempts: 0, avgWpm: 0, avgAccuracy: 0, totalErrors: 0 },
        dictation: { attempts: 0, avgAccuracy: 0, totalMistakes: 0, breakdown: { capital: 0, spelling: 0, punctuation: 0, missing: 0, extra: 0 } },
        formatting: { attempts: 0, avgMarksAwarded: 0, totalMistakes: 0, breakdown: { word: 0, formatting: 0, punctuation: 0 } },
        pitman: { attempts: 0, avgAccuracy: 0, totalMistakes: 0, breakdown: { capital: 0, spelling: 0, punctuation: 0, spacing: 0, missing: 0, extra: 0 } },
        selfPractice: { attempts: 0, avgAccuracy: 0, totalMistakes: 0, breakdown: { capital: 0, spelling: 0, punctuation: 0, spacing: 0, missing: 0, extra: 0 } },
        mcq: { attempts: 0, avgScore: 0, avgAccuracyPercent: 0 },
      });
    }

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    const activityLogs = Array.isArray(user?.activityLogs) ? user.activityLogs : [];

    for (const log of activityLogs) {
      const idx = days.findIndex(d => d.date === log.date);
      if (idx !== -1) {
        const attendance = days[idx].attendance;
        attendance.status = 'Present';
        attendance.totalActiveTimeSeconds = (attendance.totalActiveTimeSeconds || 0) + (log.totalActiveTime || 0);
        attendance.totalPagesViewed = (attendance.totalPagesViewed || 0) + (log.totalPagesViewed || 0);
        const pagesMap = new Map(attendance.pages.map(p => [p.page, p]));
        for (const p of (log.pages || [])) {
          if (pagesMap.has(p.page)) {
            const x = pagesMap.get(p.page);
            x.timeSpent += (p.timeSpent || 0);
            x.viewCount += (p.viewCount || 1);
          } else {
            pagesMap.set(p.page, { page: p.page, timeSpent: p.timeSpent || 0, viewCount: p.viewCount || 1 });
          }
        }
        attendance.pages = Array.from(pagesMap.values());
      }
    }
    for (const d of days) {
      d.attendance.punctual = d.attendance.status === 'Present' && (d.attendance.totalActiveTimeSeconds >= 15*60);
    }

    const range = { $gte: startDate, $lte: endDate };

    const [selfPractice, formattingTests, pitmanSubs, typingRecords, dictationSubs, mcqSubs] = await Promise.all([
      SelfPracticeSubmission.find({ user: userId, submittedAt: range }).lean(),
      FormattingTestResult.find({ user: userId, createdAt: range }).lean(),
      PitmanExerciseSubmission.find({ user: userId, submittedAt: range }).lean(),
      TypingRecord.find({ user: userId, createdAt: range }).lean(),
      UserDictationSubmission.find({ user: userId, submittedAt: range }).lean(),
      McqSubmission.find({ userId: userId, submittedAt: range }).lean(),
    ]);

    const dateKey = (dt) => toYmd(dt);

    for (const rec of typingRecords) {
      const k = dateKey(rec.createdAt);
      const d = days.find(x=>x.date===k);
      if (!d) continue;
      d.typing.attempts += 1;
      d.typing.avgWpm += rec.wpm || 0;
      d.typing.avgAccuracy += rec.accuracy || 0;
      d.typing.totalErrors += rec.errors || 0;
    }
    for (const d of days) {
      if (d.typing.attempts>0) { d.typing.avgWpm = +(d.typing.avgWpm / d.typing.attempts).toFixed(2); d.typing.avgAccuracy = +(d.typing.avgAccuracy / d.typing.attempts).toFixed(2); }
    }

    for (const sub of dictationSubs) {
      const k = dateKey(sub.submittedAt);
      const d = days.find(x=>x.date===k);
      if (!d) continue;
      d.dictation.attempts += 1;
      d.dictation.avgAccuracy += sub.accuracy || 0;
      d.dictation.totalMistakes += sub.totalMistakes || 0;
      d.dictation.breakdown.capital += sub.capitalMistakes || 0;
      d.dictation.breakdown.spelling += sub.spellingMistakes || 0;
      d.dictation.breakdown.punctuation += sub.punctuationMistakes ? (Array.isArray(sub.punctuationMistakes) ? sub.punctuationMistakes.length : sub.punctuationMistakes) : 0;
      d.dictation.breakdown.missing += sub.missingWords || 0;
      d.dictation.breakdown.extra += sub.extraWords || 0;
    }
    for (const d of days) {
      if (d.dictation.attempts>0) d.dictation.avgAccuracy = +(d.dictation.avgAccuracy / d.dictation.attempts).toFixed(2);
    }

    for (const sub of formattingTests) {
      const k = dateKey(sub.createdAt);
      const d = days.find(x=>x.date===k);
      if (!d) continue;
      d.formatting.attempts += 1;
      d.formatting.avgMarksAwarded += sub.marksAwarded || 0;
      d.formatting.totalMistakes += sub.totalMistakes || 0;
      d.formatting.breakdown.word += sub.wordMistakesCount || 0;
      d.formatting.breakdown.formatting += sub.formattingMistakesCount || 0;
      d.formatting.breakdown.punctuation += sub.punctuationMistakesCount || 0;
    }
    for (const d of days) {
      if (d.formatting.attempts>0) d.formatting.avgMarksAwarded = +(d.formatting.avgMarksAwarded / d.formatting.attempts).toFixed(2);
    }

    for (const sub of pitmanSubs) {
      const k = dateKey(sub.submittedAt);
      const d = days.find(x=>x.date===k);
      if (!d) continue;
      d.pitman.attempts += 1;
      d.pitman.avgAccuracy += sub.accuracy || 0;
      d.pitman.totalMistakes += sub.totalMistakes || 0;
      d.pitman.breakdown.capital += sub.capitalMistakes || 0;
      d.pitman.breakdown.spelling += sub.spellingMistakes || 0;
      d.pitman.breakdown.punctuation += sub.punctuationMistakes || 0;
      d.pitman.breakdown.spacing += sub.spacingMistakes || 0;
      d.pitman.breakdown.missing += sub.missingWords || 0;
      d.pitman.breakdown.extra += sub.extraWords || 0;
    }
    for (const d of days) {
      if (d.pitman.attempts>0) d.pitman.avgAccuracy = +(d.pitman.avgAccuracy / d.pitman.attempts).toFixed(2);
    }

    for (const sub of selfPractice) {
      const k = dateKey(sub.submittedAt);
      const d = days.find(x=>x.date===k);
      if (!d) continue;
      d.selfPractice.attempts += 1;
      d.selfPractice.avgAccuracy += sub.accuracy || 0;
      d.selfPractice.totalMistakes += sub.totalMistakes || 0;
      d.selfPractice.breakdown.capital += sub.capitalMistakes || 0;
      d.selfPractice.breakdown.spelling += sub.spellingMistakes || 0;
      d.selfPractice.breakdown.punctuation += sub.punctuationMistakes || 0;
      d.selfPractice.breakdown.spacing += sub.spacingMistakes || 0;
      d.selfPractice.breakdown.missing += sub.missingWords || 0;
      d.selfPractice.breakdown.extra += sub.extraWords || 0;
    }
    for (const d of days) {
      if (d.selfPractice.attempts>0) d.selfPractice.avgAccuracy = +(d.selfPractice.avgAccuracy / d.selfPractice.attempts).toFixed(2);
    }

    for (const sub of mcqSubs) {
      const k = dateKey(sub.submittedAt);
      const d = days.find(x=>x.date===k);
      if (!d) continue;
      d.mcq.attempts += 1;
      d.mcq.avgScore += sub.score || 0;
      d.mcq.avgAccuracyPercent += sub.total ? ((sub.score / sub.total) * 100) : 0;
    }
    for (const d of days) {
      if (d.mcq.attempts>0) {
        d.mcq.avgScore = +(d.mcq.avgScore / d.mcq.attempts).toFixed(2);
        d.mcq.avgAccuracyPercent = +(d.mcq.avgAccuracyPercent / d.mcq.attempts).toFixed(2);
      }
    }

    const weekly = {
      range: { start: toYmd(startDate), end: toYmd(endDate) },
      attendance: {
        daysPresent: days.filter(d=>d.attendance.status==='Present').length,
        daysAbsent: days.filter(d=>d.attendance.status==='Absent').length,
        punctualDays: days.filter(d=>d.attendance.punctual).length,
        totalActiveTimeSeconds: days.reduce((acc,d)=>acc + (d.attendance.totalActiveTimeSeconds||0), 0),
      },
      totals: {
        typingAttempts: typingRecords.length,
        dictationAttempts: dictationSubs.length,
        formattingAttempts: formattingTests.length,
        pitmanAttempts: pitmanSubs.length,
        selfPracticeAttempts: selfPractice.length,
        mcqAttempts: mcqSubs.length,
      }
    };

    const pickMetricSeries = (daysArr, path) => {
      const vals = daysArr.map(d => {
        const v = path.split('.').reduce((o,k)=>o && o[k], d);
        return (Number.isFinite(v) ? v : null);
      });
      return vals;
    };

    const typingWpmSeries = pickMetricSeries(days, 'typing.avgWpm');
    const typingAccSeries = pickMetricSeries(days, 'typing.avgAccuracy');
    const dictAccSeries = pickMetricSeries(days, 'dictation.avgAccuracy');
    const pitmanAccSeries = pickMetricSeries(days, 'pitman.avgAccuracy');
    const selfAccSeries = pickMetricSeries(days, 'selfPractice.avgAccuracy');
    const fmtMarksSeries = pickMetricSeries(days, 'formatting.avgMarksAwarded');

    const growthFromSeries = (series) => {
      const first = series.find(v=>v!==null && v>0);
      const last = [...series].reverse().find(v=>v!==null && v>0);
      if (!first || !last) return { changePercent: 0, direction: 'flat' };
      const change = last - first;
      const perc = first>0 ? (change/first)*100 : 0;
      return { changePercent: +perc.toFixed(2), direction: change>0?'up':change<0?'down':'flat' };
    };

    const growth = {
      typingWpm: growthFromSeries(typingWpmSeries),
      typingAccuracy: growthFromSeries(typingAccSeries),
      dictationAccuracy: growthFromSeries(dictAccSeries),
      pitmanAccuracy: growthFromSeries(pitmanAccSeries),
      selfPracticeAccuracy: growthFromSeries(selfAccSeries),
      formattingMarks: growthFromSeries(fmtMarksSeries),
    };

    const overallGrowthRate = (
      (growth.typingWpm.changePercent || 0) +
      (growth.typingAccuracy.changePercent || 0) +
      (growth.dictationAccuracy.changePercent || 0) +
      (growth.pitmanAccuracy.changePercent || 0) +
      (growth.selfPracticeAccuracy.changePercent || 0) +
      (growth.formattingMarks.changePercent || 0)
    ) / 6;

    weekly.overallGrowthRatePercent = +overallGrowthRate.toFixed(2);

    const mistakeTotals = {
      capital: 0, spelling: 0, punctuation: 0, spacing: 0, missing: 0, extra: 0
    };
    const addMistakes = (b) => {
      mistakeTotals.capital += b.capital || 0;
      mistakeTotals.spelling += b.spelling || 0;
      mistakeTotals.punctuation += b.punctuation || 0;
      mistakeTotals.spacing += b.spacing || 0;
      mistakeTotals.missing += b.missing || 0;
      mistakeTotals.extra += b.extra || 0;
    };
    for (const d of days) {
      addMistakes(d.dictation.breakdown);
      addMistakes(d.pitman.breakdown);
      addMistakes(d.selfPractice.breakdown);
      mistakeTotals.punctuation += d.formatting.breakdown.punctuation || 0;
      mistakeTotals.spelling += d.formatting.breakdown.word || 0;
      mistakeTotals.capital += d.formatting.breakdown.formatting || 0;
    }
    const sortedDanger = Object.entries(mistakeTotals).sort((a,b)=>b[1]-a[1]);
    const top3 = sortedDanger.slice(0,3).map(([k,v])=>({ category: k, count: v }));

    const dictationTopicAgg = {};
    for (const sub of dictationSubs) {
      const key = `${sub.dictationTitle}|${sub.dictationType}`;
      dictationTopicAgg[key] = (dictationTopicAgg[key] || 0) + (sub.totalMistakes || 0);
    }
    const topDictationTopics = Object.entries(dictationTopicAgg).sort((a,b)=>b[1]-a[1]).slice(0,3)
      .map(([key,count])=>{ const [title,type]=key.split('|'); return { title, type, totalMistakes: count }; });

    const suggestions = top3.map(t => {
      switch (t.category) {
        case 'punctuation': return 'Focus on punctuation: practice comma, semicolon, and full-stop exercises daily.';
        case 'spelling': return 'Strengthen spelling: use quick revision lists and do 10-word drills.';
        case 'capital': return 'Improve capitalization/formatting discipline: review formatting rules and apply consistently.';
        case 'spacing': return 'Work on spacing: slow down slightly and verify word boundaries.';
        case 'missing': return 'Reduce missing words: increase attention during dictation playback and cross-check.';
        case 'extra': return 'Avoid extra words: type what is dictated, resist paraphrasing.';
        default: return 'Maintain consistency across all sections; practice regularly.';
      }
    });

    const report = {
      user: { id: userId, name: `${user?.firstName||''} ${user?.lastName||''}`.trim(), category: user?.examCategory },
      weekly,
      days,
      growth,
      dangerZone: {
        topMistakeCategories: top3,
        dictationTopWeakTopics: topDictationTopics,
      },
      suggestions,
      generatedAt: new Date().toISOString(),
    };

    return res.status(200).json(report);

  } catch (error) {
    console.error('Admin weekly report error:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const FormattingTestResult = require('../models/FormattingTestResult');
const PitmanExerciseSubmission = require('../models/PitmanExerciseSubmission');
const SelfPracticeSubmission = require('../models/SelfPracticeSubmission');
const TypingRecord = require('../models/TypingRecord');
const UserDictationSubmission = require('../models/UserDictationSubmission');
const McqSubmission = require('../models/mcqSubmissionModel');
