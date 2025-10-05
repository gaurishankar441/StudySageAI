import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class EmbeddingService {
  private modelName = 'text-embedding-3-small'; // 1536 dimensions, multilingual support
  private dimensions = 1536;

  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    try {
      console.log(`[EmbeddingService] Generating embedding for text (${text.length} chars)`);
      
      const response = await openai.embeddings.create({
        model: this.modelName,
        input: text,
        dimensions: this.dimensions,
      });

      const embedding = response.data[0].embedding;
      
      if (embedding.length !== this.dimensions) {
        console.warn(`[EmbeddingService] Expected ${this.dimensions} dimensions, got ${embedding.length}`);
      }
      
      console.log(`[EmbeddingService] Generated embedding with ${embedding.length} dimensions`);
      return embedding;
    } catch (error) {
      console.error('[EmbeddingService] Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    try {
      console.log(`[EmbeddingService] Generating embeddings for ${texts.length} texts in batch`);
      
      const response = await openai.embeddings.create({
        model: this.modelName,
        input: texts,
        dimensions: this.dimensions,
      });

      const embeddings = response.data.map(item => item.embedding);
      
      console.log(`[EmbeddingService] Generated ${embeddings.length} embeddings successfully`);
      return embeddings;
    } catch (error) {
      console.error('[EmbeddingService] Error generating batch embeddings:', error);
      throw new Error(`Failed to generate batch embeddings: ${error}`);
    }
  }

  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  getDimensions(): number {
    return this.dimensions;
  }
}

export const embeddingService = new EmbeddingService();
