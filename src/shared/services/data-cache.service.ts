import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface CacheConfig {
  maxAge: number; // in milliseconds
  maxSize: number; // maximum number of items to cache
  enableDiffUpdates: boolean;
  storageKey: string;
}

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  version: string;
  lastModified?: string;
  etag?: string;
}

export interface DiffResult<T> {
  hasChanges: boolean;
  newData: T;
  changes: any[];
  added: any[];
  removed: any[];
  modified: any[];
}

@Injectable({
  providedIn: 'root'
})
export class DataCacheService {
  private cache = new Map<string, CacheItem<any>>();
  private cacheConfig: CacheConfig = {
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxSize: 100,
    enableDiffUpdates: true,
    storageKey: 'pos_data_cache'
  };

  private cacheStatusSubject = new BehaviorSubject<{
    isCached: boolean;
    lastUpdated: Date | null;
    cacheSize: number;
  }>({
    isCached: false,
    lastUpdated: null,
    cacheSize: 0
  });

  constructor() {
    this.loadFromStorage();
    this.startCleanupTimer();
  }

  /**
   * Get data with caching support
   */
  getCachedData<T>(
    key: string,
    dataFetcher: () => Observable<T>,
    options?: Partial<CacheConfig>
  ): Observable<T> {
    const config = { ...this.cacheConfig, ...options };
    const cachedItem = this.getFromCache<T>(key);

    if (cachedItem && this.isCacheValid(cachedItem, config.maxAge)) {
      this.updateCacheStatus();
      return of(cachedItem.data);
    }

    return dataFetcher().pipe(
      tap(data => this.setCache(key, data, config)),
      catchError(error => {
        // If fetch fails but we have cached data, return cached data
        if (cachedItem) {
          console.warn(`Failed to fetch fresh data for ${key}, using cached data`);
          return of(cachedItem.data);
        }
        return throwError(error);
      })
    );
  }

  /**
   * Get data with diff updates
   */
  getDataWithDiff<T>(
    key: string,
    dataFetcher: () => Observable<T>,
    options?: Partial<CacheConfig>
  ): Observable<T> {
    const config = { ...this.cacheConfig, ...options };
    const cachedItem = this.getFromCache<T>(key);

    if (cachedItem && this.isCacheValid(cachedItem, config.maxAge)) {
      // Try to get diff updates if supported
      if (config.enableDiffUpdates && cachedItem.lastModified) {
        return this.getDiffUpdates<T>(key, dataFetcher, cachedItem).pipe(
          map(diffResult => {
            if (diffResult.hasChanges) {
              this.setCache(key, diffResult.newData, config);
              return diffResult.newData;
            }
            return cachedItem.data;
          }),
          catchError(() => {
            // If diff update fails, return cached data
            return of(cachedItem.data);
          })
        );
      }
      return of(cachedItem.data);
    }

    return dataFetcher().pipe(
      tap(data => this.setCache(key, data, config))
    );
  }

  /**
   * Force refresh data (bypass cache)
   */
  forceRefresh<T>(
    key: string,
    dataFetcher: () => Observable<T>,
    options?: Partial<CacheConfig>
  ): Observable<T> {
    const config = { ...this.cacheConfig, ...options };
    return dataFetcher().pipe(
      tap(data => this.setCache(key, data, config))
    );
  }

  /**
   * Get cache status
   */
  getCacheStatus(): Observable<{
    isCached: boolean;
    lastUpdated: Date | null;
    cacheSize: number;
  }> {
    return this.cacheStatusSubject.asObservable();
  }

