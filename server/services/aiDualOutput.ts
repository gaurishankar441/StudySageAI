/**
 * AI Dual-Output Service
 * 
 * Generates both chat_md (rich markdown) and speak_ssml (teacher-style SSML)
 * in a single OpenAI call with structured JSON output
 */

import { promises as fs } from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import { DualOutputSchema, type DualOutput } from '../schemas/dualOutput';
import { sanitizeSSML, lintSSMLStrict, estimateSpeechSeconds, compressSpeakSSML } from '../utils/ssmlUtils';
import { buildDevContext } from '../prompts/dualOutput.dev';
import { generateFallbackDualOutput } from '../utils/chatToSpeechFallback';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

interface GenerateDualOutputOptions {
  userQuery: string;
  contextMessages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  persona?: 'Priya' | 'Amit';
  language?: 'en' | 'hi' | 'hinglish';
  emotion?: string;
  subject?: string;
  userLevel?: string;
  topicHints?: string[];
}

interface GenerateDualOutputResult {
  chat_md: string;
  speak_ssml: string;
  speak_meta: {
    persona?: 'Priya' | 'Amit';
    language?: 'en' | 'hi' | 'hinglish';
    avg_wpm?: number;
    segments?: Array<{
      id: string;
      purpose?: 'hook' | 'explain' | 'example' | 'step' | 'recap' | 'cta';
      text_preview: string;
      approx_seconds: number;
    }>;
  };
  metadata: {
    source: 'ai_primary' | 'ai_repaired' | 'fallback';
    validation_warnings?: string[];
    compressed?: boolean;
    original_duration?: number;
  };
}

let systemPromptCache: string | null = null;

async function getSystemPrompt(): Promise<string> {
  if (systemPromptCache) return systemPromptCache;
  
  const promptPath = path.join(process.cwd(), 'server/prompts/dualOutput.system.txt');
  systemPromptCache = await fs.readFile(promptPath, 'utf-8');
  return systemPromptCache;
}

/**
 * Generate dual-output response from AI
 */
export async function generateDualOutput(
  options: GenerateDualOutputOptions
): Promise<GenerateDualOutputResult> {
  const {
    userQuery,
    contextMessages,
    persona = 'Priya',
    language = 'en',
    emotion = 'neutral',
    subject,
    userLevel,
    topicHints = []
  } = options;

  const systemPrompt = await getSystemPrompt();
  const devContext = buildDevContext({
    persona,
    language,
    emotion,
    topicHints,
    userLevel,
    subject
  });

  // Try primary generation
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: devContext },
        ...contextMessages,
        { role: 'user', content: userQuery }
      ],
      max_tokens: 1800
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error('No content in OpenAI response');
    }

    // Parse and validate
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (parseError) {
      // JSON parse failed - pass the actual malformed JSON to repair
      console.warn('[Dual Output] JSON parse error, attempting repair with malformed content');
      return await repairDualOutput(rawContent, { persona, language });
    }

    const validated = DualOutputSchema.safeParse(parsed);

    if (validated.success) {
      // Success! Apply SSML hygiene
      return await processDualOutput(validated.data, 'ai_primary');
    }

    // Primary validation failed - try repair
    console.warn('[Dual Output] Primary validation failed, attempting repair', validated.error);
    return await repairDualOutput(rawContent, { persona, language });

  } catch (error) {
    console.error('[Dual Output] Primary generation failed completely', error);
    
    // Last resort: use fallback converter
    try {
      console.warn('[Dual Output] Attempting chat-only fallback');
      const chatOnly = await generateChatOnly({ userQuery, contextMessages, persona, language });
      const fallback = generateFallbackDualOutput(chatOnly, { language, emotion, persona });
      
      // Process fallback through validation pipeline
      return await processDualOutput(
        {
          chat_md: fallback.chat_md,
          speak_ssml: fallback.speak_ssml,
          speak_meta: {
            ...fallback.speak_meta,
            segments: [] // Add empty segments to satisfy schema
          }
        },
        'fallback'
      );
    } catch (fallbackError) {
      console.error('[Dual Output] Even fallback failed, using hard-coded response', fallbackError);
      
      // Absolute last resort: hard-coded apology (also processed for validation)
      const hardCoded = getHardCodedFallback(language, persona);
      return await processDualOutput(
        {
          chat_md: hardCoded.chat_md,
          speak_ssml: hardCoded.speak_ssml,
          speak_meta: {
            persona: hardCoded.speak_meta.persona,
            language: hardCoded.speak_meta.language || language, // Ensure defined
            avg_wpm: hardCoded.speak_meta.avg_wpm || 140,
            segments: [] // Satisfy schema
          }
        },
        'fallback'
      );
    }
  }
}

/**
 * Attempt to repair malformed JSON from AI
 */
