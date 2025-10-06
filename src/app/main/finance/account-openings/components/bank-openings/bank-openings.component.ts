import { Component } from "@angular/core";

@Component({
  selector: "app-bank-openings",
  templateUrl: "./bank-openings.component.html",
})
export class BankOpeningsComponent {
  target = "GeneralLedger";
  bulkUploadModal = false;
  fileName = "Bank-Openings-Data";
  constructor() {}

  ngOnInit() {}

  headerMap: { [key: string]: string } = {
    "Bank Name": "coaLevel04Name",
    Credit: "credit",
    Debit: "debit",
    Remarks: "remarks",
  };

  onPreview(data: any[]) {
    console.log("Preview data:", data);
  }

  openBulkUpload() {
    this.bulkUploadModal = true;
  }
}
