import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ConfirmationService } from "primeng/api";
import { MessageService } from "primeng/api";
import { SharedModule } from "../../../shared/shared.module";
import { CurrencyComponent } from "./chart of account setups/currency/currency.component";
import { LinkWithComponent } from "./chart of account setups/link-with/link-with.component";
import { AccountTypeComponent } from "./chart of account setups/account-type/account-type.component";
import { ChartOfAccountRoutingModule } from "./chart-of-account-routing.module";
import { CoaLevel1Component } from "./chart of account levels/coa-level1/coa-level1.component";
import { CoaLevel2Component } from "./chart of account levels/coa-level2/coa-level2.component";
import { CoaLevel3Component } from "./chart of account levels/coa-level3/coa-level3.component";
import { CoaLevel4Component } from "./chart of account levels/coa-level4/coa-level4.component";
import { ChartOfAccountTabsComponent } from "./chart-of-account-tabs/chart-of-account-tabs.component";
import { NatureOfAccountTabsComponent } from "./nature-of-account-tabs/nature-of-account-tabs.component";
import { SupplierComponent } from "./nature of accounts components/supplier/supplier.component";
import { ClientComponent } from "./nature of accounts components/client/client.component";
import { BrokerComponent } from "./nature of accounts components/broker/broker.component";
import { BankComponent } from "./nature of accounts components/bank/bank.component";
import { TaxComponent } from "./nature of accounts components/tax/tax.component";
import { SkeletonModule } from "primeng/skeleton";
@NgModule({
  declarations: [
    CurrencyComponent,
    LinkWithComponent,
    AccountTypeComponent,
    SupplierComponent,
    ClientComponent,
    BrokerComponent,
    BankComponent,
    TaxComponent,
    NatureOfAccountTabsComponent,
    CoaLevel1Component,
    CoaLevel2Component,
    CoaLevel3Component,
    CoaLevel4Component,
    ChartOfAccountTabsComponent,
  ],
  imports: [CommonModule, ChartOfAccountRoutingModule, SharedModule, SkeletonModule],
  providers: [MessageService, ConfirmationService],
})
export class ChartOfAccountModule {}