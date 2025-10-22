import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { Subject, takeUntil, BehaviorSubject } from 'rxjs';
import { DataCacheService } from '../../services/data-cache.service';
import { DataRefreshErrorHandlerService } from '../../services/data-refresh-error-handler.service';
import { BackgroundSyncService, SyncStatus } from '../../services/background-sync.service';

export interface RefreshConfig {
  enableAutoRefresh: boolean;
  refreshInterval: number;
  enableCaching: boolean;
  cacheKey: string;
  showLastUpdated: boolean;
  showSyncStatus: boolean;
  enableRetry: boolean;
  maxRetries: number;
}

@Component({
  selector: 'app-data-refresh',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    ProgressSpinnerModule,
    MessageModule,
    TooltipModule
  ],
  template: `
    <div class="data-refresh-container">
      <!-- Refresh Controls -->
      <div class="refresh-controls" *ngIf="showControls">
        <p-button
          [label]="isRefreshing ? 'Refreshing...' : 'Refresh'"
          [icon]="isRefreshing ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'"
          [loading]="isRefreshing"
          [disabled]="isRefreshing"
          (onClick)="manualRefresh()"
          size="small"
          severity="secondary"
          [pTooltip]="getRefreshTooltip()"
        ></p-button>

        <p-button
          *ngIf="config.enableAutoRefresh"
          [label]="autoRefreshEnabled ? 'Stop Auto' : 'Start Auto'"
          [icon]="autoRefreshEnabled ? 'pi pi-pause' : 'pi pi-play'"
          (onClick)="toggleAutoRefresh()"
          size="small"
          severity="info"
          [pTooltip]="autoRefreshEnabled ? 'Stop automatic refresh' : 'Start automatic refresh'"
        ></p-button>
      </div>

      <!-- Status Information -->
      <div class="refresh-status" *ngIf="showStatus">
        <div class="status-item" *ngIf="config.showLastUpdated && lastUpdated">
          <i class="pi pi-clock"></i>
          <span>Last updated: {{ lastUpdated | date:'short' }}</span>
        </div>

        <div class="status-item" *ngIf="config.showSyncStatus">
          <i class="pi pi-sync" [class.pi-spin]="syncStatus?.isRunning"></i>
          <span>{{ getSyncStatusText() }}</span>
        </div>

        <div class="status-item" *ngIf="cacheStatus?.isCached">
          <i class="pi pi-database"></i>
          <span>Cached ({{ cacheStatus.cacheSize }} items)</span>
        </div>
      </div>

      <!-- Error Display -->
      <p-message
        *ngIf="errorMessage"
        severity="error"
        [text]="errorMessage"
        [closable]="true"
        (onClose)="clearError()"
      >
        <ng-template pTemplate="content">
          <div class="error-content">
            <div class="error-message">{{ errorMessage }}</div>
            <div class="error-actions" *ngIf="config.enableRetry">
              <p-button
                label="Retry"
                icon="pi pi-refresh"
                size="small"
                severity="secondary"
                (onClick)="retry()"
                [loading]="isRetrying"
              ></p-button>
              <p-button
                label="Use Cached Data"
                icon="pi pi-database"
                size="small"
                severity="info"
                (onClick)="useCachedData()"
                *ngIf="cacheStatus?.isCached"
              ></p-button>
            </div>
          </div>
        </ng-template>
      </p-message>

      <!-- Loading Indicator -->
      <div class="loading-indicator" *ngIf="isRefreshing && showLoading">
        <p-progressSpinner
          [style]="{ width: '20px', height: '20px' }"
          strokeWidth="3"
        ></p-progressSpinner>
        <span>{{ loadingText }}</span>
      </div>
    </div>
  `,
  styles: [`
    .data-refresh-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .refresh-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .refresh-status {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .error-content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .error-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .loading-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #6b7280;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataRefreshComponent implements OnInit, OnDestroy {
  @Input() config: RefreshConfig = {
    enableAutoRefresh: true,
    refreshInterval: 300000, // 5 minutes
    enableCaching: true,
    cacheKey: 'default',
    showLastUpdated: true,
    showSyncStatus: true,
    enableRetry: true,
    maxRetries: 3
  };

  @Input() showControls: boolean = true;
  @Input() showStatus: boolean = true;
  @Input() showLoading: boolean = true;
  @Input() loadingText: string = 'Loading...';

  @Output() dataRefreshed = new EventEmitter<any>();
  @Output() refreshError = new EventEmitter<any>();
  @Output() retryAttempted = new EventEmitter<void>();

  isRefreshing = false;
  isRetrying = false;
  autoRefreshEnabled = false;
  lastUpdated: Date | null = null;
  errorMessage: string | null = null;
  retryCount = 0;

  private destroy$ = new Subject<void>();
  private refreshSubject = new BehaviorSubject<void>(undefined);
  private autoRefreshTimer: any;

  constructor(
    private cacheService: DataCacheService,
    private errorHandler: DataRefreshErrorHandlerService,
    private backgroundSync: BackgroundSyncService
  ) {}

  ngOnInit(): void {
    this.setupAutoRefresh();
    this.setupSyncStatus();
    this.setupCacheStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearAutoRefresh();
  }

  /**
   * Manual refresh trigger
   */
  manualRefresh(): void {
    this.refreshSubject.next();
  }

  /**
   * Toggle auto refresh
   */
  toggleAutoRefresh(): void {
    if (this.autoRefreshEnabled) {
      this.clearAutoRefresh();
    } else {
      this.startAutoRefresh();
    }
  }

  /**
   * Retry failed operation
   */
  retry(): void {
    this.isRetrying = true;
    this.retryCount++;
    this.retryAttempted.emit();
    this.manualRefresh();
  }

  /**
   * Use cached data when available
   */
  useCachedData(): void {
    if (this.cacheService.isDataCached(this.config.cacheKey)) {
      this.clearError();
      // Emit cached data
      this.dataRefreshed.emit();
    }
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.errorMessage = null;
    this.retryCount = 0;
  }

  /**
   * Get refresh tooltip text
   */
  getRefreshTooltip(): string {
    if (this.isRefreshing) {
      return 'Refreshing data...';
    }
    if (this.lastUpdated) {
      return `Last updated: ${this.lastUpdated.toLocaleString()}`;
    }
    return 'Refresh data';
  }

  /**
   * Get sync status text
   */
  getSyncStatusText(): string {
    if (!this.syncStatus) return 'Sync not available';
    
    if (this.syncStatus.isRunning) {
      return 'Syncing...';
    }
    if (this.syncStatus.lastSync) {
      return `Last sync: ${this.syncStatus.lastSync.toLocaleString()}`;
    }
    return 'Not synced';
  }

  /**
   * Setup auto refresh
   */
  private setupAutoRefresh(): void {
    if (this.config.enableAutoRefresh) {
      this.startAutoRefresh();
    }
  }

  /**
   * Start auto refresh
   */
  private startAutoRefresh(): void {
    this.clearAutoRefresh();
    this.autoRefreshEnabled = true;
    
    this.autoRefreshTimer = setInterval(() => {
      this.manualRefresh();
    }, this.config.refreshInterval);
  }

  /**
   * Clear auto refresh
   */
  private clearAutoRefresh(): void {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
    this.autoRefreshEnabled = false;
  }

  /**
   * Setup sync status monitoring
   */
  private setupSyncStatus(): void {
    this.backgroundSync.getSyncStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.syncStatus = status;
      });
  }

  /**
   * Setup cache status monitoring
   */
  private setupCacheStatus(): void {
    this.cacheService.getCacheStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.cacheStatus = status;
        if (status.lastUpdated) {
          this.lastUpdated = status.lastUpdated;
        }
      });
  }

  // Properties for template
  syncStatus: SyncStatus | null = null;
  cacheStatus: any = null;
}
