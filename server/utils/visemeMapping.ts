/**
 * AWS Polly Viseme → Unity Blendshape Mapping
 * 
 * Polly visemes: https://docs.aws.amazon.com/polly/latest/dg/viseme.html
 * Unity blendshapes: From avatar model (B_M_P, F_V, TH, etc.)
 */

export interface PhonemeData {
  time: number;
  blendshape: string;
  weight: number;
}

/**
 * Map AWS Polly viseme codes to Unity blendshape names
 */
const POLLY_TO_UNITY_VISEME_MAP: Record<string, string> = {
  // Silence
  'sil': 'sil',
  
  // Consonants
  'p': 'B_M_P',      // p, b, m (lips closed)
  'f': 'F_V',        // f, v (teeth on lower lip)
  'T': 'TH',         // th (tongue between teeth)
  't': 'T_L_D_N',    // t, d, n (tongue behind teeth)
  'S': 'Ch_J',       // sh, ch, j (wide lips)
  's': 'S_Z',        // s, z (narrow lips)
  'k': 'K_G_H_NG',   // k, g, ng (back of throat)
  'r': 'R',          // r (lips slightly rounded)
  
  // Vowels
  'a': 'Ah',         // ah (mouth wide open)
  '@': 'Er',         // er, schwa (neutral position)
  'e': 'EE',         // ee (smile, lips stretched)
  'E': 'AE',         // ae (mouth open, lips stretched)
  'i': 'IH',         // ih (slight smile)
  'o': 'Oh',         // oh (lips rounded)
  'u': 'W_OO',       // oo, w (lips very rounded)
};

/**
 * Convert Polly visemes to Unity phoneme sequence with timing
 */
export function mapPollyVisemesToUnityPhonemes(
  visemes: Array<{time: number; type: string; value: string}>
): PhonemeData[] {
  const phonemes: PhonemeData[] = [];
  
  for (const viseme of visemes) {
    const unityBlendshape = POLLY_TO_UNITY_VISEME_MAP[viseme.value] || 'sil';
    
    phonemes.push({
      time: viseme.time,
      blendshape: unityBlendshape,
      weight: unityBlendshape === 'sil' ? 0 : 1.0, // Full weight for active phonemes
    });
  }
  
  console.log(`[VISEME MAPPING] Mapped ${visemes.length} Polly visemes → ${phonemes.length} Unity phonemes`);
  
  return phonemes;
}

/**
 * Get human-readable viseme description (for debugging)
 */
export function getVisemeDescription(pollyViseme: string): string {
  const descriptions: Record<string, string> = {
    'sil': 'Silence',
    'p': 'p, b, m sounds',
    'f': 'f, v sounds',
    'T': 'th sounds',
    't': 't, d, n sounds',
    'S': 'sh, ch, j sounds',
    's': 's, z sounds',
    'k': 'k, g, ng sounds',
    'r': 'r sounds',
    'a': 'ah sounds',
    '@': 'er sounds',
    'e': 'ee sounds',
    'E': 'ae sounds',
    'i': 'ih sounds',
    'o': 'oh sounds',
    'u': 'oo, w sounds',
  };
  
  return descriptions[pollyViseme] || 'Unknown';
}
