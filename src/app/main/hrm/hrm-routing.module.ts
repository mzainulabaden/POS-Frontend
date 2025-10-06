import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { CreateOrEditEmployeeComponent } from "./employeemanagement/create-or-edit-employee/create-or-edit-employee.component";
import { EmployeeTypeComponent } from "./hrm setups/employee-type/employee-type.component";
import { EmployeeAttendanceComponent } from "./employeemanagement/employee-attendance/employee-attendance.component";
import { EmployeeSalaryComponent } from "./employeemanagement/employee-salary/employee-salary.component";
import { DesignationComponent } from "./hrm setups/designation/designation.component";
import { GazettedHolidaysComponent } from "./hrm setups/gazetted-holidays/gazetted-holidays.component";
import { CompanyprofileComponent } from "./employeemanagement/companyprofile/companyprofile.component";
const routes: Routes = [
  {
    path: "",
    children: [
      {
        path: "employee-type",
        component: EmployeeTypeComponent,
      },
      {
        path: "create-employee",
        component: CreateOrEditEmployeeComponent,
      },
      {
        path: "employee-attendance",
        component: EmployeeAttendanceComponent,
      },
      {
        path: "employee-salary",
        component: EmployeeSalaryComponent,
      },
      {
        path: "designation",
        component: DesignationComponent,
      },
      {
        path: "gazetted-holidays",
        component: GazettedHolidaysComponent,
      },

      {
        path: "companyprofile",
        component: CompanyprofileComponent,
      },
    ],
  },
];
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HrmRoutingModule {}
