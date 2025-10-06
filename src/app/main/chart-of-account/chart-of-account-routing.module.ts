import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { ChartOfAccountTabsComponent } from "./chart-of-account-tabs/chart-of-account-tabs.component";
import { NatureOfAccountTabsComponent } from "./nature-of-account-tabs/nature-of-account-tabs.component";
const routes: Routes = [
  {
    path: "",
    children: [
      {
        path: "chart-of-account-tabs",
        component: ChartOfAccountTabsComponent,
      },
      {
        path: "nature-of-account-tabs",
        component: NatureOfAccountTabsComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ChartOfAccountRoutingModule {}
