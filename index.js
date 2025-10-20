const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const adminRoutes = require('./routes/adminRoutes');
const submissionRoutes = require("./routes/userDicatationSubmissionRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const cron = require('node-cron');
const autoDeactivateUsers = require('./utils/autoDeactivateUsers');
const newsFeedRoutes = require('./routes/newsFeedRoutes');
const compareRoutes = require('./routes/compareRoutes');
const pitmanRoutes = require('./routes/pitmanExerciseRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const pitmanUserSubmissionRoutes = require("./routes/pitmanRoutes");
const paymentMonthlyRoutes = require('./routes/paymentMonthlyRoutes');
const questionRoutes = require("./routes/questionRoutes");
const mcqSubmissionRoutes = require("./routes/mcqSubmissionRoutes");
const typingTestRoutes = require('./routes/typingTestRoutes');
const formattingTestRoutes = require('./routes/formattingTestRoutes');
const selfPracticeRoutes = require('./routes/selfPracticeRoutes');

require('./utils/trialExpiryJob'); // <--- ⏳ Run every minute to expire Trial users



dotenv.config();
connectDB();

const app = express();

// ✅ Fix: Properly Configure CORS
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://www.rapidsteno.in",
      "https://rapidstenographer.vercel.app",
      "https://rapidsteno.vercel.app",
      "https://rapid-steno-api.vercel.app"
    ], // Allow frontend domains
    methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    allowedHeaders: ["Content-Type", "Authorization", "x-session-token"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// ✅ Extra Fix: Handle Preflight Requests
app.options('*', cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dictations', require('./routes/dictationRoutes'));
app.use('/api/admin', adminRoutes); // Prefix all admin routes
app.use("/api/user/dictationSubmissions", submissionRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/newsfeed", newsFeedRoutes);
app.use("/api/compare", compareRoutes);
app.use('/api/pitmanExercises', pitmanRoutes);
app.use('/api/payments', paymentRoutes);
app.use("/api/pitman", pitmanUserSubmissionRoutes);
app.use('/api/paymentMonthly', paymentMonthlyRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/mcq-submissions", mcqSubmissionRoutes);
app.use('/api/typing-test', typingTestRoutes);
app.use('/api/formatting-test', formattingTestRoutes);
app.use('/api/self-practice', selfPracticeRoutes);

// Trust proxy to get correct client IP when behind a reverse proxy (like Nginx, Vercel, etc.)
app.set('trust proxy', true);

// ✅ Schedule cron job to run daily at midnight
// cron.schedule('0 0 * * *', () => {
//   console.log("🔄 Running daily user deactivation check...");
//   autoDeactivateUsers();
// });

// const autoReportMailer = require('./utils/autoReportMailer');

//  //cron.schedule('*/1 * * * *', () => {
// cron.schedule('0 */6 * * *', () => {
// 
//   console.log("📤 Scheduled: Sending performance reports...");
//   autoReportMailer();
// });


// ✅ Run every Sunday at 10:00 AM
// cron.schedule('0 10 * * 0', async () => {
//   console.log('⏰ Weekly report cron triggered on Sunday 10:00 AM');
//   await autoReportMailer();
// });



const PORT = process.env.PORT || 5000;

// ✅ Export for Vercel serverless, use listen only locally
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
