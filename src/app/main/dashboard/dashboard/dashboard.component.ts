import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import * as moment from "moment";
import { FormBuilder, FormGroup } from "@angular/forms";
import { DashboardService } from "../services/dashboard.service";
import { catchError, of, tap } from "rxjs";
import { Router } from "@node_modules/@angular/router";

// ---------- Interfaces ----------
interface AttendanceResponse {
  totalEmployees: number;
  presentEmployees: number;
  absentEmployees: number;
  attendanceDetails: any[];
}

interface BusinessPartnersResponse {
  totalSuppliers: number;
  totalClients: number;
  totalBanks: number;
  totalBrokers: number;
}

interface SalesStatsResponse {
  purchaseStats: {
    totalPurchaseInvoices: number;
    totalPurchaseOrders: number;
    totalPurchaseInvoiceAmount: number;
    totalPurchaseOrderAmount: number;
  };
  salesStats: {
    totalSalesInvoices: number;
    totalSalesOrders: number;
    totalSalesInvoiceAmount: number;
    totalSalesOrderAmount: number;
  };
}

interface TileCard {
  key: string;
  total: number | string;
  label: string;
  icon: string;
  bg: string;
  color?: string;
}

@Component({
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
})
export class DashboardComponent implements OnInit {
  // Form
  dashboardForm!: FormGroup;

  // Attendance
  todayDate = "";
  attendanceDetails: any[] = [];
  totalEmployees = 0;
  presentEmployees = 0;
  absentEmployees = 0;
  attendanceTiles: TileCard[] = [];

  // Business Partners
  totalSuppliers = 0;
  totalClients = 0;
  totalBanks = 0;
  totalBrokers = 0;
  tileCards: TileCard[] = [];

  // Sales & Purchase
  totalPurchaseInvoices = 0;
  totalPurchaseOrders = 0;
  totalPurchaseInvoiceAmount = 0;
  totalPurchaseOrderAmount = 0;
  totalSalesInvoices = 0;
  totalSalesOrders = 0;
  totalSalesInvoiceAmount = 0;
  totalSalesOrderAmount = 0;
  startDate = "";
  endDate = "";

  kpiCards: TileCard[] = [];
  salesPurchaseTiles: TileCard[] = [];
  salesPurchaseAmountTiles: TileCard[] = [];

  // Chart data
  dataEmployee: any;
  optionsEmployee: any;
  dataBusinessPartners: any;
  optionsBusinessPartners: any;
  dataSalesPurchaseStats: any;
  optionsSalesPurchaseStats: any;
  dataAmount: any;
  optionsAmount: any;
  purchaseSalesChartData: any;
  purchaseSalesChartOptions: any;

