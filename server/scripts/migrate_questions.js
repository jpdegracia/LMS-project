import mongoose from 'mongoose';
import { Question } from '../models/QuestionSchema.js'; // Adjust path if needed
import dotenv from 'dotenv';
import { renderHtmlWithLatex } from '../utils/katexRenderer.js'; // Adjust path if needed
import striptags from 'striptags';

dotenv.config();

/**
 * ⚠️ Helper function to ensure migrated text meets schema validation.
 * This version fixes the bug that destroyed short, valid strings.
 */
const safeString = (value) => {
    // Use a placeholder that passes all known min-length validations (e.g., 5 and 10)
    const minLengthPlaceholder = 'Empty Legacy Text'; 
    
    // 1. Check for null, undefined, or empty string
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        // We must return a placeholder to pass 'required: true' or 'minlength' checks.
        return minLengthPlaceholder; 
    }

    // 2. 🚀 FIX: The check for (value.trim().length < 5) was removed.
    // It was incorrectly changing valid short strings (like "True", "a)", "x=2")
    // into "Empty Legacy Text".

    // 3. Return the original, valid, non-empty value
    return value;
}


/**
 * Creates a NEW Question object with migrated and rendered HTML fields.
 * This function is critical for correctly generating the *Html content.
 */
const createMigratedQuestion = (oldData) => {
    
    // 1. Process Options
    const newOptions = (oldData.options || []).map(option => {
        // Get the original text, which might be HTML or LaTeX
        const originalText = option.optionTextRaw || option.optionText || '';
        
        const newOptionTextRaw = striptags(originalText);
        const newOptionTextHtml = renderHtmlWithLatex(originalText);

        return {
            // Use the new versions. safeString will now correctly handle
            // short options like "True" or "a)"
            optionTextRaw: safeString(newOptionTextRaw),
            optionTextHtml: safeString(newOptionTextHtml), 
            isCorrect: option.isCorrect,
            _id: option._id, 
        };
    });

    // 2. Process top-level text fields
    // ==========================================================
    // 🚀 THE FIX: Look for `oldData.questionTextRaw` first.
    // ==========================================================
    const originalQuestionText = oldData.questionTextRaw || oldData.questionText || '';
    const originalContextText = oldData.questionContext || oldData.prompt || ''; // Handles old prompt field

    const newQuestionTextRaw = striptags(originalQuestionText);
    const newQuestionTextHtml = renderHtmlWithLatex(originalQuestionText);
    const newContextRaw = striptags(originalContextText);
    const newContextHtml = renderHtmlWithLatex(originalContextText);

    // 3. Process correctAnswers (for shortAnswer, etc.)
    const newCorrectAnswers = [];
    if (oldData.correctAnswer && typeof oldData.correctAnswer === 'string') {
         const originalAnswer = oldData.correctAnswer;
         newCorrectAnswers.push({
             answer: safeString(striptags(originalAnswer)),
             answerHtml: safeString(renderHtmlWithLatex(originalAnswer))
         });
    }
    else if (oldData.correctAnswers && Array.isArray(oldData.correctAnswers)) {
         oldData.correctAnswers.forEach(ans => {
             const originalAnswer = (typeof ans === 'string') ? ans : (ans.answer || '');
             newCorrectAnswers.push({
                 answer: safeString(striptags(originalAnswer)),
                 answerHtml: safeString(renderHtmlWithLatex(originalAnswer))
             });
         });
    }

    const newDoc = new Question({
        // Copy the title
        questionTitle: oldData.questionTitle || `Migrated Question ${oldData._id}`,

        // New Processed Fields
        questionTextRaw: safeString(newQuestionTextRaw),
        questionTextHtml: safeString(newQuestionTextHtml),
        questionContext: safeString(newContextRaw), 
        questionContextHtml: safeString(newContextHtml),
        options: newOptions,
        correctAnswers: newCorrectAnswers,
        
        // Existing Fields (copied as is)
        _id: oldData._id,
        questionType: oldData.questionType,
        trueFalseAnswer: oldData.trueFalseAnswer,
        
        // 🚀 THE FIX (from last time): Copy numericalAnswer
        numericalAnswer: oldData.numericalAnswer, 

        feedback: oldData.feedback || '',
        difficulty: oldData.difficulty,
        tags: oldData.tags || [],
        subject: oldData.subject,
        status: oldData.status,
        createdBy: oldData.createdBy,
        createdAt: oldData.createdAt,
        updatedAt: oldData.updatedAt,
        __v: oldData.__v
    });

    return newDoc;
};


const runMigration = async () => {
    let connection;
    try {
        if (!process.env.MONGO_URI) {
            console.error('CRITICAL ERROR: MONGO_URI is not defined in your .env file.');
            process.exit(1);
        }
        connection = await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.');

        // PHASE 1: (No changes)
        const promptResult = await Question.updateMany(
            { prompt: { $exists: true, $ne: "" } },
            [
                { $set: { questionContext: "$prompt" } },
                { $unset: "prompt" }
            ]
        );
        console.log(`Phase 1 (Prompt Rename) complete. Updated ${promptResult.modifiedCount} documents.`);


        // PHASE 2: Legacy Data Mapping (Full Re-Save)
        console.log('Starting Phase 2: Legacy Data Mapping and HTML Rendering...');
        
        // Find all documents that need migration
        const cursor = Question.find({ 
            $or: [
                { questionTextHtml: { $exists: false } },
                { questionTextRaw: /<[a-z][\s\S]*>/i },
                { "options.optionTextHtml": { $exists: false }, questionType: 'multipleChoice' },
                { "options.optionTextRaw": /<[a-z][\s\S]*>/i, questionType: 'multipleChoice' }
            ]
        }).lean().cursor(); 

        let migratedCount = 0;
        let totalChecked = 0;

        for (let oldQuestion = await cursor.next(); oldQuestion != null; oldQuestion = await cursor.next()) {
            totalChecked++;
            
            try {
                // Create a new document instance with all new fields correctly rendered
                const newQuestionDoc = createMigratedQuestion(oldQuestion);
                
                // Delete the old document and save the new one to enforce the new schema validations
                await Question.deleteOne({ _id: oldQuestion._id });
                await newQuestionDoc.save(); 

                migratedCount++;
            } catch (error) {
                console.error(`\n-- FAILED TO MIGRATE DOCUMENT ID: ${oldQuestion._id} --`);
                if (error.errors) {
                    Object.keys(error.errors).forEach(key => {
                        console.error(`Validation Error: ${key} -> ${error.errors[key].message}`);
                    });
                } else {
                    console.error('Unknown save error:', error.message);
                }
            }
            
            if (totalChecked % 100 === 0 && totalChecked > 0) {
                console.log(`Checked ${totalChecked} documents, successfully migrated ${migratedCount}...`);
            }
        }

        console.log(`\nPhase 2 (Legacy Mapping) complete!`);
        console.log(`Total documents checked: ${totalChecked}`);
        console.log(`Total documents successfully migrated (deleted and re-created): ${migratedCount}`);
        
    } catch (error) {
        console.error('CRITICAL MIGRATION ERROR:', error);
    } finally {
        if (connection) {
            await mongoose.disconnect();
            console.log('Disconnected from MongoDB.');
        }
    }
};

runMigration();