import { storage } from "../storage";
import { aiService } from "../openai";
import { embeddingService } from "../embeddingService";
import { InsertDocument } from "@shared/schema";
import * as crypto from "crypto";
import * as mammoth from "mammoth";
import { YoutubeTranscript } from "@danielxceron/youtube-transcript";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { encoding_for_model } from "tiktoken";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const tokenizer = encoding_for_model("gpt-3.5-turbo");

export interface DocumentChunk {
  docId: string;
  ord: number;
  text: string;
  tokens: number;
  page?: number;
  section?: string;
  heading?: string;
  language?: string;
  hash?: string;
  metadata?: any;
}

export class DocumentService {
  // Extract text from different document types
  async extractText(sourceType: string, content: Buffer | string, sourceUrl?: string): Promise<{ text: string; metadata: any }> {
    switch (sourceType.toLowerCase()) {
      case 'pdf':
        return this.extractFromPDF(content as Buffer);
      case 'docx':
        return this.extractFromDOCX(content as Buffer);
      case 'youtube':
        return this.extractFromYouTube(sourceUrl!);
      case 'web':
        return this.extractFromWeb(sourceUrl!);
      case 'text':
        return { text: content as string, metadata: {} };
      default:
        throw new Error(`Unsupported source type: ${sourceType}`);
    }
  }

