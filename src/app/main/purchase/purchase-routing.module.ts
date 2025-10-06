import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { PurchaseOrderComponent } from "./purchase components/purchase-order/purchase-order.component";
import { PurchaseInvoiceComponent } from "./purchase components/purchase-invoice/purchase-invoice.component";
import { PurchaseReturnComponent } from "./purchase components/purchase-return/purchase-return.component";
import { WareHouseComponent } from "./purchase setups/ware-house/ware-house.component";
import { DemandBookComponent } from "./demand-book/demand-book.component";
const routes: Routes = [
  {
    path: "",
    children: [
      {
        path: "purchase-order",
        component: PurchaseOrderComponent,
      },
      {
        path: "purchase-invoice",
        component: PurchaseInvoiceComponent,
      },
      {
        path: "purchase-return",
        component: PurchaseReturnComponent,
      },
      {
        path: "warehouse",
        component: WareHouseComponent,
      },
      {
        path: "demand-book",
        component: DemandBookComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PurchaseRoutingModule {}
