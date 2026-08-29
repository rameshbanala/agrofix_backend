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
  // Fail fast instead of hanging the request that triggered the email —
  // nodemailer's defaults can otherwise block for minutes if the SMTP
  // server is unreachable or misconfigured.
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 10_000,
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