async function repairDualOutput(
  malformedJson: string,
  context: { persona: 'Priya' | 'Amit'; language: 'en' | 'hi' | 'hinglish' }
): Promise<GenerateDualOutputResult> {
  console.log('[Dual Output] Repair attempt with malformed JSON:', malformedJson.substring(0, 200));
  
  try {
    const repairResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a JSON repair assistant. Fix the structure to match this schema:
{
  "chat_md": "string (markdown with KaTeX)",
  "speak_ssml": "string (valid SSML with <speak> tags)",
  "speak_meta": {
    "persona": "Priya" | "Amit",
    "language": "en" | "hi" | "hinglish",
    "avg_wpm": 140,
    "segments": [...]
  }
}

Only fix the JSON structure without adding new content. If fields are missing, use minimal defaults.`
        },
        {
          role: 'user',
          content: `Repair this JSON:\n${malformedJson}\n\nContext: persona=${context.persona}, language=${context.language}`
        }
      ],
      max_tokens: 600
    });

    const repairedContent = repairResponse.choices[0]?.message?.content;
    if (!repairedContent) {
      throw new Error('No content in repair response');
    }

    const parsed = JSON.parse(repairedContent);
    const validated = DualOutputSchema.safeParse(parsed);

    if (validated.success) {
      return await processDualOutput(validated.data, 'ai_repaired');
    }

    console.error('[Dual Output] Repaired JSON still failed validation');
    throw new Error('Repair failed validation');
  } catch (error) {
    console.error('[Dual Output] Repair process failed completely', error);
    // Re-throw to trigger fallback in caller
    throw error;
  }
}

/**
 * Process and validate dual-output (sanitize SSML, check duration, compress if needed)
 */
async function processDualOutput(
  data: DualOutput,
  source: 'ai_primary' | 'ai_repaired' | 'fallback'
): Promise<GenerateDualOutputResult> {
  let { chat_md, speak_ssml, speak_meta } = data;
  const metadata: GenerateDualOutputResult['metadata'] = { source };

  // Step 1: Sanitize SSML
  speak_ssml = sanitizeSSML(speak_ssml);

  // Step 2: Lint SSML (get warnings, apply fixes)
  const lintResult = lintSSMLStrict(speak_ssml);
  speak_ssml = lintResult.fixed;
  
  if (lintResult.warnings.length > 0) {
    metadata.validation_warnings = lintResult.warnings;
    console.log('[Dual Output] SSML validation warnings:', lintResult.warnings);
  }
  
  if (!lintResult.ok) {
    // Critical errors found
    console.error('[Dual Output] SSML validation failed:', lintResult.errors);
    throw new Error(`Invalid SSML: ${lintResult.errors.join('; ')}`);
  }

  // Step 3: Estimate duration
  const wpm = speak_meta.avg_wpm || 140;
  const estimatedDuration = estimateSpeechSeconds(speak_ssml, wpm);
  metadata.original_duration = estimatedDuration;

  // Step 4: Compress if exceeds 60 seconds
  if (estimatedDuration > 60) {
    console.log(`[Dual Output] Speech too long (${estimatedDuration}s), compressing to ~45s`);
    speak_ssml = compressSpeakSSML(speak_ssml, { targetSeconds: 45 });
    metadata.compressed = true;
    
    const newDuration = estimateSpeechSeconds(speak_ssml, wpm);
    console.log(`[Dual Output] Compressed to ${newDuration}s`);
  }

  return {
    chat_md,
    speak_ssml,
    speak_meta,
    metadata
  };
}

/**
 * Generate simple chat-only response (no SSML) for fallback scenarios
 */
export async function generateChatOnly(
  options: Pick<GenerateDualOutputOptions, 'userQuery' | 'contextMessages' | 'persona' | 'language'>
): Promise<string> {
  const { userQuery, contextMessages, persona = 'Priya', language = 'en' } = options;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.5,
    messages: [
      {
        role: 'system',
        content: `You are ${persona}, a warm and helpful AI tutor. Respond in ${language === 'hi' ? 'Hindi' : language === 'hinglish' ? 'Hinglish (mix of Hindi and English)' : 'English'}.
Return a concise, well-structured markdown answer with:
- Brief explanation
- One worked example
- Short recap

Use KaTeX for equations (e.g., $$x^2 + y^2 = r^2$$). Be conversational and encouraging.`
      },
      ...contextMessages,
      { role: 'user', content: userQuery }
    ],
    max_tokens: 900
  });

  return response.choices[0]?.message?.content || 'I apologize, I could not generate a response.';
}

/**
 * Absolute last resort: hard-coded fallback when all AI methods fail
 */
function getHardCodedFallback(
  language: 'en' | 'hi' | 'hinglish',
  persona?: 'Priya' | 'Amit'
): GenerateDualOutputResult {
  const apologies = {
    en: "I'm having trouble connecting right now. Please try again in a moment.",
    hi: "मुझे अभी कनेक्ट करने में समस्या हो रही है। कृपया कुछ देर बाद पुनः प्रयास करें।",
    hinglish: "Mujhe abhi connect karne mein problem ho rahi hai. Please kuch der baad try karein."
  };

  const chat_md = `# System Message\n\n${apologies[language]}`;
  const speak_ssml = `<speak><prosody rate="medium" pitch="+0%">${apologies[language]}</prosody></speak>`;

  return {
    chat_md,
    speak_ssml,
    speak_meta: {
      persona,
      language,
      avg_wpm: 140
    },
    metadata: {
      source: 'fallback'
    }
  };
}
