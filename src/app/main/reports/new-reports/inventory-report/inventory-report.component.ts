import { Component, OnInit } from "@angular/core";
import { ReportItem } from "../../models/item-tracking.model";

@Component({
  selector: "app-inventory-report",
  templateUrl: "./inventory-report.component.html",
  styleUrls: ["./inventory-report.component.css"],
})
export class InventoryReportComponent implements OnInit {
  reports: ReportItem[] = [];
  displayReportModal: boolean = false;
  selectedReport: ReportItem | null = null;

  constructor() {}

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports() {
    this.reports = [
      {
        id: "item-tracking",
        name: "Stock Ledger Report",
        description: "View detailed item tracking with opening and closing balances",
        icon: "pi pi-chart-line",
        apiEndpoint: "ItemTracking/GetItemTracking",
      },
      // Add more reports here as needed
    ];
  }

  openReportModal(report: ReportItem) {
    this.selectedReport = report;
    this.displayReportModal = true;
  }

  closeReportModal() {
    this.displayReportModal = false;
    this.selectedReport = null;
  }
}

