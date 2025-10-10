import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReportsRoutingModule } from "./reports-routing.module";
import { GenerateReportsComponent } from "./generate-reports/generate-reports.component";
import { NewReportsComponent } from "./new-reports/new-reports.component";
import { InventoryReportComponent } from "./new-reports/inventory-report/inventory-report.component";
import { ItemTrackingModalComponent } from "./new-reports/item-tracking-modal/item-tracking-modal.component";
import { TabViewModule } from "primeng/tabview";
import { ToastModule } from "primeng/toast";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { CalendarModule } from 'primeng/calendar'
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { MessageService } from 'primeng/api';

@NgModule({
  declarations: [
    GenerateReportsComponent,
    NewReportsComponent,
    InventoryReportComponent,
    ItemTrackingModalComponent,
  ],
  imports: [
    CommonModule,
    ReportsRoutingModule,
    TabViewModule,
    ConfirmDialogModule,
    ToastModule,
    DialogModule,
    CalendarModule,
    FormsModule,
    ReactiveFormsModule,
    DropdownModule,
    MultiSelectModule,
    ButtonModule,
    TableModule,
  ],
  providers: [MessageService],
})
export class ReportsModule {}
