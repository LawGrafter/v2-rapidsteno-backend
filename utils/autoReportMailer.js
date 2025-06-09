// const cron = require('node-cron');
// const nodemailer = require('nodemailer');
// const PDFDocument = require('pdfkit');
// const fs = require('fs');
// const path = require('path');
// const mongoose = require('mongoose');
// const connectDB = require('../config/db'); // ✅ DB connection setup
// const User = require('../models/userModel');
// const Submission = require('../models/UserDictationSubmission');

// // Nodemailer setup
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
// auth: {
//   user: process.env.SMTP_USER,
//   pass: process.env.SMTP_PASS
// },
//   connectionTimeout: 10000 // 10 seconds

// });


// const puppeteer = require('puppeteer');

// const generateUserPDF = async (user, data, filePath) => {
//   const templatePath = path.join(__dirname, 'reportTemplate.html'); // your saved HTML
//   let html = fs.readFileSync(templatePath, 'utf-8');

//   const conclusion =
//     data.accuracy > 95
//       ? '✅ Excellent accuracy. Keep up the great work!'
//       : data.accuracy > 80
//       ? '👍 Good job. Focus on reducing missing words to improve accuracy.'
//       : '⚠️ Needs improvement. Work on spelling and sentence flow for better scores.';

//   const replacements = {
//   '{{name}}': `${user.firstName} ${user.lastName}`,
//   '{{email}}': user.email,
//   '{{rank}}': data.rank,
//   '{{count}}': data.count,
//   '{{accuracy}}': data.accuracy.toFixed(2),
//   '{{spellingMistakes}}': data.spellingMistakes,
//   '{{missingWords}}': data.missingWords,
//   '{{extraWords}}': data.extraWords,
//   '{{capitalMistakes}}': data.capitalMistakes,
//   '{{conclusion}}': conclusion,
// };

// for (const [key, value] of Object.entries(replacements)) {
//   const regex = new RegExp(key, 'g');
//   html = html.replace(regex, value);
// }


//   const browser = await puppeteer.launch({
//     headless: true,
//     args: ['--no-sandbox', '--disable-setuid-sandbox']
//   });

//   const page = await browser.newPage();
//   await page.setContent(html, { waitUntil: 'networkidle0' });

//   await page.pdf({
//     path: filePath,
//     format: 'A4',
//     printBackground: true
//   });

//   await browser.close();
// };


// const sendUserReportEmail = async (user, pdfPath) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USERNAME,
//     to: user.email,
//     subject: 'Your Dictation Practice Report',
//     html: `<p>Hi <strong>${user.firstName}</strong>,</p>
//            <p>Your dictation practice summary report is attached as a PDF. Please review your performance and keep improving!</p>
//            <p>Regards,<br>Rapid Steno</p>`,
//     attachments: [
//       {
//         filename: 'Performance_Report.pdf',
//         path: pdfPath
//       }
//     ]
//   };

//   await transporter.sendMail(mailOptions);
// };

// const autoReportMailer = async () => {
//   try {
//     await connectDB(); // ✅ Ensure DB is connected
//     console.log('⏳ Running auto-report mailer...');

//     const users = await User.find({ isEmailVerified: true });

//     for (const user of users) {
//       const subs = await Submission.find({ user: user._id });
//       if (subs.length === 0) continue;

//       const count = subs.length;
//       const avg = (field) =>
//         +(subs.map(s => s[field] || 0).reduce((a, b) => a + b, 0) / count).toFixed(2);

//       const summary = {
//         count,
//         accuracy: avg('accuracy'),
//         totalMistakes: avg('totalMistakes'),
//         spellingMistakes: avg('spellingMistakes'),
//         missingWords: avg('missingWords'),
//         extraWords: avg('extraWords'),
//         capitalMistakes: avg('capitalMistakes')
//       };

//       const pdfFile = path.join(__dirname, `../../reports/${user._id}_report.pdf`);
//       fs.mkdirSync(path.dirname(pdfFile), { recursive: true });

//       // generateUserPDF(user, summary, pdfFile);

//       // setTimeout(async () => {
//       //   await sendUserReportEmail(user, pdfFile);
//       //   fs.unlink(pdfFile, () => {}); // Clean up
//       // }, 1000);
//       await generateUserPDF(user, summary, pdfFile); // ✅ Fix here

// setTimeout(async () => {
//   try {
//     await sendUserReportEmail(user, pdfFile);
//     fs.unlink(pdfFile, () => {}); // Clean up
//   } catch (err) {
//     console.error(`❌ Failed to send report to ${user.email}:`, err.message);
//   }
// }, 1000);

//     }
//   } catch (error) {
//     console.error('❌ Error sending reports:', error);
//   } finally {
//     mongoose.connection.close(); // ✅ Clean exit
//   }
// };

// // Export as function for cron call from index.js
// module.exports = autoReportMailer;

const cron = require('node-cron');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/userModel');
const Submission = require('../models/UserDictationSubmission');
const puppeteer = require('puppeteer');