  // Other
  tableData: any;
  years: { label: string; value: number }[] = [];
  selectedYear = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.loadInitialData();
    this.initDummyDashboardData();
  }

  // --------- Initialization ----------
  private initializeForm(): void {
    const today = new Date();
    this.dashboardForm = this.fb.group({
      date: [today],
      startDate: [today],
      endDate: [today],
    });

    this.dashboardForm.valueChanges.subscribe(() => {
      this.fetchAttendanceData();
      this.fetchSalesPurchaseStats();
    });
  }

  private loadInitialData(): void {
    this.getAllData();
    this.fetchAttendanceData();
    this.fetchBusinessPartnersCount();
    this.fetchSalesPurchaseStats();
  }

  // --------- Attendance ----------
  fetchAttendanceData(): void {
    const date = this.dashboardForm.get("date")?.value;
    if (!date) return this.resetAttendanceData();

    const formattedDate = moment(date).format("YYYY-MM-DD");
    this.dashboardService
      .getEmployeeAttendance(formattedDate)
      .pipe(
        tap((res: AttendanceResponse) => {
          this.totalEmployees = res.totalEmployees || 0;
          this.presentEmployees = res.presentEmployees || 0;
          this.absentEmployees = res.absentEmployees || 0;
          this.attendanceDetails = res.attendanceDetails || [];
          this.updateEmployeeChart();
        }),
        catchError((err) => {
          console.error("Error fetching attendance:", err);
          this.resetAttendanceData();
          return of(null);
        })
      )
      .subscribe();
  }

  private resetAttendanceData(): void {
    this.totalEmployees = this.presentEmployees = this.absentEmployees = 0;
    this.attendanceDetails = [];
    this.updateEmployeeChart();
  }

  private updateEmployeeChart(): void {
    this.dataEmployee = {
      labels: ["Present", "Absent"],
      datasets: [
        {
          data: [this.presentEmployees, this.absentEmployees],
          backgroundColor: ["#4caf50", "#f44336"],
        },
      ],
    };
    this.optionsEmployee = { aspectRatio: 2.6, cutout: "60%" };
    this.updateAttendanceTiles();
    this.cdr.detectChanges();
  }

  private updateAttendanceTiles(): void {
    this.attendanceTiles = [
      {
        key: "date",
        total: this.todayDate,
        label: "Date",
        icon: "pi pi-calendar",
        bg: "#182135",
      },
      {
        key: "total",
        total: this.totalEmployees,
        label: "Total",
        icon: "fas fa-users",
        bg: "#1c7ed6",
      },
      {
        key: "present",
        total: this.presentEmployees,
        label: "Present",
        icon: "fas fa-user",
        bg: "#2fb47c",
      },
      {
        key: "absent",
        total: this.absentEmployees,
        label: "Absent",
        icon: "fas fa-user-times",
        bg: "#e64980",
      },
    ];
  }

  // --------- Business Partners ----------
  fetchBusinessPartnersCount(): void {
    this.dashboardService
      .getBusinessPartnersCount()
      .pipe(
        tap((res: BusinessPartnersResponse) => {
          this.totalSuppliers = res.totalSuppliers || 0;
          this.totalClients = res.totalClients || 0;
          this.totalBanks = res.totalBanks || 0;
          this.totalBrokers = res.totalBrokers || 0;
          this.updateBusinessPartnersChart();
          this.updateTileCards();
        }),
        catchError((err) => {
          console.error("Error fetching partners:", err);
          this.resetBusinessPartnersCount();
          return of(null);
        })
      )
      .subscribe();
  }

  private resetBusinessPartnersCount(): void {
    this.totalSuppliers =
      this.totalClients =
      this.totalBanks =
      this.totalBrokers =
        0;
    this.updateBusinessPartnersChart();
  }

  private updateBusinessPartnersChart(): void {
    this.dataBusinessPartners = {
      labels: ["Suppliers", "Brokers", "Clients", "Banks"],
      datasets: [
        {
          label: "Business Partners",
          data: [
            this.totalSuppliers,
            this.totalBrokers,
            this.totalClients,
            this.totalBanks,
          ],
          backgroundColor: ["#ff6384", "#ff9f40", "#4bc0c0", "#9966ff"],
        },
      ],
    };
  }

  private updateTileCards(): void {
    this.tileCards = [
      {
        key: "clients",
        total: this.totalClients,
        label: "Clients",
        icon: "pi pi-users",
        bg: "#ffa94d",
      },
      {
        key: "suppliers",
        total: this.totalSuppliers,
        label: "Suppliers",
        icon: "pi pi-user-plus",
        bg: "#40c3ff",
      },
      {
        key: "banks",
        total: this.totalBanks,
        label: "Banks",
        icon: "fa fa-university",
        bg: "#9966FF",
      },
      {
        key: "brokers",
        total: this.totalBrokers,
        label: "Brokers",
        icon: "fas fa-handshake",
        bg: "#4BC0C0",
      },
    ];
  }

  // --------- Sales & Purchase ----------
  fetchSalesPurchaseStats(): void {
    const start = this.dashboardForm.get("startDate")?.value;
    const end = this.dashboardForm.get("endDate")?.value;
    if (!start || !end) return this.resetSalesStats();

    const formattedStart = moment(start).format("YYYY-MM-DD");
    const formattedEnd = moment(end).format("YYYY-MM-DD");

    this.dashboardService
      .getSalesStats(formattedStart, formattedEnd)
      .pipe(
        tap((res: SalesStatsResponse) => {
          const { purchaseStats, salesStats } = res;
          Object.assign(this, {
            ...purchaseStats,
            ...salesStats,
          });
          this.updateAllSalesPurchaseCharts();
        }),
        catchError((err) => {
          console.error("Error fetching sales stats:", err);
          this.resetSalesStats();
          return of(null);
        })
      )
      .subscribe();
  }

  private resetSalesStats(): void {
    this.totalPurchaseInvoices =
      this.totalPurchaseOrders =
      this.totalPurchaseInvoiceAmount =
      this.totalPurchaseOrderAmount =
        0;
    this.totalSalesInvoices =
      this.totalSalesOrders =
      this.totalSalesInvoiceAmount =
      this.totalSalesOrderAmount =
        0;
    this.updateAllSalesPurchaseCharts();
  }

  private updateAllSalesPurchaseCharts(): void {
    this.updateKpiCards();
    this.updateSalesPurchaseTiles();
    this.updateSalesPurchaseCharts();
    this.cdr.detectChanges();
  }

  private updateKpiCards(): void {
    this.kpiCards = [
      {
        key: "totalSalesInvoiceAmount",
        total: this.totalSalesInvoiceAmount,
        label: "Total Sales Amount",
        icon: "pi pi-send",
        bg: "#e6f6ff",
      },
      {
        key: "totalPurchaseInvoiceAmount",
        total: this.totalPurchaseInvoiceAmount,
        label: "Total Purchase Amount",
        icon: "pi pi-shopping-bag",
        bg: "#ffe9d6",
      },
      {
        key: "totalSalesOrders",
        total: this.totalSalesOrders,
        label: "Total Sales Orders",
        icon: "pi pi-dollar",
        bg: "#e6fff3",
      },
      {
        key: "totalPurchaseOrders",
        total: this.totalPurchaseOrders,
        label: "Total Purchase Orders",
        icon: "pi pi-arrow-up-right",
        bg: "#ffeef3",
      },
    ];
  }

  private updateSalesPurchaseTiles(): void {
    this.salesPurchaseTiles = [
      {
        key: "so",
        total: this.totalSalesOrders,
        label: "Sales Orders",
        icon: "pi pi-shopping-cart",
        bg: "#FF6384",
      },
      {
        key: "si",
        total: this.totalSalesInvoices,
        label: "Sales Invoices",
        icon: "pi pi-file-edit",
        bg: "#FF9F40",
      },
      {
        key: "po",
        total: this.totalPurchaseOrders,
        label: "Purchase Orders",
        icon: "pi pi-briefcase",
        bg: "#4BC0C0",
      },
      {
        key: "pi",
        total: this.totalPurchaseInvoices,
        label: "Purchase Invoices",
        icon: "pi pi-file",
        bg: "#9966FF",
      },
    ];

    this.salesPurchaseAmountTiles = [
      {
        key: "soAmount",
        total: this.totalSalesOrderAmount,
        label: "SO Amount",
        icon: "pi pi-chart-line",
        bg: "#FF6384",
      },
      {
        key: "siAmount",
        total: this.totalSalesInvoiceAmount,
        label: "SI Amount",
        icon: "pi pi-wallet",
        bg: "#FF9F40",
      },
      {
        key: "poAmount",
        total: this.totalPurchaseOrderAmount,
        label: "PO Amount",
        icon: "pi pi-chart-bar",
        bg: "#4BC0C0",
      },
      {
        key: "piAmount",
        total: this.totalPurchaseInvoiceAmount,
        label: "PI Amount",
        icon: "pi pi-dollar",
        bg: "#9966FF",
      },
    ];
  }

  private updateSalesPurchaseCharts(): void {
    this.dataSalesPurchaseStats = {
      labels: [
        "Sales Invoices",
        "Sales Orders",
        "Purchase Invoices",
        "Purchase Orders",
      ],
      datasets: [
        {
          data: [
            this.totalSalesInvoices,
            this.totalSalesOrders,
            this.totalPurchaseInvoices,
            this.totalPurchaseOrders,
          ],
          backgroundColor: ["#42A5F5", "#66BB6A", "#FFA726", "#AB47BC"],
        },
      ],
    };

    this.dataAmount = {
      labels: [
        "Sales Order Amount",
        "Sales Invoice Amount",
        "Purchase Order Amount",
        "Purchase Invoice Amount",
      ],
      datasets: [
        {
          data: [
            this.totalSalesOrderAmount,
            this.totalSalesInvoiceAmount,
            this.totalPurchaseOrderAmount,
            this.totalPurchaseInvoiceAmount,
          ],
          backgroundColor: ["#1e07e9", "#12f525", "#edf118", "#17e0e0"],
        },
      ],
    };

    this.purchaseSalesChartData = {
      labels: ["Sales", "Purchase"],
      datasets: [
        {
          type: "bar",
          label: "Orders",
          backgroundColor: "#2eb885",
          data: [this.totalSalesOrders, this.totalPurchaseOrders],
        },
        {
          type: "bar",
          label: "Invoices",
          backgroundColor: "#ff6b6b",
          data: [this.totalSalesInvoices, this.totalPurchaseInvoices],
        },
      ],
    };
  }

  // --------- Other ----------
  getAllData(): void {
    this.dashboardService
      .getAllData("Todo")
      .subscribe((res) => (this.tableData = res.items));
  }

  private initDummyDashboardData(): void {
    const startYear = this.selectedYear - 4;
    this.years = Array.from({ length: 5 }).map((_, i) => {
      const year = startYear + i;
      return { label: String(year), value: year };
    });
  }

  goto(data: string) {
    this.router.navigate([data]);
  }
}
