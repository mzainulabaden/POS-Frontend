import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AboutComponent } from './about.component';
import { DashboardComponent } from '@app/main/dashboard/dashboard/dashboard.component';

const routes: Routes = [
    // {
    //     path: '',
    //     component: AboutComponent,
    //     pathMatch: 'full',
    // },
    {
        path: 'dashboard',
        component: DashboardComponent,
        pathMatch: 'full',
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AboutRoutingModule {}
