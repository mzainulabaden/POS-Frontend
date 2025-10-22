import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError, tap, finalize } from 'rxjs/operators';
import { DataCacheService } from './data-cache.service';
import { DataRefreshErrorHandlerService } from './data-refresh-error-handler.service';
import { BackgroundSyncService } from './background-sync.service';
import { newBaseUrl } from '../AppBaseUrl/appBaseURL';

export interface DataServiceConfig {
  enableCaching: boolean;
  cacheKey: string;
  enableBackgroundSync: boolean;
  syncOperationId: string;
  enableErrorHandling: boolean;
  enableRetry: boolean;
  maxRetries: number;
}

@Injectable({
  providedIn: 'root'
})
export class EnhancedDataService {
  protected commonUrl: string = "api/services/app/";
  protected baseUrl: string = newBaseUrl + this.commonUrl;

  constructor(
    protected http: HttpClient,
    private cacheService: DataCacheService,
    private errorHandler: DataRefreshErrorHandlerService,
    private backgroundSync: BackgroundSyncService
  ) {}

  /**
   * Get all data with enhanced error handling and caching
   */
  getAllData(
    target: string,
    skipCount?: number,
    maxCount?: number,
    name?: string,
    config?: Partial<DataServiceConfig>
  ): Observable<any> {
    const serviceConfig = this.getDefaultConfig(config);
    const cacheKey = `${target}_${skipCount}_${maxCount}_${name || ''}`;

    const dataFetcher = () => this.buildGetAllRequest(target, skipCount, maxCount, name);

    if (serviceConfig.enableCaching) {
      return this.cacheService.getCachedData(
        cacheKey,
        dataFetcher,
        { storageKey: serviceConfig.cacheKey }
      );
    }

    return this.executeWithErrorHandling(dataFetcher, serviceConfig);
  }

  /**
   * Get data with diff updates
   */
  getAllDataWithDiff(
    target: string,
    skipCount?: number,
    maxCount?: number,
    name?: string,
    config?: Partial<DataServiceConfig>
  ): Observable<any> {
    const serviceConfig = this.getDefaultConfig(config);
    const cacheKey = `${target}_${skipCount}_${maxCount}_${name || ''}`;

    const dataFetcher = () => this.buildGetAllRequest(target, skipCount, maxCount, name);

    if (serviceConfig.enableCaching) {
      return this.cacheService.getDataWithDiff(
        cacheKey,
        dataFetcher,
        { storageKey: serviceConfig.cacheKey }
      );
    }

    return this.executeWithErrorHandling(dataFetcher, serviceConfig);
  }

  /**
   * Force refresh data (bypass cache)
   */
  forceRefreshData(
    target: string,
    skipCount?: number,
    maxCount?: number,
    name?: string,
    config?: Partial<DataServiceConfig>
  ): Observable<any> {
    const serviceConfig = this.getDefaultConfig(config);
    const cacheKey = `${target}_${skipCount}_${maxCount}_${name || ''}`;

    const dataFetcher = () => this.buildGetAllRequest(target, skipCount, maxCount, name);

    if (serviceConfig.enableCaching) {
      return this.cacheService.forceRefresh(
        cacheKey,
        dataFetcher,
        { storageKey: serviceConfig.cacheKey }
      );
    }

    return this.executeWithErrorHandling(dataFetcher, serviceConfig);
  }

  /**
   * Get single data item
   */
  getData(
    id: number,
    target: string,
    config?: Partial<DataServiceConfig>
  ): Observable<any> {
    const serviceConfig = this.getDefaultConfig(config);
    const cacheKey = `${target}_${id}`;

    const dataFetcher = () => this.buildGetRequest(id, target);

    if (serviceConfig.enableCaching) {
      return this.cacheService.getCachedData(
        cacheKey,
        dataFetcher,
        { storageKey: serviceConfig.cacheKey }
      );
    }

    return this.executeWithErrorHandling(dataFetcher, serviceConfig);
  }

  /**
   * Create data
   */
  create(
    dto: any,
    target: string,
    config?: Partial<DataServiceConfig>
  ): Observable<any> {
    const serviceConfig = this.getDefaultConfig(config);
    const dataFetcher = () => this.buildCreateRequest(dto, target);

    return this.executeWithErrorHandling(dataFetcher, serviceConfig).pipe(
      tap(() => this.invalidateRelatedCache(target))
    );
  }

