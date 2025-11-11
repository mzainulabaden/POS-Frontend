import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PosRoutingModule } from "./pos-routing.module";
import { PosLayoutComponent } from "./components/pos-layout/pos-layout.component";
import { PosItemsComponent } from "./components/pos-items/pos-items.component";
import { PosCartSidebarComponent } from "./components/pos-cart-sidebar/pos-cart-sidebar.component";
import { ReceiptTemplateComponent } from "./components/receipt-template/receipt-template.component";
import { InvoiceComponent } from "./components/invoice/invoice.component";
import { InvoicePreviewComponent } from "./components/invoice-preview/invoice-preview.component";
import { SharedModule } from "../shared/shared.module";

@NgModule({
  declarations: [
    PosLayoutComponent,
    PosItemsComponent,
    PosCartSidebarComponent,
    ReceiptTemplateComponent,
    InvoiceComponent,
    InvoicePreviewComponent,
  ],
  imports: [CommonModule, PosRoutingModule, SharedModule],
})
export class PosModule {}
