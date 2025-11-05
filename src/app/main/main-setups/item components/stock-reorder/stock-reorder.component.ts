import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { MainSetupsService } from "../../shared/services/main-setups.service";

@Component({
  selector: "app-stock-reorder",
  templateUrl: "./stock-reorder.component.html",
  styleUrls: ["./stock-reorder.component.css"],
})
export class StockReorderComponent implements OnInit {
  loading = false;
  rows: any[] = [];

  constructor(private _mainService: MainSetupsService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.fetch();
  }

  fetch(): void {
    this.loading = true;
    this._mainService.getStockReorder().subscribe({
      next: (res: any) => {
        // Normalize: support either array or wrapped result
        const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
        this.rows = items.map((x: any) => ({
          itemName: x.itemName,
          reOrderQty: x.reOrderQty,
          unitName: x.unitName,
          warehouseName: x.warehouseName,
          balance: x.balance,
        }));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.rows = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
