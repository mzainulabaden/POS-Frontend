import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { UnitOfMeasureComponent } from "./unit-of-measure/unit-of-measure.component";
import { ItemsComponent } from "./items/items.component";
import { MainSetupsRoutingModule } from "./main-setups-routing.module";
import { SharedModule } from "@shared/shared.module";
import { CategoryComponent } from "./item components/category/category.component";
import { CreateItemComponent } from "./item components/create-item/create-item.component";
import { ItemCategoryComponent } from "./item components/item-category/item-category.component";
import { PaymentTermsComponent } from "./payment-terms/payment-terms.component";
import { DefaultIntegrationsComponent } from "./default-integrations/default-integrations.component";
import { WarehouseStockAdjustmentComponent } from "./warehouse-stock-adjustment/warehouse-stock-adjustment.component";
import { TooltipModule } from "primeng/tooltip";

import { ProductSearchEditorComponent } from "../search-component/product-search-editor.component";
import { AgGridModule } from "ag-grid-angular";
import { SkeletonModule } from "primeng/skeleton";
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import {DayBookComponent} from "./daybook/dayBook.component";
import { CreateItemCategoryModalComponent } from './shared/create-item-category-modal/create-item-category-modal.component'
import { DepartmentComponent } from "./department/department.component";
import { WarehouseStockTransferComponent } from "./warehouse-stock-transfer/warehouse-stock-transfer.component";
import { DepartmentStockComponent } from "./department-stock/department-stock.component";

@NgModule({
  declarations: [
    UnitOfMeasureComponent,
    ItemsComponent,
    CategoryComponent,
    CreateItemComponent,
    ItemCategoryComponent,
    PaymentTermsComponent,
    DefaultIntegrationsComponent,
    WarehouseStockAdjustmentComponent,
    ProductSearchEditorComponent,
    DayBookComponent,
    CreateItemCategoryModalComponent,
    DepartmentComponent,
    WarehouseStockTransferComponent,
    DepartmentStockComponent,
  ],
  imports: [
    CommonModule,
    AgGridModule,
    MainSetupsRoutingModule,
    SharedModule,
    TooltipModule,
    SkeletonModule,
    ProgressSpinnerModule
  ]
})
export class MainSetupsModule {}