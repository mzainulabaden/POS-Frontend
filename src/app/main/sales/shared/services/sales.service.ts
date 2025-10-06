import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { catchError, map, throwError } from "rxjs";
import { newBaseUrl } from "../../../../../shared/AppBaseUrl/appBaseURL";
import * as moment from "moment";

@Injectable({
  providedIn: "root",
})
export class SalesService {
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

  getAllByCustomerID(target: string, CustomerCOALevel04Id?: number) {
    this.url = `${this.baseUrl}${target}/GetAllSalesOrders`;
    const params = [];

    if (CustomerCOALevel04Id !== undefined) {
      params.push(`customerCOALevel04Id=${CustomerCOALevel04Id}`);
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

  getAllByCustomer(target: string, CustomerCOALevel04Id?: number) {
    this.url = `${this.baseUrl}${target}/GetAll`;
    const params = [];

    if (CustomerCOALevel04Id !== undefined) {
      params.push(`customerCOALevel04Id=${CustomerCOALevel04Id}`);
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
    this.url += target + "/GetForEdit?Id=" + id;
    return this.http.get(this.url).pipe(
      map((response: any) => {
        return response["result"];
      })
    );
  }

  getDetailsForItem(itemId: number, unitId: number, target: string) {
    this.url = this.baseUrl;
    this.url += `${target}/GetItemPricingInfo?itemId=${itemId}&unitId=${unitId}`;
    return this.http.get(this.url).pipe(
      map((response: any) => {
        return response["result"];
      })
    );
  }
  getItemUnits(itemId: number, target: string) {
    this.url = this.baseUrl;
    this.url += `${target}/GetItemUnits?itemId=${itemId}`;
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

  getDataById(id: number, target: string) {
    this.url = this.baseUrl;
    this.url += target + "/GetById?Id=" + id;
    return this.http.get(this.url).pipe(
      map((response: any) => {
        return response["result"];
      })
    );
  }

  dataForEdit(id: number, target: string) {
    this.url = this.baseUrl;
    this.url += target + "/Get?Id=" + id;
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
  Approve(id: number, target: string) {
    this.url = this.baseUrl;
    this.url += target + "/ApproveDocument?Id=" + id;
    return this.http.post(this.url, {});
  }

  unApprove(id: number, target: string) {
    this.url = this.baseUrl;
    this.url += target + "/UnapproveDocument?Id=" + id;
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
  getVoucherNumber(prefix: string, issueDate: string, target: string) {
    this.url = this.baseUrl;
    this.url +=
      target +
      "/GetVoucherNumber?Prefix=" +
      prefix +
      "&IssueDate=" +
      moment(issueDate).format("YYYY-MM-DD");
    return this.http.get(this.url).pipe(
      map((response: any) => {
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

  getMinStockLevel(itemId: number, unitId: number) {
    const url = `${this.baseUrl}WarehouseStockAdjustment/GetMinStockLevel?ItemId=${itemId}&UnitId=${unitId}`;
    return this.http.get(url).pipe(
      map((response: any) => response.result),
      catchError((error) => {
        console.error("Error fetching stock level:", error);
        return throwError(error);
      })
    );
  }

  getCommissionPolicyByUserId(userId: number) {
    const url = `${this.baseUrl}SalesInvoice/GetCommissionPolicyByUserId?userId=${userId}`;
    return this.http.get(url).pipe(
      map((response: any) => response.result),
      catchError((error) => {
        console.error("Error fetching commission policy:", error);
        return throwError(error);
      })
    );
  }

  generateReport(url: string, bodyParams: any[] = []) {
    return this.http
      .post(url, bodyParams, {
        responseType: "blob", // Set response type to 'blob' for file download
      })
      .pipe(
        catchError((error) => {
          console.error("Error generating report:", error);
          return throwError(error);
        })
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

  getSalesTracking(target: string, skipCount?: number, maxCount?: number) {
    this.url = `${this.baseUrl}${target}/Summary`;
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

  getCustomerSales(userId: number) {
    const url = `${this.baseUrl}SalesTracking/details/${userId}`;
    return this.http.get(url).pipe(
      map((response: any) => response.result),
      catchError((error) => {
        console.error("Error fetching commission policy:", error);
        return throwError(error);
      })
    );
  }

  getLastSalesRate(
    target: string,
    itemId: number,
    unitId: number,
    customerCOALevel04Id: number
  ) {
    this.url = this.baseUrl;
    this.url += `${target}/GetLatestRate?ItemId=${itemId}&CustomerCOALevel04Id=${customerCOALevel04Id}&UnitId=${unitId}`;
    return this.http.get(this.url).pipe(
      map((response: any) => {
        return response["result"];
      })
    );
  }
}
