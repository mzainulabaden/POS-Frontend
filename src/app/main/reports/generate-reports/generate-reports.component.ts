import { ChangeDetectorRef, Component, Injector } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
} from "@node_modules/@angular/forms";
import { catchError, finalize, throwError } from "rxjs";
import { ReportsService } from "@app/main/reports/services/reports.service";
import { MessageService, ConfirmationService } from "primeng/api";
import { report } from "process";

@Component({
  selector: "app-generate-reports",
  templateUrl: "./generate-reports.component.html",
  styleUrl: "./generate-reports.component.css",
})
export class GenerateReportsComponent {
  filterConfig: any = {
    EmployeeId: {
      type: "dropdown",
      label: "Employee",
      options: () => this.employees,
      optionLabel: "name",
      optionValue: "id",
    },
    PurchaseOrderId: {
      type: "dropdown",
      label: "Purchase Order",
      options: () => this.poTableData,
      optionLabel: "voucherNumber",
      optionValue: "id",
    },
    PurchaseInvoiceId: {
      type: "dropdown",
      label: "Purchase Invoice",
      options: () => this.piTableData,
      optionLabel: "voucherNumber",
      optionValue: "id",
    },
    SalesOrderId: {
      type: "dropdown",
      label: "Sales Order",
      options: () => this.soTableData,
      optionLabel: "voucherNumber",
      optionValue: "id",
    },
    SalesInvoiceId: {
      type: "dropdown",
      label: "Sales Invoice",
      options: () => this.siTableData,
      optionLabel: "voucherNumber",
      optionValue: "id",
    },

    ItemId: {
      type: "dropdown",
      label: "Item",
      options: () => this.item,
      optionLabel: "name",
      optionValue: "id",
    },
    PaymentModeId: {
      type: "dropdown",
      label: "Payment Mode",
      options: () => this.paymentTerms,
      optionLabel: "name",
      optionValue: "id",
    },
    UnitId: {
      type: "dropdown",
      label: "Unit",
      options: () => this.units,
      optionLabel: "name",
      optionValue: "id",
    },
    SupplierId: {
      type: "dropdown",
      label: "Supplier",
      options: () => this.supplier,
      optionLabel: "name",
      optionValue: "id",
    },
    BrokerId: {
      type: "dropdown",
      label: "Broker",
      options: () => this.broker,
      optionLabel: "name",
      optionValue: "id",
    },
    WarehouseId: {
      type: "dropdown",
      label: "Warehouse",
      options: () => this.wareHouse,
      optionLabel: "name",
      optionValue: "id",
    },
    CustomerId: {
      type: "dropdown",
      label: "Customer",
      options: () => this.client,
      optionLabel: "name",
      optionValue: "id",
    },

    CategoryId: {
      type: "dropdown",
      label: "Category",
      options: () => this.category,
      optionLabel: "name",
      optionValue: "id",
    },

    ReferenceNumber: { type: "input", label: "Reference Number" },
    CurrencyName: { type: "input", label: "Currency Name" },
    EmailAddress: { type: "input", label: "Email Address" },
    NatureOfAccount: {
      type: "dropdown",
      label: "Nature Of Account",
      options: () => this.natureOfAccountOptions,
      optionLabel: "label",
      optionValue: "value",
    },
    SerialNumber: { type: "input", label: "Serial Number" },

    ChartOfAccountId: {
      type: "dropdown",
      label: "Chart of Account",
      options: () => this.coaLvl4,
      optionLabel: "name",
      optionValue: "id",
    },
    ToDate: { type: "date", label: "To Date" },
    FromDate: { type: "date", label: "From Date" },
    MaxQ: { type: "input", label: "Max Quantity" },
    MinQ: { type: "input", label: "Min Quantity" },
    Top: { type: "input", label: "Top Numbers" },
  };