  /**
   * Clear specific cache entry
   */
  clearCache(key: string): void {
    this.cache.delete(key);
    this.saveToStorage();
    this.updateCacheStatus();
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
    this.saveToStorage();
    this.updateCacheStatus();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Check if data is cached and valid
   */
  isDataCached(key: string, maxAge?: number): boolean {
    const cachedItem = this.getFromCache(key);
    if (!cachedItem) return false;
    
    const age = maxAge || this.cacheConfig.maxAge;
    return this.isCacheValid(cachedItem, age);
  }

  /**
   * Set cache configuration
   */
  setCacheConfig(config: Partial<CacheConfig>): void {
    this.cacheConfig = { ...this.cacheConfig, ...config };
  }

  /**
   * Get data from cache
   */
  private getFromCache<T>(key: string): CacheItem<T> | null {
    return this.cache.get(key) || null;
  }

  /**
   * Set data in cache
   */
  private setCache<T>(key: string, data: T, config: CacheConfig): void {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      version: this.generateVersion(),
      lastModified: new Date().toISOString()
    };

    this.cache.set(key, cacheItem);
    this.enforceMaxSize(config.maxSize);
    this.saveToStorage();
    this.updateCacheStatus();
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(cacheItem: CacheItem<any>, maxAge: number): boolean {
    return (Date.now() - cacheItem.timestamp) < maxAge;
  }

  /**
   * Get diff updates (placeholder for server-side diff support)
   */
  private getDiffUpdates<T>(
    key: string,
    dataFetcher: () => Observable<T>,
    cachedItem: CacheItem<T>
  ): Observable<DiffResult<T>> {
    // This is a placeholder for server-side diff support
    // In a real implementation, you would send the lastModified timestamp
    // to the server and get only the changes
    return dataFetcher().pipe(
      map(newData => {
        const changes = this.calculateChanges(cachedItem.data, newData);
        return {
          hasChanges: changes.length > 0,
          newData,
          changes,
          added: changes.filter(c => c.type === 'added'),
          removed: changes.filter(c => c.type === 'removed'),
          modified: changes.filter(c => c.type === 'modified')
        };
      })
    );
  }

  /**
   * Calculate changes between old and new data
   */
  private calculateChanges(oldData: any, newData: any): any[] {
    const changes: any[] = [];
    
    if (Array.isArray(oldData) && Array.isArray(newData)) {
      // Compare arrays
      const oldIds = new Set(oldData.map((item: any) => item.id));
      const newIds = new Set(newData.map((item: any) => item.id));
      
      // Find added items
      newData.forEach((item: any) => {
        if (!oldIds.has(item.id)) {
          changes.push({ type: 'added', item });
        }
      });
      
      // Find removed items
      oldData.forEach((item: any) => {
        if (!newIds.has(item.id)) {
          changes.push({ type: 'removed', item });
        }
      });
      
      // Find modified items
      newData.forEach((newItem: any) => {
        const oldItem = oldData.find((item: any) => item.id === newItem.id);
        if (oldItem && JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
          changes.push({ type: 'modified', oldItem, newItem });
        }
      });
    }
    
    return changes;
  }

  /**
   * Enforce maximum cache size
   */
  private enforceMaxSize(maxSize: number): void {
    if (this.cache.size > maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toDelete = entries.slice(0, this.cache.size - maxSize);
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Generate version string
   */
  private generateVersion(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.cacheConfig.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.cache = new Map(parsed);
        this.updateCacheStatus();
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    try {
      const serialized = JSON.stringify(Array.from(this.cache.entries()));
      localStorage.setItem(this.cacheConfig.storageKey, serialized);
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  /**
   * Update cache status
   */
  private updateCacheStatus(): void {
    const lastUpdated = this.cache.size > 0 
      ? new Date(Math.max(...Array.from(this.cache.values()).map(item => item.timestamp)))
      : null;
      
    this.cacheStatusSubject.next({
      isCached: this.cache.size > 0,
      lastUpdated,
      cacheSize: this.cache.size
    });
  }

  /**
   * Start cleanup timer for expired cache entries
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (!this.isCacheValid(item, this.cacheConfig.maxAge)) {
          this.cache.delete(key);
        }
      }
      this.saveToStorage();
      this.updateCacheStatus();
    }, 60000); // Check every minute
  }
}
