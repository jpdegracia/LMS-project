import mongoose from "mongoose";

// 1. Define the structure for a single area (questionText or questionContext)
const rangyAnnotationAreaSchema = new mongoose.Schema({
    // Stores the full string output from highlighter.serialize()
    serialized: { 
        type: String, 
        default: "",
        description: "Rangy's full serialized string for all highlights in this area."
    },
    // Stores the notes: Highlight ID (Rangy's UUID) -> Note Text (string)
    // CRITICAL FIX: Using Mixed instead of Map for reliable serialization.
    notes: { 
        type: mongoose.Schema.Types.Mixed, // Allows dynamic string keys and string values
        default: {}
    },
    snippets: { 
        type: mongoose.Schema.Types.Mixed, // Highlight ID -> Snippet Text (string)
        default: {}
    }
}, { _id: false });

// 2. Define the structure for a single Question's annotations
// This sub-schema defines the fixed fields (questionText and questionContext).
const questionAnnotationsWrapperSchema = new mongoose.Schema({
    questionText: { 
        type: rangyAnnotationAreaSchema, 
        default: {} 
    },
    questionContext: { 
        type: rangyAnnotationAreaSchema, 
        default: {} 
    },
}, { _id: false });

// 3. Define the final top-level schema for the 'annotations' field in QuizAttempt.
// This uses the Mixed type to represent the dictionary { [Question ID]: { ... } }
// CRITICAL FIX: Using Mixed type directly at the root to allow dynamic Question ID keys.
export const rangyAnnotationsSchema = new mongoose.Schema(
    {}, 
    { 
        strict: false, // Allows arbitrary Question ID keys
        minimize: false // Ensures empty objects {} are saved if set explicitly
    }
);

// We define an index on the original quiz module ID for efficient lookups
rangyAnnotationsSchema.index({ originalQuizModuleId: 1 });

// We must manually define a schema path for the dynamic question IDs 
// if you were previously trying to apply the wrapper schema to them.
// However, the simplest and most robust approach is to let the top level be Mixed (as above)
// and rely on the database structure.

// You can export the Area schema for reuse if needed, but it's nested here.
// export { rangyAnnotationAreaSchema };