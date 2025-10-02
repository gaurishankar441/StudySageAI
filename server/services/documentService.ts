import { storage } from "../storage";
import { aiService } from "../openai";
import { InsertDocument } from "@shared/schema";
import * as crypto from "crypto";
import * as mammoth from "mammoth";
import { YoutubeTranscript } from "youtube-transcript";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

export interface DocumentChunk {
  text: string;
  tokens: number;
  page?: number;
  section?: string;
  heading?: string;
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

  // PDF text extraction using pdf-parse (loaded via CommonJS)
  private async extractFromPDF(buffer: Buffer): Promise<{ text: string; metadata: any }> {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      
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
      const transcript = await YoutubeTranscript.fetchTranscript(url);
      const text = transcript.map(entry => entry.text).join(' ');
      const duration = transcript.length > 0 ? transcript[transcript.length - 1].offset / 1000 : 0;
      
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
      console.error('YouTube transcript error:', error);
      throw new Error(`Failed to extract YouTube transcript: ${error}`);
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

  // Chunk text into manageable pieces
  chunkText(text: string, maxTokens: number = 700, overlap: number = 80): DocumentChunk[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: DocumentChunk[] = [];
    let currentChunk = '';
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);
      
      if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
        // Add current chunk
        chunks.push({
          text: currentChunk.trim(),
          tokens: currentTokens
        });

        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, overlap);
        currentChunk = overlapText + sentence;
        currentTokens = this.estimateTokens(currentChunk);
      } else {
        currentChunk += sentence + '. ';
        currentTokens += sentenceTokens;
      }
    }

    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        tokens: currentTokens
      });
    }

    return chunks;
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English
    return Math.ceil(text.length / 4);
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

      // Update document with metadata
      await storage.updateDocumentStatus(document.id, 'ready', {
        ...metadata,
        ...analysis,
        totalTokens: this.estimateTokens(text)
      });

      // Chunk text and generate embeddings (this would be done in background)
      const chunks = this.chunkText(text);
      
      // In production, you'd store chunks in vector database and generate embeddings
      // For now, we'll just log the processing
      console.log(`Processed document ${document.id}: ${chunks.length} chunks`);

      return document.id;
    } catch (error) {
      console.error('Document ingestion error:', error);
      throw error;
    }
  }

  // Retrieve relevant chunks for RAG
  async retrieveRelevantChunks(
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
