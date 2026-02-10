// /public/plugins/katex/katex_plugin.js

tinymce.PluginManager.add('katex', (editor, url) => {
    
    const insertKatexEquation = () => {
        editor.windowManager.open({
            title: 'Insert KaTeX Equation',
            body: {
                type: 'panel',
                items: [
                    {
                        type: 'input',
                        name: 'latexCode',
                        label: 'LaTeX Code (e.g., \\frac{a}{b})',
                        placeholder: '\\frac{dy}{dx} + \\frac{1}{x}y = x^2'
                    }
                ]
            },
            buttons: [
                { type: 'cancel', text: 'Close' },
                { type: 'submit', text: 'Save', primary: true }
            ],
            onSubmit: (api) => {
                const data = api.getData();
                const latex = data.latexCode.trim();
                api.close();

                // If logs are still suppressed, this is our only reliable path.
                
                if (!latex) return;

                const tempDiv = document.createElement('span');
                
                try {
                    // Check if KaTeX is available (silent failure confirmation)
                    if (typeof window.katex === 'undefined') {
                        throw new Error("KaTeX Library Error: Library is not loaded.");
                    }

                    // CRITICAL STEP: Render to HTML
                    window.katex.render(latex, tempDiv, { 
                        throwOnError: true, 
                        displayMode: true 
                    });

                    // 1. Create the final HTML structure for insertion
                    const renderedHtml = `<span 
                        class="math-display mceNonEditable" 
                        contenteditable="false" 
                        data-latex="${tinymce.DOM.encode(latex)}">
                        ${tempDiv.innerHTML}
                    </span>`;

                    // 2. *** NEW INSERTION METHOD ***
                    // Use execCommand to force the insertion of the HTML
                    editor.execCommand('mceInsertContent', false, renderedHtml);

                } catch (e) {
                    // FALLBACK: If rendering fails (likely due to syntax)
                    editor.notificationManager.open({
                        text: `KaTeX Error. Check syntax. Raw text inserted.`,
                        type: 'error',
                        timeout: 8000
                    });

                    // Insert raw text as a final fallback
                    editor.insertContent(latex); 
                }
            }
        });
    };

    // ... (rest of plugin setup is the same)
    editor.ui.registry.addButton('katexbutton', {
        text: 'fx Math',
        tooltip: 'Insert KaTeX Equation',
        onAction: insertKatexEquation
    });
    
    editor.on('init', () => {
        editor.dom.addClass(editor.dom.select('.math-display'));
    });

    return {
        getMetadata: () => ({ name: 'KaTeX Math Plugin', url: 'https://katex.org' })
    };
});