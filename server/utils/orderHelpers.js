
import mongoose from 'mongoose';
import { Section } from '../models/SectionSchema.js'; 
import { Module } from '../models/ModuleSchema.js'; 

// --- Section Order Helpers ---

export const getNextSectionOrder = async (courseId, session = null) => {
    try {
        const lastSection = await Section.findOne({ course: courseId })
                                         .sort({ order: -1 })
                                         .session(session);
        return lastSection ? lastSection.order + 1 : 1;
    } catch (error) {
        console.error("Error getting next section order:", error);
        throw error;
    }
};

export const shiftSectionOrderUp = async (courseId, deletedSectionOrder, session = null) => {
    try {
        console.log(`[OrderHelper] Shifting section orders for course ${courseId} after deleting order ${deletedSectionOrder}`);
        const result = await Section.updateMany(
            {
                course: courseId,
                order: { $gt: deletedSectionOrder }
            },
            { $inc: { order: -1 } },
            { session: session }
        );
        console.log(`[OrderHelper] Shifted ${result.modifiedCount} sections up.`);
        return result;
    } catch (error) {
        console.error("[OrderHelper] Error shifting section order up:", error);
        throw error;
    }
};

export const reorderSection = async (sectionIdToMove, courseId, newOrder, session = null) => {
    let oldOrder;
    try {
        let localSession = session;
        let startedNewSession = false;
        if (!localSession) {
            localSession = await mongoose.startSession();
            localSession.startTransaction();
            startedNewSession = true;
        }

        try {
            const sectionToMove = await Section.findById(sectionIdToMove).session(localSession);
            if (!sectionToMove) {
                throw new Error('Section not found.');
            }
            oldOrder = sectionToMove.order;

            if (oldOrder === newOrder) {
                console.log("[OrderHelper] Section is already in the target order. No reordering needed.");
                if (startedNewSession) {
                    await localSession.abortTransaction(); // No need to commit empty transaction
                }
                return { message: "No change needed." };
            }

            console.log(`[OrderHelper] Reordering section ${sectionIdToMove} from order ${oldOrder} to ${newOrder} in course ${courseId}`);

            if (newOrder < oldOrder) {
                // Moving UP (e.g., from 3 to 1): Increment items between newOrder and oldOrder-1
                await Section.updateMany(
                    {
                        course: courseId,
                        order: { $gte: newOrder, $lt: oldOrder }
                    },
                    { $inc: { order: 1 } },
                    { session: localSession }
                );
            } else {
                // Moving DOWN (e.g., from 1 to 3): Decrement items between oldOrder+1 and newOrder
                await Section.updateMany(
                    {
                        course: courseId,
                        order: { $gt: oldOrder, $lte: newOrder }
                    },
                    { $inc: { order: -1 } },
                    { session: localSession }
                );
            }

            sectionToMove.order = newOrder;
            await sectionToMove.save({ session: localSession });

            if (startedNewSession) {
                await localSession.commitTransaction();
            }
            console.log(`[OrderHelper] Successfully reordered section ${sectionIdToMove}.`);
            return { message: "Section reordered successfully." };

        } catch (txnError) {
            if (startedNewSession) {
                await localSession.abortTransaction();
            }
            throw txnError;
        } finally {
            if (startedNewSession) {
                localSession.endSession();
            }
        }

    } catch (error) {
        console.error(`[OrderHelper] Error reordering section ${sectionIdToMove}:`, error);
        throw error;
    }
};

// --- Module Order Helpers ---

export const getNextModuleOrder = async (sectionId, session = null) => {
    try {
        const lastModule = await Module.findOne({ section: sectionId })
                                       .sort({ order: -1 })
                                       .session(session);
        return lastModule ? lastModule.order + 1 : 1;
    } catch (error) {
        console.error("Error getting next module order:", error);
        throw error;
    }
};

export const shiftModuleOrderUp = async (sectionId, deletedModuleOrder, session = null) => {
    try {
        console.log(`[OrderHelper] Shifting module orders for section ${sectionId} after deleting order ${deletedModuleOrder}`);
        const result = await Module.updateMany(
            {
                section: sectionId,
                order: { $gt: deletedModuleOrder }
            },
            { $inc: { order: -1 } },
            { session: session }
        );
        console.log(`[OrderHelper] Shifted ${result.modifiedCount} modules up.`);
        return result;
    } catch (error) {
        console.error("[OrderHelper] Error shifting module order up:", error);
        throw error;
    }
};

export const reorderModule = async (moduleIdToMove, sectionId, newOrder, session = null) => {
    let oldOrder;
    try {
        let localSession = session;
        let startedNewSession = false;
        if (!localSession) {
            localSession = await mongoose.startSession();
            localSession.startTransaction();
            startedNewSession = true;
        }

        try {
            const moduleToMove = await Module.findById(moduleIdToMove).session(localSession);
            if (!moduleToMove) {
                throw new Error('Module not found.');
            }
            oldOrder = moduleToMove.order;

            if (oldOrder === newOrder) {
                console.log("[OrderHelper] Module is already in the target order. No reordering needed.");
                if (startedNewSession) {
                    await localSession.abortTransaction();
                }
                return { message: "No change needed." };
            }

            console.log(`[OrderHelper] Reordering module ${moduleIdToMove} from order ${oldOrder} to ${newOrder} in section ${sectionId}`);

            if (newOrder < oldOrder) {
                await Module.updateMany(
                    {
                        section: sectionId,
                        order: { $gte: newOrder, $lt: oldOrder }
                    },
                    { $inc: { order: 1 } },
                    { session: localSession }
                );
            } else {
                await Module.updateMany(
                    {
                        section: sectionId,
                        order: { $gt: oldOrder, $lte: newOrder }
                    },
                    { $inc: { order: -1 } },
                    { session: localSession }
                );
            }

            moduleToMove.order = newOrder;
            await moduleToMove.save({ session: localSession });

            if (startedNewSession) {
                await localSession.commitTransaction();
            }
            console.log(`[OrderHelper] Successfully reordered module ${moduleIdToMove}.`);
            return { message: "Module reordered successfully." };

        } catch (txnError) {
            if (startedNewSession) {
                await localSession.abortTransaction();
            }
            throw txnError;
        } finally {
            if (startedNewSession) {
                localSession.endSession();
            }
        }

    } catch (error) {
        console.error(`[OrderHelper] Error reordering module ${moduleIdToMove}:`, error);
        throw error;
    }
};

