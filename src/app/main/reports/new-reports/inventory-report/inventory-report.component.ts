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
      {
        id: "sales-customer-wise",
        name: "Sales Customer Wise Report",
        description: "View sales data grouped by customer with daily totals and invoice counts",
        icon: "pi pi-users",
        apiEndpoint: "SalesCustomerWise/GetSalesCustomerWise",
      },
      {
        id: "warehouse-stock",
        name: "Warehouse Stock Report",
        description: "View warehouse stock details with in/out quantities and total stock balance",
        icon: "pi pi-box",
        apiEndpoint: "salesCustomerWise/GetWarehouseStockLedgerDetails",
      },
      {
        id: "daily-sales",
        name: "Daily Sales Report",
        description: "View daily sales summary with total sales, invoice counts, and payment breakdown",
        icon: "pi pi-calendar",
        apiEndpoint: "ReportingPreview/GetDailySales",
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

