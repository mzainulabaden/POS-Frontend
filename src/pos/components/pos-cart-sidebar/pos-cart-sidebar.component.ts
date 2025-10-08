import { ChangeDetectorRef, Component, Input } from "@angular/core";
import { PurchaseService } from "@app/main/purchase/shared/services/purchase.service";
import { FormArray, FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MessageService } from "primeng/api";
import { finalize, catchError, throwError } from "rxjs";
import * as moment from "moment";
import { PosService } from "pos/core/services/pos.service";

@Component({
  selector: "app-pos-cart-sidebar",
  templateUrl: "./pos-cart-sidebar.component.html",
  styleUrls: ["./pos-cart-sidebar.component.css"],
})
export class PosCartSidebarComponent {
  purchaseForm: FormGroup;
  paymentTerms: { id: any; name: string }[] = [];
  customer: { id: any; name: string }[] = [];
  wareHouse: { id: any; name: string }[] = [];
  private _cartItems: any[] = [];
  displayModal = false;
  pendingLabel = "";

  receivedAmount: number = 0;
  RemainingAmount: number = 0;

  set cartItems(value: any[]) {
    this._cartItems = value || [];
    this.salesInvoiceDetails.clear();

    if (this._cartItems.length > 0) {
      this._cartItems.forEach((product) => this.addItemToForm(product));
    }
    console.log("Cart sidebar items:", this._cartItems);
  }

  get cartItems() {
    return this._cartItems;
  }

  constructor(
    private fb: FormBuilder,
    private purchaseService: PurchaseService,
    private cdr: ChangeDetectorRef,
    private msgService: MessageService,
    private posService: PosService
  ) {
    this.purchaseForm = this.fb.group({
      id: [0],
      issueDate: [new Date().toISOString(), Validators.required],
      remarks: [""],
      referenceNumber: [""],
      paymentModeId: [null, Validators.required],
      customerCOALevel04Id: [null, Validators.required],
      advanceAmountBankCOALevl04Id: [null],
      taxCOALevel04Id: [0],
      employeeName: [""],
      commissionAmount: [0],
      grandTotal: [0],
      advanceAmount: [0],
      discountPercentage: [0], // bill discount %
      discountAmount: [0], // bill discount amount
      freightAmount: [0],
      taxAmount: [0],
      selectedWarehouseId: [null],
      salesInvoiceDetails: this.fb.array([]),
    });
  }

  get salesInvoiceDetails(): FormArray {
    return this.purchaseForm.get("salesInvoiceDetails") as FormArray;
  }

  ngOnInit() {
    console.log("Cart Sidebar Loaded");
    this.trigger();
    // Subscribe to shared cart
    this.posService.cartItems$.subscribe((items) => {
      this.cartItems = items;
      this.salesInvoiceDetails.clear();
      this.cartItems.forEach((p) => this.addItemToForm(p));
    });

    this.purchaseForm.get("paymentModeId")?.valueChanges.subscribe((modeId) => {
      const selected = this.paymentTerms.find((p) => p.id === modeId);

      if (selected) {
        if (selected.name.toLowerCase() === "cash") {
          this.pendingLabel = "Remaining (Return to Customer)";
        } else if (selected.name.toLowerCase() === "credit") {
          this.pendingLabel = "Pending (Customer to Pay)";
        } else {
          this.pendingLabel = "Pending";
        }
      } else {
        this.pendingLabel = "Pending";
      }

      this.calculatePending();
    });

    this.purchaseForm
      .get("selectedWarehouseId")
      ?.valueChanges.subscribe((id) => {
        this.salesInvoiceDetails.controls.forEach((ctrl) => {
          ctrl.patchValue({ warehouseId: id });
        });
      });
  }

  trigger() {
    // Fetch dropdowns
    this.fetchDropdownData("PaymentMode");
    this.fetchDropdownData("Client");
    this.fetchDropdownData("Warehouse");
  }