  storeForm: FormGroup;
  selectedItem: string = "";
  selectedTab: number = 0;
  selectedReport: any;
  isModalVisible: boolean;
  target: string = "Reporting";
  mainTabs: string[] = ["HRM Setups", "Inventory Management", "Finance"];
  activeTabIndex: number = 0;
  employees: { id: number; name: string }[] = [];
  units: {
    id: any;
    name: string;
    additional: string;
  }[] = [];
  item: { id: any; name: string }[] = [];
  paymentTerms: { id: any; name: string }[] = [];
  coaLvl4: { id: any; name: string }[] = [];
  supplier: { id: any; name: string }[] = [];
  broker: { id: any; name: string }[] = [];
  tax: { id: any; name: string }[] = [];
  wareHouse: { id: any; name: string }[] = [];
  client: { id: any; name: string }[] = [];
  category: { id: any; name: string }[] = [];
  poTableData: any;
  piTableData: any;
  siTableData: any;
  soTableData: any;
  saving: boolean = false;
  baseurl: string = "http://173.249.23.108:6063";

  natureOfAccountOptions = [
    { label: "Banks", value: "0" },
    { label: "Brokers", value: "1" },
    { label: "Clients", value: "2" },
    { label: "Suppliers", value: "3" },
    { label: "Taxs", value: "4" },
  ];
  reportFormats = [
    { label: "PDF", value: 0 },
    { label: "EXCEL", value: 1 },
    { label: "WORD", value: 2 },
    { label: "PPTX", value: 3 },
    { label: "CSV", value: 4 },
    { label: "XML", value: 5 },
    { label: "MHTML", value: 6 },
    { label: "IMAGE", value: 7 },
  ];
  constructor(
    injector: Injector,
    private fb: FormBuilder,
    private _reportService: ReportsService,
    private msgService: MessageService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
  }
  ngOnInit() {
    this.activeIndex = +localStorage.getItem("activeTabIndex") || 0;
  }

  initializeForm() {
    this.storeForm = this.fb.group({
      //HRM Setups
      EmployeeId: [""],
      StartDate: [""],
      EndDate: [""],

      //Inventory Management Params
      PurchaseOrderId: [""],
      PurchaseInvoiceId: [""],
      SalesOrderId: [""],
      SalesInvoiceId: [""],

      //Inventory Management Setups Report Extra Params
      ItemId: [""],
      PaymentModeId: [""],
      ReferenceNumber: [""],
      UnitId: [""],
      BrokerId: [""],
      SupplierId: [""],
      WarehouseId: [""],
      CustomerId: [""],

      //Finance Reports
      CurrencyName: [""],
      EmailAddress: [""],
      NatureOfAccount: [{ value: "", disabled: true }],
      SerialNumber: [""],

      //General Ledger
      ChartOfAccountId: [""],
      ToDate: [""],
      FromDate: [""],
      Top: [""],
      MaxQ: [""],
      MinQ: [""],
      CategoryId: [""],

      //Report Format
      ReportFormat: ["", Validators.required],
    });
  }
  activeIndex: number;
  onTabChange(event: any): void {
    this.activeIndex = event.index;
    localStorage.setItem("activeTabIndex", this.activeIndex.toString());
  }

  hrmList = [
    {
      reportName: "HRM",
      reportUrl: "%2fHumanResource%2fRPT_HRM_EmployeeAttendance",
      defaultParams: "",
      params: {},
      showFilter: ["EmployeeId", "StartDate", "EndDate"],
    },
  ];

