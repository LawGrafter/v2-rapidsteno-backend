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


dotenv.config();
connectDB();

const app = express();

// ✅ Fix: Properly Configure CORS
app.use(
  cors({
    origin: ["http://localhost:3000", "https://rapidstenographer.vercel.app", "https://rapidsteno.vercel.app", "https://rapid-steno-api.vercel.app"], // Allow frontend domains
    methods: "GET,POST,PUT,DELETE,PATCH",
    // allowedHeaders: "Content-Type,Authorization",
    allowedHeaders: ["Content-Type", "Authorization", "x-session-token"],
  })
);

// ✅ Extra Fix: Handle Preflight Requests
app.options('*', cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dictation', require('./routes/dictationRoutes'));
app.use('/api/admin', adminRoutes); // Prefix all admin routes
app.use("/api/user/dictationSubmissions", submissionRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/newsfeed", newsFeedRoutes);
app.use("/api/compare", compareRoutes);


// Trust proxy to get correct client IP when behind a reverse proxy (like Nginx, Vercel, etc.)
app.set('trust proxy', true);

// ✅ Schedule cron job to run daily at midnight
cron.schedule('0 0 * * *', () => {
  console.log("🔄 Running daily user deactivation check...");
  autoDeactivateUsers();
});

const autoReportMailer = require('./utils/autoReportMailer');

 //cron.schedule('*/1 * * * *', () => {
cron.schedule('0 */6 * * *', () => {

  console.log("📤 Scheduled: Sending performance reports...");
  autoReportMailer();
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