// ✅ Setup Email Transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  connectionTimeout: 10000
});

// ✅ Generate PDF from HTML Template
const generateUserPDF = async (user, data, filePath) => {
  const templatePath = path.join(__dirname, 'reportTemplate.html');
  let html = fs.readFileSync(templatePath, 'utf-8');

  const conclusion =
    data.accuracy > 95
      ? '✅ Excellent accuracy. Keep up the great work!'
      : data.accuracy > 80
        ? '👍 Good job. Focus on reducing missing words to improve accuracy.'
        : '⚠️ Needs improvement. Work on spelling and sentence flow for better scores.';

  // ✅ Replace placeholders with actual data
  const replacements = {
    '{{name}}': `${user.firstName} ${user.lastName}`,
    '{{email}}': user.email,
    '{{count}}': data.count,
    '{{accuracy}}': data.accuracy.toFixed(2),
    '{{spellingMistakes}}': data.spellingMistakes,
    '{{missingWords}}': data.missingWords,
    '{{extraWords}}': data.extraWords,
    '{{capitalMistakes}}': data.capitalMistakes,
    '{{conclusion}}': conclusion,
    '{{rank}}': data.rank // ✅ New placeholder for All India Rank
  };

  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(key, 'g');
    html = html.replace(regex, value);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: filePath,
    format: 'A4',
    printBackground: true
  });

  await browser.close();
};

// ✅ Send Email With PDF Attachment
const sendUserReportEmail = async (user, pdfPath) => {
  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: user.email,
    subject: '📝 Your Weekly Dictation Report is Ready – Track Your Progress Now!',
    // html: `<p>Hi <strong>${user.firstName}</strong>,</p>
    //        <p>Your dictation practice summary report is attached as a PDF. Please review your performance and keep improving!</p>
    //        <p>Regards,<br>Rapid Steno</p>`,
      html: `
      <p>Hi <strong>${user.firstName}</strong>,</p>

      <p>Your dictation practice summary report is ready and attached as a PDF.<br>
      It includes your latest performance metrics and insights to help you improve faster.</p>

      <p>Take a few minutes to review it and continue building your speed and accuracy.</p>

      <p>Keep going strong!</p>

      <p>Best regards,<br>
      Team Rapid Steno</p>
    `,
    attachments: [
      {
        filename: 'Performance_Report.pdf',
        path: pdfPath
      }
    ]
  };

  await transporter.sendMail(mailOptions);
};

// ✅ MAIN REPORT GENERATION FUNCTION
const autoReportMailer = async () => {
  try {
    await connectDB();
    console.log('⏳ Running auto-report mailer...');

    const users = await User.find({ isEmailVerified: true });

    // ✅ Step 1: Calculate average accuracy of all verified users
    const userSummaries = await Promise.all(users.map(async u => {
      const subs = await Submission.find({ user: u._id });
      if (subs.length === 0) return null;

      const avg = (field) =>
        +(subs.map(s => s[field] || 0).reduce((a, b) => a + b, 0) / subs.length).toFixed(2);

      return {
        userId: u._id.toString(),
        accuracy: avg('accuracy')
      };
    }));

    // ✅ Step 2: Rank all users by accuracy (descending)
    const rankedUsers = userSummaries.filter(Boolean).sort((a, b) => b.accuracy - a.accuracy);

    // ✅ Step 3: Define function to find rank of a specific user
    const findRank = (userId) => rankedUsers.findIndex(u => u.userId === userId.toString()) + 1;

    for (const user of users) {
      const subs = await Submission.find({ user: user._id });
      if (subs.length === 0) continue;

      const count = subs.length;
      const avg = (field) =>
        +(subs.map(s => s[field] || 0).reduce((a, b) => a + b, 0) / count).toFixed(2);

      // ✅ Get current user's rank
      const rank = findRank(user._id);

      const summary = {
        count,
        accuracy: avg('accuracy'),
        totalMistakes: avg('totalMistakes'),
        spellingMistakes: avg('spellingMistakes'),
        missingWords: avg('missingWords'),
        extraWords: avg('extraWords'),
        capitalMistakes: avg('capitalMistakes'),
        rank // ✅ Pass to generateUserPDF
      };

      const pdfFile = path.join(__dirname, `../../reports/${user._id}_report.pdf`);
      fs.mkdirSync(path.dirname(pdfFile), { recursive: true });

      await generateUserPDF(user, summary, pdfFile);

      setTimeout(async () => {
        try {
          await sendUserReportEmail(user, pdfFile);
          fs.unlink(pdfFile, () => { });
        } catch (err) {
          console.error(`❌ Failed to send report to ${user.email}:`, err.message);
        }
      }, 1000);
    }
  } catch (error) {
    console.error('❌ Error sending reports:', error);
  } finally {
    mongoose.connection.close();
  }
};

// ✅ Export for use in cron or manual trigger
module.exports = autoReportMailer;