  inventoryList = [
    //Purchase Order Report
    {
      reportName: "Purchase Order Report",
      reportUrl: "%2fInventoryManagement%2fRPT_PurchaseOrderDetails",
      defaultParams: "",
      params: {},
      showFilter: [
        "PurchaseOrderId",
        "ItemId",
        "PaymentModeId",
        "SupplierId",
        "UnitId",
      ],
    },

    //Purchase Order Supplier Wise Report
    {
      reportName: "Purchase Order Supplier-Wise Report",
      reportUrl:
        "%2fInventoryManagement%2fRPT_PurchaseOrderDetails-supplier_wise",
      defaultParams: "",
      params: {},
      showFilter: [
        "PurchaseOrderId",
        "ItemId",
        "PaymentModeId",
        "SupplierId",
        "UnitId",
      ],
    },

    //Purchase Invoice Report
    {
      reportName: "Purchase Invoice Report",
      reportUrl: "%2fInventoryManagement%2fRPT_PurchaseInvoiceDetails",
      defaultParams: "",
      params: {},
      showFilter: [
        "PurchaseInvoiceId",
        "BrokerId",
        "ItemId",
        "SupplierId",
        "WarehouseId",
      ],
    },

    //Sales Order Report
    {
      reportName: "Sales Order Report",
      reportUrl: "%2fInventoryManagement%2fRPT_SalesOrderDetails",
      defaultParams: "",
      params: {},
      showFilter: [
        "SalesOrderId",
        "CustomerId",
        "ItemId",
        "PaymentModeId",
        "WarehouseId",
      ],
    },

    //Sales Invoice Report
    {
      reportName: "Sales Invoice Report",
      reportUrl: "%2fInventoryManagement%2fRPT_SalesInvoiceDetails",
      defaultParams: "",
      params: {},
      showFilter: [
        "SalesInvoiceId",
        "CustomerId",
        "ItemId",
        "PaymentModeId",
        "WarehouseId",
        "ReferenceNumber",
      ],
    },

    {
      reportName: "Stock Ledger Report",
      reportUrl: "%2fInventoryManagement%2fRPT_Current_Stock_Ledger",
      defaultParams: "",
      params: {},
      showFilter: ["ItemId", "WarehouseId"],
    },

    // Least Selling Item Report
    {
      reportName: "Least Selling Item Report",
      reportUrl: "%2fInventoryManagement%2fRPT_LeastSellingReport",
      defaultParams: "",
      params: {},
      showFilter: ["FromDate", "ToDate", "MinQ", "MaxQ", "Top"],
    },

    // Top Selling Item Report
    {
      reportName: "Top Selling Item Report",
      reportUrl: "%2fInventoryManagement%2fRPT_Topselling-report",
      defaultParams: "",
      params: {},
      showFilter: ["FromDate", "ToDate", "MinQ", "MaxQ", "Top"],
    },

    // Category Wise Sale Report
    {
      reportName: "Category Wise Sale Report",
      reportUrl: "%2fInventoryManagement%2fRPT_SalesCategoryWise",
      defaultParams: "",
      params: {},
      showFilter: ["FromDate", "ToDate", "CategoryId", "MinQ", "MaxQ", "Top"],
    },

    // Sales Customer Wise Report
    {
      reportName: "Sales Customer Wise Report",
      reportUrl: "%2fInventoryManagement%2fRPT_SalesCustomerWiseReport",
      defaultParams: "",
      params: {},
      showFilter: [
        "FromDate",
        "ToDate",
        "CategoryId",
        "CustomerId",
        "MinQ",
        "MaxQ",
        "Top",
      ],
    },

    // Sales Payment Method Wise Report
    {
      reportName: "Sales Payment Method Wise Report",
      reportUrl: "%2fInventoryManagement%2fRPT_SalesPaymentMethodrWiseReport",
      defaultParams: "",
      params: {},
      showFilter: [
        "FromDate",
        "ToDate",
        "CategoryId",
        "CustomerId",
        "PaymentModeId",
        "MinQ",
        "MaxQ",
        "Top",
      ],
    },
  ];

