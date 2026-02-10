import React, { useState, useContext } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import UserContext from '../UserContext/UserContext';
import Sidebar from './Sidebar';
import Subnavbar from './Subnavbar';

const MainLayout = () => {
    const { logout, loading } = useContext(UserContext);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Initial state: sidebar is open (controlled by click toggle)
    const [isSidebarHovered, setIsSidebarHovered] = useState(false); // New state to track if sidebar is being hovered
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout(); // Call the logout function from context
        navigate('/login'); // Redirect to login page after logout
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // Function to be passed to Sidebar to update hover state in MainLayout
    const handleSidebarHoverChange = (isHovering) => {
        setIsSidebarHovered(isHovering);
    };

    // Determine the effective sidebar width based on its open state and hover state
    // If sidebar is explicitly open OR it's collapsed but being hovered, it should be wide.
    // Otherwise, it should be narrow (collapsed).
    const effectiveSidebarWidth = (isSidebarOpen || isSidebarHovered) ? 'ml-64' : 'ml-20';

    // Global loading state for the layout (if authentication data is still being fetched)
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-xl font-semibold text-gray-700">Loading application layout...</div>
            </div>
        );
    }

    return (
        <div className="app-container flex h-screen overflow-hidden bg-gray-100">

            {/* Sidebar component, passing its state, toggle function, and hover callback */}
            <Sidebar
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={toggleSidebar}
                onSidebarHoverChange={handleSidebarHoverChange} // Pass the new hover callback
            />

            {/* Main content area, dynamically adjusting its left margin based on effective sidebar width */}
            <div
                className={`main-content flex-1 flex flex-col overflow-y-auto transition-all duration-300 ${effectiveSidebarWidth}`}
            >

                {/* Subnavbar component, also receiving sidebar state and toggle function */}
                <Subnavbar
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    toggleSidebar={toggleSidebar}
                    onLogout={handleLogout}
                />

                {/* This <Outlet /> is the key for nested routing!
                    Any route defined as a child of MainLayout in App.jsx
                    will render its element right here. */}
                <div className="page-content p-4 flex-grow">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default MainLayout;