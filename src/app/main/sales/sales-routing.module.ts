import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { SalesOrderComponent } from "./sales components/sales-order/sales-order.component";
import { SalesInvoiceComponent } from "./sales components/sales-invoice/sales-invoice.component";
import { SalesRetunComponent } from "./sales components/sales-retun/sales-retun.component";
import {SalesTracingComponent} from "./sales components/sales-tracing/sales-tracing.component";

import { SaleCommitionPolicyComponent } from "./sales components/sale-commition-policy/sale-commition-policy.component";
const routes: Routes = [
  {
    path: "",
    children: [
      {
        path: "sales-order",
        component: SalesOrderComponent,
      },
      {
        path: "sales-invoice",
        component: SalesInvoiceComponent,
      },
      {
        path: "sales-return",
        component: SalesRetunComponent,
      },
      {
        path: "sale-commition-policy",
        component: SaleCommitionPolicyComponent,
      },
      {
        path: "sale-tracing",
        component: SalesTracingComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SalesRoutingModule {}