  financeList = [
    {
      reportName: "Chart of Account Level-4 Banks Report",
      reportUrl: "%2fFinance_Defence+Rice%2fRPT_DR_COA_L4-Banks",
      defaultParams: "",
      params: {},
      showFilter: [
        "CurrencyName",
        "EmailAddress",
        "NatureOfAccount",
        "SerialNumber",
      ],
    },
    {
      reportName: "Chart of Account Level-4 Brokers Report",
      reportUrl: "%2fFinance_Defence+Rice%2fRPT_DR_COA_L4-Brokers",
      defaultParams: "",
      params: {},
      showFilter: [
        "CurrencyName",
        "EmailAddress",
        "NatureOfAccount",
        "SerialNumber",
      ],
    },
    {
      reportName: "Chart of Account Level-4 Clients Report",
      reportUrl: "%2fFinance_Defence+Rice%2fRPT_DR_COA_L4-Clients",
      defaultParams: "",
      params: {},
      showFilter: [
        "CurrencyName",
        "EmailAddress",
        "NatureOfAccount",
        "SerialNumber",
      ],
    },
    {
      reportName: "Chart of Account Level-4 Suppliers Report",
      reportUrl: "%2fFinance_Defence+Rice%2fRPT_DR_COA_L4-+Suppliers",
      defaultParams: "",
      params: {},
      showFilter: [
        "CurrencyName",
        "EmailAddress",
        "NatureOfAccount",
        "SerialNumber",
      ],
    },
    {
      reportName: "Chart of Account Level-4 Taxs Report",
      reportUrl: "%2fFinance_Defence+Rice%2fRPT_DR_COA_L4-+Tax",
      defaultParams: "",
      params: {},
      showFilter: [
        "CurrencyName",
        "EmailAddress",
        "NatureOfAccount",
        "SerialNumber",
      ],
    },
    {
      reportName: "General Ledger Report",
      reportUrl: "%2fFinance_Defence+Rice%2fRPT_DR_GeneralLedgerSummary",
      defaultParams: "",
      params: {},
      showFilter: ["ChartOfAccountId", "EndDate", "StartDate"],
    },
    {
      reportName: "Chart of Account Trial Balance",
      reportUrl: "%2fFinance_Defence+Rice%2fRPT_DR_COA_Trial_Balance",
      defaultParams: "",
      params: {},
      showFilter: ["ChartOfAccountId", "FromDate", "ToDate"],
    },
    {
      reportName: "Opening COA Trial Balance",
      reportUrl: "%2fFinance_Defence+Rice%2fRPT_DR_OpeningCOATrialBalance",
      defaultParams: "",
      params: {},
      showFilter: ["ChartOfAccountId", "FromDate", "ToDate"],
    },
    {
      reportName: "Account Payables",
      reportUrl: "%2fFinance_Defence+Rice%2fRPT_DR_AccountPayables",
      defaultParams: "",
      params: {},
      showFilter: ["ChartOfAccountId", "EndDate", "StartDate"],
    },
    {
      reportName: "Account Receivable",
      reportUrl: "%2fFinance_Defence+Rice%2fRPT_DR_AccountReceivable",
      defaultParams: "",
      params: {},
      showFilter: ["ChartOfAccountId", "EndDate", "StartDate"],
    },
  ];

  getTabItems(index: number) {
    switch (index) {
      case 0:
        return this.hrmList;
      case 1:
        return this.inventoryList;
      case 2:
        return this.financeList;
      default:
        return [{ reportName: "No reports available for this tab" }];
    }
  }
  openModal(item: any) {
    if (typeof item === "string") {
      this.selectedReport = this.hrmList.find(
        (report) => report.reportName === item
      );
    } else {
      this.selectedReport = item;
    }
    this.isModalVisible = true;
    if (this.selectedReport?.reportName === "HRM") {
      const today = new Date();
      this.storeForm.patchValue({
        StartDate: today,
        EndDate: today,
      });
    }
    this.fetchEmployee();
    this.getAllPurchaseOrder();
    this.getAllPurchaseInvoice();
    this.getAllSaleInvoice();
    this.getAllSalesOrder();
    this.fetchDropdownData("Item");
    this.fetchDropdownData("PaymentMode");
    this.fetchDropdownData("Unit");
    this.fetchDropdownData("Supplier");
    this.fetchDropdownData("Broker");
    this.fetchDropdownData("Client");
    this.fetchDropdownData("ItemCategory");
    this.fetchDropdownData("Warehouse");
    this.fetchDropdownData("COALevel04");
    this.setNatureOfAccountDefault();
  }

