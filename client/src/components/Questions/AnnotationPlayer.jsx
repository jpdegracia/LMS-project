import React, { useState, useCallback } from 'react';
import { Annotation } from 'react-annotation';

// ===================================================================
// 1. Popup for DISPLAYING an existing annotation's note
// ===================================================================
const NotePopup = ({ note, onClose }) => (
  <div style={{
    position: 'absolute',
    top: '100%',
    left: '0',
    background: 'white',
    border: '1px solid #ccc',
    borderRadius: '4px',
    padding: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    zIndex: 10,
    minWidth: '200px'
  }}>
    <p style={{ margin: 0, paddingBottom: '10px' }}>{note}</p>
    <button
      onClick={onClose}
      style={{ fontSize: '12px', padding: '2px 8px' }}
    >
      Close
    </button>
  </div>
);

// ===================================================================
// 2. Modal for CREATING/EDITING a new annotation
// ===================================================================
const AnnotationEditorModal = ({ selection, onSave, onCancel }) => {
  const [note, setNote] = useState('');
  const [color, setColor] = useState('#ffef99'); // Default yellow

  const handleSave = () => {
    onSave({ note, color });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '20px',
        width: '400px'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Add Annotation Note</h3>
        <p style={{ fontStyle: 'italic', background: '#f4f4f4', padding: '8px', borderRadius: '4px' }}>
          "{selection.text}"
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Enter your note..."
          style={{ width: '100%', minHeight: '100px', boxSizing: 'border-box', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', margin: '15px 0' }}>
          <label htmlFor="annot-color" style={{ marginRight: '10px' }}>Highlight Color:</label>
          <input
            id="annot-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button onClick={onCancel} style={{ padding: '8px 12px' }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: '8px 12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>Save</button>
        </div>
      </div>
    </div>
  );
};

// ===================================================================
// 3. The Main Annotation Player Component
// ===================================================================
function AnnotationPlayer({ rawText, annotations = [], onAnnotationsChange, source = 'question' }) {
  // State for DISPLAYING a note popup
  const [activeAnnotation, setActiveAnnotation] = useState(null);
  
  // State for CREATING a new annotation
  const [selection, setSelection] = useState(null);

  // Check for bad or missing text
  if (!rawText || rawText.trim() === '' || rawText === 'Empty Legacy Text') {
    return (
      <div style={{
        padding: '20px',
        background: '#fff3f3',
        border: '1px solid #ffcccc',
        borderRadius: '4px',
        color: '#d90000',
        fontFamily: 'monospace'
      }}>
        [Question text is missing or could not be loaded.]
      </div>
    );
  }

  // --- Handlers for Annotation Actions ---

  // Called when a user highlights new text OR deletes an old one
  const handleChange = useCallback((newAnnotations) => {
    // 1. Check for ADDITION
    if (newAnnotations.length > annotations.length) {
      // Find the new annotation (the one that's not in the original `annotations` prop)
      const newSelection = newAnnotations.find(a => 
        !annotations.some(b => b.start === a.start && b.end === a.end)
      );
      if (newSelection) {
        // Store this temporary selection and show the editor modal
        setSelection(newSelection);
      }
    } 
    // 2. Check for DELETION
    else if (newAnnotations.length < annotations.length) {
      // A highlight was removed. Pass the new, shorter array up to the parent.
      // We also add `data` back in, as the library sometimes strips it.
      const updatedAnnotations = newAnnotations.map(a => a.data || a);
      onAnnotationsChange(updatedAnnotations);
    }
  }, [annotations, onAnnotationsChange]);

  // Called when the user clicks "Save" in the modal
  const handleSaveAnnotation = useCallback(({ note, color }) => {
    if (!selection) return;

    // Create the complete annotation object
    const completeAnnotation = {
      ...selection,
      note: note,
      color: color,
      source: source,
      tag: '', // `tag` is in your schema, so we add it.
      style: {}  // `style` is in your schema, so we add it.
    };
    
    // Add the new complete annotation to the existing list and send it to the parent
    onAnnotationsChange([...annotations, completeAnnotation]);
    
    // Close the modal
    setSelection(null);
  }, [selection, annotations, onAnnotationsChange, source]);

  // Called when the user clicks "Cancel" in the modal
  const handleCancelAnnotation = useCallback(() => {
    setSelection(null);
  }, []);

  // Called when clicking an EXISTING annotation to show its note
  const handleDisplayClick = useCallback((annot, e) => {
    e.stopPropagation();
    setActiveAnnotation(annot);
  }, []);

  // Closes the note popup when clicking anywhere else
  const handleCloseDisplayPopup = useCallback(() => {
    setActiveAnnotation(null);
  }, []);

  // Add the onClick handler to all existing annotations
  const processedAnnotations = annotations.map(annot => ({
    ...annot,
    data: annot, // Store the original data
    onClick: (e) => handleDisplayClick(annot, e),
  }));

  return (
    // This outer div is for closing the popup when clicking away
    <div
      className="annotation-player-container"
      onClick={handleCloseDisplayPopup}
      style={{ 
        position: 'relative', 
        lineHeight: '2.0', // Increase line-height so highlights don't overlap
        fontSize: '1.1rem',
        fontFamily: 'Georgia, serif'
      }}
    >
      <Annotation
        value={processedAnnotations}
        content={rawText}
        onChange={handleChange} 
        // `getSpan` defines how each highlight is rendered
        getSpan={(span) => {
          const isActive = activeAnnotation && 
                           activeAnnotation.start === span.start && 
                           activeAnnotation.end === span.end;

          return (
            <mark
              key={`${span.start}-${span.end}`}
              style={{
                backgroundColor: span.color || '#ffef99', // Use color from DB
                padding: '2px 0',
                borderRadius: '3px',
                cursor: 'pointer',
                // Make the active highlight stand out
                outline: isActive ? '2px solid #007bff' : 'none',
              }}
              onClick={span.onClick}
            >
              {span.text} {/* 'text' is automatically populated by the library */}
              
              {/* Show the popup if this annotation is active */}
              {isActive && (
                <NotePopup
                  note={span.note || "No note for this highlight."}
                  onClose={handleCloseDisplayPopup}
                />
              )}
            </mark>
          );
        }}
      />

      {/* Show the editor modal if a new selection is being made */}
      {selection && (
        <AnnotationEditorModal
          selection={selection}
          onSave={handleSaveAnnotation}
          onCancel={handleCancelAnnotation}
        />
      )}
    </div>
  );
}

export default AnnotationPlayer;