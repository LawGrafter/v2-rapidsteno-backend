const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

const sendWelcomeEmail = async (email, firstName) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const htmlPath = path.join(__dirname, "welcomeTemplate.html");
  let htmlTemplate = fs.readFileSync(htmlPath, "utf8");

  htmlTemplate = htmlTemplate.replace("Registration Successful!", `Welcome, ${firstName}!`);

  const mailOptions = {
    from: `"Rapid Steno | Best Shorthand Software" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "🎉 Welcome to Rapid Steno!",
    html: htmlTemplate,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendWelcomeEmail;
