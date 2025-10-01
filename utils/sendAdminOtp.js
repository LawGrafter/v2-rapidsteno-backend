const transporter = require('./emailTransporter');

exports.sendAdminOtp = async (email, otp) => {
  const mailOptions = {
    from: `"RapidSteno Admin" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Your Admin OTP Code",
    html: `<p>Your OTP for admin login is <strong>${otp}</strong>. It will expire in 5 minutes.</p>`
  };

  await transporter.sendMail(mailOptions);
};
