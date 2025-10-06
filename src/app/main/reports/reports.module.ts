import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReportsRoutingModule } from "./reports-routing.module";
import { GenerateReportsComponent } from "./generate-reports/generate-reports.component";
import { TabViewModule } from "primeng/tabview";
import { ToastModule } from "primeng/toast";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { CalendarModule } from 'primeng/calendar'
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
@NgModule({
  declarations: [GenerateReportsComponent],
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
    ButtonModule
  ],
})
export class ReportsModule {}
