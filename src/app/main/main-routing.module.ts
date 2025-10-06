import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

const routes: Routes = [
  {
    path: "hrm",
    loadChildren: () => import("./hrm/hrm.module").then((m) => m.HrmModule),
  },
  {
    path: "chart-of-account",
    loadChildren: () =>
      import("./chart-of-account/chart-of-account.module").then(
        (m) => m.ChartOfAccountModule
      ),
  },
  {
    path: "purchase",
    loadChildren: () =>
      import("./purchase/purchase.module").then((m) => m.PurchaseModule),
  },
  {
    path: "sales",
    loadChildren: () =>
      import("./sales/sales.module").then((m) => m.SalesModule),
  },
  {
    path: "main-setups",
    loadChildren: () =>
      import("./main-setups/main-setups.module").then(
        (m) => m.MainSetupsModule),
  },
  {
    path: "finance",
    loadChildren: () =>
      import("./finance/finance.module").then((m) => m.FinanceModule),
  },
  {
    path: "reports",
    loadChildren: () =>
      import("./reports/reports.module").then((m) => m.ReportsModule),
  },
  {
    path: "dashboard",
    loadChildren: () =>
      import("./dashboard/dashboard.module").then((m) => m.DashboardModule),
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MainRoutingModule {}