  /**
   * Update data
   */
  update(
    dto: any,
    target: string,
    config?: Partial<DataServiceConfig>
  ): Observable<any> {
    const serviceConfig = this.getDefaultConfig(config);
    const dataFetcher = () => this.buildUpdateRequest(dto, target);

    return this.executeWithErrorHandling(dataFetcher, serviceConfig).pipe(
      tap(() => this.invalidateRelatedCache(target))
    );
  }

  /**
   * Delete data
   */
  delete(
    id: number,
    target: string,
    config?: Partial<DataServiceConfig>
  ): Observable<any> {
    const serviceConfig = this.getDefaultConfig(config);
    const dataFetcher = () => this.buildDeleteRequest(id, target);

    return this.executeWithErrorHandling(dataFetcher, serviceConfig).pipe(
      tap(() => this.invalidateRelatedCache(target))
    );
  }

  /**
   * Register background sync operation
   */
  registerBackgroundSync(
    operationId: string,
    operation: () => Observable<any>,
    priority: number = 1,
    config?: Partial<DataServiceConfig>
  ): void {
    const serviceConfig = this.getDefaultConfig(config);
    
    if (serviceConfig.enableBackgroundSync) {
      this.backgroundSync.registerSyncOperation({
        id: operationId,
        name: `Sync ${operationId}`,
        operation,
        priority,
        maxRetries: serviceConfig.maxRetries
      });
    }
  }

  /**
   * Get cache status
   */
  getCacheStatus(): Observable<any> {
    return this.cacheService.getCacheStatus();
  }

  /**
   * Clear cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.cacheService.clearCache(key);
    } else {
      this.cacheService.clearAllCache();
    }
  }

  /**
   * Build GET all request
   */
  protected buildGetAllRequest(
    target: string,
    skipCount?: number,
    maxCount?: number,
    name?: string
  ): Observable<any> {
    let url = `${this.baseUrl}${target}/GetAll`;
    const params = [];

    if (skipCount !== undefined) {
      params.push(`SkipCount=${skipCount}`);
    }
    if (maxCount !== undefined) {
      params.push(`MaxResultCount=${maxCount}`);
    }
    if (name !== undefined) {
      params.push(`name=${name}`);
    }
    if (params.length > 0) {
      url += `?${params.join("&")}`;
    }

    return this.http.get(url).pipe(
      map((response: any) => response["result"])
    );
  }

  /**
   * Build GET request
   */
  protected buildGetRequest(id: number, target: string): Observable<any> {
    const url = `${this.baseUrl}${target}/Get?Id=${id}`;
    return this.http.get(url).pipe(
      map((response: any) => response["result"])
    );
  }

  /**
   * Build CREATE request
   */
  protected buildCreateRequest(dto: any, target: string): Observable<any> {
    const url = `${this.baseUrl}${target}/Create`;
    return this.http.post(url, dto);
  }

  /**
   * Build UPDATE request
   */
  protected buildUpdateRequest(dto: any, target: string): Observable<any> {
    const url = `${this.baseUrl}${target}/Update`;
    return this.http.put(url, dto);
  }

  /**
   * Build DELETE request
   */
  protected buildDeleteRequest(id: number, target: string): Observable<any> {
    const url = `${this.baseUrl}${target}/Delete?Id=${id}`;
    return this.http.delete(url);
  }

  /**
   * Execute operation with error handling
   */
  protected executeWithErrorHandling<T>(
    operation: () => Observable<T>,
    config: DataServiceConfig
  ): Observable<T> {
    if (config.enableErrorHandling) {
      return this.errorHandler.handleDataRefreshError(
        operation,
        'Data operation',
        {
          maxRetries: config.maxRetries,
          initialDelay: 1000,
          maxDelay: 5000,
          backoffMultiplier: 2
        }
      );
    }

    return operation();
  }

  /**
   * Invalidate related cache entries
   */
  protected invalidateRelatedCache(target: string): void {
    // Clear cache entries that start with the target name
    const cacheKeys = Array.from(this.cacheService['cache'].keys())
      .filter(key => key.startsWith(target));
    
    cacheKeys.forEach(key => this.cacheService.clearCache(key));
  }

  /**
   * Get default configuration
   */
  protected getDefaultConfig(config?: Partial<DataServiceConfig>): DataServiceConfig {
    return {
      enableCaching: true,
      cacheKey: 'default',
      enableBackgroundSync: false,
      syncOperationId: 'default',
      enableErrorHandling: true,
      enableRetry: true,
      maxRetries: 3,
      ...config
    };
  }
}