  // -------- Dropdowns --------
  fetchDropdownData(target: string) {
    this.purchaseService.getAllSuggestion(target).subscribe((response: any) => {
      const mappedData = response.items.map((item: any) => ({
        id: item?.id,
        name: item?.name,
        additional: item?.additional,
      }));

      switch (target) {
        case "PaymentMode":
          this.paymentTerms = mappedData.reverse();
          if (this.paymentTerms.length > 0) {
            this.purchaseForm.patchValue({
              paymentModeId: this.paymentTerms[0].id,
            });
          }
          break;

        case "Client":
          this.customer = mappedData.reverse();
          if (this.customer.length > 0) {
            this.purchaseForm.patchValue({
              customerCOALevel04Id: this.customer[0].id,
            });
          }
          break;

        case "Warehouse":
          debugger;
          this.wareHouse = mappedData.reverse();
          if (
            this.wareHouse.length > 0 &&
            this.salesInvoiceDetails.length > 0
          ) {
            this.salesInvoiceDetails.controls.forEach((ctrl) => {
              if (ctrl.get("warehouseId")) {
                ctrl.patchValue({ warehouseId: this.wareHouse[0].id });
              }
            });
            debugger;
          }
          break;
      }

      this.cdr.detectChanges();
    });
  }

  // -------- Cart Helpers --------
  addItemToForm(product: any) {
    const defaultId =
      this.purchaseForm.get("selectedWarehouseId")?.value ||
      (this.wareHouse.length > 0 ? this.wareHouse[0].id : 0);

    const itemForm = this.fb.group({
      id: [0],
      itemId: [product.id],
      itemName: [product.name],
      rate: [product.unitPrice || 0],
      invoiceQty: [product.qty || 1],
      discount: [product.discount || 0], // amount
      discountPercentage: [0], // percent
      unitId: [product.unitId || 0],
      warehouseId: [defaultId],
      lineTotal: [((product.qty || 1) * (product.unitPrice || 0)) || 0],
    });
    const qtyCtrl = itemForm.get("invoiceQty"); // decimal units
    const rateCtrl = itemForm.get("rate"); // price per unit
    const totalCtrl = itemForm.get("lineTotal"); // amount
    const discAmtCtrl = itemForm.get("discount"); // amount
    const discPctCtrl = itemForm.get("discountPercentage"); // percent

    let isUpdating = false;

    // When quantity changes: amount = qty * rate
    qtyCtrl?.valueChanges.subscribe((qty) => {
      if (isUpdating) return;
      isUpdating = true;
      const quantity = +qty || 0;
      const unitRate = +(rateCtrl?.value as any) || 0;
      const amount = quantity * unitRate;
      totalCtrl?.setValue(+amount.toFixed(2), { emitEvent: false });
      // Recompute item discount amount from %
      const pct = +(discPctCtrl?.value as any) || 0;
      if (pct > 0) {
        const dAmt = +(amount * (pct / 100)).toFixed(2);
        discAmtCtrl?.setValue(dAmt, { emitEvent: false });
      }
      isUpdating = false;
    });

    // When unit price changes: amount = qty * rate
    rateCtrl?.valueChanges.subscribe((rate) => {
      if (isUpdating) return;
      isUpdating = true;
      const unitRate = +rate || 0;
      const quantity = +(qtyCtrl?.value as any) || 0;
      const amount = quantity * unitRate;
      totalCtrl?.setValue(+amount.toFixed(2), { emitEvent: false });
      // Recompute item discount amount from %
      const pct = +(discPctCtrl?.value as any) || 0;
      if (pct > 0) {
        const dAmt = +(amount * (pct / 100)).toFixed(2);
        discAmtCtrl?.setValue(dAmt, { emitEvent: false });
      }
      isUpdating = false;
    });

    // When amount changes: qty = amount / rate (if rate > 0)
    totalCtrl?.valueChanges.subscribe((total) => {
      if (isUpdating) return;
      isUpdating = true;
      const amount = +total || 0;
      const unitRate = +(rateCtrl?.value as any) || 0;
      if (unitRate > 0) {
        const quantity = +(amount / unitRate).toFixed(3);
        qtyCtrl?.setValue(quantity, { emitEvent: false });
      }
      isUpdating = false;
    });

    // When discount % changes: recompute discount amount
    discPctCtrl?.valueChanges.subscribe((pct) => {
      if (isUpdating) return;
      isUpdating = true;
      const percent = +pct || 0;
      const quantity = +(qtyCtrl?.value as any) || 0;
      const unitRate = +(rateCtrl?.value as any) || 0;
      const gross = quantity * unitRate;
      const dAmt = +(gross * (percent / 100)).toFixed(2);
      discAmtCtrl?.setValue(dAmt, { emitEvent: false });
      isUpdating = false;
    });

    this.salesInvoiceDetails.push(itemForm);
  }

