import { Component } from "@angular/core";

@Component({
  selector: "app-stocks-openings",
  templateUrl: "./stocks-openings.component.html",
})
export class StocksOpeningsComponent {
  target = "WarehouseStockLedger";
  fileName = "Stocks-Openings-Data";
  bulkUploadModal = false;

  ngOnInit() {}

  headerMap: { [key: string]: string } = {
    "Item Name": "itemName",
    "Warehouse Name": "warehouseName",
    Credit: "credit",
    Debit: "debit",
    Rate: "rate",
    Remarks: "remarks",
  };

  onPreview(data: any[]) {
    console.log("Preview data:", data);
  }

  openBulkUpload() {
    this.bulkUploadModal = true;
  }
}
