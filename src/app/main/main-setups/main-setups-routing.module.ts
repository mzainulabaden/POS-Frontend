import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { UnitOfMeasureComponent } from "./unit-of-measure/unit-of-measure.component";
import { ItemsComponent } from "./items/items.component";
import { PaymentTermsComponent } from "./payment-terms/payment-terms.component";
import { DefaultIntegrationsComponent } from "./default-integrations/default-integrations.component";
import { WarehouseStockAdjustmentComponent } from "./warehouse-stock-adjustment/warehouse-stock-adjustment.component";
import { DayBookComponent } from "./daybook/dayBook.component";
const routes: Routes = [
  {
    path: "",
    children: [
      {
        path: "unit-of-measure",
        component: UnitOfMeasureComponent,
      },
      {
        path: "items",
        component: ItemsComponent,
      },
      {
        path: "payment-terms",
        component: PaymentTermsComponent,
      },
      {
        path: "default-integrations",
        component: DefaultIntegrationsComponent,
      },
      {
        path: "warehouse-stock-adjustment",
        component: WarehouseStockAdjustmentComponent,
      },
      {
        path: "daybook",
        component: DayBookComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MainSetupsRoutingModule {}
