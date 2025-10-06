import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PurchaseOrderComponent } from "./purchase components/purchase-order/purchase-order.component";
import { PurchaseInvoiceComponent } from "./purchase components/purchase-invoice/purchase-invoice.component";
import { PurchaseReturnComponent } from "./purchase components/purchase-return/purchase-return.component";
import { PurchaseRoutingModule } from "./purchase-routing.module";
import { WareHouseComponent } from "./purchase setups/ware-house/ware-house.component";
import { SharedModule } from "../../../shared/shared.module";
import { MessageService } from "primeng/api";
import { ConfirmationService } from "primeng/api";
import { SkeletonModule } from "primeng/skeleton";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { DemandBookComponent } from "./demand-book/demand-book.component";

@NgModule({
  declarations: [
    PurchaseOrderComponent,
    PurchaseInvoiceComponent,
    PurchaseReturnComponent,
    WareHouseComponent,
    DemandBookComponent,
  ],

  imports: [
    CommonModule,
    PurchaseRoutingModule,
    SharedModule,
    ProgressSpinnerModule,
    SkeletonModule,
  ],
  providers: [MessageService, ConfirmationService],
})
export class PurchaseModule {}
