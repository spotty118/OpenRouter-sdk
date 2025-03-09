/**
 * Example demonstrating the use of ChromaVectorDB with OpenRouter SDK
 */
import { OpenRouter } from '../core/open-router.js';
import { VectorDBType } from '../interfaces/vector-db.js';
/**
 * This example demonstrates how to use the ChromaVectorDB integration
 * with the OpenRouter SDK for knowledge storage and retrieval.
 */
async function main() {
    // Initialize OpenRouter with your API key
    const openRouter = new OpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY || 'your-api-key-here',
        defaultModel: 'anthropic/claude-3-opus'
    });
    console.log('Creating Chroma vector database with deep integration...');
    // Create a Chroma vector database with proper typing
    const vectorDb = openRouter.createVectorDb({
        dimensions: 1536,
        similarityMetric: 'cosine',
        type: VectorDBType.CHROMA,
        chromaUrl: 'http://localhost:8000',
        collectionPrefix: 'openrouter-example-',
        useInMemory: true
    });
    // Define default namespace for operations
    const defaultNamespace = 'default';
    // Sample documents about electric vehicles
    const documents = [
        {
            id: 'ev-market-1',
            content: 'Electric vehicle sales have grown by 40% year-over-year globally, with China, Europe, and the US being the largest markets.',
            metadata: { source: 'market-report', topic: 'electric-vehicles', date: '2024-02-15' }
        },
        {
            id: 'ev-market-2',
            content: 'Battery technology improvements have reduced costs by 80% over the past decade, making electric vehicles more affordable for consumers.',
            metadata: { source: 'technology-report', topic: 'electric-vehicles', date: '2024-01-10' }
        },
        {
            id: 'ev-market-3',
            content: 'Major automakers have committed to transitioning their fleets to electric vehicles, with many planning to be fully electric by 2035.',
            metadata: { source: 'industry-news', topic: 'electric-vehicles', date: '2024-03-01' }
        },
        {
            id: 'ev-market-4',
            content: 'Charging infrastructure has expanded significantly, with over 1.8 million public charging stations worldwide, a 40% increase from the previous year.',
            metadata: { source: 'infrastructure-report', topic: 'electric-vehicles', date: '2024-02-28' }
        },
        {
            id: 'ev-market-5',
            content: 'The average range of electric vehicles has increased by 35% in the past three years, with many models now exceeding 300 miles on a single charge.',
            metadata: { source: 'technology-report', topic: 'electric-vehicles', date: '2024-03-05' }
        },
        {
            id: 'ev-market-6',
            content: 'Government incentives for electric vehicle purchases vary widely by country, with some offering tax credits up to $7,500 and others providing direct subsidies.',
            metadata: { source: 'policy-report', topic: 'electric-vehicles', date: '2024-02-20' }
        }
    ];
    console.log(`Adding ${documents.length} documents to vector database...`);
    // Add documents to the vector database with namespace
    const docIds = await vectorDb.addDocuments(documents, defaultNamespace);
    console.log(`Added documents with IDs: ${docIds.join(', ')}`);
    // List all namespaces
    const namespaces = await vectorDb.listNamespaces();
    console.log(`Available namespaces: ${namespaces.join(', ')}`);
    // Search for documents about battery technology with proper options
    console.log('\nSearching for documents about battery technology:');
    const batteryResults = await vectorDb.searchByText('battery technology improvements', {
        limit: 2,
        namespace: defaultNamespace
    });
    batteryResults.forEach((result, i) => {
        console.log(`\nResult ${i + 1} (Score: ${result.score.toFixed(4)}):`);
        console.log(`Content: ${result.document.content}`);
        console.log(`Metadata: ${JSON.stringify(result.document.metadata)}`);
    });
    // Search for documents about charging infrastructure with proper options
    console.log('\nSearching for documents about charging infrastructure:');
    const chargingResults = await vectorDb.searchByText('charging stations infrastructure', {
        limit: 2,
        namespace: defaultNamespace
    });
    chargingResults.forEach((result, i) => {
        console.log(`\nResult ${i + 1} (Score: ${result.score.toFixed(4)}):`);
        console.log(`Content: ${result.document.content}`);
        console.log(`Metadata: ${JSON.stringify(result.document.metadata)}`);
    });
    // Search with metadata filter and proper options
    console.log('\nSearching for documents from technology reports:');
    const techReportResults = await vectorDb.searchByText('electric vehicles technology', {
        limit: 3,
        namespace: defaultNamespace,
        filter: (metadata) => metadata.source === 'technology-report'
    });
    techReportResults.forEach((result, i) => {
        console.log(`\nResult ${i + 1} (Score: ${result.score.toFixed(4)}):`);
        console.log(`Content: ${result.document.content}`);
        console.log(`Metadata: ${JSON.stringify(result.document.metadata)}`);
    });
    // Get a specific document by ID with namespace
    console.log('\nRetrieving document by ID:');
    const specificDoc = await vectorDb.getDocument('ev-market-1', defaultNamespace);
    if (specificDoc) {
        console.log(`Document ID: ${specificDoc.id}`);
        console.log(`Content: ${specificDoc.content}`);
        console.log(`Metadata: ${JSON.stringify(specificDoc.metadata)}`);
    }
    else {
        console.log('Document not found');
    }
    console.log('\nDemonstrating advanced ChromaDB integration:');
    // Create an agent with knowledge base using proper config typing
    console.log('\nCreating an agent with Chroma knowledge base...');
    const researchAgent = openRouter.createAgent({
        id: 'ev-researcher',
        name: 'EV Research Specialist',
        description: 'Expert at researching electric vehicle market trends',
        model: 'anthropic/claude-3-opus',
        systemMessage: 'You are a research specialist focused on electric vehicle market trends.',
        memory: {
            vectorDb: {
                dimensions: 1536,
                type: VectorDBType.CHROMA,
                chromaUrl: 'http://localhost:8000',
                collectionPrefix: 'agent-',
                useInMemory: true
            }
        }
    });
    // Add knowledge to the agent with proper namespace
    console.log('Adding knowledge to the agent...');
    await openRouter.addAgentKnowledgeBatch('ev-researcher', documents, defaultNamespace);
    // Create a task for the agent
    const researchTask = openRouter.createTask({
        id: 'ev-market-research',
        name: 'EV Market Research',
        description: 'Research the current market trends for electric vehicles',
        assignedAgentId: 'ev-researcher',
        expectedOutput: 'A comprehensive report on EV market trends with key statistics'
    });
    // Execute the task with proper typing
    console.log('\nExecuting research task with knowledge-enabled agent...');
    const result = await openRouter.executeTask(researchTask, researchAgent);
    console.log('\nTask Result:');
    console.log(`Status: ${result.status}`);
    console.log(`Output: ${result.output}`);
    // Clean up - delete a document with namespace
    console.log('\nDeleting a document:');
    const deleteResult = await vectorDb.deleteDocument('ev-market-6', defaultNamespace);
    console.log(`Document deleted: ${deleteResult}`);
    // Verify deletion with proper options
    const remainingDocs = await vectorDb.searchByText('government incentives', {
        limit: 1,
        namespace: defaultNamespace
    });
    console.log(`Search for deleted content returned ${remainingDocs.length} results`);
    console.log(`Demonstration complete. ChromaDB integration is fully functional.`);
}
// Run the example
main().catch(error => {
    console.error('Error in Chroma vector DB example:', error);
});
//# sourceMappingURL=chroma-vector-db-example.js.map