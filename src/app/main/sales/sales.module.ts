import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SalesInvoiceComponent } from "./sales components/sales-invoice/sales-invoice.component";
import { SalesRetunComponent } from "./sales components/sales-retun/sales-retun.component";
import { SalesOrderComponent } from "./sales components/sales-order/sales-order.component";
import { SalesRoutingModule } from "./sales-routing.module";
import { SharedModule } from "../../../shared/shared.module";
import { SaleCommitionPolicyComponent } from "./sales components/sale-commition-policy/sale-commition-policy.component";
import { SalesTracingComponent } from "./sales components/sales-tracing/sales-tracing.component";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { SkeletonModule } from "primeng/skeleton";

@NgModule({
  declarations: [
    SalesInvoiceComponent,
    SalesOrderComponent,
    SalesRetunComponent,
    SaleCommitionPolicyComponent,
    SalesTracingComponent,
  ],
  imports: [
    CommonModule,
    SalesRoutingModule,
    SharedModule,
    ProgressSpinnerModule,
    SkeletonModule,
  ],
})
export class SalesModule {}
