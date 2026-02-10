import express from 'express';
import { submitContactForm } from '../controllers/contact.js';

const router = express.Router();

// Define the POST route for contact form submission
router.post('/', submitContactForm); // The path here is relative to what's used in server.js

export default router;