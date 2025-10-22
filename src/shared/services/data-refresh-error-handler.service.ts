import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, Observable, throwError, timer } from 'rxjs';
import { retry, retryWhen, delay, take, concat, switchMap } from 'rxjs/operators';

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface DataRefreshError {
  message: string;
  code?: string;
  timestamp: Date;
  retryCount: number;
  canRetry: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DataRefreshErrorHandlerService {
  private errorSubject = new BehaviorSubject<DataRefreshError | null>(null);
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };

  constructor(private messageService: MessageService) {}

  /**
   * Handle data refresh errors with retry logic
   */
  handleDataRefreshError<T>(
    operation: () => Observable<T>,
    context: string = 'Data refresh',
    customRetryConfig?: Partial<RetryConfig>
  ): Observable<T> {
    const config = { ...this.retryConfig, ...customRetryConfig };
    let retryCount = 0;

    return operation().pipe(
      retryWhen(errors =>
        errors.pipe(
          switchMap((error, index) => {
            retryCount = index + 1;
            const delayTime = Math.min(
              config.initialDelay * Math.pow(config.backoffMultiplier, index),
              config.maxDelay
            );

            if (retryCount > config.maxRetries) {
              this.showPermanentError(context, retryCount);
              return throwError(error);
            }

            this.showRetryMessage(context, retryCount, delayTime);
            return timer(delayTime);
          }),
          take(config.maxRetries)
        )
      )
    );
  }

  /**
   * Handle errors with custom retry logic
   */
  handleWithCustomRetry<T>(
    operation: () => Observable<T>,
    context: string,
    retryFunction: (error: any, retryCount: number) => boolean
  ): Observable<T> {
    return operation().pipe(
      retry({
        count: this.retryConfig.maxRetries,
        delay: (error, retryCount) => {
          if (!retryFunction(error, retryCount)) {
            throw error;
          }
          return timer(this.calculateDelay(retryCount));
        }
      })
    );
  }

  /**
   * Show error message with retry option
   */
  showErrorWithRetry(error: any, context: string, retryCallback: () => void): void {
    const errorMessage = this.extractErrorMessage(error);
    
    this.messageService.add({
      severity: 'error',
      summary: `${context} Failed`,
      detail: errorMessage,
      life: 0, // Persistent until dismissed
      data: {
        showRetry: true,
        retryCallback: retryCallback,
        context: context
      }
    });
  }

  /**
   * Show permanent error (no retry option)
   */
  showPermanentError(context: string, retryCount: number): void {
    this.messageService.add({
      severity: 'error',
      summary: `${context} Failed`,
      detail: `Failed after ${retryCount} attempts. Please check your connection and try again.`,
      life: 5000
    });
  }

  /**
   * Show retry message
   */
  private showRetryMessage(context: string, retryCount: number, delayTime: number): void {
    this.messageService.add({
      severity: 'warn',
      summary: `${context} Retrying...`,
      detail: `Attempt ${retryCount} of ${this.retryConfig.maxRetries} (retrying in ${Math.ceil(delayTime / 1000)}s)`,
      life: delayTime
    });
  }

  /**
   * Get current error state
   */
  getCurrentError(): Observable<DataRefreshError | null> {
    return this.errorSubject.asObservable();
  }

  /**
   * Clear current error
   */
  clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Set retry configuration
   */
  setRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  /**
   * Calculate delay with exponential backoff
   */
  private calculateDelay(retryCount: number): number {
    return Math.min(
      this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount - 1),
      this.retryConfig.maxDelay
    );
  }

  /**
   * Extract error message from various error types
   */
  private extractErrorMessage(error: any): string {
    if (error?.error?.error?.message) {
      return error.error.error.message;
    }
    if (error?.error?.message) {
      return error.error.message;
    }
    if (error?.message) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'An unexpected error occurred';
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error: any): boolean {
    // Network errors are typically retryable
    if (error?.status === 0 || error?.code === 'NETWORK_ERROR') {
      return true;
    }
    
    // Server errors (5xx) are retryable
    if (error?.status >= 500 && error?.status < 600) {
      return true;
    }
    
    // Timeout errors are retryable
    if (error?.status === 408 || error?.code === 'TIMEOUT') {
      return true;
    }
    
    // Client errors (4xx) are generally not retryable
    if (error?.status >= 400 && error?.status < 500) {
      return false;
    }
    
    return true; // Default to retryable for unknown errors
  }
}
