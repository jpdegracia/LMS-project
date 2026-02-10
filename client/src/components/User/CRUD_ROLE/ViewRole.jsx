import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserContext from '../../UserContext/UserContext'; // Adjust path as needed
import { Tag, ScrollText, CheckSquare, XSquare, ArrowLeft, Loader2, ListTree } from 'lucide-react'; // Icons for display

const ViewRolePage = () => {
    const { id: roleId } = useParams(); // Get role ID from URL parameters
    const navigate = useNavigate(); // Hook for navigation
    const { hasPermission } = useContext(UserContext); // Access hasPermission from UserContext

    // State to hold the fetched role data
    const [roleData, setRoleData] = useState(null);
    // Loading state for initial data fetch
    const [loading, setLoading] = useState(true);
    // Error state for displaying messages
    const [error, setError] = useState(null);

    // Function to fetch role data from the backend
    useEffect(() => {
        const fetchRoleData = async () => {
            console.log("ViewRolePage: Starting role data fetch for ID:", roleId);
            
            // --- Permission Check: Ensure user has 'role:read' permission ---
            if (!hasPermission('role:read')) {
                const noPermissionError = "You don't have permission to view this role's details.";
                console.warn("ViewRolePage: Permission denied:", noPermissionError);
                setError(noPermissionError);
                setLoading(false);
                return; // Stop execution if permission is denied
            }

            try {
                setLoading(true); // Set loading to true while fetching
                setError(null); // Clear any previous errors

                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/roles/${roleId}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', // Important for sending HTTP-only cookies
                });

                console.log("ViewRolePage: Response status:", response.status);

                if (!response.ok) {
                    let errorDetails = 'Unknown error fetching role data.';
                    try {
                        const errorData = await response.json();
                        errorDetails = errorData.message || errorDetails;
                    } catch (jsonErr) {
                        console.error("ViewRolePage: Error parsing non-OK response as JSON:", jsonErr);
                        errorDetails = `Failed to parse error response. Status: ${response.status}.`;
                    }
                    throw new Error(errorDetails);
                }

                const data = await response.json();
                console.log("ViewRolePage: Parsed data:", data);

                if (data.success && data.role) {
                    setRoleData(data.role); // Set the fetched role data to state
                    console.log("ViewRolePage: Role data successfully set.");
                } else {
                    console.log("ViewRolePage: Backend reported success: false or role not found. Message:", data.message);
                    throw new Error(data.message || 'Role not found or backend reported failure.');
                }
            } catch (err) {
                console.error('ViewRolePage: Caught error:', err.message);
                setError(err.message); // Set error message
            } finally {
                setLoading(false); // Set loading to false after fetch completes
                console.log("ViewRolePage: Finished role data fetch.");
            }
        };

        fetchRoleData();
    }, [roleId, hasPermission]); // Dependencies: Re-run if roleId or hasPermission status changes

    // Handle navigation back to the role management page
    const handleBackClick = () => {
        navigate('/roles'); // Assuming this is your main role management route
    };

    // --- Conditional Rendering for Loading and Error States ---
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 text-gray-700">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
                <p className="mt-4">Loading role data...</p>
            </div>
        );
    }

    // Display a full error page if user does not have 'role:read' permission (or other critical errors)
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 text-red-700">
                <h2 className="text-3xl font-bold mb-4">Error</h2>
                <p className="text-lg text-center">{error}</p>
                <button
                    onClick={handleBackClick}
                    className="mt-6 inline-flex items-center justify-center py-2 px-5 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Go Back to Roles
                </button>
            </div>
        );
    }

    // If data is loaded and no error, display role details
    return (
        <section className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                    .font-inter {
                        font-family: 'Inter', sans-serif;
                    }
                    .animate-fade-in {
                        animation: fadeIn 0.5s ease-out;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>

            <div className="max-w-4xl w-full bg-white p-8 rounded-lg shadow-xl animate-fade-in">
                <h1 className="text-2xl font-semibold font-primary text-gray-900 mb-2 text-center tracking-tight capitalize">
                    Role: {roleData.name}
                </h1>
                <p className='font-medium font-secondary text-[15px] text-blue-600 mb-8 text-center'>(  ROLE ID: {roleId}  )</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Role Name */}
                    <div className="col-span-1">
                        <label className=" text-sm font-medium text-gray-500 flex items-center">
                            <Tag className="w-4 h-4 mr-1" /> Role Name
                        </label>
                        <p className="mt-1 text-lg text-gray-900 capitalize">{roleData.name || 'N/A'}</p>
                    </div>
                </div>

                {/* Permissions Section */}
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <ListTree className="w-5 h-5 mr-2" /> Assigned Permissions ({roleData.permissions?.length || 0})
                </h2>
                {roleData.permissions && roleData.permissions.length > 0 ? (
                    <div className="bg-gray-50 p-4 rounded-md shadow-inner max-h-80 overflow-y-auto">
                        <ul className="divide-y divide-gray-200">
                            {roleData.permissions.map(permission => (
                                <li key={permission._id} className="py-3 flex justify-between items-center">
                                    <div>
                                        <p className="text-base font-medium text-gray-800">{permission.name}</p>
                                        <p className="text-sm text-gray-600">{permission.description || 'No description.'}</p>
                                    </div>
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                                        {permission.category || 'General'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <p className="text-gray-600 italic">No permissions assigned to this role.</p>
                )}

                {/* Back Button */}
                <div className="col-span-full flex justify-end mt-6">
                    <button
                        onClick={handleBackClick}
                        className="inline-flex items-center justify-center py-2 px-5 btn-b transition duration-200"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to Roles
                    </button>
                </div>
            </div>
        </section>
    );
};

export default ViewRolePage;
