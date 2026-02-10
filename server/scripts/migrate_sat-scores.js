import mongoose from "mongoose";
import { PracticeTestAttempt } from "../models/PracticeTestAttemptSchema.js";
import { SATGradingScale } from "../models/SATGradingScale.js";
import { Section } from "../models/SectionSchema.js";
import SAT_CONVERSION_TABLE_ENTRIES from "../utils/SATConversionData.js";
import dotenv from 'dotenv';

dotenv.config();

// --- Core Conversion Logic (Unchanged) ---
const getNewScaledScore = (rawScore, sectionType) => {
    const entry = SAT_CONVERSION_TABLE_ENTRIES.find(e => e.raw_score === rawScore);

    if (!entry) {
        return 200; 
    }

    if (sectionType === 'rw') {
        return entry.reading_writing_score || 200;
    } else if (sectionType === 'math') {
        return entry.math_score !== null ? entry.math_score : 200;
    }
    return 200;
};

// --- Migration Function ---
async function migrateSatScores() {
    console.log('Starting SAT Score Migration...');

    if (!process.env.MONGO_URI) {
        console.error("❌ FATAL ERROR: MONGO_URI environment variable is not set.");
        process.exit(1);
    }

    try {
        // Direct connection using the simplification you suggested
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully.');

        // 1. Find all practice test attempts that need migration
        // We look for attempts where 'totalSatScore' is still the old 'object' type {lower, upper}
        const attemptsToMigrate = await PracticeTestAttempt.find({
            'satScoreDetails.totalSatScore': { $type: 'object' } 
        }).populate('sectionIds', 'sectionTitle');

        console.log(`Found ${attemptsToMigrate.length} attempts to migrate.`);
        let migratedCount = 0;

        for (const attempt of attemptsToMigrate) {
            const oldDetails = attempt.satScoreDetails;
            let rwRaw = oldDetails.rawScoreReadingWriting || 0;
            let mathRaw = oldDetails.rawScoreMath || 0;
            
            // --- Look up new single scores ---
            const newRwScaled = getNewScaledScore(rwRaw, 'rw');
            const newMathScaled = getNewScaledScore(mathRaw, 'math');
            const newTotalScore = newRwScaled + newMathScaled;

            // --- Recalculate sectionScores array ---
            const newSectionScores = [];
            let isRwHandled = false;
            let isMathHandled = false;

            if (Array.isArray(attempt.sectionIds)) {
                attempt.sectionIds.forEach(section => {
                    const title = section?.sectionTitle?.toLowerCase() || '';
                    if ((title.includes('reading') || title.includes('writing')) && !isRwHandled) {
                        newSectionScores.push({ id: section._id, score: newRwScaled });
                        isRwHandled = true;
                    } else if (title.includes('math') && !isMathHandled) {
                        newSectionScores.push({ id: section._id, score: newMathScaled });
                        isMathHandled = true;
                    }
                });
            }

            // 2. Define the $unset and $set operations
            const fieldsToClear = {
                'satScoreDetails.totalSatScore': "",
                'satScoreDetails.scaledScoreReadingWriting': "",
                'satScoreDetails.scaledScoreMath': "",
            };

            const setNewFields = {
                // Top-level fields
                overallScore: newTotalScore,
                sectionScores: newSectionScores.length > 0 ? newSectionScores : attempt.sectionScores,

                // Nested fields: Use $set for the NEW single score values
                'satScoreDetails.rawScoreReadingWriting': rwRaw,
                'satScoreDetails.rawScoreMath': mathRaw,
                'satScoreDetails.scaledScoreReadingWriting': newRwScaled,
                'satScoreDetails.scaledScoreMath': newMathScaled,
                'satScoreDetails.totalSatScore': newTotalScore,
                'satScoreDetails.gradingScaleId': oldDetails.gradingScaleId,
            };

            // 3. Update the document in the database
            await PracticeTestAttempt.findByIdAndUpdate(attempt._id, {
                $unset: fieldsToClear,
            }, { new: false }); // Use new:false as we don't need the result, just the action

            // --- STEP 2: SET THE NEW PRIMITIVE VALUES ---
            await PracticeTestAttempt.findByIdAndUpdate(attempt._id, {
                $set: setNewFields,
            }, { new: false });

            migratedCount++;
        }

        console.log(`✅ Migration complete! Updated ${migratedCount} practice test attempts.`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB disconnected.');
    }
}

migrateSatScores();