  // PDF text extraction using pdf-parse (CommonJS)
  private async extractFromPDF(buffer: Buffer): Promise<{ text: string; metadata: any }> {
    try {
      // Use main export - automatically resolves to dist/cjs/index.js via package.json exports
      const { pdf } = require('pdf-parse');
      const data = await pdf(buffer);
      
      if (!data.text || data.text.trim().length === 0) {
        throw new Error('No text content extracted from PDF');
      }
      
      return {
        text: data.text,
        metadata: {
          pages: data.numpages,
          info: data.info,
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error(`Failed to extract PDF: ${error}`);
    }
  }

  // DOCX text extraction using mammoth
  private async extractFromDOCX(buffer: Buffer): Promise<{ text: string; metadata: any }> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return {
        text: result.value,
        metadata: {
          messages: result.messages,
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('DOCX extraction error:', error);
      throw new Error(`Failed to extract DOCX: ${error}`);
    }
  }

  // YouTube transcript extraction using @danielxceron/youtube-transcript
  private async extractFromYouTube(url: string): Promise<{ text: string; metadata: any }> {
    try {
      console.log('[YouTube] Processing URL:', url);
      
      // Extract video ID from various YouTube URL formats
      const videoId = this.extractYouTubeVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL. Please provide a valid YouTube video link.');
      }
      
      console.log('[YouTube] Extracted video ID:', videoId);
      
      // Fetch transcript using video ID
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (!transcript || transcript.length === 0) {
        console.error('[YouTube] No transcript found for URL:', url);
        throw new Error('This video does not have captions/transcript available. Please try another video with captions enabled.');
      }
      
      console.log(`[YouTube] Successfully fetched transcript: ${transcript.length} segments`);
      
      // Extract text from segments
      const text = transcript.map(entry => entry.text).join(' ');
      // Library returns offset and duration in milliseconds
      const durationMs = transcript.length > 0 ? 
        transcript[transcript.length - 1].offset + transcript[transcript.length - 1].duration : 0;
      const duration = durationMs / 1000;
      
      console.log('[YouTube] Transcript text:', text.length, 'characters');
      console.log('[YouTube] First 200 chars:', text.substring(0, 200));
      
      if (text.trim().length === 0) {
        console.error('[YouTube] Transcript text is empty');
        throw new Error('Video transcript is empty. Please try another video with captions enabled.');
      }
      
      return {
        text,
        metadata: {
          url,
          duration: `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`,
          segments: transcript.length,
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('[YouTube] Extraction error:', error);
      
      // Provide user-friendly error messages
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('not available') || errorMsg.includes('disabled')) {
        throw new Error('This video does not have captions/transcript available. Please try another video with captions enabled.');
      } else if (errorMsg.includes('private') || errorMsg.includes('restricted')) {
        throw new Error('Unable to access this video. It may be private, age-restricted, or region-locked.');
      } else {
        throw new Error(`Failed to extract YouTube transcript: ${errorMsg}`);
      }
    }
  }


  // Web content extraction using Readability
  private async extractFromWeb(url: string): Promise<{ text: string; metadata: any }> {
    try {
      const response = await fetch(url);
      const html = await response.text();
      
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) {
        throw new Error('Failed to parse article content');
      }

      return {
        text: article.textContent || '',
        metadata: {
          url,
          title: article.title || 'Untitled',
          excerpt: article.excerpt || '',
          byline: article.byline || '',
          siteName: article.siteName || '',
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Web extraction error:', error);
      throw new Error(`Failed to fetch web content: ${error}`);
    }
  }

  private extractYouTubeVideoId(url: string): string | null {
    try {
      // Clean the URL
      url = url.trim();
      
      // Handle various YouTube URL formats
      const patterns = [
        /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
      
      return null;
    } catch (error) {
      console.error('[YouTube] Error extracting video ID:', error);
      return null;
    }
  }

  private extractTitle(html: string): string {
    const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
    return match ? match[1].trim() : 'Untitled';
  }

  private splitIntoSentences(text: string): string[] {
    text = text.replace(/\s+/g, ' ').trim();
    
    const sentenceRegex = /(?<=[.!?।])\s+|(?<=[.!?।])$/g;
    const sentences = text.split(sentenceRegex).filter(s => s && s.trim().length > 0);
    
    return sentences.map(s => s.trim());
  }

  private getDynamicChunkSize(documentWordCount: number): number {
    if (documentWordCount < 5000) {
      return 350;
    } else if (documentWordCount < 20000) {
      return 250;
    } else {
      return 180;
    }
  }

  private async createSemanticChunks(
    text: string,
    docId: string,
    docTitle: string,
    language: string = 'en',
    similarityThreshold: number = 0.5
  ): Promise<DocumentChunk[]> {
    try {
      console.log('[SemanticChunking] Starting semantic chunking process...');
      
      if (!text || text.trim().length === 0) {
        throw new Error('Input text must be a non-empty string');
      }

      const cleanedText = text.replace(/\s+/g, ' ').trim();
      const sentences = this.splitIntoSentences(cleanedText);
      
      console.log(`[SemanticChunking] Split into ${sentences.length} sentences`);
      
      if (sentences.length === 0) {
        throw new Error('No sentences extracted from text');
      }

      const documentWordCount = cleanedText.split(/\s+/).length;
      const targetChunkSize = this.getDynamicChunkSize(documentWordCount);
      
      console.log(`[SemanticChunking] Document has ${documentWordCount} words, target chunk size: ${targetChunkSize} words`);

      console.log('[SemanticChunking] Generating sentence embeddings in batches...');
      const sentenceEmbeddings: number[][] = [];
      const batchSize = 100;
      
      for (let i = 0; i < sentences.length; i += batchSize) {
        const batch = sentences.slice(i, i + batchSize);
        console.log(`[SemanticChunking] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(sentences.length/batchSize)} (${batch.length} sentences)`);
        const batchEmbeddings = await embeddingService.generateEmbeddings(batch);
        sentenceEmbeddings.push(...batchEmbeddings);
      }
      
      console.log(`[SemanticChunking] Generated ${sentenceEmbeddings.length} embeddings`);

      const chunks: DocumentChunk[] = [];
      let currentChunk: string[] = [];
      let currentLength = 0;

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const sentenceLength = sentence.split(/\s+/).length;

        if (sentenceLength > targetChunkSize * 1.5) {
          console.log(`[SemanticChunking] Warning: Long sentence detected (${sentenceLength} words), adding as separate chunk`);
          if (currentChunk.length > 0) {
            chunks.push(this.createChunkObject(currentChunk.join(' '), docId, docTitle, language, chunks.length));
            currentChunk = [];
            currentLength = 0;
          }
          chunks.push(this.createChunkObject(sentence, docId, docTitle, language, chunks.length));
          continue;
        }

        if (i > 0) {
          const similarity = embeddingService.cosineSimilarity(
            sentenceEmbeddings[i],
            sentenceEmbeddings[i - 1]
          );

          if (similarity < similarityThreshold && currentLength > targetChunkSize * 0.75) {
            console.log(`[SemanticChunking] Low similarity (${similarity.toFixed(3)}) detected, creating new chunk`);
            chunks.push(this.createChunkObject(currentChunk.join(' '), docId, docTitle, language, chunks.length));
            currentChunk = [];
            currentLength = 0;
          }
        }

        currentChunk.push(sentence);
        currentLength += sentenceLength;

        if (currentLength >= targetChunkSize && sentence.match(/[.!?।]$/)) {
          chunks.push(this.createChunkObject(currentChunk.join(' '), docId, docTitle, language, chunks.length));
          currentChunk = [];
          currentLength = 0;
        }
      }

      if (currentChunk.length > 0) {
        chunks.push(this.createChunkObject(currentChunk.join(' '), docId, docTitle, language, chunks.length));
      }

      console.log(`[SemanticChunking] Created ${chunks.length} semantic chunks from ${sentences.length} sentences`);
      return chunks;
    } catch (error) {
      console.error('[SemanticChunking] Error in semantic chunking:', error);
      throw error;
    }
  }

  private createChunkObject(
    text: string,
    docId: string,
    docTitle: string,
    language: string,
    ord: number
  ): DocumentChunk {
    return {
      docId,
      ord,
      text: text.trim(),
      tokens: this.countTokens(text),
      language,
      hash: this.generateHash(text),
      metadata: {
        docTitle,
        docId,
        page: Math.floor(ord / 3) + 1,
        section: (ord % 3) + 1
      }
    };
  }

  // Adaptive chunk size based on document length
  private getAdaptiveChunkSize(totalTokens: number): { maxTokens: number; overlap: number } {
    if (totalTokens < 2000) {
      // Small documents: larger chunks for better context
      return { maxTokens: 1024, overlap: 100 };
    } else if (totalTokens < 10000) {
      // Medium documents: balanced chunks
      return { maxTokens: 768, overlap: 80 };
    } else {
      // Large documents: smaller chunks for precision
      return { maxTokens: 512, overlap: 60 };
    }
  }

  // Accurate token counting using tiktoken
  private countTokens(text: string): number {
    try {
      return tokenizer.encode(text).length;
    } catch (error) {
      // Fallback to estimation if encoding fails
      return Math.ceil(text.length / 4);
    }
  }

  async chunkText(text: string, docId: string, docTitle: string, language: string = 'en', similarityThreshold: number = 0.5): Promise<DocumentChunk[]> {
    try {
      const totalTokens = this.countTokens(text);
      console.log(`[Chunking] Starting semantic chunking for document: ${docTitle}, Total tokens: ${totalTokens}`);
      
      const chunks = await this.createSemanticChunks(text, docId, docTitle, language, similarityThreshold);
      
      console.log(`[Chunking] Document: ${docTitle}, Total tokens: ${totalTokens}, Chunks created: ${chunks.length}`);
      return chunks;
    } catch (error) {
      console.error('[Chunking] Error in semantic chunking, falling back to simple chunking:', error);
      
      const sentences = this.splitIntoSentences(text);
      const chunks: DocumentChunk[] = [];
      const targetSize = 300;
      
      let currentChunk: string[] = [];
      let currentLength = 0;
      
      for (const sentence of sentences) {
        const sentenceLength = sentence.split(/\s+/).length;
        
        if (currentLength + sentenceLength > targetSize && currentChunk.length > 0) {
          chunks.push(this.createChunkObject(currentChunk.join(' '), docId, docTitle, language, chunks.length));
          currentChunk = [];
          currentLength = 0;
        }
        
        currentChunk.push(sentence);
        currentLength += sentenceLength;
      }
      
      if (currentChunk.length > 0) {
        chunks.push(this.createChunkObject(currentChunk.join(' '), docId, docTitle, language, chunks.length));
      }
      
      console.log(`[Chunking] Fallback chunking created ${chunks.length} chunks`);
      return chunks;
    }
  }

  private getOverlapText(text: string, overlapTokens: number): string {
    const words = text.split(' ');
    const overlapWords = Math.min(Math.ceil(overlapTokens * 0.75), words.length);
    return words.slice(-overlapWords).join(' ') + ' ';
  }

  // Generate hash for deduplication
  generateHash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  // Process document ingestion
  async ingestDocument(
    userId: string,
    title: string,
    sourceType: string,
    content: Buffer | string,
    sourceUrl?: string,
    fileKey?: string
  ): Promise<string> {
    try {
      // Create document record
      const docData: InsertDocument = {
        userId,
        title,
        sourceType,
        sourceUrl,
        fileKey,
        status: 'processing'
      };

      const document = await storage.createDocument(docData);

      // Extract text
      const { text, metadata } = await this.extractText(sourceType, content, sourceUrl);
      
      // Analyze document
      const analysis = await aiService.analyzeDocument(title, text, sourceType);

      // Chunk text with document title for citations using semantic chunking
      const chunks = await this.chunkText(text, document.id, title, analysis.language || 'en');
      
      // Check if chunks were created
      if (chunks.length === 0) {
        console.error(`No chunks created for document ${document.id} - text might be too short or empty`);
        await storage.updateDocumentStatus(document.id, 'error', {
          error: 'No content could be extracted from this source',
          totalTokens: this.countTokens(text),
          chunkCount: 0
        });
        throw new Error('No content chunks created - source might be empty or too short');
      }
      
      // Generate embeddings for chunks (in batches of 100 to avoid API limits)
      const chunkTexts = chunks.map(c => c.text);
      const batchSize = 100;
      let allEmbeddings: number[][] = [];
      
      for (let i = 0; i < chunkTexts.length; i += batchSize) {
        const batch = chunkTexts.slice(i, i + batchSize);
        const embeddings = await aiService.generateEmbeddings(batch);
        allEmbeddings = allEmbeddings.concat(embeddings);
      }
      
      // Add embeddings to chunks while preserving citation metadata
      const chunksWithEmbeddings = chunks.map((chunk, idx) => ({
        ...chunk,
        embedding: allEmbeddings[idx], // Store as vector, not JSON
        metadata: {
          docTitle: chunk.metadata.docTitle,
          docId: chunk.metadata.docId,
          page: chunk.metadata.page,
          section: chunk.metadata.section
        }
      }));
      
      // Store chunks in database
      await storage.createChunks(chunksWithEmbeddings);

      // Update document with metadata
      await storage.updateDocumentStatus(document.id, 'ready', {
        ...metadata,
        ...analysis,
        totalTokens: this.countTokens(text),
        chunkCount: chunks.length
      });

      console.log(`Processed document ${document.id}: ${chunks.length} chunks stored`);

      return document.id;
    } catch (error) {
      console.error('Document ingestion error:', error);
      
      // Update document status to error if it exists
      const docId = (error as any).documentId;
      if (docId) {
        await storage.updateDocumentStatus(docId, 'error', {
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
      
      throw error;
    }
  }

  // Retrieve relevant chunks for RAG using pgvector semantic search
  async retrieveRelevantChunks(
    query: string,
    userId: string,
    docIds?: string[],
    limit: number = 8
  ): Promise<{ text: string; metadata: any; score: number }[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await aiService.generateEmbedding(query);
      
      // Use pgvector similarity search
      const results = await storage.searchChunksByEmbedding(
        queryEmbedding,
        docIds,
        limit
      );
      
      // Format results with metadata
      return results.map(chunk => ({
        text: chunk.text,
        metadata: {
          docTitle: (chunk.metadata as any)?.docTitle || 'Unknown Document',
          docId: chunk.docId,
          ord: chunk.ord,
          page: (chunk.metadata as any)?.page || chunk.page || 1,
          section: (chunk.metadata as any)?.section || chunk.section || 1,
          heading: chunk.heading,
          language: chunk.language
        },
        score: chunk.similarity
      }));
    } catch (error) {
      console.error('Error retrieving relevant chunks:', error);
      return [];
    }
  }

  // Legacy method - keeping for compatibility
  async retrieveRelevantChunksLegacy(
    query: string,
    userId: string,
    docIds?: string[],
    limit: number = 8
  ): Promise<{ text: string; metadata: any; score: number }[]> {
    // In production, this would query the vector database
    // For now, we'll return a mock response
    
    const mockChunks = [
      {
        text: "Wave-particle duality is a fundamental concept in quantum mechanics that describes how quantum objects exhibit properties of both waves and particles.",
        metadata: { docTitle: "Quantum Physics Chapter 3", page: 5, section: "Wave-Particle Duality" },
        score: 0.95
      },
      {
        text: "The de Broglie wavelength λ = h/p relates the wavelength of a particle to its momentum, where h is Planck's constant.",
        metadata: { docTitle: "Quantum Physics Chapter 3", page: 6, section: "de Broglie Hypothesis" },
        score: 0.87
      }
    ];

    // Filter by docIds if provided
    if (docIds && docIds.length > 0) {
      // In production, filter by document IDs
    }

    return mockChunks.slice(0, limit);
  }

  // Search within document transcripts/content
  async searchDocumentContent(
    docId: string,
    query: string,
    userId: string
  ): Promise<{ results: any[]; highlights: string[] }> {
    const document = await storage.getDocument(docId);
    if (!document || document.userId !== userId) {
      throw new Error('Document not found or access denied');
    }

    // In production, this would search through stored chunks
    return {
      results: [],
      highlights: []
    };
  }
}

export const documentService = new DocumentService();
