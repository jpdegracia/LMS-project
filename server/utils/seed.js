import mongoose from 'mongoose';
import dotenv from 'dotenv';

import { User } from '../models/UserSchema.js';
import { Role } from '../models/RoleSchema.js'; 
import { Permission } from '../models/PermissionSchema.js'; 

import { Course } from '../models/CourseSchema.js';
import { SATGradingScale } from '../models/SATGradingScale.js';
import SAT_CONVERSION_TABLE_ENTRIES from './SATConvertionData.js'; // <-- Ensure path is correct

dotenv.config();

// Define your initial permissions and roles here.
const initialPermissionGroups = {
    'user_management': [
        'user:create',
        'user:read:all',
        'user:update',
        'user:read',
        'user:delete',
        'user:assign:roles',

    ],
    'role_management': [
        'role:create',
        'role:read:all',
        'role:update',
        'role:delete',
        'role:read',
    ],
    'permission_management': [
        'permission:create',
        'permission:read:all',
        'permission:update',
        'permission:delete',
        'permission:read',
    ],
    'general_access': [
        'view:profile',
        'view:courses',
        'view:assignments',
        'view:all_students',
    ],
    'course_management': [
        'course:create'
    ],
    'grade_management': [
        'grade:assignments'
    ]
};

const initialRolePermissions = {
    'admin': [
        'manage:admin', // Top-level admin access
        'user_management', // Group of user-related permissions
        'role_management', // Group of role-related permissions
        'permission_management', // Group of global permission type management
        'general_access', // Admin often has all general access too
    ],
    'student': [
        'general_access', // Assign the group of general access permissions
    ],
    'teacher': [
        'general_access', // Assign the group of general access permissions
        'create:courses',
        'grade:assignments',
        'user:read:all'
    ],

};

