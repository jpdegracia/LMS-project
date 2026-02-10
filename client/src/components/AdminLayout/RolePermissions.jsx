import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PermissionPage = () => {
    const [permissionsData, setPermissionsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/admin/roles/all-permissions`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Failed to fetch permissions: Status ${response.status}`);
                }

                const result = await response.json();

                if (result.success && result.data && result.data.groupedPermissions) {
                    setPermissionsData(result.data.groupedPermissions);
                } else {
                    throw new Error('Invalid response structure for permissions data.');
                }
            } catch (err) {
                console.error('Error fetching permissions:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPermissions();
    }, []);

    const handleGoBack = () => {
        navigate(-1);
    };

    // --- Loading State ---
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-4 text-gray-700">Loading permissions...</p>
                </div>
            </div>
        );
    }

    // --- Error State ---
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg max-w-xl mx-auto text-center" role="alert">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline ml-2">{error}</span>
                    <p className="text-sm mt-2">Please ensure you have the necessary `role:read` permission or contact an administrator.</p>
                </div>
            </div>
        );
    }

    // --- Prepare and Filter data for rendering ---
    const groupedAndFilteredPermissions = {};
    if (permissionsData) {
        const sortedCategories = Object.keys(permissionsData).sort();
        sortedCategories.forEach(category => {
            const filteredCategoryPermissions = permissionsData[category]
                .slice()
                .sort((a, b) => a.localeCompare(b))
                .filter(permissionKey =>
                    permissionKey.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(permissionKey => {
                    const description = `This permission allows users to perform '${permissionKey.replace(':', ' ')}' operations.`;
                    const examples = [
                        `e.g., Accessing all ${permissionKey.split(':')[0]} records.`,
                        `e.g., Creating new ${permissionKey.split(':')[0]} entries.`,
                        `e.g., Modifying existing ${permissionKey.split(':')[0]} attributes.`,
                        `e.g., Deleting ${permissionKey.split(':')[0]} data.`,
                    ];
                    return {
                        permissionKey,
                        description,
                        examples: examples.slice(0, 2)
                    };
                });

            if (filteredCategoryPermissions.length > 0) {
                groupedAndFilteredPermissions[category] = filteredCategoryPermissions;
            }
        });
    }

    return (
        <div className="container mx-auto p-6 sm:p-8 lg:p-10 max-w-4xl"> {/* Adjusted max-w to 4xl */}
            {/* --- Back Button --- */}
            <div className="mb-4">
                <button
                    onClick={handleGoBack}
                    className="flex items-center text-white bg-blue-700 rounded-3xl py-2 px-4 hover:text-black transition-colors duration-200"
                >
                    <svg
                        className="w-5 h-5 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        ></path>
                    </svg>
                    Back
                </button>
            </div>
            {/* --- End Back Button --- */}

            <h1 className="text-4xl font-semibold font-primary uppercase text-gray-900 mb-6 text-center tracking-tight">
                 Permissions Reference Guide
            </h1>
            <p className="text-lg text-gray-700 mb-8 font-secondary font-medium text-center max-w-2xl mx-auto">
                This table provides a comprehensive overview of all defined permissions, their purpose, and examples of their usage within the application.
            </p>

            {/* --- Search Input Field --- */}
            <div className="mb-8 max-w-md mx-auto">
                <input
                    type="text"
                    placeholder="Search by permission key (e.g., 'user:read')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md  bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            {/* --- End Search Input Field --- */}

            {Object.keys(groupedAndFilteredPermissions).length > 0 ? (
                Object.keys(groupedAndFilteredPermissions).map(category => (
                    <div key={category} className="mb-10">
                        <h2 className="text-2xl font-semibold font-primary uppercase text-gray-800 mb-4">
                            {category} Permissions
                        </h2>
                        <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 font-secondary uppercase tracking-wider">Permission Key</th>
                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 font-secondary uppercase tracking-wider">Description</th>
                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 font-secondary uppercase tracking-wider">Examples</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {groupedAndFilteredPermissions[category].map((perm, index) => (
                                        <tr key={perm.permissionKey} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="py-3 px-4 text-sm text-blue-700 font-secondary font-semibold">{perm.permissionKey}</td>
                                            <td className="py-3 px-4 text-sm text-gray-700 font-secondary">{perm.description}</td>
                                            <td className="py-3 px-4 text-sm text-gray-600 font-secondary">
                                                <ul className="list-disc list-inside space-y-0.5">
                                                    {perm.examples.map((example, exIndex) => (
                                                        <li key={exIndex}>{example}</li>
                                                    ))}
                                                </ul>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            ) : (
                <p className="mt-4 text-center text-gray-600 p-4 bg-white rounded-lg shadow-sm">
                    {searchQuery ? `No permissions found matching "${searchQuery}".` : "No permissions found or defined in the system."}
                </p>
            )}
        </div>
    );
};

export default PermissionPage;