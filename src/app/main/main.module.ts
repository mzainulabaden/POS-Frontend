import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MainRoutingModule } from './main-routing.module';
import { IconFieldModule } from "primeng/iconfield";
import { InputIconModule } from 'primeng/inputicon';
import { FinanceModule } from './finance/finance.module';
import { ProgressSpinnerModule } from "primeng/progressspinner";


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    IconFieldModule,
    InputIconModule,
    MainRoutingModule,
    FinanceModule,
    ProgressSpinnerModule,
  ]
})
export class MainModule { }
