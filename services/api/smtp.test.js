const nodemailer = require('nodemailer');

(async () => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: {
      user: 'relayio@umojaairways.com',
      pass: 'cplmrwzygtwxgvxy',
    },
  });

  try {
    await transporter.sendMail({
      from: 'no-reply@umojaairways.com',
      to: 'natnaelmekonnengebretsadik@gmail.com', // Replace this with your actual inbox
      subject: 'SMTP Test',
      text: '✅ It works!',
    });

    console.log('✅ Email sent successfully!');
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
})();
