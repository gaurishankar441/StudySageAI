import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';

class EmbeddingService {
  private modelName = 'Xenova/all-MiniLM-L6-v2';
  private dimensions = 384;
  private extractor: FeatureExtractionPipeline | null = null;
  private initPromise: Promise<void> | null = null;

  private async initialize() {
    if (this.extractor) return;
    
    if (!this.initPromise) {
      this.initPromise = (async () => {
        console.log(`[EmbeddingService] Loading ${this.modelName}...`);
        this.extractor = await pipeline('feature-extraction', this.modelName, {
          quantized: false
        });
        console.log(`[EmbeddingService] Model loaded successfully`);
      })();
    }
    
    await this.initPromise;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    try {
      await this.initialize();
      console.log(`[EmbeddingService] Generating embedding for text (${text.length} chars)`);
      
      const output = await this.extractor!(text, {
        pooling: 'cls',
        normalize: false
      });

      const embedding = Array.from(output.data);
      
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
      await this.initialize();
      console.log(`[EmbeddingService] Generating embeddings for ${texts.length} texts in batch`);
      
      const output = await this.extractor!(texts, {
        pooling: 'cls',
        normalize: false
      });

      const embeddings: number[][] = [];
      for (let i = 0; i < texts.length; i++) {
        const start = i * this.dimensions;
        const end = start + this.dimensions;
        embeddings.push(Array.from(output.data.slice(start, end)));
      }
      
      console.log(`[EmbeddingService] Generated ${embeddings.length} embeddings successfully`);
      return embeddings;
    } catch (error) {
      console.error('[EmbeddingService] Error generating batch embeddings:', error);
      throw new Error(`Failed to generate batch embeddings: ${error}`);
    }
  }

  dotProductSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
    }
    
    return dotProduct;
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
