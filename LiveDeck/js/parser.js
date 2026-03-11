/**
 * LiveDeck - Markdown Parser & Serializer
 * 
 * Handles the two-way conversion between raw Markdown strings and structured Block objects.
 * Slide format:
 * Slides are separated by `\n\n---\n\n`.
 * 
 * Block format:
 * :::block {"id":"abc", "type":"text", "x":0, "y":0, "w":400, "h":200, "z":1}
 * Content goes here
 * :::
 */

const parser = {
    /**
     * Parses the full document markdown into an array of slide objects.
     * @param {string} md - The full markdown string.
     * @returns {Array<{id: string, blocks: Array<Object>}>} Array of slides.
     */
    parseDeck(md) {
        // Match '---' on its own line, with optional leading/trailing whitespace/newlines
        const slideStrings = md.split(/\n?\s*^---\s*$\s*\n?/m).map(s => s.trim()).filter(s => s !== '');
        if (slideStrings.length === 0 && md.trim() !== '') slideStrings.push(md.trim());
        
        return slideStrings.map((slideStr, index) => {
            return {
                id: `slide-${index}`,
                blocks: this.parseSlide(slideStr)
            };
        });
    },

    /**
     * Parses a single slide's markdown into an array of block objects.
     * @param {string} slideMd - The markdown string for a single slide.
     * @returns {Array<Object>} Array of block objects with positioning data.
     */
    parseSlide(slideMd) {
        const blocks = [];
        // Support both :::block {config}\nContent::: AND :::type\nContent::: (shorthand)
        const blockRegex = /:::(block|text|poll|quiz|image|board|whiteboard)\s*?({.*?})?\s*?\n?([\s\S]*?):::/g;
        
        let lastIndex = 0;
        let match;

        while ((match = blockRegex.exec(slideMd)) !== null) {
            // Stray content logic
            const precedingText = slideMd.substring(lastIndex, match.index).trim();
            if (precedingText && precedingText !== '---') {
                blocks.push(this.createDefaultTextBlock(precedingText));
            }

            const type = match[1];
            const configStr = match[2];
            const content = match[3].trim();

            if (type === 'block') {
                try {
                    const config = configStr ? JSON.parse(configStr) : {};
                    blocks.push({
                        ...config,
                        content: content
                    });
                } catch (e) {
                    console.error("Block Config Parse Error:", e, configStr);
                    blocks.push(this.createDefaultTextBlock(match[0]));
                }
            } else {
                // Shorthand notation
                blocks.push({
                    id: this.generateId(),
                    type: type,
                    x: 400,
                    y: 200,
                    w: 1120,
                    h: 500,
                    z: blocks.length + 1,
                    content: content
                });
            }

            lastIndex = blockRegex.lastIndex;
        }

        const trailingText = slideMd.substring(lastIndex).trim();
        if (trailingText && trailingText !== '---') {
            blocks.push(this.createDefaultTextBlock(trailingText));
        }

        return blocks;
    },

    /**
     * Serializes an array of slides back into the full markdown string.
     * @param {Array<{blocks: Array<Object>}>} slides - Array of slide objects.
     * @returns {string} Full markdown string.
     */
    serializeDeck(slides) {
        return slides.map(slide => this.serializeSlide(slide.blocks)).join('\n\n---\n\n');
    },

    /**
     * Serializes an array of blocks back into slide markdown.
     * @param {Array<Object>} blocks - Array of block objects.
     * @returns {string} Slide markdown string.
     */
    serializeSlide(blocks) {
        return blocks.map(block => {
            const { content, ...config } = block;
            return `:::block ${JSON.stringify(config)}\n${content}\n:::`;
        }).join('\n\n');
    },

    /**
     * Helper to wrap legacy or raw text into a standard block format.
     * @param {string} text - Raw markdown text.
     * @returns {Object} A standardized text block.
     */
    createDefaultTextBlock(text) {
        return {
            id: 'blk-' + Math.random().toString(36).substr(2, 9),
            type: 'text',
            x: 100,
            y: 100,
            w: 800,
            h: 400,
            z: 1,
            content: text
        };
    },

    /**
     * Helper to generate a unique ID for new blocks.
     * @returns {string} Unique ID.
     */
    generateId() {
        return 'blk-' + Math.random().toString(36).substr(2, 9);
    }
};
