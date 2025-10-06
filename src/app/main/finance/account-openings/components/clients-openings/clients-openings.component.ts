import { Component } from "@angular/core";

@Component({
  selector: "app-clients-openings",
  templateUrl: "./clients-openings.component.html",
})
export class ClientsOpeningsComponent {
  target = "GeneralLedger";
  fileName = "Clients-Openings-Data";
  bulkUploadModal = false;
  constructor() {}

  ngOnInit() {}

  headerMap: { [key: string]: string } = {
    "Client Name": "coaLevel04Name",
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
