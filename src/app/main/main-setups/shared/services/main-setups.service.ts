import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { catchError, map, Subject, throwError, switchMap } from "rxjs";
import { newBaseUrl } from "../../../../../shared/AppBaseUrl/appBaseURL";
import * as moment from "moment";

@Injectable({
  providedIn: "root",
})
export class MainSetupsService {
  commonUrl: string = "api/services/app/";
  baseUrl: string = newBaseUrl + this.commonUrl;

  url: string = "";
  url_: string = "";
  constructor(private http: HttpClient) {}
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
    if (param.VoucherNumber !== undefined) {
      params.push(`VoucherNumber=${param.VoucherNumber}`);
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

  // Generic method for getAll

  getAllRecord(target: string, params?: any) {
    this.url = `${this.baseUrl}${target}/GetAll?`;
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.DocOrVocNumber) {
        searchParams.append("VoucherNumber", params.DocOrVocNumber.toString());
      }
      if (params.name) {
        searchParams.append("Name", params.name.toString());
      }
      if (params.skipCount) {
        searchParams.append("SkipCount", params.skipCount.toString());
      }
      if (params.maxCount) {
        searchParams.append("MaxResultCount", params.maxCount.toString());
      }
    }

    // Construct the final URL
    this.url += searchParams.toString();
    return this.http.get(this.url).pipe(
      map((response: any) => {
        console.log(response);
        return response["result"];
      })
    );
  }
  create(dto: any, target: string) {
    console.log(dto);
    this.url = this.baseUrl;
    this.url += target + "/Create";
    return this.http.post(this.url, dto);
  }
  submitAttendance(dto: any, target: string) {
    console.log(dto);
    this.url = this.baseUrl;
    this.url += target + "/SubmitAttendance";
    return this.http.post(this.url, dto);
  }

  delete(id: number, target: string) {
    this.url = this.baseUrl;
    this.url += target + "/Delete?Id=" + id;
    return this.http.delete(this.url);
  }
  getDataForEdit(id: number, target: string) {
    this.url = this.baseUrl;
    this.url += target + "/Get?Id=" + id;
    return this.http.get(this.url).pipe(
      map((response: any) => {
        return response["result"];
      })
    );
  }

  getData(id: number, target: string) {
    this.url = this.baseUrl;
    this.url += target + "/Get?Id=" + id;
    return this.http.get(this.url).pipe(
      map((response: any) => {
        return response["result"];
      })
    );
  }

  getSuggestions(target: string, name: string) {
    this.url = `${this.baseUrl}Suggestion/GetSuggestions?Target=${target}&name=${name}`;
    return this.http.get(this.url).pipe(
      map((response: any) => {
        console.log(response);

        return response["result"];
      })
    );
  }
  getDataView(id: number, target: string) {
    this.url = this.baseUrl;

    this.url += target + "/GetItemDetailsByCategory?ItemCategoryId=" + id;
    return this.http.get(this.url).pipe(
      map((response: any) => {
        return response["result"];
      })
    );
  }
  update(dto: any, target: string) {
    console.log(dto);
    this.url = this.baseUrl;
    this.url += target + "/Update";
    return this.http.put(this.url, dto);
  }
  updateView(dto: any, target: string) {
    console.log(dto);
    this.url = this.baseUrl;
    this.url += target + "/BulkUpdateItemDetails";
    return this.http.post(this.url, dto);
  }
  Approve(id: number, target: string) {
    this.url = this.baseUrl;
    this.url += target + "/ApproveDocument?Id=" + id;
    return this.http.post(this.url, {});
  }
  getAllSuggestion(target: string) {
    this.url = `${this.baseUrl}Suggestion/GetSuggestions?Target=${target}`;
    return this.http.get(this.url).pipe(
      map((response: any) => {
        console.log(response);

        return response["result"];
      })
    );
  }
  getAllPresentEmployees(
    target: string,
    startDate: string,
    endDate: string,
    skipCount?: number,
    maxCount?: number
  ) {
    this.url = `${this.baseUrl}${target}/GetAllPresentEmployees`;
    const params = [];

    if (skipCount !== undefined) {
      params.push(`SkipCount=${skipCount}`);
    }

    if (maxCount !== undefined) {
      params.push(`MaxResultCount=${maxCount}`);
    }
    if (startDate !== undefined) {
      params.push(`StartDate=${moment(startDate).format("YYYY-MM-DD")}`);
    }
    if (endDate !== undefined) {
      params.push(`EndDate=${moment(endDate).format("YYYY-MM-DD")}`);
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
  getAllAbsentEmployees(
    target: string,
    startDate: string,
    endDate: string,
    skipCount?: number,
    maxCount?: number
  ) {
    this.url = `${this.baseUrl}${target}/GetAllAbsentEmployees`;
    const params = [];

    if (skipCount !== undefined) {
      params.push(`SkipCount=${skipCount}`);
    }

    if (maxCount !== undefined) {
      params.push(`MaxResultCount=${maxCount}`);
    }
    if (startDate !== undefined) {
      params.push(`StartDate=${moment(startDate).format("YYYY-MM-DD")}`);
    }
    if (endDate !== undefined) {
      params.push(`EndDate=${moment(endDate).format("YYYY-MM-DD")}`);
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
  generateEmployeeSalary(
    target: string,
    startDate: string,
    endDate: string,
    employeeType: string,
    skipCount?: number,
    maxCount?: number
  ) {
    this.url = `${this.baseUrl}${target}/GenerateSalary`;
    const params = [];

    if (employeeType !== undefined) {
      params.push(`EmployeeType=${employeeType}`);
    }

    if (startDate !== undefined) {
      params.push(`StartDate=${moment(startDate).format("YYYY-MM-DD")}`);
    }
    if (endDate !== undefined) {
      params.push(`EndDate=${moment(endDate).format("YYYY-MM-DD")}`);
    }
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
  getAllSalaries(
    target: string,
    skipCount?: number,
    maxCount?: number,
    issueDate?: string
  ) {
    this.url = `${this.baseUrl}${target}/GetAll`;
    const params = [];

    if (issueDate !== undefined) {
      params.push(`IssueDate=${moment(issueDate).format("YYYY-MM-DD")}`);
    }
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

  private categoryUpdateSubject = new Subject<void>();

  // Observable to notify subscribers
  categoryUpdated$ = this.categoryUpdateSubject.asObservable();

  notifyCategoryUpdate() {
    this.categoryUpdateSubject.next();
  }

  bulkUpload(target: string, payload: any) {
    const url = `${this.baseUrl}${target}/BulkUpload`;
    return this.http.post(url, payload).pipe(
      map((response: any) => response["result"]),
      catchError((error) => {
        console.error("Bulk upload error:", error);
        return throwError(error);
      })
    );
  }

  updateItemStockLocally(itemId: number, unitId: number, stockDelta: number) {
    const target = "Item"; // assuming the item target is 'Item'

    return this.getDataForEdit(itemId, target).pipe(
      map((item: any) => {
        const updatedItem = { ...item };

        // Find the correct unit entry
        const detailIndex = updatedItem.itemDetails.findIndex(
          (detail: any) => detail.unitId === unitId
        );

        if (detailIndex > -1) {
          updatedItem.itemDetails[detailIndex].minStockLevel =
            (updatedItem.itemDetails[detailIndex].minStockLevel || 0) +
            stockDelta;
        } else {
          // Optional: add new unit entry if not found
          updatedItem.itemDetails.push({
            unitId: unitId,
            minStockLevel: stockDelta,
          });
        }

        return updatedItem;
      }),
      // After modifying, call update
      switchMap((updatedItem) => this.update(updatedItem, target))
    );
  }

  uploadDocuments(target: string, base64Images: string[]) {
    const url = `${this.baseUrl}${target}/UploadDocuments`;
    const payload = {
      base64Images: base64Images,
    };
    return this.http.post(url, payload).pipe(
      map((response: any) => {
        console.log("Upload response", response);
        return response["result"];
      }),
      catchError((error) => {
        console.error("Upload error:", error);
        return throwError(error);
      })
    );
  }

  // Observable for Trigger Save method in items category
  private saveCategorySubject = new Subject<any>();
  saveCategory$ = this.saveCategorySubject.asObservable();

  private categoryCreatedSubject = new Subject<any>();
  categoryCreated$ = this.categoryCreatedSubject.asObservable();

  triggerSave(data: any) {
    this.saveCategorySubject.next(data);
  }

  notifyCategoryCreated(newCategory: any) {
    this.categoryCreatedSubject.next(newCategory);
  }
}
