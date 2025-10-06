import { Component } from "@angular/core";

@Component({
  selector: "app-supplier-openings",
  templateUrl: "./supplier-openings.component.html",
})
export class SupplierOpeningsComponent {
  target = "GeneralLedger";
  fileName = "Supplier-Openings-Data";
  bulkUploadModal = false;
  constructor() {}

  ngOnInit() {}

  headerMap: { [key: string]: string } = {
    "Supplier Name": "coaLevel04Name",
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
