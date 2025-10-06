import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { BankPaymentComponent } from "./bank-payment/bank-payment.component";
import { CashPaymentComponent } from "./cash-payment/cash-payment.component";
import { BankReceiptComponent } from "./bank-receipt/bank-receipt.component";
import { CashReceiptComponent } from "./cash-receipt/cash-receipt.component";
import { JournalVoucherComponent } from "./journal-voucher/journal-voucher.component";
import { GeneralNoteComponent } from "../finance/general-note/general-note.component";
import { ProfitLossNoteComponent } from "./profit-loss-note/profit-loss-note.component";
import { AccountOpeningsComponent } from "./account-openings/account-openings.component";

const routes: Routes = [
  {
    path: "",
    children: [
      {
        path: "bank-payment",
        component: BankPaymentComponent,
      },
      {
        path: "cash-payment",
        component: CashPaymentComponent,
      },
      {
        path: "bank-receipt",
        component: BankReceiptComponent,
      },
      {
        path: "cash-receipt",
        component: CashReceiptComponent,
      },
      {
        path: "journal-voucher",
        component: JournalVoucherComponent,
      },
      {
        path: "general-note",
        component: GeneralNoteComponent,
      },
      {
        path: "profit-loss-note",
        component: ProfitLossNoteComponent,
      },

      {
        path: "account-openings",
        component: AccountOpeningsComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FinanceRoutingModule {}
