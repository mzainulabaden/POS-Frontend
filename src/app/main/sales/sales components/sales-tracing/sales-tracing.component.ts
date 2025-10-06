import { ChangeDetectorRef, Component } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MessageService, ConfirmationService } from "primeng/api";
import { SalesService } from "../../shared/services/sales.service";
import { catchError, finalize, throwError } from "rxjs";
import { Table } from "primeng/table";

@Component({
  selector: "app-sales-tracing",
  templateUrl: "./sales-tracing.component.html",
})
export class SalesTracingComponent {
  displayCustomerDetailsModal: boolean = false;
  loading: boolean = false;
  loadingCustomerDetails: boolean = false;
  mainTableData: any[] = []; // For the main table
  customerDetailsTableData: any[] = []; // For the dialog table
  count: number = 0;
  currentPage: number = 1;
  customerDetails: any;
  target: string = "SalesTracking";
  skipCount: number = 0;
  maxCount: number = 10;

  constructor(
    private fb: FormBuilder,
    private _salesService: SalesService,
    private cdr: ChangeDetectorRef,
    private msgService: MessageService
  ) {}

  ngOnInit(): void {
    this.getSalesTracking();
  }

  getSalesTracking() {
    this.loading = true;
    this._salesService
      .getSalesTracking(this.target, this.skipCount, this.maxCount)
      .pipe(
        finalize(() => this.loading = false),
        catchError((error) => {
          this.showError("Failed to load sales tracking data", error);
          return throwError(error);
        })
      )
      .subscribe({
        next: (response) => {
          this.mainTableData = response.items || [];
          this.count = response.totalCount;
          this.cdr.detectChanges();
        },
      });
  }
  
viewOnly(customerId: number) {
  this.displayCustomerDetailsModal = true;
  this.loadingCustomerDetails = true;
  this.customerDetailsTableData = [];

  const selectedCustomer = this.mainTableData.find(x => x.id === customerId);
  this.customerDetails = selectedCustomer?.customerName || 'Customer';

  this._salesService.getCustomerSales(customerId)
    .pipe(
      finalize(() => this.loadingCustomerDetails = false),
      catchError((error) => {
        this.showError("Failed to load customer sales details", error);
        return throwError(error);
      })
    )
    .subscribe({
      next: (response) => {
        const result = response.result || response;
        const tableData: any[] = [];
        let srCounter = 1;

        const matchedInvoiceIds = new Set();

        // Match salesOrders and invoices
        if (result.salesOrders?.length) {
          result.salesOrders.forEach((order: any) => {
            const invoice = result.salesInvoices?.find(
              inv =>
                inv.salesInvoiceNumber === order.salesOrderNumber ||
                inv.voucherNumber === order.voucherNumber
            );
            if (invoice) matchedInvoiceIds.add(invoice.id);

            tableData.push({
              sr: srCounter++,
              orderNumber: order.salesOrderNumber || order.voucherNumber || 'N/A',
              orderStatus: order.status || 'N/A',
              invoiceNumber: invoice?.voucherNumber || 'N/A',
              invoiceStatus: invoice?.status || 'N/A',
              salesmanName: order.salesmanName || invoice?.salesmanName || 'N/A',
              issueDate: order.issueDate || 'N/A'
            });
          });
        }

        // Add unmatched invoices
        if (result.salesInvoices?.length) {
          result.salesInvoices.forEach((invoice: any) => {
            if (!matchedInvoiceIds.has(invoice.id)) {
              tableData.push({
                sr: srCounter++,
                orderNumber: 'N/A',
                orderStatus: 'N/A',
                invoiceNumber: invoice.voucherNumber || 'N/A',
                invoiceStatus: invoice.status || 'N/A',
                salesmanName: invoice.salesmanName || 'N/A',
                issueDate: invoice.issueDate || 'N/A'
              });
            }
          });
        }

        this.customerDetailsTableData = tableData;
        this.cdr.detectChanges();
      }
    });
}


  onDialogHide() {
    // Optional: Clear dialog data when closed
    // this.customerDetailsTableData = [];
  }

  onPageChange(event: any) {
    this.skipCount = event.first;
    this.maxCount = event.rows;
    this.getSalesTracking();
  }

  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  private showError(summary: string, error: any) {
    this.msgService.add({
      severity: "error",
      summary: "Error",
      detail: error?.error?.error?.message || summary,
      life: 2000,
    });
  }
}