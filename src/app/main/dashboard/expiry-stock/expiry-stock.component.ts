import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from "@angular/core";
import { DashboardService } from "../services/dashboard.service";

@Component({
  selector: "app-expiry-stock",
  templateUrl: "./expiry-stock.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpiryStockComponent implements OnInit {
  loading: boolean = false;
  rows: any[] = [];

  constructor(private dashboardService: DashboardService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.loading = true;
    this.dashboardService.getExpiryStock().subscribe({
      next: (res) => {
        this.rows = Array.isArray(res) ? res : (res?.items || []);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.rows = [];
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
1``}


