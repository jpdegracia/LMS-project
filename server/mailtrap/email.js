import { mailtrapClient, sender } from "./mailer.js"; 
import {
  VERIFICATION_EMAIL_TEMPLATE,
  WELCOME_EMAIL_TEMPLATE,
  PASSWORD_RESET_REQUEST_TEMPLATE,
  PASSWORD_RESET_SUCCESS_TEMPLATE,
  CONTACT_MESSAGE_TEMPLATE,
} from "./emailTemplates.js";




const sendEmail = async ({ to, subject, html, category }) => {
  try {
    const info = await mailtrapClient.send({ 
      from: sender, 
      to: [{ email: to }], 
      subject,
      html,

      category: category, 
    });
    console.log("Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Email sending error:", error);

    console.error("Mailtrap API Error details:", error.response ? error.response.data : 'No response data');
    throw new Error(`Failed to send email: ${error.message}`);
  }
};


// VERIFICATION EMAIL
export const sendVerificationEmail = (email, firstName, verificationToken) => {
  const verificationPageUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`; 

  return sendEmail({
    to: email,
    subject: "Welcome to The Careerlab°! Please Verify Your Email",
    // Correct argument order for the template:
    html: VERIFICATION_EMAIL_TEMPLATE(firstName, verificationToken, verificationPageUrl),
    text: `Hello ${firstName},\n\nWelcome to The Careerlab°! An admin has created an account for you. To activate your account and set your password, please verify your email address.\n\nYour verification code is: ${verificationToken}\n\nGo to the verification page here: ${verificationPageUrl}\n\nThis verification code will expire in 15 minutes for security reasons.\n\nIf you did not expect this email, please ignore it.\n\nBest regards,\nThe Careerlab° Team\n\nThis is an automated message, please do not reply to this email.`,
    category: "User Verification"
  });
};

// WELCOME EMAIL
export const sendWelcomeEmail = (email, firstName) => {
  return sendEmail({
    to: email,
    subject: `Welcome to The Careerlab°, ${firstName}!`,
    html: WELCOME_EMAIL_TEMPLATE,
    category: "Welcome Email" // Optional: add a category
  });
};

// PASSWORD RESET REQUEST EMAIL
export const sendPasswordResetEmail = (email, resetURL) => {
  return sendEmail({
    to: email,
    subject: "Reset your password",
    html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
    category: "Password Reset Request",
  });
};

// PASSWORD RESET SUCCESS EMAIL
export const sendResetSuccessEmail = (email) => {
  return sendEmail({
    to: email,
    subject: "Password Reset Successful",
    html: PASSWORD_RESET_SUCCESS_TEMPLATE,
    category: "Password Reset Success"
  });
};

// Contact ME EMAIL
export const sendContactNotificationEmail = async (name, sender, message) => {

 const adminEmail = "thecareerlabph@gmail.com";
 const timestamp = new Date().toLocaleString('en-PH', {
    timeZone: 'Asia/Manila', 
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true 
  });

  return sendEmail({
    to: adminEmail,
    subject: `New Contact Message from ${name}`,
    html: CONTACT_MESSAGE_TEMPLATE(name, sender, message, timestamp),
    category: "Contact Form Submission",
  });
};
