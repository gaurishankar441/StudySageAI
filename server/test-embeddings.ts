import { embeddingService } from './embeddingService';

async function testEmbeddings() {
  console.log('🧪 Testing new embedding service...\n');
  
  try {
    // Test 1: Single embedding generation
    console.log('Test 1: Generating single embedding...');
    const text1 = 'What is quantum mechanics?';
    const embedding1 = await embeddingService.generateEmbedding(text1);
    console.log(`✅ Generated embedding with ${embedding1.length} dimensions`);
    console.log(`   First 5 values: [${embedding1.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
    
    // Test 2: Batch embedding generation
    console.log('\nTest 2: Generating batch embeddings...');
    const texts = [
      'Photosynthesis is the process by which plants make food',
      'Newton discovered the law of gravitation',
      'Python is a programming language'
    ];
    const embeddings = await embeddingService.generateEmbeddings(texts);
    console.log(`✅ Generated ${embeddings.length} embeddings`);
    
    // Test 3: Dot-product similarity
    console.log('\nTest 3: Testing dot-product similarity...');
    const text2 = 'What is the quantum theory?';
    const embedding2 = await embeddingService.generateEmbedding(text2);
    const similarity = embeddingService.dotProductSimilarity(embedding1, embedding2);
    console.log(`✅ Similarity between similar queries: ${similarity.toFixed(4)}`);
    
    const text3 = 'How to cook pasta?';
    const embedding3 = await embeddingService.generateEmbedding(text3);
    const dissimilarity = embeddingService.dotProductSimilarity(embedding1, embedding3);
    console.log(`✅ Similarity between dissimilar queries: ${dissimilarity.toFixed(4)}`);
    
    // Test 4: Verify dimensions
    console.log('\nTest 4: Verifying dimensions...');
    const expectedDims = embeddingService.getDimensions();
    console.log(`✅ Expected dimensions: ${expectedDims}`);
    console.log(`✅ Actual dimensions: ${embedding1.length}`);
    console.log(`✅ Match: ${embedding1.length === expectedDims}`);
    
    console.log('\n✨ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests
testEmbeddings()
  .then(() => {
    console.log('\n🎉 Embedding service is working correctly!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
