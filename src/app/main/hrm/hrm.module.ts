import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { EmployeeTypeComponent } from "./hrm setups/employee-type/employee-type.component";
import { HrmRoutingModule } from "./hrm-routing.module";
import { CreateOrEditEmployeeComponent } from "./employeemanagement/create-or-edit-employee/create-or-edit-employee.component";
import { EmployeeAttendanceComponent } from "./employeemanagement/employee-attendance/employee-attendance.component";
import { EmployeeSalaryComponent } from "./employeemanagement/employee-salary/employee-salary.component";
import { SharedModule } from "@shared/shared.module";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
// import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { DesignationComponent } from "./hrm setups/designation/designation.component";
import { CompanyprofileComponent } from "./employeemanagement/companyprofile/companyprofile.component";
import { GazettedHolidaysComponent } from "./hrm setups/gazetted-holidays/gazetted-holidays.component";
import { SkeletonModule } from "primeng/skeleton";
// ModuleRegistry.registerModules([AllCommunityModule]);

@NgModule({
  declarations: [
    EmployeeTypeComponent,
    CreateOrEditEmployeeComponent,
    EmployeeAttendanceComponent,
    DesignationComponent,
    GazettedHolidaysComponent,
    EmployeeSalaryComponent,
    CompanyprofileComponent,
  ],
  imports: [CommonModule, HrmRoutingModule, SharedModule, SkeletonModule],
})
export class HrmModule {}