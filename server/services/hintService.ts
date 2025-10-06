import { 
  HINT_LEVELS, 
  HINT_PROGRESSION_GUIDANCE,
  getNextHintLevel,
  shouldAllowNextHint,
  type HintLevel,
  type HintState
} from '../config/hintProgression';

export class HintService {
  initializeHintState(problemContext?: string): HintState {
    return {
      currentLevel: 0 as HintLevel, // Will become 1 on first hint request
      previousHints: [],
      problemContext,
      totalHintsUsed: 0,
      lastHintTimestamp: new Date(0).toISOString() // Use epoch so first hint is allowed
    };
  }

  getHintState(messages: any[]): HintState | null {
    const assistantMessages = messages.filter((m: any) => m.role === 'assistant');
    
    for (let i = assistantMessages.length - 1; i >= 0; i--) {
      const msg = assistantMessages[i];
      if (msg.metadata?.hintState) {
        return msg.metadata.hintState as HintState;
      }
    }
    
    return null;
  }
  
  updateHintStateWithResponse(hintState: HintState, hintResponse: string): HintState {
    return {
      ...hintState,
      previousHints: [...hintState.previousHints, hintResponse]
    };
  }

  advanceHintLevel(currentState: HintState): { 
    newState: HintState; 
    nextLevel: HintLevel;
    canAdvance: boolean;
    message?: string;
  } {
    const checkResult = shouldAllowNextHint(currentState);
    
    if (!checkResult.allowed) {
      return {
        newState: currentState,
        nextLevel: currentState.currentLevel,
        canAdvance: false,
        message: checkResult.reason
      };
    }
    
    const nextLevel = getNextHintLevel(currentState.currentLevel);
    
    if (nextLevel === null) {
      return {
        newState: currentState,
        nextLevel: 4,
        canAdvance: false,
        message: 'You\'ve received all 4 hint levels. Try solving with the information given!'
      };
    }
    
    const newState: HintState = {
      ...currentState,
      currentLevel: nextLevel,
      totalHintsUsed: currentState.totalHintsUsed + 1,
      lastHintTimestamp: new Date().toISOString()
    };
    
    return {
      newState,
      nextLevel,
      canAdvance: true
    };
  }

  buildHintPrompt(
    level: HintLevel,
    language: 'hi' | 'en',
    problemContext: string,
    studentQuery: string,
    previousHints: string[]
  ): string {
    const levelConfig = HINT_LEVELS[level];
    const guidance = language === 'hi' ? levelConfig.hindiGuidance : levelConfig.guidance;
    
    const previousHintsContext = previousHints.length > 0
      ? `\n\nPREVIOUS HINTS GIVEN:\n${previousHints.map((h, i) => `Level ${i + 1}: ${h}`).join('\n')}`
      : '';
    
    return `
${HINT_PROGRESSION_GUIDANCE.general}

CURRENT HINT LEVEL: ${level} - ${levelConfig.name}
${guidance}

PROBLEM CONTEXT:
${problemContext}

STUDENT QUERY:
"${studentQuery}"
${previousHintsContext}

YOUR TASK:
Generate a Level ${level} hint that follows the guidelines above.
- Maximum information revealed: ${levelConfig.maxRevealed}
- Maintain Socratic approach: guide, don't solve
- Keep it concise (50-80 words)
- Encourage the student to think and apply

${language === 'hi' ? 'Hindi/Hinglish mein hint do agar student Hindi use kar raha hai.' : 'Provide hint in English.'}
    `.trim();
  }

  generateHintMetadata(
    level: HintLevel,
    hintState: HintState
  ): Record<string, any> {
    return {
      hintLevel: level,
      hintState,
      totalHintsUsed: hintState.totalHintsUsed,
      hintProgression: `${level}/4`,
      isHintResponse: true,
      socraticMethod: true
    };
  }

  formatHintDisclaimer(level: HintLevel, language: 'hi' | 'en'): string {
    if (language === 'hi') {
      return `\n\n💡 **Hint Level ${level}/4**: ${HINT_LEVELS[level].name}\n${level < 4 ? '_Agar aur help chahiye toh "hint do" bolo_' : '_Yeh last hint level hai, ab try karo solve karna!_'}`;
    } else {
      return `\n\n💡 **Hint Level ${level}/4**: ${HINT_LEVELS[level].name}\n${level < 4 ? '_Need more help? Ask for another hint!_' : '_This is the final hint level. Give it your best shot!_'}`;
    }
  }

  checkIfHintRequest(query: string): boolean {
    const hintKeywords = [
      'hint', 'clue', 'help', 'stuck', 'madad', 'मदद',
      'hint do', 'help karo', 'kya karu', 'kaise karu'
    ];
    
    const queryLower = query.toLowerCase();
    return hintKeywords.some(keyword => queryLower.includes(keyword));
  }

  generateCooldownMessage(timeRemaining: number, language: 'hi' | 'en'): string {
    const seconds = Math.ceil(timeRemaining / 1000);
    
    if (language === 'hi') {
      return `Pehle wale hint ke bare mein ${seconds} seconds sochne ki koshish karo, phir next hint maangna! 🤔`;
    } else {
      return `Take ${seconds} more seconds to think about the previous hint before asking for the next one! 🤔`;
    }
  }
}

export const hintService = new HintService();
