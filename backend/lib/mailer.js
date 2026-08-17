'use strict';

/**
 * Mailer stub — ready for Nodemailer integration.
 * Non-blocking: if SMTP is not configured, calls succeed silently.
 */

/**
 * Send an email. Does nothing if SMTP environment variables are not set.
 * @param {{ to:string, subject:string, text:string, html?:string }} options
 * @returns {Promise<boolean>} true if sent, false if skipped or errored
 */
async function sendMail({ to, subject, text, html }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    // SMTP not configured — skip silently
    return false;
  }

  try {
    // Lazy-load nodemailer only when actually needed
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10) || 587,
      secure: parseInt(SMTP_PORT, 10) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });

    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to,
      subject,
      text,
      html: html || undefined
    });

    return true;
  } catch (err) {
    console.error('[mailer] Erreur d\'envoi :', err.message);
    return false;
  }
}

module.exports = { sendMail };