  // Removed kg conversion; keeping qty as decimal units

  removeFromList(index: number) {
    this.salesInvoiceDetails.removeAt(index);
    this.posService.removeFromCart(index);
    console.log("Removed, current form:", this.salesInvoiceDetails.value);
  }

  // -------- Calculations --------
  get subtotal(): number {
    return this.salesInvoiceDetails.controls.reduce((acc, ctrl) => {
      const qty = ctrl.get("invoiceQty")?.value || 1;
      const price = ctrl.get("rate")?.value || 0;
      const discount = ctrl.get("discount")?.value || 0;
      return acc + qty * price - discount;
    }, 0);
  }

  get nettotal(): number {
    return this.salesInvoiceDetails.controls.reduce((acc, ctrl) => {
      const qty = ctrl.get("qty")?.value || 1;
      const price = ctrl.get("rate")?.value || 0;
      return acc + qty * price;
    }, 0);
  }

  get tax(): number {
    return this.subtotal * 0.1; // Example 10% tax
  }

  get payableAmount(): number {
    const billDiscountAmt = this.purchaseForm.get("discountAmount")?.value || 0;
    const billDiscountPct = this.purchaseForm.get("discountPercentage")?.value || 0;
    const pctAmt = +(this.subtotal * (billDiscountPct / 100)).toFixed(2);
    const total = this.subtotal - billDiscountAmt - pctAmt;
    return total < 0 ? 0 : total; // prevent negative totals
  }

  formatPrice(value: number): string {
    return `PKR ${value.toFixed(2)}`;
  }

  // -------- Save --------
  save() {
    if (!this.purchaseForm.valid) {
      this.msgService.add({
        severity: "error",
        detail: "Please fill all required fields",
        life: 2000,
      });
      return;
    }

    this.purchaseForm.patchValue({
      salesInvoiceDetails: this.salesInvoiceDetails.value,
      issueDate: moment(this.purchaseForm.value.issueDate).format("YYYY-MM-DD"),
      viAmount: 0,
      commissionAmount: this.purchaseForm.value.commissionAmount || 0,
      netTotal: this.nettotal,
      grandTotal: this.payableAmount,
    });

    debugger;

    this.posService
      .create({ ...this.purchaseForm.value }, "SalesInvoice")
      .pipe(
        finalize(() => {}),
        catchError((error) => {
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: error.error?.error?.message,
            life: 2000,
          });
          return throwError(() => error.error.error.message);
        })
      )
      .subscribe({
        next: () => {
          this.msgService.add({
            severity: "success",
            summary: "Confirmed",
            detail: "Saved Successfully",
            life: 2000,
          });

          this.purchaseForm.reset();
          this.salesInvoiceDetails.clear();
          this.posService.clearCart();
          this.displayModal = false;
          this.trigger();
        },
      });
  }

  calculatePending() {
    const received = this.receivedAmount || 0;
    const total = this.payableAmount;
    this.RemainingAmount = this.payableAmount - received;
    const selectedMode = this.paymentTerms.find(
      (p) => p.id === this.purchaseForm.value.paymentModeId
    );

    if (selectedMode?.name.toLowerCase() === "cash") {
      // FE calculator only: Remaining = change to give back
      this.RemainingAmount = received - total;
    } else if (selectedMode?.name.toLowerCase() === "credit") {
      // Customer still owes
      this.RemainingAmount = total - received;

      // Save to form
      this.purchaseForm.patchValue({
        advanceAmount: received,
      });
    } else {
      this.RemainingAmount = total - received;
    }
  }

  resetPaymentModal() {
    // Reset form fields
    this.purchaseForm.patchValue({
      advanceAmount: 0,
      pendingAmount: 0,
    });

    this.receivedAmount = 0;
    this.RemainingAmount = 0;
  }
}
