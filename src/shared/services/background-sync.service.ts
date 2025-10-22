import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, interval, fromEvent, merge, throwError } from 'rxjs';
import { map, filter, switchMap, takeUntil, tap, catchError } from 'rxjs/operators';
import { DataCacheService } from './data-cache.service';
import { DataRefreshErrorHandlerService } from './data-refresh-error-handler.service';

export interface SyncConfig {
  interval: number; // in milliseconds
  enableOnVisibilityChange: boolean;
  enableOnNetworkChange: boolean;
  enableOnFocus: boolean;
  retryOnFailure: boolean;
  maxConcurrentSyncs: number;
}

export interface SyncStatus {
  isRunning: boolean;
  lastSync: Date | null;
  nextSync: Date | null;
  errorCount: number;
  successCount: number;
  currentOperation: string | null;
}

export interface SyncOperation {
  id: string;
  name: string;
  operation: () => Observable<any>;
  priority: number;
  retryCount: number;
  maxRetries: number;
}

@Injectable({
  providedIn: 'root'
})
export class BackgroundSyncService {
  private syncStatusSubject = new BehaviorSubject<SyncStatus>({
    isRunning: false,
    lastSync: null,
    nextSync: null,
    errorCount: 0,
    successCount: 0,
    currentOperation: null
  });

  private syncConfig: SyncConfig = {
    interval: 5 * 60 * 1000, // 5 minutes
    enableOnVisibilityChange: true,
    enableOnNetworkChange: true,
    enableOnFocus: true,
    retryOnFailure: true,
    maxConcurrentSyncs: 3
  };

  private syncOperations = new Map<string, SyncOperation>();
  private activeSyncs = new Set<string>();
  private syncTimer: any;
  private isOnline = navigator.onLine;

  constructor(
    private ngZone: NgZone,
    private cacheService: DataCacheService,
    private errorHandler: DataRefreshErrorHandlerService
  ) {
    this.initializeSync();
    this.setupEventListeners();
  }

  /**
   * Register a sync operation
   */
  registerSyncOperation(operation: Omit<SyncOperation, 'retryCount'>): void {
    this.syncOperations.set(operation.id, {
      ...operation,
      retryCount: 0
    });
  }

  /**
   * Unregister a sync operation
   */
  unregisterSyncOperation(id: string): void {
    this.syncOperations.delete(id);
  }

  /**
   * Start background sync
   */
  startSync(): void {
    if (this.syncStatusSubject.value.isRunning) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.syncTimer = setInterval(() => {
        this.ngZone.run(() => this.performSync());
      }, this.syncConfig.interval);
    });

    this.updateSyncStatus({ isRunning: true });
  }

  /**
   * Stop background sync
   */
  stopSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.updateSyncStatus({ isRunning: false });
  }

  /**
   * Force sync all operations
   */
  forceSync(): void {
    this.performSync(true);
  }

  /**
   * Get sync status
   */
  getSyncStatus(): Observable<SyncStatus> {
    return this.syncStatusSubject.asObservable();
  }

  /**
   * Set sync configuration
   */
  setSyncConfig(config: Partial<SyncConfig>): void {
    this.syncConfig = { ...this.syncConfig, ...config };
    
    if (this.syncStatusSubject.value.isRunning) {
      this.stopSync();
      this.startSync();
    }
  }

  /**
   * Get next sync time
   */
  getNextSyncTime(): Date | null {
    const status = this.syncStatusSubject.value;
    if (!status.isRunning) return null;
    
    const lastSync = status.lastSync;
    if (!lastSync) return new Date(Date.now() + this.syncConfig.interval);
    
    return new Date(lastSync.getTime() + this.syncConfig.interval);
  }

  /**
   * Perform sync operations
   */
  private async performSync(force: boolean = false): Promise<void> {
    if (!this.isOnline && !force) {
      console.log('Offline - skipping sync');
      return;
    }

    if (this.activeSyncs.size >= this.syncConfig.maxConcurrentSyncs) {
      console.log('Max concurrent syncs reached - skipping');
      return;
    }

    const operations = Array.from(this.syncOperations.values())
      .sort((a, b) => b.priority - a.priority);

    for (const operation of operations) {
      if (this.activeSyncs.has(operation.id)) {
        continue;
      }

      if (this.activeSyncs.size >= this.syncConfig.maxConcurrentSyncs) {
        break;
      }

      this.executeSyncOperation(operation);
    }
  }

  /**
   * Execute a single sync operation
   */
  private executeSyncOperation(operation: SyncOperation): void {
    this.activeSyncs.add(operation.id);
    this.updateSyncStatus({ currentOperation: operation.name });

    this.errorHandler.handleDataRefreshError(
      operation.operation,
      operation.name,
      {
        maxRetries: operation.maxRetries,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      }
    ).pipe(
      tap(() => {
        this.updateSyncStatus({
          lastSync: new Date(),
          successCount: this.syncStatusSubject.value.successCount + 1,
          errorCount: Math.max(0, this.syncStatusSubject.value.errorCount - 1)
        });
      }),
      catchError(error => {
        this.updateSyncStatus({
          errorCount: this.syncStatusSubject.value.errorCount + 1
        });
        
        if (this.syncConfig.retryOnFailure && operation.retryCount < operation.maxRetries) {
          operation.retryCount++;
          // Retry after a delay
          setTimeout(() => {
            this.executeSyncOperation(operation);
          }, this.calculateRetryDelay(operation.retryCount));
        }
        
        return throwError(error);
      })
    ).subscribe({
      complete: () => {
        this.activeSyncs.delete(operation.id);
        this.updateSyncStatus({ currentOperation: null });
      }
    });
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    return Math.min(1000 * Math.pow(2, retryCount), 30000);
  }

  /**
   * Initialize sync
   */
  private initializeSync(): void {
    // Start sync if we have operations registered
    if (this.syncOperations.size > 0) {
      this.startSync();
    }
  }

  /**
   * Setup event listeners for automatic sync triggers
   */
  private setupEventListeners(): void {
    // Network status changes
    if (this.syncConfig.enableOnNetworkChange) {
      merge(
        fromEvent(window, 'online'),
        fromEvent(window, 'offline')
      ).pipe(
        tap(() => {
          this.isOnline = navigator.onLine;
          if (this.isOnline && this.syncOperations.size > 0) {
            this.performSync(true);
          }
        })
      ).subscribe();

    // Visibility changes (tab focus/blur)
    if (this.syncConfig.enableOnVisibilityChange) {
      fromEvent(document, 'visibilitychange').pipe(
        filter(() => !document.hidden),
        tap(() => {
          if (this.syncOperations.size > 0) {
            this.performSync(true);
          }
        })
      ).subscribe();
    }

    // Window focus
    if (this.syncConfig.enableOnFocus) {
      fromEvent(window, 'focus').pipe(
        tap(() => {
          if (this.syncOperations.size > 0) {
            this.performSync(true);
          }
        })
      ).subscribe();
    }
    }
  }

  /**
   * Update sync status
   */
  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    const currentStatus = this.syncStatusSubject.value;
    this.syncStatusSubject.next({
      ...currentStatus,
      ...updates,
      nextSync: this.getNextSyncTime()
    });
  }
}
