import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { catchError, map, Subject, throwError } from "rxjs";
import { newBaseUrl } from "../../../../../shared/AppBaseUrl/appBaseURL";
import * as moment from "moment";

@Injectable({
  providedIn: "root",
})
export class ChartOfAccountService {
  commonUrl: string = "api/services/app/";
  baseUrl: string = newBaseUrl + this.commonUrl;

  url: string = "";
  url_: string = "";
  constructor(private http: HttpClient) {}
  getAll(
    target: string,
    skipCount?: number,
    maxCount?: number,
    natureOfAccount?: number
  ) {
    this.url = `${this.baseUrl}${target}/GetAll`;
    const params = [];

    if (skipCount !== undefined) {
      params.push(`SkipCount=${skipCount}`);
    }

    if (maxCount !== undefined) {
      params.push(`MaxResultCount=${maxCount}`);
    }
    if (natureOfAccount !== undefined) {
      params.push(`NatureOfAccounts=${natureOfAccount}`);
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
      if (params.skipCount !== undefined) {
        searchParams.append("SkipCount", params.skipCount.toString());
      }
      if (params.maxCount !== undefined) {
        searchParams.append("MaxResultCount", params.maxCount.toString());
      }
      if (
        params.natureOfAccount !== undefined &&
        params.natureOfAccount !== null
      ) {
        searchParams.append(
          "NatureOfAccounts",
          params.natureOfAccount.toString()
        );
      }
    }

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
  getAllSuggestion(target: string) {
    this.url = `${this.baseUrl}Suggestion/GetSuggestions?Target=${target}`;
    return this.http.get(this.url).pipe(
      map((response: any) => {
        console.log(response);

        return response["result"];
      })
    );
  }
  getSerialNumber(id: number, target: string) {
    this.url = this.baseUrl;
    this.url += target + "/GetSerialNumber?COALevel01Id=" + id;
    return this.http.get(this.url).pipe(
      map((response: any) => {
        return response["result"];
      })
    );
  }
  getSerialNumberLevel3(id: number, target: string) {
    this.url = this.baseUrl;
    this.url += target + "/GetSerialNumber?COALevel02Id=" + id;
    return this.http.get(this.url).pipe(
      map((response: any) => {
        return response["result"];
      })
    );
  }
  getSerialNumberLevel4(id: number, target: string) {
    this.url = this.baseUrl;
    this.url += target + "/GetSerialNumber?COALevel03Id=" + id;
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
    employeeType: string
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
  getAllSalaries(target: string, issueDate?: string) {
    this.url = `${this.baseUrl}${target}/GetAll`;
    const params = [];

    if (issueDate !== undefined) {
      params.push(`IssueDate=${moment(issueDate).format("YYYY-MM-DD")}`);
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

  private updateSubject = new Subject<void>();

  // Observable to notify subscribers
  categoryUpdated$ = this.updateSubject.asObservable();

  notifyUpdate() {
    this.updateSubject.next();
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
}
