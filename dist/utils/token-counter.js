"use strict";
/**
 * Token counting utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.countTokens = countTokens;
/**
 * Count tokens in a text string (approximation)
 *
 * Note: This is a very simplified token counter. In production,
 * use a proper tokenizer for the specific model you're using.
 *
 * @param text - The text to count tokens for
 * @returns Approximate token count
 */
function countTokens(text) {
    // This is a very simplified approximation (roughly 4 characters per token)
    // In production, use a proper tokenizer for your specific model
    return Math.ceil(text.length / 4);
}
