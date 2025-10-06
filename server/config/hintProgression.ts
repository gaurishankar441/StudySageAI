export type HintLevel = 1 | 2 | 3 | 4;

export interface HintLevelConfig {
  name: string;
  description: string;
  guidance: string;
  hindiGuidance: string;
  maxRevealed: string;
}

export const HINT_LEVELS: Record<HintLevel, HintLevelConfig> = {
  1: {
    name: 'Guiding Question',
    description: 'Most abstract - prompt thinking direction',
    guidance: `HINT LEVEL 1: GUIDING QUESTION
- Ask a broad question that directs thinking
- Focus on WHAT to think about, not HOW to solve
- Help identify the core concept involved
- Examples: "What kind of motion is this?", "Which law applies here?"
- DO NOT: Mention specific formulas, values, or steps`,
    hindiGuidance: `HINT LEVEL 1: GUIDING QUESTION
- Ek broad question pucho jo thinking ko direct kare
- KYA sochna hai pe focus karo, KAISE solve karna hai pe nahi
- Core concept identify karne mein help karo
- Examples: "Yeh kaisi motion hai?", "Kaunsa law apply hota hai yahan?"
- MAT KARO: Specific formula, values ya steps mention karna`,
    maxRevealed: 'Concept category only'
  },
  
  2: {
    name: 'Narrow Down',
    description: 'More specific - guide to relevant concept/formula',
    guidance: `HINT LEVEL 2: NARROW DOWN
- Narrow focus to specific concept or formula family
- Guide toward the RIGHT APPROACH without solving
- Suggest WHERE to look or WHAT to consider
- Examples: "Think about Newton's Second Law", "Consider energy conservation"
- DO NOT: Give the actual formula or calculation steps`,
    hindiGuidance: `HINT LEVEL 2: NARROW DOWN
- Specific concept ya formula family pe focus karo
- SAHI APPROACH ke taraf guide karo, solve mat karo
- KAHAN dekhna hai ya KYA consider karna hai batao
- Examples: "Newton's Second Law ke bare mein socho", "Energy conservation consider karo"
- MAT KARO: Actual formula ya calculation steps dena`,
    maxRevealed: 'Relevant concept/approach'
  },
  
  3: {
    name: 'Formula/Approach',
    description: 'Direct guidance - provide formula or method',
    guidance: `HINT LEVEL 3: FORMULA/APPROACH
- Provide the specific formula or method needed
- Explain WHAT each variable represents
- Guide on HOW to apply the formula
- Examples: "Use F = ma where F is force, m is mass, a is acceleration"
- DO NOT: Substitute values or show calculations`,
    hindiGuidance: `HINT LEVEL 3: FORMULA/APPROACH
- Specific formula ya method provide karo
- Har variable KYA represent karta hai explain karo
- Formula kaise apply karna hai guide karo
- Examples: "F = ma use karo jahan F force hai, m mass hai, a acceleration hai"
- MAT KARO: Values substitute karna ya calculations dikhana`,
    maxRevealed: 'Formula and variables'
  },
  
  4: {
    name: 'Worked Example',
    description: 'Most concrete - step-by-step guidance',
    guidance: `HINT LEVEL 4: WORKED EXAMPLE
- Show step-by-step approach with similar problem
- Demonstrate the solving process clearly
- Use parallel example (similar but not identical)
- Encourage student to apply same steps to their problem
- Examples: "Here's how to solve a similar problem: Step 1..."
- STILL: Let student do the final calculation themselves`,
    hindiGuidance: `HINT LEVEL 4: WORKED EXAMPLE
- Similar problem ke sath step-by-step approach dikhao
- Solving process clearly demonstrate karo
- Parallel example use karo (similar but not identical)
- Student ko encourage karo same steps apne problem pe apply karne ke liye
- Examples: "Dekho ek similar problem kaise solve karte hain: Step 1..."
- PHIR BHI: Student ko final calculation khud karne do`,
    maxRevealed: 'Step-by-step method'
  }
};

export const HINT_PROGRESSION_GUIDANCE = {
  general: `PROGRESSIVE HINT SYSTEM (Socratic Method):
You are using a 4-level hint progression system. Each level reveals more information:
- Level 1: Guiding question (most abstract)
- Level 2: Narrow down to concept
- Level 3: Formula/approach
- Level 4: Worked example (most concrete)

CRITICAL RULES:
1. NEVER skip levels - student must go through progression
2. NEVER give the full solution, even at Level 4
3. Each hint should require student to THINK and APPLY
4. Encourage independent problem-solving at every level
5. If student asks "just tell me the answer", redirect to learning

TONE:
- Supportive and encouraging: "You're on the right track!"
- Socratic: Ask questions that lead to discovery
- Patient: "Let's break this down together"
- Avoid frustration: "This is tricky, let me help you think through it"`,

  levelTransition: `LEVEL TRANSITION GUIDELINES:
- If student tries again but still struggles → Offer next level hint
- If student is close → Encourage: "You're almost there! Think about..."
- If student wants to skip → Explain: "Let's work through this step by step"
- After Level 4 hint and still stuck → Consider if problem is too hard, offer to simplify or try different problem`,
};

export interface HintState {
  currentLevel: HintLevel;
  previousHints: string[];
  problemContext?: string;
  totalHintsUsed: number;
  lastHintTimestamp: string;
}

export const MAX_HINTS_PER_PROBLEM = 4;
export const HINT_COOLDOWN_MS = 30000; // 30 seconds between hints to encourage thinking

export function getNextHintLevel(currentLevel: HintLevel): HintLevel | null {
  if (currentLevel >= 4) return null;
  return (currentLevel + 1) as HintLevel;
}

export function shouldAllowNextHint(hintState: HintState): { allowed: boolean; reason?: string } {
  if (hintState.totalHintsUsed >= MAX_HINTS_PER_PROBLEM) {
    return { 
      allowed: false, 
      reason: 'Maximum hints reached for this problem. Try to solve with the information given!' 
    };
  }
  
  const timeSinceLastHint = Date.now() - new Date(hintState.lastHintTimestamp).getTime();
  if (timeSinceLastHint < HINT_COOLDOWN_MS) {
    return { 
      allowed: false, 
      reason: 'Take a moment to think about the previous hint first!' 
    };
  }
  
  return { allowed: true };
}
