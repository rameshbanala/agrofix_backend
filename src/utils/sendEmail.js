const nodemailer = require("nodemailer");
const env = require("../config/env");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: env.email.user,
    pass: env.email.password,
  },
});

async function sendEmail({ email, subject, html, attachments }) {
  const mailOptions = {
    from: `"${env.email.fromName}" <${env.email.user}>`,
    to: email,
    subject,
    html,
  };
  if (attachments) mailOptions.attachments = attachments;

  return transporter.sendMail(mailOptions);
}

module.exports = { sendEmail };
