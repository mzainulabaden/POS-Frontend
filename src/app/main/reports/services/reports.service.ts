import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { catchError, map, throwError } from "rxjs";
import { newBaseUrl } from "../../../../shared/AppBaseUrl/appBaseURL";
import * as moment from "moment";

@Injectable({
  providedIn: "root",
})
export class ReportsService {
  commonUrl: string = "api/services/app/";
  baseUrl: string = newBaseUrl + this.commonUrl;
  url: string = "";

  constructor(private http: HttpClient) {}

  getAllSuggestion(target: string) {
    this.url = `${this.baseUrl}Suggestion/GetSuggestions?Target=${target}`;
    return this.http.get(this.url).pipe(
      map((response: any) => {
        console.log(response);
        return response["result"];
      })
    );
  }

  getAll(target: string, skipCount?: number, maxCount?: number, name?: string) {
      this.url = `${this.baseUrl}${target}/GetAll`;
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
        this.url += `?${params.join("&")}`;
      }
      return this.http.get(this.url).pipe(
        map((response: any) => {
          console.log(response);
          return response["result"];
        })
      );
    }

  generateReport(url: string, bodyParams: any[] = []) {
    return this.http.post(url, bodyParams, {
      responseType: "blob", // Set response type to 'blob' for file download
    }).pipe(
      catchError((error) => {
        console.error("Error generating report:", error);
        return throwError(error);
      })
    );
  }
}
