import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;
env.allowRemoteModels = true;

class EmbeddingService {
  private model: any = null;
  private modelName = 'krutrim-ai-labs/vyakyarth';
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  async initialize() {
    if (this.model) return;
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = (async () => {
      try {
        console.log(`[EmbeddingService] Loading Vyakyarth-1-Indic model: ${this.modelName}`);
        this.model = await pipeline('feature-extraction', this.modelName);
        console.log('[EmbeddingService] Vyakyarth-1-Indic model loaded successfully');
      } catch (error) {
        console.error('[EmbeddingService] Failed to load Vyakyarth-1-Indic model:', error);
        throw error;
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initPromise;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    await this.initialize();

    if (!this.model) {
      throw new Error('Embedding model not initialized');
    }

    try {
      const output = await this.model(text, {
        pooling: 'mean',
        normalize: true,
      });

      const embedding = Array.from(output.data) as number[];
      
      if (embedding.length !== 768) {
        console.warn(`[EmbeddingService] Expected 768 dimensions, got ${embedding.length}`);
      }
      
      return embedding;
    } catch (error) {
      console.error('[EmbeddingService] Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    await this.initialize();

    const embeddings: number[][] = [];
    
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }
    
    return embeddings;
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
}

export const embeddingService = new EmbeddingService();
