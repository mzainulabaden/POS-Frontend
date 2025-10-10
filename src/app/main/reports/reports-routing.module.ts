import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { GenerateReportsComponent } from "./generate-reports/generate-reports.component";
import { NewReportsComponent } from "./new-reports/new-reports.component";

const routes: Routes = [
  {
    path: "",
    children: [
      {
        path: "ssrs-reports",
        component: GenerateReportsComponent,
      },
      {
        path: "new-reports",
        component: NewReportsComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReportsRoutingModule {}
