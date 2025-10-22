# Enhanced Data Services

This directory contains enhanced data services that provide robust error handling, caching, and background synchronization for the POS application.

## Services Overview

### 1. DataRefreshErrorHandlerService
Handles data refresh errors with retry logic and user-friendly error messages.

**Features:**
- Exponential backoff retry mechanism
- Configurable retry attempts
- Error message extraction
- Retryable error detection

**Usage:**
```typescript
constructor(private errorHandler: DataRefreshErrorHandlerService) {}

// Handle data refresh with retry
this.errorHandler.handleDataRefreshError(
  () => this.dataService.getAllData(),
  'Data loading',
  { maxRetries: 3, initialDelay: 1000 }
).subscribe({
  next: (data) => console.log('Data loaded:', data),
  error: (error) => console.error('Failed after retries:', error)
});
```

### 2. DataCacheService
Provides intelligent caching with localStorage persistence and diff updates.

**Features:**
- localStorage persistence
- Configurable cache expiration
- Diff updates for efficient data sync
- Cache size management
- Automatic cleanup

**Usage:**
```typescript
constructor(private cacheService: DataCacheService) {}

// Get cached data with fallback
this.cacheService.getCachedData(
  'my-data-key',
  () => this.apiService.getData(),
  { maxAge: 300000 } // 5 minutes
).subscribe(data => {
  // Use cached data if available, otherwise fetch fresh
});

// Get data with diff updates
this.cacheService.getDataWithDiff(
  'my-data-key',
  () => this.apiService.getData()
).subscribe(result => {
  if (result.hasChanges) {
    console.log('Changes detected:', result.changes);
  }
});
```

### 3. BackgroundSyncService
Manages background data synchronization with minimal UI blocking.

**Features:**
- Automatic sync on network/visibility changes
- Configurable sync intervals
- Priority-based operation queuing
- Concurrent sync limits
- Retry on failure

**Usage:**
```typescript
constructor(private backgroundSync: BackgroundSyncService) {}

// Register sync operation
this.backgroundSync.registerSyncOperation(
  'user-data-sync',
  () => this.userService.getUserData(),
  1, // Priority
  { enableBackgroundSync: true }
);

// Start background sync
this.backgroundSync.startSync();

// Monitor sync status
this.backgroundSync.getSyncStatus().subscribe(status => {
  console.log('Sync status:', status);
});
```

### 4. EnhancedDataService
Base service that integrates all enhanced functionality.

**Features:**
- Automatic error handling
- Built-in caching
- Background sync support
- Retry mechanisms
- Cache invalidation

**Usage:**
```typescript
export class MyService extends EnhancedDataService {
  constructor(http: HttpClient) {
    super(http);
  }

  getMyData() {
    return this.getAllData('MyEntity', 0, 10, undefined, {
      enableCaching: true,
      cacheKey: 'my-entity-cache',
      enableBackgroundSync: true,
      enableErrorHandling: true,
      maxRetries: 3
    });
  }
}
```

## Data Refresh Component

### DataRefreshComponent
Reusable component for data refresh operations with error handling and retry options.

**Features:**
- Manual and automatic refresh
- Error display with retry options
- Cache status indication
- Sync status monitoring
- Configurable refresh intervals

**Usage:**
```html
<app-data-refresh
  [config]="refreshConfig"
  [showControls]="true"
  [showStatus]="true"
  (dataRefreshed)="onDataRefreshed()"
  (refreshError)="onRefreshError($event)"
  (retryAttempted)="onRetryAttempted()"
></app-data-refresh>
```

```typescript
refreshConfig = {
  enableAutoRefresh: true,
  refreshInterval: 300000, // 5 minutes
  enableCaching: true,
  cacheKey: 'my-data',
  showLastUpdated: true,
  showSyncStatus: true,
  enableRetry: true,
  maxRetries: 3
};
```

## Configuration Options

### RetryConfig
```typescript
interface RetryConfig {
  maxRetries: number;        // Maximum retry attempts
  initialDelay: number;      // Initial delay in milliseconds
  maxDelay: number;          // Maximum delay in milliseconds
  backoffMultiplier: number; // Exponential backoff multiplier
}
```

### CacheConfig
```typescript
interface CacheConfig {
  maxAge: number;           // Cache expiration time in milliseconds
  maxSize: number;          // Maximum number of cached items
  enableDiffUpdates: boolean; // Enable diff-based updates
  storageKey: string;       // localStorage key for persistence
}
```

### SyncConfig
```typescript
interface SyncConfig {
  interval: number;                    // Sync interval in milliseconds
  enableOnVisibilityChange: boolean;  // Sync when tab becomes visible
  enableOnNetworkChange: boolean;     // Sync when network comes online
  enableOnFocus: boolean;             // Sync when window gains focus
  retryOnFailure: boolean;            // Retry failed sync operations
  maxConcurrentSyncs: number;        // Maximum concurrent sync operations
}
```

## Best Practices

1. **Error Handling**: Always use the error handler service for data operations
2. **Caching**: Enable caching for frequently accessed data
3. **Background Sync**: Use background sync for non-critical data updates
4. **Retry Logic**: Configure appropriate retry attempts based on operation criticality
5. **Cache Management**: Set appropriate cache expiration times
6. **User Feedback**: Provide clear error messages and retry options

## Example Implementation

See `todo-list-enhanced.component.ts` for a complete example of how to integrate all these services in a real component.

## Migration Guide

To migrate existing services to use enhanced functionality:

1. Extend `EnhancedDataService` instead of creating custom HTTP calls
2. Replace manual error handling with the error handler service
3. Add caching configuration to frequently accessed data
4. Register background sync operations for non-critical updates
5. Use the data refresh component in your templates

This approach provides a robust, user-friendly data management system with minimal code changes.
