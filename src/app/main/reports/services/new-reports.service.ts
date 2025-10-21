import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ItemTrackingReport, ItemTrackingParams, SalesCustomerWiseReport, SalesCustomerWiseParams, WarehouseStockReport, WarehouseStockParams } from "../models/item-tracking.model";
import { newBaseUrl } from "../../../../shared/AppBaseUrl/appBaseURL";

@Injectable({
  providedIn: "root",
})
export class NewReportsService {
  private baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = newBaseUrl + "api/services/app/";
  }

  getItemTracking(params: ItemTrackingParams): Observable<ItemTrackingReport[]> {
    let httpParams = new HttpParams();
    
    if (params.warehouseId) {
      httpParams = httpParams.append("WarehouseId", params.warehouseId.toString());
    }
    if (params.itemId) {
      httpParams = httpParams.append("ItemId", params.itemId.toString());
    }
    if (params.fromDate) {
      httpParams = httpParams.append("FromDate", params.fromDate);
    }
    if (params.toDate) {
      httpParams = httpParams.append("ToDate", params.toDate);
    }

    return this.http.get<any>(
      `${this.baseUrl}ItemTracking/GetItemTracking`,
      { params: httpParams }
    ).pipe(
      map((response) => {
        // Handle ABP response format - data might be in response.result or directly in response
        if (response && response.result) {
          return response.result;
        }
        return response || [];
      })
    );
  }

  getSalesCustomerWise(params: SalesCustomerWiseParams): Observable<SalesCustomerWiseReport[]> {
    let httpParams = new HttpParams();
    
    if (params.fromDate) {
      httpParams = httpParams.append("FromDate", params.fromDate);
    }
    if (params.toDate) {
      httpParams = httpParams.append("ToDate", params.toDate);
    }

    return this.http.get<any>(
      `${this.baseUrl}SalesCustomerWise/GetSalesCustomerWise`,
      { params: httpParams }
    ).pipe(
      map((response) => {
        // Handle ABP response format - data might be in response.result or directly in response
        if (response && response.result) {
          return response.result;
        }
        return response || [];
      })
    );
  }

  getWarehouseStockLedger(params: WarehouseStockParams): Observable<WarehouseStockReport[]> {
    let httpParams = new HttpParams();
    
    if (params.fromDate) {
      httpParams = httpParams.append("FromDate", params.fromDate);
    }
    if (params.toDate) {
      httpParams = httpParams.append("ToDate", params.toDate);
    }
    if (params.warehouseId) {
      httpParams = httpParams.append("WarehouseId", params.warehouseId.toString());
    }
    if (params.itemId) {
      httpParams = httpParams.append("ItemId", params.itemId.toString());
    }

    return this.http.get<any>(
      `${this.baseUrl}salesCustomerWise/GetWarehouseStockLedgerDetails`,
      { params: httpParams }
    ).pipe(
      map((response) => {
        // Handle ABP response format - data might be in response.result or directly in response
        if (response && response.result) {
          return response.result;
        }
        return response || [];
      })
    );
  }

  getCompanyProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}CompanyProfile/Get`).pipe(
      map((response: any) => {
        // Handle ABP response format
        if (response && response.result) {
          return response.result;
        }
        return response;
      })
    );
  }
}

