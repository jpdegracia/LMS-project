import 'dotenv/config';
import dotenv from "dotenv";
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { connectDB } from './dB/connectDB.js'; 

// --- Import all your routers ---
import authRoutes from "./routes/authRoutes.js";
import contactRoutes from './routes/contact.js'; 
import userRoutes from "./routes/userRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import permissionRoutes from "./routes/permissionRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";


// Main routers for course management
import courseRoutes from './routes/course.js'; 
import sectionRoutes from './routes/section.js'; // Consolidated section router
import moduleRoutes from './routes/module.js'; // Consolidated module router
import categoryRoutes from './routes/categoryRoutes.js';   

// Routers for Lesson Content and Questions (content banks)
import courseLessonContentRoutes from './routes/courseLessonContentRoutes.js';
import courseQuestionRoutes from './routes/courseQuestionRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';

// --- NEW: Import quizAttemptRoutes ---
import quizAttemptRoutes from './routes/quizAttemptRoutes.js';
import practiceTestRoutes from './routes/practiceTestRoutes.js';

// --- NEW: Import notification routes ---
import notificationRoutes from './routes/notificationRoutes.js';

// --- NEW: Import AI routes ---
import aiRoutes from './routes/aiRoutes.js';

dotenv.config(); 

const app = express();

const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            'http://localhost:5173', 
            'http://localhost:4000',
            'http://localhost',
            'https://digital-frontend-mocha.vercel.app', 
            'https://digital-frontend-iffg.onrender.com' 
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS: Origin '${origin}' not allowed.`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
};

const PORT = process.env.PORT || 4000;

app.use(cors(corsOptions));
app.use(express.json()); 
app.use(cookieParser()); 
app.use(express.urlencoded({ extended: true })); 

app.use((req, res, next) => {
    console.log(`[Request Arrived]: ${req.method} ${req.originalUrl}`);
    next();
});

app.get("/", (req, res) => {
    res.send("Welcome to Careerlab° Backend API!")
});

// --- API Routes (Consolidated and Organized) ---
app.use("/auth", authRoutes);
app.use("/contacts", contactRoutes); 
app.use("/roles", roleRoutes);
app.use("/users", userRoutes);
app.use("/permissions", permissionRoutes);

app.use("/courses", courseRoutes);
app.use("/categories", categoryRoutes); 
app.use("/sections", sectionRoutes); // Use the consolidated section router

app.use("/modules", moduleRoutes); // Use the consolidated module router
app.use("/lesson-content", courseLessonContentRoutes);
app.use("/questions", courseQuestionRoutes);
app.use("/subjects", subjectRoutes);
app.use("/enrollments", enrollmentRoutes);

// --- NEW: Add the quiz-attempts router with a path prefix ---
app.use("/practice-tests", practiceTestRoutes);
app.use("/quiz-attempts", quizAttemptRoutes);

// --- NEW: Import and use notification routes ---
app.use("/notifications", notificationRoutes);

// --- NEW: Import and use AI routes ---
app.use('/ai', aiRoutes);

// --- Error Handling Middleware ---
app.use((req, res, next) => {
    console.warn(`API 404 Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
});

app.use((err, req, res, next) => {
    console.error('API Error Stack:', err.stack);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'An unexpected server error occurred.';
    res.status(statusCode).json({
        success: false,
        message: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});


// --- Database Connection and Server Start ---
connectDB()
    .then(() => {
        console.log('MongoDB connected successfully.');
        app.listen(PORT, () => {
            console.log(`Server is running on port: ${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });