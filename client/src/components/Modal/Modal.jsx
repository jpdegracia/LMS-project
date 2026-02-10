import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * A reusable Modal component that renders its children into a portal.
 * * NOTE: The fix for TinyMCE conflicts is added via the useEffect hook 
 * to stop the propagation of TinyMCE's focusin events from bubbling up 
 * to the modal's focus management system.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - The content to be rendered inside the modal.
 * @param {string} props.title - The title displayed at the top of the modal.
 * @param {function} props.onCancel - Callback function to be called when the modal is closed.
 * @param {boolean} [props.disableFocusEnforcement=false] - Allows TinyMCE dialogs to function correctly.
 */
const Modal = ({ children, title, onCancel }) => {
    
    // ⭐ THE TINYMCE FOCUS FIX ⭐
    useEffect(() => {
        // We listen for TinyMCE dialogs/popups getting focus.
        // If a focused element is inside a TinyMCE dialog (.tox-dialog), 
        // we stop the event from bubbling up to the main application's focus management (which might close the modal or break the dropdown).
        const handleFocusIn = (e) => {
            // Check if the focus event target is within a TinyMCE dialog or floating panel
            if (e.target.closest('.tox-dialog') || e.target.closest('.tox-tinymce-aux')) {
                e.stopImmediatePropagation();
            }
        };

        // Attach the listener globally to the document body
        document.addEventListener('focusin', handleFocusIn, true);

        // Cleanup the listener when the component unmounts
        return () => {
            document.removeEventListener('focusin', handleFocusIn, true);
        };
    }, []); 

    return createPortal(
        <div
            // Overlay styles (unchanged)
            className="fixed inset-0 bg-gray-200 bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={onCancel} 
        >
            <div
                // Modal content container (unchanged)
                className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl max-h-[100vh] overflow-y-auto"
                onClick={e => e.stopPropagation()} 
            >
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                    {/* Added close button back for usability */}
                    <button
                        onClick={onCancel}
                        className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none focus:outline-none"
                        aria-label="Close modal"
                    >
                        &times;
                    </button>
                </div>
                {children}
            </div>
        </div>,
        document.body
    );
};

export default Modal;