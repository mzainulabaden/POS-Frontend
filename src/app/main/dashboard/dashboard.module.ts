import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TabViewModule } from "primeng/tabview";
import { ToastModule } from "primeng/toast";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { CalendarModule } from "primeng/calendar";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { DropdownModule } from "primeng/dropdown";
import { MultiSelectModule } from "primeng/multiselect";
import { ButtonModule } from "primeng/button";
import { DashboardComponent } from "./dashboard/dashboard.component";
import { TodoListComponent } from "./todo-list/todo-list.component";
import { DashboardRoutingModule } from "./dashboard-routing.module";
import { ToolbarModule } from "primeng/toolbar";
import { ChartModule } from "primeng/chart";
import { CardModule } from "primeng/card";
import { TableModule } from "primeng/table";
import { AgGridModule } from "ag-grid-angular";
import { AccordionModule } from "primeng/accordion";

@NgModule({
  declarations: [DashboardComponent, TodoListComponent],
  imports: [
    DashboardRoutingModule,
    CommonModule,
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
    ToolbarModule,
    ChartModule,
    CardModule,
    TableModule,
    AgGridModule,
    AccordionModule,
  ],
})
export class DashboardModule {}
