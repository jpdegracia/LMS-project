import { Contact } from '../models/ContactSchema.js';
import { sendContactNotificationEmail } from '../mailtrap/email.js';


export const submitContactForm = async (req, res) => {
  const { name, email, message } = req.body;

  // 1. Basic Server-side Validation
  if (!name || !email || !message) {
    return res.status(400).json({ msg: 'Please enter all fields.' });
  }
  if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
    return res.status(400).json({ msg: 'Please enter a valid email address.' });
  }

  try {
    // 2. Save Message to MongoDB
    const newMessage = new Contact({
      name,
      email,
      message,
    });
    await newMessage.save();

    const emailSent = await sendContactNotificationEmail(name, email, message);

    if (!emailSent) {
      console.warn('Email notification failed to send, but message was saved to DB.');

    }

    // 4. Send Success Response
    res.status(200).json({ msg: 'Message sent successfully!' });

  } catch (err) {
    console.error('Error handling contact form submission:', err);
    if (err.name === 'ValidationError') {
      res.status(400).json({ msg: err.message });
    } else {
      res.status(500).json({ msg: 'Server error. Please try again later.' });
    }
  }
};