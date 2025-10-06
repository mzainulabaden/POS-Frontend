import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { PosLayoutComponent } from "./components/pos-layout/pos-layout.component";
import { AppRouteGuard } from "@shared/auth/auth-route-guard";

const routes: Routes = [
  {
    path: "items",
    component: PosLayoutComponent,
    canActivate: [AppRouteGuard],
  },

  {
    path: "**",
    redirectTo: "items",
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PosRoutingModule {}
