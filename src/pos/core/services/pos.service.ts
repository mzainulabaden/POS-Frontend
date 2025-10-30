import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { catchError, map, Subject, throwError, switchMap } from "rxjs";
import { newBaseUrl } from "../../../shared/AppBaseUrl/appBaseURL";
import * as moment from "moment";

import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class PosService {
  commonUrl: string = "api/services/app/";
  baseUrl: string = newBaseUrl + this.commonUrl;

  url: string = "";
  url_: string = "";
  constructor(private http: HttpClient) {}
  private sidebarOpen = new BehaviorSubject<boolean>(true); // Initial state is open
  sidebarOpen$ = this.sidebarOpen.asObservable();

  toggleSidebar() {
    this.sidebarOpen.next(!this.sidebarOpen.value);
  }

  get isSidebarOpen() {
    return this.sidebarOpen.value;
  }

  // ---------- Shared Cart State ----------
  private _cartItems = new BehaviorSubject<any[]>([]);
  cartItems$ = this._cartItems.asObservable();

  get cartItems(): any[] {
    return this._cartItems.value;
  }

  addToCart(product: any) {
    const items = [...this._cartItems.value];
    const targetId = product && product.id != null ? String(product.id) : undefined;
    const existing = items.find((item) => (item && item.id != null ? String(item.id) : undefined) === targetId);

    if (existing) {
      const currentQty = Number(existing.qty || 1);
      existing.qty = currentQty + 1;
    } else {
      items.push({ ...product, qty: 1 });
    }

    this._cartItems.next(items);
  }

  removeFromCart(index: number) {
    const items = [...this._cartItems.value];
    items.splice(index, 1);
    this._cartItems.next(items);
  }

  updateCartItems(items: any[]) {
    this._cartItems.next(items);
  }

  clearCart() {
    this._cartItems.next([]);
  }

  //  ------------ Search Bar---------------

  private searchTerm = new BehaviorSubject<string>(""); // default empty
  searchTerm$ = this.searchTerm.asObservable();

  setSearchTerm(term: string) {
    this.searchTerm.next(term);
  }

  //  ------------ Barcode Scan ---------------

	private barcodeScanSubject = new Subject<string>();
	barcodeScan$ = this.barcodeScanSubject.asObservable();

	emitBarcodeScan(code: string) {
		if (code && code.trim()) {
			this.barcodeScanSubject.next(code.trim());
		}
	}

  //  ------------ Warehouse Management ---------------

  private currentWarehouseId = new BehaviorSubject<number | null>(null);
  currentWarehouseId$ = this.currentWarehouseId.asObservable();
  private dukkanWarehouseId: number | null = null;

  setCurrentWarehouseId(warehouseId: number | null) {
    this.currentWarehouseId.next(warehouseId);
  }


  getCurrentWarehouseId() {
    debugger;
    const target = "Warehouse";
     this.url = `${this.baseUrl}Suggestion/GetSuggestions?Target=${target}`;
    return this.http.get(this.url).pipe(
      map((response: any) => {
        console.log(response);

        return response.result.items[0].id;
      })
    );
  }

  setDukkanWarehouseId(warehouseId: number | null) {
    this.dukkanWarehouseId = warehouseId;
  }

  getDukkanWarehouseId(): number | null {
    return this.dukkanWarehouseId;
  }

  getEffectiveWarehouseId(): number | null {
    debugger    // Return current warehouse if set, otherwise return dukkan warehouse as default
    return this.currentWarehouseId.value || this.dukkanWarehouseId;
  }

  //  ------------ New API Methods ---------------

  getItemsWithStockByWarehouse(warehouseId: number, itemId?: number) {
    this.url = `${this.baseUrl}Item/GetItemsWithStockByWarehouse`;
    // Use lowercase param name to match backend (per provided URL)
    const params = [`warehouseId=${warehouseId}`];
    
    if (params.length > 0) {
      this.url += `?${params.join("&")}`;
    }

    return this.http.get(this.url).pipe(
      map((response: any) => {
        console.log('GetItemsWithStockByWarehouse response:', response);
        return response["result"] || response;
      }),
      catchError((error) => {
        console.error('Error fetching items with stock by warehouse:', error);
        return throwError(error);
      })
    );
  }

  // Get stock for a specific item in a warehouse
  getItemStockByWarehouse(warehouseId: number, itemId: number) {
    return this.getItemsWithStockByWarehouse(warehouseId, itemId);
  }

  getAll(target: string, skipCount?: number, maxCount?: number) {
    this.url = `${this.baseUrl}${target}/GetAll`;
    const params = [];

    if (skipCount !== undefined) {
      params.push(`SkipCount=${skipCount}`);
    }

    if (maxCount !== undefined) {
      params.push(`MaxResultCount=${maxCount}`);
    }
    if (params.length > 0) {
      this.url += `?${params.join("&")}`;
    }

    return this.http.get(this.url).pipe(
      map((response: any) => {
        console.log(response);

        return response["result"];
      })
    );
  }

  getAll1(target: string, param?: any) {
    this.url = `${this.baseUrl}${target}/GetAll`;
    const params = [];

    if (param.skipCount !== undefined) {
      params.push(`SkipCount=${param.skipCount}`);
    }

    if (param.maxCount !== undefined) {
      params.push(`MaxResultCount=${param.maxCount}`);
    }
    if (param.name !== undefined) {
      params.push(`name=${param.name}`);
    }
    if (param && param.ItemCategoryId !== undefined) {
      params.push(`ItemCategoryId=${param.ItemCategoryId}`);
    }
    if (params.length > 0) {
      this.url += `?${params.join("&")}`;
    }
    return this.http.get(this.url).pipe(
      map((response: any) => {
        return response["result"];
      })
    );
  }

  create(dto: any, target: string) {
    console.log(dto);
    this.url = this.baseUrl;
    this.url += target + "/CreatePOS";
    return this.http.post(this.url, dto);
  }
}
