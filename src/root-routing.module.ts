import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { AppRouteGuard } from "@shared/auth/auth-route-guard";

const routes: Routes = [
  { path: "", redirectTo: "/app/main/dashboard/dashboard", pathMatch: "full" },
  {
    path: "account",
    loadChildren: () =>
      import("account/account.module").then((m) => m.AccountModule), // Lazy load account module
    data: { preload: true },
  },
  {
    path: "app",
    loadChildren: () => import("app/app.module").then((m) => m.AppModule), // Lazy load account module
    data: { preload: true },
    canActivate: [AppRouteGuard],
  },
  {
    path: "pos",
    loadChildren: () =>
      import("../src/pos/pos.module").then((m) => m.PosModule), // Lazy load account module
    data: { preload: true },
    canActivate: [AppRouteGuard],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [],
})
export class RootRoutingModule {}
