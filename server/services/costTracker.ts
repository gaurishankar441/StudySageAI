export class CostTracker {
  private costs = new Map<string, { tokens: number; cost: number }>();
  private queryCounts = new Map<string, number>();
  
  // Model pricing (per million tokens)
  private readonly PRICING = {
    'gemini-1.5-flash': 0.07,
    'gpt-4o-mini': 0.15,
    'claude-haiku': 0.25,
    'gpt-4': 5.00, // Old expensive model
    'text-embedding-3-small': 0.02,
    'assemblyai-stt': 0.15 / 60, // per minute
    'aws-polly-tts': 16.00 / 1000000, // per character
  };
  
  // Track token usage for a model
  trackTokenUsage(model: string, inputTokens: number, outputTokens: number) {
    const totalTokens = inputTokens + outputTokens;
    const costPerToken = ((this.PRICING as any)[model] || 0) / 1000000;
    const cost = totalTokens * costPerToken;
    
    // Update costs
    const current = this.costs.get(model) || { tokens: 0, cost: 0 };
    this.costs.set(model, {
      tokens: current.tokens + totalTokens,
      cost: current.cost + cost,
    });
    
    // Update query count
    const queryCount = this.queryCounts.get(model) || 0;
    this.queryCounts.set(model, queryCount + 1);
    
    console.log(
      `[COST] ${model}: ${totalTokens} tokens = $${cost.toFixed(6)} | Total: $${(current.cost + cost).toFixed(4)}`
    );
    
    return cost;
  }
  
  // Get daily cost
  getDailyCost(): number {
    return Array.from(this.costs.values()).reduce((sum, item) => sum + item.cost, 0);
  }
  
  // Get cost breakdown by model
  getCostBreakdown(): Array<{ model: string; queries: number; tokens: number; cost: number; percentage: number }> {
    const totalCost = this.getDailyCost();
    const breakdown: Array<{ model: string; queries: number; tokens: number; cost: number; percentage: number }> = [];
    
    for (const [model, data] of Array.from(this.costs.entries())) {
      breakdown.push({
        model,
        queries: this.queryCounts.get(model) || 0,
        tokens: data.tokens,
        cost: data.cost,
        percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
      });
    }
    
    return breakdown.sort((a, b) => b.cost - a.cost);
  }
  
  // Calculate projected monthly cost
  getProjectedMonthlyCost(dailyQueries: number): number {
    const totalQueries = Array.from(this.queryCounts.values()).reduce((sum, count) => sum + count, 0);
    
    if (totalQueries === 0) {
      return 0;
    }
    
    const costPerQuery = this.getDailyCost() / totalQueries;
    const monthlyQueries = dailyQueries * 30;
    
    return costPerQuery * monthlyQueries;
  }
  
  // Get savings compared to GPT-4
  getSavingsVsGPT4(): { current: number; gpt4: number; savings: number; savingsPercent: number } {
    const currentCost = this.getDailyCost();
    const totalTokens = Array.from(this.costs.values()).reduce((sum, item) => sum + item.tokens, 0);
    const gpt4Cost = (totalTokens / 1000000) * this.PRICING['gpt-4'];
    
    return {
      current: currentCost,
      gpt4: gpt4Cost,
      savings: gpt4Cost - currentCost,
      savingsPercent: gpt4Cost > 0 ? ((gpt4Cost - currentCost) / gpt4Cost) * 100 : 0,
    };
  }
  
  // Print cost summary
  printSummary() {
    console.log('\n='.repeat(60));
    console.log('💰 COST TRACKER SUMMARY');
    console.log('='.repeat(60));
    
    const breakdown = this.getCostBreakdown();
    const savings = this.getSavingsVsGPT4();
    const totalQueries = Array.from(this.queryCounts.values()).reduce((sum, count) => sum + count, 0);
    
    console.log(`\n📊 Total Queries: ${totalQueries}`);
    console.log(`💵 Total Cost: $${this.getDailyCost().toFixed(4)}`);
    console.log(`📉 Savings vs GPT-4: $${savings.savings.toFixed(4)} (${savings.savingsPercent.toFixed(1)}%)`);
    
    console.log('\n📈 Cost Breakdown by Model:');
    for (const item of breakdown) {
      console.log(
        `  ${item.model.padEnd(20)} | ` +
        `Queries: ${String(item.queries).padStart(4)} | ` +
        `Tokens: ${String(item.tokens).padStart(8)} | ` +
        `Cost: $${item.cost.toFixed(4).padStart(7)} | ` +
        `${item.percentage.toFixed(1).padStart(5)}%`
      );
    }
    
    console.log('\n📅 Projected Monthly Cost (10K students):');
    const avgQueriesPerStudent = 20; // Average 20 queries per month per student
    const monthlyQueries = 10000 * avgQueriesPerStudent;
    const monthlyCost = this.getProjectedMonthlyCost(monthlyQueries / 30);
    console.log(`  Total: $${monthlyCost.toFixed(2)}`);
    console.log(`  Per Student: $${(monthlyCost / 10000).toFixed(4)}`);
    
    console.log('='.repeat(60) + '\n');
  }
  
  // Reset daily counter (call this at midnight via cron)
  reset() {
    this.costs.clear();
    this.queryCounts.clear();
    console.log('[COST] Daily cost tracker reset');
  }
  
  // Check if daily cost exceeds threshold
  checkThreshold(thresholdUSD: number = 50): boolean {
    const dailyCost = this.getDailyCost();
    if (dailyCost > thresholdUSD) {
      console.warn(`⚠️ COST ALERT: Daily cost $${dailyCost.toFixed(2)} exceeds threshold $${thresholdUSD}`);
      return true;
    }
    return false;
  }
}

// Singleton instance
export const costTracker = new CostTracker();

// Print summary every hour
setInterval(() => {
  costTracker.printSummary();
}, 60 * 60 * 1000);
