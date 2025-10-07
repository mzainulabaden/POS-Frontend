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
    const existing = items.find((item) => item.id === product.id);

    if (existing) {
      existing.qty = (existing.qty || 1) + 1;
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
