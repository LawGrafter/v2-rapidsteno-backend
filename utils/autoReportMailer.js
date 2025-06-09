const cron = require('node-cron');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db'); // ✅ DB connection setup
const User = require('../models/userModel');
const Submission = require('../models/UserDictationSubmission');

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
auth: {
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS
},
  connectionTimeout: 10000 // 10 seconds

});

// const generateUserPDF = (user, data, filePath) => {
//   const doc = new PDFDocument();
//   doc.pipe(fs.createWriteStream(filePath));

//   doc.fontSize(18).text(`Weekly Performance Report for ${user.firstName} ${user.lastName}`, { align: 'center' });
//   doc.moveDown();

//   doc.fontSize(12).text(`Email: ${user.email}`);
//   doc.text(`Total Submissions: ${data.count}`);
//   doc.text(`Average Accuracy: ${data.accuracy.toFixed(2)}%`);
//   doc.text(`Avg Spelling Mistakes: ${data.spellingMistakes}`);
//   doc.text(`Avg Missing Words: ${data.missingWords}`);
//   doc.text(`Avg Extra Words: ${data.extraWords}`);
//   doc.text(`Avg Capital Mistakes: ${data.capitalMistakes}`);
//   doc.moveDown();

//   doc.fontSize(14).text("Conclusion:", { underline: true });
//   if (data.accuracy > 95) {
//     doc.text("Excellent accuracy. Keep up the great work!");
//   } else if (data.accuracy > 80) {
//     doc.text("Good job. Focus on reducing missing words to improve accuracy.");
//   } else {
//     doc.text("Needs improvement. Work on spelling and understanding sentence flow.");
//   }

//   doc.end();
// };

const puppeteer = require('puppeteer');

const generateUserPDF = async (user, data, filePath) => {
  const templatePath = path.join(__dirname, 'reportTemplate.html'); // your saved HTML
  let html = fs.readFileSync(templatePath, 'utf-8');

  const conclusion =
    data.accuracy > 95
      ? '✅ Excellent accuracy. Keep up the great work!'
      : data.accuracy > 80
      ? '👍 Good job. Focus on reducing missing words to improve accuracy.'
      : '⚠️ Needs improvement. Work on spelling and sentence flow for better scores.';

  // Replace placeholders
  html = html.replace('{{name}}', `${user.firstName} ${user.lastName}`)
             .replace('{{email}}', user.email)
             .replace('{{count}}', data.count)
             .replace('{{accuracy}}', data.accuracy.toFixed(2))
             .replace('{{spellingMistakes}}', data.spellingMistakes)
             .replace('{{missingWords}}', data.missingWords)
             .replace('{{extraWords}}', data.extraWords)
             .replace('{{capitalMistakes}}', data.capitalMistakes)
             .replace('{{conclusion}}', conclusion);

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


const sendUserReportEmail = async (user, pdfPath) => {
  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: user.email,
    subject: 'Your Dictation Practice Report',
    html: `<p>Hi <strong>${user.firstName}</strong>,</p>
           <p>Your dictation practice summary report is attached as a PDF. Please review your performance and keep improving!</p>
           <p>Regards,<br>Rapid Steno</p>`,
    attachments: [
      {
        filename: 'Performance_Report.pdf',
        path: pdfPath
      }
    ]
  };

  await transporter.sendMail(mailOptions);
};

const autoReportMailer = async () => {
  try {
    await connectDB(); // ✅ Ensure DB is connected
    console.log('⏳ Running auto-report mailer...');

    const users = await User.find({ isEmailVerified: true });

    for (const user of users) {
      const subs = await Submission.find({ user: user._id });
      if (subs.length === 0) continue;

      const count = subs.length;
      const avg = (field) =>
        +(subs.map(s => s[field] || 0).reduce((a, b) => a + b, 0) / count).toFixed(2);

      const summary = {
        count,
        accuracy: avg('accuracy'),
        totalMistakes: avg('totalMistakes'),
        spellingMistakes: avg('spellingMistakes'),
        missingWords: avg('missingWords'),
        extraWords: avg('extraWords'),
        capitalMistakes: avg('capitalMistakes')
      };

      const pdfFile = path.join(__dirname, `../../reports/${user._id}_report.pdf`);
      fs.mkdirSync(path.dirname(pdfFile), { recursive: true });

      // generateUserPDF(user, summary, pdfFile);

      // setTimeout(async () => {
      //   await sendUserReportEmail(user, pdfFile);
      //   fs.unlink(pdfFile, () => {}); // Clean up
      // }, 1000);
      await generateUserPDF(user, summary, pdfFile); // ✅ Fix here

setTimeout(async () => {
  try {
    await sendUserReportEmail(user, pdfFile);
    fs.unlink(pdfFile, () => {}); // Clean up
  } catch (err) {
    console.error(`❌ Failed to send report to ${user.email}:`, err.message);
  }
}, 1000);

    }
  } catch (error) {
    console.error('❌ Error sending reports:', error);
  } finally {
    mongoose.connection.close(); // ✅ Clean exit
  }
};

// Export as function for cron call from index.js
module.exports = autoReportMailer;
