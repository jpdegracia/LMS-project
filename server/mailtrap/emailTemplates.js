export const VERIFICATION_EMAIL_TEMPLATE = (firstName, verificationCode, verificationPageUrl) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    /* Basic email styling for better readability across clients */
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(to right, #007bff, #0056b3);
      padding: 25px 30px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 30px;
    }
    .content p {
      margin-bottom: 15px;
    }
    .code-display {
      text-align: center;
      margin: 30px 0;
      padding: 15px;
      background-color: #e9f5ff; /* Light blue background for the code */
      border: 1px solid #cce0ff;
      border-radius: 5px;
    }
    .code-display span {
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 5px;
      color: #0056b3;
      display: block; /* Ensures the code takes its own line */
      word-break: break-all; /* Helps with long codes on small screens */
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      background-color: #0056b3;
      color: white !important; /* !important to override some client default link colors */
      padding: 12px 25px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      display: inline-block; /* Make it behave like a block for padding/margin */
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      padding: 20px 30px;
      color: #888;
      font-size: 0.85em;
      border-top: 1px solid #eee;
      background-color: #fcfcfc;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Welcome to The Careerlab°!</h1>
    </div>
    <div class="content">
      <p>Hello ${firstName || 'there'},</p>
      <p>Welcome to The Careerlab°! An admin has created an account for you. To activate your account and set your password, please verify your email address.</p>
      
      <p>Click the button below to **automatically verify your email** and proceed:</p>
      <div class="button-container">
        <a href="${verificationPageUrl}" class="button">Verify My Email Now</a>
      </div>

      
      <p>This verification code will expire in 15 minutes for security reasons.</p>
      <p>If you did not expect this email, please ignore it.</p>
      <p>Best regards,<br>The Careerlab° Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message, please do not reply to this email.</p>
      <p>The Careerlab° | Cebu City, Central Visayas, Philippines</p>
    </div>
  </div>
</body>
</html>
`;


export const WELCOME_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to The Careerlab°!</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(to right, #007bff, #0056b3); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Welcome to The Careerlab°!</h1>
        <p style="color: #f0f8ff; font-size: 1.1em; margin-top: 10px;">Your journey to career success starts here.</p>
    </div>
    <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
        <p>Hi there,</p>
        <p>Welcome aboard! We're thrilled to have you join The Careerlab° community.</p>
        <p>Thank you for signing up!</p>
        <p>We're excited to help you achieve your career goals. Explore our resources, connect with other professionals, and let's build your future together!</p>
        <p>Best regards,<br>The Careerlab° Team</p>
    </div>
    <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
        <p>This is an automated message, please do not reply to this email.</p>
        <p><a href="{unsubscribeLink}" style="color: #888;">Unsubscribe</a> | <a href="{privacyPolicyLink}" style="color: #888;">Privacy Policy</a></p>
    </div>
</body>
</html>
`;


export const PASSWORD_RESET_REQUEST_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #007bff, #0056b3); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Password Reset</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello,</p>
    <p>We received a request to reset your password. If you didn't make this request, please ignore this email.</p>
    <p>To reset your password, click the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{resetURL}" style="background-color: #0056b3; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
    </div>
    <p>This link will expire in 15 mins for security reasons.</p>
    <p>Best regards,<br>Your App Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
`;

export const PASSWORD_RESET_SUCCESS_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Successful</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #007bff, #0056b3); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Password Reset Successful</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello,</p>
    <p>We're writing to confirm that your password has been successfully reset.</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background-color: #0056b3; color: white; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; display: inline-block; font-size: 30px;">
        ✓
      </div>
    </div>
    <p>If you did not initiate this password reset, please contact our support team immediately.</p>
    <p>For security reasons, we recommend that you:</p>
    <ul>
      <li>Use a strong, unique password</li>
      <li>Enable two-factor authentication if available</li>
      <li>Avoid using the same password across multiple sites</li>
    </ul>
    <p>Thank you for helping us keep your account secure.</p>
    <p>Best regards,<br>The Careerlab° Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
`;


// --- NEW CONTACT MESSAGE TEMPLATE ---
export const CONTACT_MESSAGE_TEMPLATE = (name, email, message, timestamp) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Contact Message</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f0f2f5; /* Light grey background similar to Gmail */
            margin: 0;
            padding: 0;
        }
        .email-wrapper {
            max-width: 600px; /* Fixed width for the email content */
            margin: 40px auto; /* Center the email and add top/bottom margin */
            background-color: #ffffff; /* White background for the main content area */
            border-radius: 8px; /* Slightly rounded corners */
            overflow: hidden; /* Ensures content stays within rounded corners */
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Subtle shadow for depth */
        }
        .header {
            background-color: #007bff; /* Blue header color */
            padding: 25px 0; /* Vertical padding */
            text-align: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
        }
        .content {
            padding: 30px; /* Padding inside the content area */
        }
        .content p {
            margin-bottom: 15px;
            font-size: 16px;
        }
        .detail-group {
            background-color: #f9f9f9; /* Slightly different background for details */
            border: 1px solid #eee; /* Subtle border */
            border-radius: 4px;
            padding: 20px;
            margin: 25px 0;
            text-align: center; /* Center the message if it's the main focus */
        }
        .detail-group p {
            margin: 5px 0;
        }
        .message-box {
            background-color: #f4f4f4; /* Light gray background for the message */
            border-left: 5px solid #007bff; /* Blue border on the left */
            padding: 15px;
            margin: 20px 0;
            font-style: italic;
            border-radius: 4px;
            color: #555;
            white-space: pre-wrap; /* Preserves whitespace and line breaks */
            word-wrap: break-word; /* Breaks long words if necessary */
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            padding: 20px 30px; /* Padding for the footer text */
            color: #888;
            font-size: 0.85em;
            border-top: 1px solid #eee; /* Separator line */
            background-color: #fcfcfc; /* Slightly lighter footer background */
        }
        .footer p {
            margin: 5px 0;
        }
        a {
            color: #007bff;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="header">
            New Contact Message Received
        </div>
        <div class="content">
            <p>Hello Administrator,</p>
            <p>You have received a new message through the contact form on your website. Here are the details:</p>

            <div class="detail-group">
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <p><strong>Time:</strong> ${timestamp}</p> 
            </div>

            <p><strong>Message:</strong></p>
            <div class="message-box">
                <p>${message.replace(/\n/g, '<br>')}</p>
            </div>

            <p>Please log in to your dashboard or reply to the sender directly via email if necessary.</p>
            <p>Best regards,</p>
            <p>The Careerlab° Team</p>
        </div>
        <div class="footer">
            <p>This message was sent from your website's contact form.</p>
            <p>The Careerlab° | Cebu City, Central Visayas, Philippines</p>
            <p>This is an automated message, please do not reply to this email directly unless intended for the sender.</p>
        </div>
    </div>
</body>
</html>
`;