  submitForm() {
    if (this.storeForm.valid) {
      this.generateReportUrl(
        this.selectedReport.reportName,
        this.selectedReport.reportUrl
      );
    }
  }

  fetchEmployee() {
    this._reportService.getAllSuggestion("Employee").subscribe(
      (response: any) => {
        this.employees = response.items.map((employee: any) => ({
          id: employee?.id,
          name: employee?.name,
        }));
      },
      (error) => {
        this.msgService.add({
          severity: "error",
          summary: "Error",
          detail: error.error.error.message,
          life: 2000,
        });
        return throwError(error.error.error.message);
      }
    );
  }

  //Get All Purchase Orders
  getAllPurchaseOrder() {
    this._reportService
      .getAll("PurchaseOrder")
      .pipe(
        finalize(() => {}),
        catchError((error) => {
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: error.error.error.message,
            life: 2000,
          });
          return throwError(error.error.error.message);
        })
      )
      .subscribe({
        next: (response) => {
          this.poTableData = response.items.filter(
            (item) => item.status == "APPROVED"
          );
          this.cdr.markForCheck();
        },
      });
  }

  //Get All Purchase Invoices
  getAllPurchaseInvoice() {
    this._reportService
      .getAll("PurchaseInvoice")
      .pipe(
        finalize(() => {}),
        catchError((error) => {
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: error.error.error.message,
            life: 2000,
          });
          return throwError(error.error.error.message);
        })
      )
      .subscribe({
        next: (response) => {
          this.piTableData = response.items.filter(
            (item) => item.status == "APPROVED"
          );
          this.cdr.markForCheck();
        },
      });
  }

  //Get All Sale Orders
  getAllSalesOrder() {
    this._reportService
      .getAll("SalesOrder")
      .pipe(
        finalize(() => {}),
        catchError((error) => {
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: error.error.error.message,
            life: 2000,
          });
          return throwError(error.error.error.message);
        })
      )
      .subscribe({
        next: (response) => {
          this.soTableData = response.items.filter(
            (item) => item.status == "APPROVED"
          );
          this.cdr.markForCheck();
        },
      });
  }

  //Get All Sale Invoices
  getAllSaleInvoice() {
    this._reportService
      .getAll("SalesInvoice")
      .pipe(
        finalize(() => {}),
        catchError((error) => {
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: error.error.error.message,
            life: 2000,
          });
          return throwError(error.error.error.message);
        })
      )
      .subscribe({
        next: (response) => {
          this.siTableData = response.items.filter(
            (item) => item.status == "APPROVED"
          );
          this.cdr.markForCheck();
        },
      });
  }

  generateReportUrl(reportName: string, reportUrl: string) {
    if (!reportName || !reportUrl) {
      this.msgService.add({
        severity: "warn",
        summary: "Missing Parameters",
        detail: "Please provide a valid report name and URL.",
      });
      return;
    }

    const reportFormat = this.storeForm.get("ReportFormat")?.value ?? 0;

    // Initialize query parameters
    let queryParams = `ReportName=${encodeURIComponent(
      reportName
    )}&ReportUrl=${encodeURIComponent(reportUrl)}`;

    // Prepare body parameters (parameterName and parameterValue)
    const bodyParams = [];
    Object.keys(this.storeForm.controls).forEach((key) => {
      let value = this.storeForm.get(key)?.value;
      if (value && key !== "ReportFormat") {
        // Format date if it's a date object or string
        if (key.toLowerCase().includes("date")) {
          const dateValue = new Date(value);
          value = `${dateValue.getFullYear()}-${String(
            dateValue.getMonth() + 1
          ).padStart(2, "0")}-${String(dateValue.getDate()).padStart(2, "0")}`;
        }
        // Convert Date object to formatted string if it's detected
        if (typeof value === "string" && value.includes("GMT")) {
          const dateValue = new Date(value);
          value = `${dateValue.getFullYear()}-${String(
            dateValue.getMonth() + 1
          ).padStart(2, "0")}-${String(dateValue.getDate()).padStart(2, "0")}`;
        }
        bodyParams.push({
          parameterName: key,
          parameterValue: value.toString(),
        });
      }
    });

    // If no filters were added, send an empty array
    const finalBodyParams = bodyParams.length > 0 ? bodyParams : [];

    const fullUrl = `${this.baseurl}/api/services/app/Reporting/DownloadReport?${queryParams}&format=${reportFormat}`;

    this._reportService.generateReport(fullUrl, finalBodyParams).subscribe(
      (response: Blob) => {
        if (response) {
          const downloadUrl = window.URL.createObjectURL(response);
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = `${reportName}.${this.getFileExtension(reportFormat)}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(downloadUrl);
        } else {
          this.msgService.add({
            severity: "error",
            summary: "Report Error",
            detail: "Failed to generate report URL.",
          });
        }
      },
      (error) => {
        this.msgService.add({
          severity: "error",
          summary: "Report Error",
          detail: "An error occurred while generating the report.",
        });
        console.error("Error generating report:", error);
      }
    );
    this.onDialogClose();
  }

  getFileExtension(format: number): string {
    const formatExtensions = {
      0: "pdf",
      1: "xls",
      2: "doc",
      3: "pptx",
      4: "csv",
      5: "xml",
      6: "mhtml",
      7: "tif",
    };
    return formatExtensions[format] || "pdf";
  }

  // Method to set default NatureOfAccount
  setNatureOfAccountDefault() {
    if (this.selectedReport) {
      switch (this.selectedReport.reportName) {
        case "Chart of Account Level-4 Banks Report":
          this.storeForm.get("NatureOfAccount").setValue("0");
          break;
        case "Chart of Account Level-4 Brokers Report":
          this.storeForm.get("NatureOfAccount").setValue("1");
          break;
        case "Chart of Account Level-4 Clients Report":
          this.storeForm.get("NatureOfAccount").setValue("2");
          break;
        case "Chart of Account Level-4 Suppliers Report":
          this.storeForm.get("NatureOfAccount").setValue("3");
          break;
        case "Chart of Account Level-4 Taxs Report":
          this.storeForm.get("NatureOfAccount").setValue("4");
          break;
        default:
          this.storeForm.get("NatureOfAccount").setValue("");
          break;
      }
    }
  }

  fetchDropdownData(target) {
    this._reportService.getAllSuggestion(target).subscribe((response: any) => {
      const mappedData = response.items.map((item: any) => ({
        id: item?.id,
        name: item?.name,
        additional: item?.additional,
      }));
      switch (target) {
        case "Unit":
          this.units = mappedData;
          break;
        case "Item":
          this.item = mappedData;
          break;
        case "Supplier":
          this.supplier = mappedData;
          break;
        case "PaymentMode":
          this.paymentTerms = mappedData;
          break;
        case "Broker":
          this.broker = mappedData;
          break;
        case "Warehouse":
          this.wareHouse = mappedData;
          break;
        case "Client":
          this.client = mappedData;
          break;
        case "ItemCategory":
          this.category = mappedData;
          break;
        case "COALevel04":
          this.coaLvl4 = mappedData;
        default:
          break;
      }
      this.cdr.detectChanges();
    });
  }

  onDialogClose() {
    this.initializeForm();
    this.isModalVisible = false;
  }
}
