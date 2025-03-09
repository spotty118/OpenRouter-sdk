"use strict";
/**
 * Example demonstrating the use of EmbeddingGenerator with ChromaDB
 */
Object.defineProperty(exports, "__esModule", { value: true });
const open_router_1 = require("../core/open-router");
const embedding_generator_1 = require("../utils/embedding-generator");
const vector_db_1 = require("../interfaces/vector-db");
/**
 * This example demonstrates how to use the EmbeddingGenerator with ChromaDB
 * for generating embeddings and performing semantic search.
 */
async function main() {
    // Initialize OpenRouter with your API key
    const openRouter = new open_router_1.OpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY || 'your-api-key-here',
        defaultModel: 'anthropic/claude-3-opus'
    });
    console.log('Creating embedding generator...');
    // Create an embedding generator
    const embeddingGenerator = new embedding_generator_1.EmbeddingGenerator({
        dimensions: 1536,
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'text-embedding-3-small',
        useOpenRouter: false // Set to true to use OpenRouter API instead of OpenAI
    });
    // Create a Chroma vector database
    console.log('Creating Chroma vector database...');
    const vectorDb = openRouter.createVectorDb({
        dimensions: 1536,
        similarityMetric: 'cosine',
        type: vector_db_1.VectorDBType.Chroma,
        chroma: {
            chromaUrl: 'http://localhost:8000',
            collectionPrefix: 'embedding-example-',
            useInMemory: true
        }
    });
    // Sample texts to generate embeddings for
    const texts = [
        'Electric vehicles are becoming increasingly popular due to environmental concerns.',
        'Battery technology has improved significantly in the past decade.',
        'Charging infrastructure is expanding rapidly across major cities.',
        'Government incentives have accelerated the adoption of electric vehicles.',
        'The range of modern electric vehicles now exceeds 300 miles on a single charge.'
    ];
    console.log('Generating embeddings for sample texts...');
    // Generate embeddings for the texts
    const embeddings = await embeddingGenerator.generateEmbeddings(texts);
    console.log(`Generated ${embeddings.length} embeddings, each with ${embeddings[0].length} dimensions`);
    // Create documents with the generated embeddings
    const documents = texts.map((text, index) => ({
        id: `doc-${index + 1}`,
        content: text,
        metadata: { source: 'embedding-example', topic: 'electric-vehicles' },
        embedding: embeddings[index]
    }));
    // Add documents to the vector database
    console.log('Adding documents with pre-computed embeddings to vector database...');
    const docIds = await vectorDb.addDocuments(documents);
    console.log(`Added documents with IDs: ${docIds.join(', ')}`);
    // Generate an embedding for a query
    const queryText = 'What advancements have been made in EV batteries?';
    console.log(`\nGenerating embedding for query: "${queryText}"`);
    const queryEmbedding = await embeddingGenerator.generateEmbedding(queryText);
    // Search using the query embedding
    console.log('Searching with the query embedding...');
    const searchResults = await vectorDb.searchByVector(queryEmbedding, { limit: 2 });
    searchResults.forEach((result, i) => {
        console.log(`\nResult ${i + 1} (Score: ${result.score.toFixed(4)}):`);
        console.log(`Content: ${result.document.content}`);
    });
    // Compare with text-based search
    console.log('\nComparing with text-based search...');
    const textSearchResults = await vectorDb.searchByText(queryText, { limit: 2 });
    textSearchResults.forEach((result, i) => {
        console.log(`\nResult ${i + 1} (Score: ${result.score.toFixed(4)}):`);
        console.log(`Content: ${result.document.content}`);
    });
    // Demonstrate batch processing
    console.log('\nDemonstrating batch embedding generation...');
    const batchQueries = [
        'How far can electric vehicles travel on a single charge?',
        'What government incentives exist for electric vehicles?',
        'How is charging infrastructure developing?'
    ];
    const batchEmbeddings = await embeddingGenerator.generateEmbeddings(batchQueries);
    console.log(`Generated ${batchEmbeddings.length} batch embeddings`);
    // Search with each batch embedding
    for (let i = 0; i < batchQueries.length; i++) {
        console.log(`\nQuery: "${batchQueries[i]}"`);
        const results = await vectorDb.searchByVector(batchEmbeddings[i], { limit: 1 });
        if (results.length > 0) {
            console.log(`Top result (Score: ${results[0].score.toFixed(4)}):`);
            console.log(`Content: ${results[0].document.content}`);
        }
    }
    console.log('\nEmbedding generator and ChromaDB integration demonstration complete.');
}
// Run the example
main().catch(error => {
    console.error('Error in embedding generator example:', error);
});
//# sourceMappingURL=embedding-generator-example.js.map