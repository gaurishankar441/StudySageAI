/**
 * 🚀 PHASE 3.1: Circuit Breaker for TTS Providers
 * Prevents cascading failures by temporarily stopping requests to failing services
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  successThreshold: number; // Number of successes in HALF_OPEN to close circuit
  timeout: number; // Time in ms to wait before trying again (OPEN -> HALF_OPEN)
  monitoringPeriod: number; // Time window for counting failures
}

interface CircuitMetrics {
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private metrics: CircuitMetrics = {
    failures: 0,
    successes: 0,
    lastFailureTime: 0,
    lastSuccessTime: 0,
    totalCalls: 0,
    totalFailures: 0,
    totalSuccesses: 0,
  };
  private nextAttempt: number = 0;
  
  constructor(
    private name: string,
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000, // 30 seconds
      monitoringPeriod: 60000, // 1 minute
    }
  ) {}

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is OPEN
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`[CIRCUIT BREAKER] ${this.name} is OPEN - too many failures`);
      }
      // Transition to HALF_OPEN to test if service recovered
      this.state = 'HALF_OPEN';
      console.log(`[CIRCUIT BREAKER] ${this.name} transitioning to HALF_OPEN`);
    }

    this.metrics.totalCalls++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record successful execution
   */
  private onSuccess(): void {
    this.metrics.successes++;
    this.metrics.totalSuccesses++;
    this.metrics.lastSuccessTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      if (this.metrics.successes >= this.config.successThreshold) {
        // Service recovered - close circuit
        this.close();
      }
    }

    // Reset failure count after monitoring period
    if (Date.now() - this.metrics.lastFailureTime > this.config.monitoringPeriod) {
      this.metrics.failures = 0;
    }
  }

  /**
   * Record failed execution
   */
  private onFailure(): void {
    this.metrics.failures++;
    this.metrics.totalFailures++;
    this.metrics.lastFailureTime = Date.now();
    this.metrics.successes = 0; // Reset success count

    if (this.state === 'HALF_OPEN') {
      // Failed while testing - reopen circuit
      this.open();
    } else if (this.metrics.failures >= this.config.failureThreshold) {
      // Too many failures - open circuit
      this.open();
    }
  }

  /**
   * Open the circuit
   */
  private open(): void {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.config.timeout;
    console.error(
      `[CIRCUIT BREAKER] ${this.name} OPENED - ${this.metrics.failures} failures detected. ` +
      `Will retry at ${new Date(this.nextAttempt).toISOString()}`
    );
  }

  /**
   * Close the circuit
   */
  private close(): void {
    this.state = 'CLOSED';
    this.metrics.failures = 0;
    this.metrics.successes = 0;
    console.log(`[CIRCUIT BREAKER] ${this.name} CLOSED - service recovered`);
  }

  /**
   * Get current state and metrics
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      ...this.metrics,
      config: this.config,
    };
  }

  /**
   * Force close circuit (useful for testing)
   */
  forceClose(): void {
    this.close();
  }

  /**
   * Force open circuit (useful for testing)
   */
  forceOpen(): void {
    this.open();
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.state = 'CLOSED';
    this.metrics = {
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      totalCalls: 0,
      totalFailures: 0,
      totalSuccesses: 0,
    };
    this.nextAttempt = 0;
  }
}

// Circuit breakers for different TTS providers
export const sarvamCircuitBreaker = new CircuitBreaker('Sarvam TTS', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 20000, // 20 seconds
  monitoringPeriod: 60000, // 1 minute
});

export const pollyCircuitBreaker = new CircuitBreaker('AWS Polly', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30 seconds
  monitoringPeriod: 60000, // 1 minute
});

export const enhancedVoiceCircuitBreaker = new CircuitBreaker('Enhanced Voice', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 15000, // 15 seconds
  monitoringPeriod: 60000, // 1 minute
});
