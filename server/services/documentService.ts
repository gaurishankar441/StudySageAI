import { storage } from "../storage";
import { aiService } from "../openai";
import { InsertDocument } from "@shared/schema";
import * as crypto from "crypto";
import * as mammoth from "mammoth";
import { YoutubeTranscript } from "youtube-transcript";
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

  // YouTube transcript extraction using youtube-transcript
  private async extractFromYouTube(url: string): Promise<{ text: string; metadata: any }> {
    try {
      console.log('Processing YouTube URL:', url);
      
      // Extract video ID from various YouTube URL formats
      const videoId = this.extractYouTubeVideoId(url);
      if (!videoId) {
        console.error('Failed to extract video ID from URL:', url);
        throw new Error('Invalid YouTube URL - could not extract video ID');
      }

      console.log('Extracted video ID:', videoId, '- fetching transcript...');
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (!transcript || transcript.length === 0) {
        console.warn('No transcript available for video:', videoId);
        throw new Error('This video does not have captions/transcript available. Please try another video or upload a document with text content.');
      }
      
      const text = transcript.map(entry => entry.text).join(' ');
      const duration = transcript.length > 0 ? transcript[transcript.length - 1].offset / 1000 : 0;
      
      console.log('Successfully extracted transcript:', text.length, 'characters');
      
      if (text.trim().length === 0) {
        console.warn('Transcript is empty for video:', videoId);
        throw new Error('Video transcript is empty. Please try another video with captions enabled.');
      }
      
      return {
        text,
        metadata: {
          url,
          videoId,
          duration: `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`,
          segments: transcript.length,
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('YouTube transcript error:', error);
      throw new Error(`Failed to extract YouTube transcript: ${error}`);
    }
  }

  // Extract YouTube video ID from various URL formats
  private extractYouTubeVideoId(url: string): string | null {
    try {
      // Remove any whitespace
      url = url.trim();
      
      // Try regex-based extraction first (most reliable)
      // Matches: v=ID, /ID, embed/ID, shorts/ID, live/ID
      const regexPatterns = [
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/ // Plain video ID
      ];
      
      for (const pattern of regexPatterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          console.log('Regex extracted video ID:', match[1]);
          return match[1];
        }
      }
      
      // Fallback to URL parsing
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase().replace('www.', '').replace('m.', '');
        
        // Format: https://youtube.com/watch?v=VIDEO_ID (with or without www)
        if (hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
          const videoId = urlObj.searchParams.get('v');
          // Clean video ID (remove any fragments or extra params)
          const cleanId = videoId ? videoId.split(/[&#]/)[0] : null;
          if (cleanId) {
            console.log('URL parsing extracted video ID:', cleanId);
            return cleanId;
          }
        }
        
        // Format: https://youtu.be/VIDEO_ID
        if (hostname === 'youtu.be') {
          const videoId = urlObj.pathname.substring(1);
          // Clean video ID (remove any fragments or extra params)
          const cleanId = videoId ? videoId.split(/[?&#]/)[0] : null;
          if (cleanId) {
            console.log('URL parsing extracted video ID from youtu.be:', cleanId);
            return cleanId;
          }
        }
        
        // Format: https://youtube.com/embed/VIDEO_ID
        if (hostname.includes('youtube.com') && urlObj.pathname.startsWith('/embed/')) {
          const videoId = urlObj.pathname.split('/')[2];
          // Clean video ID (remove any fragments or extra params)
          const cleanId = videoId ? videoId.split(/[?&#]/)[0] : null;
          if (cleanId) {
            console.log('URL parsing extracted video ID from embed:', cleanId);
            return cleanId;
          }
        }
        
        // Format: https://youtube.com/shorts/VIDEO_ID
        if (hostname.includes('youtube.com') && urlObj.pathname.startsWith('/shorts/')) {
          const videoId = urlObj.pathname.split('/')[2];
          // Clean video ID (remove any fragments or extra params)
          const cleanId = videoId ? videoId.split(/[?&#]/)[0] : null;
          if (cleanId) {
            console.log('URL parsing extracted video ID from shorts:', cleanId);
            return cleanId;
          }
        }
        
        // Format: https://youtube.com/live/VIDEO_ID
        if (hostname.includes('youtube.com') && urlObj.pathname.startsWith('/live/')) {
          const videoId = urlObj.pathname.split('/')[2];
          // Clean video ID (remove any fragments or extra params)
          const cleanId = videoId ? videoId.split(/[?&#]/)[0] : null;
          if (cleanId) {
            console.log('URL parsing extracted video ID from live:', cleanId);
            return cleanId;
          }
        }
      } catch (urlError) {
        console.log('URL parsing failed, likely not a valid URL:', urlError);
      }
      
      console.log('Could not extract video ID from URL:', url);
      return null;
    } catch (error) {
      console.error('Error extracting YouTube video ID:', error);
      return null;
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

  private extractTitle(html: string): string {
    const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
    return match ? match[1].trim() : 'Untitled';
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

  // Chunk text into manageable pieces with smart semantic boundaries
  chunkText(text: string, docId: string, docTitle: string, language: string = 'en', maxTokensOverride?: number, overlapOverride?: number): DocumentChunk[] {
    // Count total tokens in document
    const totalTokens = this.countTokens(text);
    
    // Determine adaptive chunk size
    const { maxTokens, overlap } = maxTokensOverride 
      ? { maxTokens: maxTokensOverride, overlap: overlapOverride || 80 }
      : this.getAdaptiveChunkSize(totalTokens);

    // Split on sentence boundaries for semantic coherence
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    const chunks: DocumentChunk[] = [];
    let currentChunk = '';
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.countTokens(sentence);
      
      if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
        // Add current chunk
        const chunkText = currentChunk.trim();
        chunks.push({
          docId,
          ord: chunks.length,
          text: chunkText,
          tokens: this.countTokens(chunkText),
          language,
          hash: this.generateHash(chunkText),
          metadata: {
            docTitle,
            docId,
            page: Math.floor(chunks.length / 3) + 1, // Estimate page number
            section: (chunks.length % 3) + 1 // Section within page
          }
        });

        // Start new chunk with overlap (10-20% for context preservation)
        const overlapText = this.getOverlapText(currentChunk, overlap);
        currentChunk = overlapText + sentence + ' ';
        currentTokens = this.countTokens(currentChunk);
      } else {
        currentChunk += sentence + ' ';
        currentTokens += sentenceTokens;
      }
    }

    // Add final chunk
    if (currentChunk.trim()) {
      const chunkText = currentChunk.trim();
      chunks.push({
        docId,
        ord: chunks.length,
        text: chunkText,
        tokens: this.countTokens(chunkText),
        language,
        hash: this.generateHash(chunkText),
        metadata: {
          docTitle,
          docId,
          page: Math.floor(chunks.length / 3) + 1,
          section: (chunks.length % 3) + 1
        }
      });
    }

    console.log(`[Chunking] Document: ${docTitle}, Total tokens: ${totalTokens}, Chunk size: ${maxTokens}, Chunks created: ${chunks.length}`);
    return chunks;
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

      // Chunk text with document title for citations
      const chunks = this.chunkText(text, document.id, title, analysis.language || 'en');
      
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
