import { z } from "zod";

export const SpeakMetaSchema = z.object({
  persona: z.enum(["Priya", "Amit"]).optional(),
  language: z.enum(["en", "hi", "hinglish"]).default("en"),
  avg_wpm: z.number().min(100).max(180).default(140),
  segments: z.array(z.object({
    id: z.string(),
    purpose: z.enum(["hook", "explain", "example", "step", "recap", "cta"]).optional(),
    text_preview: z.string(),
    approx_seconds: z.number().min(1).max(30)
  })).optional()
});

export const DualOutputSchema = z.object({
  chat_md: z.string().min(10, "Chat markdown must be at least 10 characters"),
  speak_ssml: z.string().min(10, "Speak SSML must be at least 10 characters"),
  speak_meta: SpeakMetaSchema
});

export const MessageMetadataSchema = z.object({
  speakSSML: z.string().optional(),
  speakMeta: SpeakMetaSchema.optional(),
  citations: z.array(z.object({
    text: z.string(),
    source: z.string(),
    page: z.number().optional()
  })).optional(),
  confidence: z.number().optional(),
  toolUsed: z.string().optional(),
  regenerated: z.boolean().optional(),
  emotionDetected: z.string().optional(),
  languageDetected: z.string().optional()
});

export type DualOutput = z.infer<typeof DualOutputSchema>;
export type SpeakMeta = z.infer<typeof SpeakMetaSchema>;
export type MessageMetadata = z.infer<typeof MessageMetadataSchema>;
