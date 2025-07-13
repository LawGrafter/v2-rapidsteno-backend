const transporter = require('./emailTransporter');

const notifyAdminOfRegistration = async (user) => {
  const mailOptions = {
    from: `"Rapid Steno" <${process.env.SMTP_USER}>`,
    to: 'info@rapidsteno.com', // or use process.env.ADMIN_EMAIL
    subject: '📥 New User Registered on RapidSteno',
    html: `
      <h2>New Registration</h2>
      <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Phone:</strong> ${user.phone}</p>
      <p><strong>State:</strong> ${user.state || 'Not Provided'}</p>
      <p><strong>Source of Discovery:</strong> ${user.sourceOfDiscovery || 'Not Provided'}</p>
      <p><strong>Exam Category:</strong> ${user.examCategory}</p>
      <p><strong>Registration Time:</strong> ${new Date().toLocaleString()}</p>
    `,
  };

  try {
    console.log('📨 About to send admin notification...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Admin notification sent:', info.response);
  } catch (err) {
    console.error('❌ Failed to send admin email:', err.message || err);
  }
};

module.exports = notifyAdminOfRegistration;
