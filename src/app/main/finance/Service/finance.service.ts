import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { catchError, map, throwError } from "rxjs";
import { newBaseUrl } from "../../../../shared/AppBaseUrl/appBaseURL";
import * as moment from "moment";

@Injectable({
  providedIn: "root",
})
export class FinanceService {
  commonUrl: string = "api/services/app/";
  baseUrl: string = newBaseUrl + this.commonUrl;

  url: string = "";
  url_: string = "";
  constructor(private http: HttpClient) {}
  getAll(target: string, param?: any) {
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
    if (param.linkedDocument !== undefined) {
      params.push(`linkedDocument=${param.linkedDocument}`);
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

  getAllData(
    target: string,
    skipCount?: number,
    maxCount?: number,
    name?: string
  ) {
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

  getData(id: number, target: string) {
    this.url = this.baseUrl;
    this.url += target + "/Get?Id=" + id;
    return this.http.get(this.url).pipe(
      map((response: any) => {
        return response["result"];
      })
    );
  }

  getForEditData(id: number, target: string) {
    this.url = this.baseUrl;
    this.url += target + "/GetForEdit?Id=" + id;
    return this.http.get(this.url).pipe(
      map((response: any) => {
        return response["result"];
      })
    );
  }

  create(dto: any, target: string) {
    console.log(target, "Data", dto);

    this.url = this.baseUrl;
    this.url += target + "/Create";
    return this.http.post(this.url, dto);
  }

  delete(id: number, target: string) {
    this.url = this.baseUrl;
    this.url += target + "/Delete?Id=" + id;
    return this.http.delete(this.url);
  }
  Approve(id: number, target: string) {
    this.url = this.baseUrl;
    this.url += target + "/ApproveDocument?Id=" + id;
    return this.http.post(this.url, {});
  }

  update(dto: any, target: string) {
    console.log(dto);
    this.url = this.baseUrl;
    this.url += target + "/Update";
    return this.http.put(this.url, dto);
  }
  updateEdit(dto: any, target: string) {
    console.log(dto);
    this.url = this.baseUrl;
    this.url += target + "/Edit";
    return this.http.put(this.url, dto);
  }

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
}
