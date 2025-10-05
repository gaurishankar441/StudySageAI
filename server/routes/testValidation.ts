import { Router } from 'express';
import { getTestProblems, getRandomProblems, TestProblem } from '../tests/jeeNeetTestSuite';
import { optimizedAI } from '../services/optimizedAIService';
import { modelRouter } from '../services/modelRouter';
import { costTracker } from '../services/costTracker';
import { AnswerValidator } from '../tests/answerValidator';

const testValidationRouter = Router();

interface TestResult {
  problem: TestProblem;
  aiResponse: string;
  isCorrect: boolean;
  confidence: number;
  responseTime: number;
  cost: number;
  model: string;
}

/**
 * GET /api/test/problems
 * Get test problems with optional filters
 */
testValidationRouter.get('/problems', (req, res) => {
  const { subject, exam, difficulty, limit } = req.query;
  
  const problems = getTestProblems({
    subject: subject as string,
    exam: exam as string,
    difficulty: difficulty as string,
    limit: limit ? parseInt(limit as string) : undefined,
  });
  
  res.json({
    success: true,
    count: problems.length,
    problems,
  });
});

/**
 * POST /api/test/validate
 * Test AI response accuracy for a single problem
 */
testValidationRouter.post('/validate', async (req, res) => {
  try {
    const { problemId } = req.body;
    
    if (!problemId) {
      return res.status(400).json({ error: 'Problem ID is required' });
    }
    
    const allProblems = getTestProblems({});
    const problem = allProblems.find(p => p.id === problemId);
    
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    const startTime = Date.now();
    
    // Get AI response using optimized service
    const context = `You are helping a ${problem.exam.toUpperCase()} student with ${problem.subject}. Provide ${problem.expectedResponseType}.`;
    const result = await optimizedAI.generateResponse(problem.question, context);
    
    const responseTime = Date.now() - startTime;
    
    // Use smart validator for answer checking
    const validation = AnswerValidator.validate(
      result.response,
      problem.correctAnswer,
      problem.options
    );
    
    const { isCorrect, confidence } = validation;
    
    const testResult: TestResult = {
      problem,
      aiResponse: result.response,
      isCorrect,
      confidence,
      responseTime,
      cost: result.cost || 0,
      model: result.model || 'unknown',
    };
    
    res.json({
      success: true,
      result: testResult,
    });
  } catch (error) {
    console.error('[TEST VALIDATION] Error:', error);
    res.status(500).json({
      error: 'Failed to validate problem',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/test/benchmark
 * Run benchmark on multiple problems
 */
testValidationRouter.post('/benchmark', async (req, res) => {
  try {
    const { count = 10, subject, exam, difficulty } = req.body;
    
    // Get test problems
    let problems: TestProblem[];
    
    if (subject || exam || difficulty) {
      problems = getTestProblems({ subject, exam, difficulty, limit: count });
    } else {
      problems = getRandomProblems(count);
    }
    
    if (problems.length === 0) {
      return res.status(400).json({ error: 'No problems found for given filters' });
    }
    
    const results: TestResult[] = [];
    let totalResponseTime = 0;
    let totalCost = 0;
    let correctCount = 0;
    
    // Test each problem
    for (const problem of problems) {
      const startTime = Date.now();
      
      const context = `You are helping a ${problem.exam.toUpperCase()} student with ${problem.subject}. Provide ${problem.expectedResponseType}.`;
      const aiResult = await optimizedAI.generateResponse(problem.question, context);
      
      const responseTime = Date.now() - startTime;
      
      const validation = AnswerValidator.validate(
        aiResult.response,
        problem.correctAnswer,
        problem.options
      );
      
      if (validation.isCorrect) {
        correctCount++;
      }
      
      totalResponseTime += responseTime;
      totalCost += aiResult.cost || 0;
      
      results.push({
        problem,
        aiResponse: aiResult.response,
        isCorrect: validation.isCorrect,
        confidence: validation.confidence,
        responseTime,
        cost: aiResult.cost || 0,
        model: aiResult.model || 'unknown',
      });
    }
    
    const accuracy = (correctCount / problems.length) * 100;
    const avgResponseTime = totalResponseTime / problems.length;
    const avgCost = totalCost / problems.length;
    
    res.json({
      success: true,
      benchmark: {
        totalProblems: problems.length,
        correctAnswers: correctCount,
        accuracyPercent: parseFloat(accuracy.toFixed(2)),
        accuracyDisplay: accuracy.toFixed(2) + '%',
        avgResponseTimeMs: parseFloat(avgResponseTime.toFixed(2)),
        avgResponseTimeDisplay: avgResponseTime.toFixed(2) + 'ms',
        totalCost: parseFloat(totalCost.toFixed(4)),
        totalCostDisplay: '$' + totalCost.toFixed(4),
        avgCost: parseFloat(avgCost.toFixed(4)),
        avgCostDisplay: '$' + avgCost.toFixed(4),
        results,
      },
    });
  } catch (error) {
    console.error('[TEST BENCHMARK] Error:', error);
    res.status(500).json({
      error: 'Failed to run benchmark',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/test/full-suite
 * Run complete test suite and generate report
 */
testValidationRouter.post('/full-suite', async (req, res) => {
  try {
    const allProblems = getTestProblems({});
    
    const subjectResults: Record<string, { correct: number; total: number }> = {};
    const examResults: Record<string, { correct: number; total: number }> = {};
    const difficultyResults: Record<string, { correct: number; total: number }> = {};
    
    let totalCorrect = 0;
    let totalCost = 0;
    let totalTime = 0;
    
    const detailedResults: TestResult[] = [];
    
    // Test all problems
    for (const problem of allProblems) {
      const startTime = Date.now();
      
      const context = `You are helping a ${problem.exam.toUpperCase()} student with ${problem.subject}. Provide ${problem.expectedResponseType}.`;
      const aiResult = await optimizedAI.generateResponse(problem.question, context);
      
      const responseTime = Date.now() - startTime;
      
      const validation = AnswerValidator.validate(
        aiResult.response,
        problem.correctAnswer,
        problem.options
      );
      const isCorrect = validation.isCorrect;
      
      if (isCorrect) {
        totalCorrect++;
      }
      
      totalCost += aiResult.cost || 0;
      totalTime += responseTime;
      
      // Track by subject
      if (!subjectResults[problem.subject]) {
        subjectResults[problem.subject] = { correct: 0, total: 0 };
      }
      subjectResults[problem.subject].total++;
      if (isCorrect) subjectResults[problem.subject].correct++;
      
      // Track by exam
      if (!examResults[problem.exam]) {
        examResults[problem.exam] = { correct: 0, total: 0 };
      }
      examResults[problem.exam].total++;
      if (isCorrect) examResults[problem.exam].correct++;
      
      // Track by difficulty
      if (!difficultyResults[problem.difficulty]) {
        difficultyResults[problem.difficulty] = { correct: 0, total: 0 };
      }
      difficultyResults[problem.difficulty].total++;
      if (isCorrect) difficultyResults[problem.difficulty].correct++;
      
      detailedResults.push({
        problem,
        aiResponse: aiResult.response.substring(0, 200) + '...',
        isCorrect: validation.isCorrect,
        confidence: validation.confidence,
        responseTime,
        cost: aiResult.cost || 0,
        model: aiResult.model || 'unknown',
      });
    }
    
    const overallAccuracy = (totalCorrect / allProblems.length) * 100;
    
    // Calculate subject-wise accuracy
    const subjectAccuracy: Record<string, number> = {};
    for (const [subject, stats] of Object.entries(subjectResults)) {
      subjectAccuracy[subject] = parseFloat(((stats.correct / stats.total) * 100).toFixed(2));
    }
    
    // Calculate exam-wise accuracy
    const examAccuracy: Record<string, number> = {};
    for (const [exam, stats] of Object.entries(examResults)) {
      examAccuracy[exam] = parseFloat(((stats.correct / stats.total) * 100).toFixed(2));
    }
    
    // Calculate difficulty-wise accuracy
    const difficultyAccuracy: Record<string, number> = {};
    for (const [difficulty, stats] of Object.entries(difficultyResults)) {
      difficultyAccuracy[difficulty] = parseFloat(((stats.correct / stats.total) * 100).toFixed(2));
    }
    
    res.json({
      success: true,
      report: {
        summary: {
          totalProblems: allProblems.length,
          correctAnswers: totalCorrect,
          overallAccuracyPercent: parseFloat(overallAccuracy.toFixed(2)),
          overallAccuracyDisplay: overallAccuracy.toFixed(2) + '%',
          totalCost: parseFloat(totalCost.toFixed(4)),
          totalCostDisplay: '$' + totalCost.toFixed(4),
          totalTimeMs: parseFloat(totalTime.toFixed(2)),
          totalTimeDisplay: totalTime.toFixed(2) + 'ms',
          avgTimePerProblemMs: parseFloat((totalTime / allProblems.length).toFixed(2)),
          avgTimePerProblemDisplay: (totalTime / allProblems.length).toFixed(2) + 'ms',
          avgCostPerProblem: parseFloat((totalCost / allProblems.length).toFixed(4)),
          avgCostPerProblemDisplay: '$' + (totalCost / allProblems.length).toFixed(4),
        },
        bySubject: subjectAccuracy,
        byExam: examAccuracy,
        byDifficulty: difficultyAccuracy,
        detailedResults: detailedResults.slice(0, 10), // Return first 10 detailed results
      },
    });
  } catch (error) {
    console.error('[TEST FULL SUITE] Error:', error);
    res.status(500).json({
      error: 'Failed to run full test suite',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default testValidationRouter;
