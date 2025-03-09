/**
 * Helper class for creating multimodal content
 */
export class MultiModal {
    /**
     * Create a text content part
     *
     * @param text - Text content
     * @returns Content part object
     *
     * @example
     * ```typescript
     * const textPart = MultiModal.text('Describe this image:');
     * ```
     */
    static text(text) {
        return { type: 'text', text };
    }
    /**
     * Create an image URL content part
     *
     * @param url - Image URL
     * @param detail - Detail level ('low', 'medium', 'high', 'auto')
     * @returns Content part object
     *
     * @example
     * ```typescript
     * const imagePart = MultiModal.imageUrl('https://example.com/image.jpg', 'high');
     * ```
     */
    static imageUrl(url, detail = 'auto') {
        return { type: 'image_url', image_url: { url, detail } };
    }
    /**
     * Create a content array with multiple parts
     *
     * @param parts - Array of content parts
     * @returns Array of content parts
     *
     * @example
     * ```typescript
     * const multimodalContent = MultiModal.content(
     *   MultiModal.text('What can you see in this image?'),
     *   MultiModal.imageUrl('https://example.com/image.jpg')
     * );
     * ```
     */
    static content(...parts) {
        return parts;
    }
}
//# sourceMappingURL=multi-modal.js.map