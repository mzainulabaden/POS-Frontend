import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FinanceRoutingModule } from "./finance-routing.module";
import { SharedModule } from "../../../shared/shared.module";
import { BankPaymentComponent } from "./bank-payment/bank-payment.component";
import { CashPaymentComponent } from "./cash-payment/cash-payment.component";
import { BankReceiptComponent } from "./bank-receipt/bank-receipt.component";
import { CashReceiptComponent } from "./cash-receipt/cash-receipt.component";
import { JournalVoucherComponent } from "./journal-voucher/journal-voucher.component";
import { GeneralNoteComponent } from "../finance/general-note/general-note.component";
import { SkeletonModule } from "primeng/skeleton";
import { ProfitLossNoteComponent } from "./profit-loss-note/profit-loss-note.component";
import { AccountOpeningsComponent } from "./account-openings/account-openings.component";
import { SupplierOpeningsComponent } from "./account-openings/components/supplier-openings/supplier-openings.component";
import { ClientsOpeningsComponent } from "./account-openings/components/clients-openings/clients-openings.component";
import { StocksOpeningsComponent } from "./account-openings/components/stocks-openings/stocks-openings.component";
import { BankOpeningsComponent } from "./account-openings/components/bank-openings/bank-openings.component";
import { BulkUploaderComponent } from './account-openings/components/bulk-uploader/bulk-uploader.component';

@NgModule({
  declarations: [
    BankPaymentComponent,
    CashPaymentComponent,
    BankReceiptComponent,
    CashReceiptComponent,
    JournalVoucherComponent,
    GeneralNoteComponent,
    ProfitLossNoteComponent,
    AccountOpeningsComponent,
    SupplierOpeningsComponent,
    ClientsOpeningsComponent,
    StocksOpeningsComponent,
    BankOpeningsComponent,
    BulkUploaderComponent,
  ],
  imports: [CommonModule, SharedModule, FinanceRoutingModule, SkeletonModule],
})
export class FinanceModule {}
