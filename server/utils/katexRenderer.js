import katex from 'katex';

/**
 * Renders a full HTML string by finding and replacing inline/display LaTeX code 
 * with its KaTeX-rendered HTML equivalent.
 * @param {string} rawHtml - The raw HTML (from TinyMCE) containing $...$ or $$...$$ delimiters.
 * @returns {string} The final HTML string with math rendered.
 */
export const renderHtmlWithLatex = (rawHtml) => {
    if (!rawHtml) return '';

    // Regex to find content enclosed in $$...$$ (display/block) or $...$ (inline)
    const latexRegex = /(\$\$)(.*?)(\$\$)|(\$)(.*?)(\$)/g;
    
    // A function to determine display mode and handle rendering
    const render = (latex, isDisplayMode) => {
        // --- FIX: Defensively decode &amp; back to & to prevent column errors ---
        const decodedLatex = latex.trim().replace(/&amp;/g, '&');
        // ---------------------------------------------------------------------

        try {
            // Render the decoded LaTeX using KaTeX
            const html = katex.renderToString(decodedLatex, {
                throwOnError: false, 
                displayMode: isDisplayMode, 
                output: 'html'
            });
            // Wrap the output to preserve display structure
            return `<span class="katex-ssr-rendered ${isDisplayMode ? 'display' : 'inline'}">${html}</span>`;
        } catch (error) {
            console.error("KaTeX error for:", decodedLatex);
            // Return the raw text wrapped in an error class for debugging
            return `<span class="katex-render-error">Error: ${decodedLatex}</span>`;
        }
    };

    // Replace all matches found by the regex
    const renderedHtml = rawHtml.replace(latexRegex, (match, d1, c1, d2, d3, c2, d4) => {
        // d1, c1, d2 are for $$...$$ (display mode)
        if (c1 !== undefined) {
            return render(c1, true); // Display mode
        }
        // d3, c2, d4 are for $...$ (inline mode)
        if (c2 !== undefined) {
            return render(c2, false); // Inline mode
        }
        return match; // Safe fallback for unmatched content
    });

    return renderedHtml;
};