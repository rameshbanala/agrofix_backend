const nodemailer = require("nodemailer");
require("dotenv").config();

// Create a transporter object
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // or your preferred SMTP host
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // use app password for Gmail
  },
});

// Email sending function
const sendEmail = async (options) => {
  try {
    // Configure mail options
    const mailOptions = {
      from: `"Your App" <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
    };

    // Add attachments if any
    if (options.attachments) {
      mailOptions.attachments = options.attachments;
    }

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: ", info.response);
    return info;
  } catch (error) {
    console.error("Error sending email: ", error);
    throw error;
  }
};

module.exports = { sendEmail };
