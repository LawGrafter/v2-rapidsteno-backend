const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const adminRoutes = require('./routes/adminRoutes');
const submissionRoutes = require("./routes/userDicatationSubmissionRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");

dotenv.config();
connectDB();

const app = express();

// ✅ Fix: Properly Configure CORS
app.use(
  cors({
    origin: ["http://localhost:3000", "https://rapidstenographer.vercel.app", "https://rapidsteno.vercel.app", "https://rapid-steno-api.vercel.app"], // Allow frontend domains
    methods: "GET,POST,PUT,DELETE,PATCH",
    allowedHeaders: "Content-Type,Authorization",
  })
);

// ✅ Extra Fix: Handle Preflight Requests
app.options('*', cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dictation', require('./routes/dictationRoutes'));
app.use('/admin', adminRoutes); // Prefix all admin routes
app.use("/api/user/dictationSubmissions", submissionRoutes);
app.use("/api/feedback", feedbackRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
