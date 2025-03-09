/**
 * Utility for working with multimodal content
 */
import { ContentPart } from '../interfaces';
/**
 * Helper class for creating multimodal content
 */
export declare class MultiModal {
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
    static text(text: string): ContentPart;
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
    static imageUrl(url: string, detail?: 'low' | 'medium' | 'high' | 'auto'): ContentPart;
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
    static content(...parts: ContentPart[]): ContentPart[];
}