export const seedDatabase = async () => {
    try {
        console.log('[Seed] Starting database seeding...');

        // --------------------------------------------------------------------------------
        // --- 1. SEED SAT GRADING SCALE (Execution Guaranteed) ---
        // --- This must run before any non-idempotent logic that might cause premature exit.
        // --------------------------------------------------------------------------------
        // if (SAT_CONVERSION_TABLE_ENTRIES && SAT_CONVERSION_TABLE_ENTRIES.length > 0) {
        //     console.log('[Seed] Checking SAT Grading Scales for all Practice Tests...');
            
        //     // Find ALL courses that use the 'practice_test' content type.
        //     const satCourses = await Course.find({ 
        //         contentType: 'practice_test' 
        //     });

        //     if (satCourses.length > 0) {
        //         let count = 0;
        //         for (const satCourse of satCourses) {
        //             const courseId = satCourse._id;
        //             const courseTitle = satCourse.title;

        //             const scalePayload = {
        //                 courseId: courseId,
        //                 conversionTable: SAT_CONVERSION_TABLE_ENTRIES,
        //             };
            
        //             // Upsert: Find one by courseId, update if found, insert if not.
        //             await SATGradingScale.findOneAndUpdate(
        //                 { courseId: courseId },
        //                 { $set: scalePayload },
        //                 { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        //             );
        //             count++;
        //             console.log(`✅ [Seed] Processed SAT Scale for course: ${courseTitle}`);
        //         }
        //         console.log(`[Seed] Successfully processed scales for ${count} practice tests.`);
        //     } else {
        //         console.warn(`[Seed] ⚠️ WARN: No courses found with contentType 'practice_test'. Skipping SAT scale seed.`);
        //     }
        // } else {
        //     console.warn(`[Seed] ⚠️ WARN: SAT conversion data is empty or missing in SATConvertionData.js. Skipping SAT scale seed.`);
        // }
        
        // --------------------------------------------------------------------------------
        // --- 2. Seed Permissions (Idempotent Core Logic - Unchanged) ---
        // --- NOTE: This logic remains in case new permissions or roles are added.
        // --------------------------------------------------------------------------------
        
        // Collect all unique permission names for seeding
        // const allSeedPermissionNames = new Set();
        // for (const groupName in initialPermissionGroups) {
        //     initialPermissionGroups[groupName].forEach(perm => allSeedPermissionNames.add(perm));
        // }
        // for (const roleName in initialRolePermissions) {
        //     initialRolePermissions[roleName].forEach(item => {
        //         const lowerItem = typeof item === 'string' ? item.toLowerCase() : item;
        //         if (!initialPermissionGroups[lowerItem]) {
        //             allSeedPermissionNames.add(lowerItem);
        //         }
        //     });
        // }
        // allSeedPermissionNames.add('manage:admin');

        // const permissionMap = new Map();
        // for (const permName of allSeedPermissionNames) {
        //     let permissionDoc = await Permission.findOne({ name: permName.toLowerCase() });
        //     if (!permissionDoc) {
        //         let category = permName.split(':')[0];
        //         for (const group in initialPermissionGroups) {
        //             if (initialPermissionGroups[group].includes(permName)) {
        //                 category = group;
        //                 break;
        //             }
        //         }
        //         permissionDoc = await Permission.create({
        //             name: permName.toLowerCase(),
        //             description: `Auto-seeded: ${permName}`,
        //             category: category
        //         });
        //         console.log(`[Seed] Created new permission: '${permName}'`);
        //     }
        //     permissionMap.set(permName.toLowerCase(), permissionDoc._id);
        // }
        // console.log('[Seed] Permissions seeded.');


        // --- 3. Seed Roles (Idempotent Core Logic - Unchanged) ---
        // for (const roleName in initialRolePermissions) {
        //     let roleDoc = await Role.findOne({ name: roleName.toLowerCase() });
        //     let expandedPermissions = [];
        //     initialRolePermissions[roleName].forEach(item => {
        //         const lowerItem = typeof item === 'string' ? item.toLowerCase() : item;
        //         if (initialPermissionGroups[lowerItem]) {
        //             expandedPermissions = expandedPermissions.concat(initialPermissionGroups[lowerItem] || []);
        //         } else {
        //             expandedPermissions.push(lowerItem);
        //         }
        //     });

        //     const permissionIdsForRole = [...new Set(expandedPermissions)]
        //         .map(permName => {
        //             const id = permissionMap.get(permName.toLowerCase());
        //             if (!id) {
        //                 console.warn(`[Seed] WARN: Permission '${permName}' referenced in role '${roleName}' not found in seeded permissions.`);
        //             }
        //             return id;
        //         })
        //         .filter(Boolean);

        //     if (!roleDoc) {
        //         roleDoc = await Role.create({
        //             name: roleName.toLowerCase(),
        //             permissions: permissionIdsForRole,
        //             description: `Default ${roleName} role.`
        //         });
        //         console.log(`[Seed] Created new role: '${roleName.toLowerCase()}'`);
        //     } else {
        //         const currentPermissions = roleDoc.permissions || [];
        //         const currentPermissionIdsSorted = currentPermissions.map(id => id.toString()).sort();
        //         const newPermissionIdsSorted = permissionIdsForRole.map(id => id.toString()).sort();

        //         if (JSON.stringify(currentPermissionIdsSorted) !== JSON.stringify(newPermissionIdsSorted)) {
        //             roleDoc.permissions = permissionIdsForRole;
        //             await roleDoc.save();
        //             console.log(`[Seed] Updated permissions for existing role: '${roleName.toLowerCase()}'`);
        //         } else {
        //             console.log(`[Seed] Role '${roleName.toLowerCase()}' already up-to-date.`);
        //         }
        //     }
        // }
        // console.log('[Seed] Roles seeded.');

        // --- 4. Skip User Seeding (Commented blocks are correctly skipped) ---
        
        console.log('Database seeding complete!');
        
    } catch (error) {
        console.error('Error during database seeding:', error);
        // If an error occurs, the process exits.
        process.exit(1);
    }
};

export default seedDatabase;