import { ChangeDetectorRef, Component, Input, HostListener, OnDestroy } from "@angular/core";
import { PurchaseService } from "@app/main/purchase/shared/services/purchase.service";
import { FormArray, FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MessageService } from "primeng/api";
import { finalize, catchError, throwError, takeUntil } from "rxjs";
import * as moment from "moment";
import { PosService } from "pos/core/services/pos.service";
import { ThermalPrinterService, ReceiptData } from "pos/core/services/thermal-printer.service";
import { KeyboardNavigationService, NavigationState } from "../../core/services/keyboard-navigation.service";
import { Subject } from "rxjs";

@Component({
  selector: "app-pos-cart-sidebar",
  templateUrl: "./pos-cart-sidebar.component.html",
  styleUrls: ["./pos-cart-sidebar.component.css"],
})
export class PosCartSidebarComponent implements OnDestroy {
  purchaseForm: FormGroup;
  // Disable programmatic focusing in cart by default
  private enableProgrammaticFocus = false;
  paymentTerms: { id: any; name: string }[] = [];
  customer: { id: any; name: string }[] = [];
  wareHouse: { id: any; name: string }[] = [];
  private _cartItems: any[] = [];
  selectedCartItemIndex = -1;
  selectedCartFieldIndex = -1; // 0: qty, 1: price(total), 2: discount amount, 3: discount %
  selectedActionIndex = -1;
  private destroy$ = new Subject<void>();
  navigationState: NavigationState = {
    currentSection: 'search',
    selectedProductIndex: -1,
    selectedCartItemIndex: -1,
    isSearchFocused: false,
    isBarcodeFocused: false
  };
  displayModal = false;
  displayHoldOrdersDialog = false;
  pendingLabel = "";
  holdOrders: any[] = [];
  receivedAmount: number = 0;
  RemainingAmount: number = 0;
  // Reference for first header dropdown (customer)
  // We'll query it when header section is active
  // Disable highlighting/focus for Actions section by default
  private enableActionFocus = false;

  set cartItems(value: any[]) {
    this._cartItems = value || [];
    this.salesInvoiceDetails.clear();

    if (this._cartItems.length > 0) {
      this._cartItems.forEach((product) => this.addItemToForm(product));
    }
    // items updated; form rebuilt accordingly
  }

  get cartItems() {
    return this._cartItems;
  }

  constructor(
    private fb: FormBuilder,
    private purchaseService: PurchaseService,
    private cdr: ChangeDetectorRef,
    private msgService: MessageService,
    private posService: PosService,
    private thermalPrinter: ThermalPrinterService,
    private keyboardNavService: KeyboardNavigationService
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
    this.trigger();
    this.loadHoldOrdersFromStorage();

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
        // Update the warehouse ID in PosService
        this.posService.setCurrentWarehouseId(id);
      });

    // Subscribe to navigation state changes
    this.keyboardNavService.navigationState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.navigationState = state;
        this.handleNavigationStateChange(state);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private handleNavigationStateChange(state: NavigationState) {
    if (state.currentSection === 'cart') {
      if (state.selectedCartItemIndex >= 0 && state.selectedCartItemIndex < this.cartItems.length) {
        this.selectedCartItemIndex = state.selectedCartItemIndex;
        this.scrollToSelectedCartItem();
        this.selectedCartFieldIndex = -1; // reset per-item field selection on change/entry
        this.cdr.markForCheck();
      }

    } else if (state.currentSection === 'header') {
      // Visually no selection indexes here; optionally focus first dropdown
      const headerIds = ['customer', 'paymentModeId', 'warehouse'];
      const index = (state.selectedHeaderIndex ?? 0);
      const clampedIndex = Math.max(0, Math.min(headerIds.length - 1, index));

      // Add a CSS class to indicate selection (visual highlight)
      headerIds.forEach((id, i) => {
        const host = document.getElementById(id)?.closest('.compact-dropdown-wrapper') as HTMLElement | null;
        if (host) {
          host.classList.toggle('keyboard-focus', i === clampedIndex);
        }
      });

      if (this.enableProgrammaticFocus) {
        setTimeout(() => {
          const targetId = headerIds[clampedIndex];
          const dropdownLabel = document.querySelector(`#${targetId} .p-dropdown-label`) as HTMLElement;
          const fallback = document.getElementById(targetId) as HTMLElement | null;
          (dropdownLabel || fallback)?.focus();
        }, 0);
      }
      this.cdr.markForCheck();
    } else {
      this.selectedCartItemIndex = -1;
      this.selectedActionIndex = -1;
      this.cdr.markForCheck();
    }
  }

  private scrollToSelectedCartItem() {
    if (this.selectedCartItemIndex >= 0) {
      setTimeout(() => {
        const selectedElement = document.querySelector(`[data-cart-item-index="${this.selectedCartItemIndex}"]`);
        if (selectedElement) {
          selectedElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 100);
    }
  }

  getSelectedCartItemName(): string {
    if (this.selectedCartItemIndex < 0 || this.selectedCartItemIndex >= this.salesInvoiceDetails.length) {
      return '';
    }
    const ctrl = this.salesInvoiceDetails.at(this.selectedCartItemIndex);
    const name = (ctrl.get('itemName')?.value as string) || '';
    return name;
  }

  navigateCartItems(direction: 'up' | 'down') {
    if (this.cartItems.length === 0) return;

    if (this.selectedCartItemIndex === -1) {
      this.selectedCartItemIndex = 0;
    } else {
      if (direction === 'up') {
        this.selectedCartItemIndex = Math.max(0, this.selectedCartItemIndex - 1);
      } else {
        this.selectedCartItemIndex = Math.min(this.cartItems.length - 1, this.selectedCartItemIndex + 1);
      }
    }

    this.keyboardNavService.updateNavigationState({
      selectedCartItemIndex: this.selectedCartItemIndex,
      currentSection: 'cart'
    });
    this.cdr.markForCheck();
  }

  focusCartItemQuantity() {
    if (this.selectedCartItemIndex >= 0 && this.selectedCartItemIndex < this.cartItems.length) {
      // Focus on the quantity input of the selected cart item
      if (this.enableProgrammaticFocus) {
        const quantityInput = document.querySelector(`input[formControlName="invoiceQty"]`) as HTMLInputElement;
        if (quantityInput) {
          quantityInput.focus();
          quantityInput.select();
        }
      }
    }
  }

  // Tab/Shift+Tab within cart item fields: Qty -> Price(lineTotal) -> Disc -> D%
  navigateCartFields(direction: 'next' | 'prev') {
    if (this.selectedCartItemIndex < 0 || this.selectedCartItemIndex >= this.cartItems.length) return;

    const selectors = [
      'input[formControlName="invoiceQty"]',
      'input[formControlName="lineTotal"]',
      'input[formControlName="discount"]',
      'input[formControlName="discountPercentage"]'
    ];

    const currentContainer = document.querySelector(`[data-cart-item-index="${this.selectedCartItemIndex}"]`) as HTMLElement | null;
    if (!currentContainer) return;

    // remove previous highlight from current item
    selectors.forEach(sel => {
      const el = currentContainer.querySelector(sel) as HTMLElement | null;
      const grp = el?.closest('.compact-input-group') as HTMLElement | null;
      if (grp) grp.classList.remove('keyboard-focus');
    });

    // Compute tentative next field index
    const lastFieldIndex = selectors.length - 1;
    if (this.selectedCartFieldIndex === -1) {
      this.selectedCartFieldIndex = direction === 'prev' ? lastFieldIndex : 0;
    } else {
      const delta = direction === 'next' ? 1 : -1;
      this.selectedCartFieldIndex += delta;
    }

    // Handle wrap across items
    if (this.selectedCartFieldIndex > lastFieldIndex && direction === 'next') {
      // Move to next item, first field
      if (this.selectedCartItemIndex < this.cartItems.length - 1) {
        this.selectedCartItemIndex += 1;
        this.selectedCartFieldIndex = 0;
        this.keyboardNavService.updateNavigationState({
          selectedCartItemIndex: this.selectedCartItemIndex,
          currentSection: 'cart'
        });
        this.scrollToSelectedCartItem();
      } else {
        // Stay on last field of last item
        this.selectedCartFieldIndex = lastFieldIndex;
      }
    } else if (this.selectedCartFieldIndex < 0 && direction === 'prev') {
      // Move to previous item, last field
      if (this.selectedCartItemIndex > 0) {
        this.selectedCartItemIndex -= 1;
        this.selectedCartFieldIndex = lastFieldIndex;
        this.keyboardNavService.updateNavigationState({
          selectedCartItemIndex: this.selectedCartItemIndex,
          currentSection: 'cart'
        });
        this.scrollToSelectedCartItem();
      } else {
        // Stay on first field of first item
        this.selectedCartFieldIndex = 0;
      }
    }

    // Focus target in (possibly) new item container
    const container = document.querySelector(`[data-cart-item-index="${this.selectedCartItemIndex}"]`) as HTMLElement | null;
    if (!container) return;
    const targetSel = selectors[this.selectedCartFieldIndex];
    const target = container.querySelector(targetSel) as HTMLInputElement | null;
    const grp = target?.closest('.compact-input-group') as HTMLElement | null;
    if (grp) grp.classList.add('keyboard-focus');
    if (target) {
      target.focus();
      target.select?.();
    }
    this.cdr.markForCheck();
  }

  isCartItemSelected(index: number): boolean {
    return this.selectedCartItemIndex === index;
  }

  isActionFocused(action: string): boolean {
    if (!this.enableActionFocus) return false;    
    switch (action) {
      case 'hold': return this.selectedActionIndex === 0;
      case 'sale': return this.selectedActionIndex === 1;
      case 'proceed': return this.selectedActionIndex === 2 && this.isPaymentModeCredit;
      case 'print': return this.selectedActionIndex === (this.isPaymentModeCredit ? 3 : 2);
      default: return false;
    }
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
          // Find "dukkan" warehouse or fallback to first
          const dukkanWarehouse = this.wareHouse.find(
            (w) => w.name.toLowerCase().includes('dukkan')
          );
          const defaultWarehouse = dukkanWarehouse || this.wareHouse[0];
          
          if (this.wareHouse.length > 0) {
            // Set default warehouse in form
            this.purchaseForm.patchValue({
              selectedWarehouseId: defaultWarehouse?.id
            });
            // Update the warehouse ID in PosService
            this.posService.setCurrentWarehouseId(defaultWarehouse?.id);
            // Set dukkan warehouse ID in PosService for default usage
            this.posService.setDukkanWarehouseId(defaultWarehouse?.id);
            // Update existing items
            if (this.salesInvoiceDetails.length > 0) {
              this.salesInvoiceDetails.controls.forEach((ctrl) => {
                if (ctrl.get("warehouseId")) {
                  ctrl.patchValue({ warehouseId: defaultWarehouse?.id });
                }
              });
            }
            debugger;
          }
          break;
      }

      this.cdr.detectChanges();
    });
  }

  // -------- Cart Helpers --------
  addItemToForm(product: any) {
    // Get selected warehouse or find dukkan warehouse as default
    let defaultId = this.purchaseForm.get("selectedWarehouseId")?.value;
    
    if (!defaultId && this.wareHouse.length > 0) {
      const dukkanWarehouse = this.wareHouse.find(
        (w) => w.name.toLowerCase().includes('dukkan')
      );
      defaultId = dukkanWarehouse?.id || this.wareHouse[0].id;
    }

    // Check stock for this specific item if warehouse is available
    if (defaultId && product.id) {
      this.checkItemStock(defaultId, product.id, product);
    }

    const itemForm = this.fb.group({
      id: [0],
      itemId: [product.id],
      itemName: [product.itemName],
      itemSKU: [product.barcode || product.Barcode || product.sku || product.SKU || ''],
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

    // When discount amount changes: recompute discount percentage
    discAmtCtrl?.valueChanges.subscribe((amt) => {
      if (isUpdating) return;
      isUpdating = true;
      const discountAmount = +amt || 0;
      const quantity = +(qtyCtrl?.value as any) || 0;
      const unitRate = +(rateCtrl?.value as any) || 0;
      const gross = quantity * unitRate;
      
      if (gross > 0) {
        const percentage = +((discountAmount / gross) * 100).toFixed(2);
        discPctCtrl?.setValue(percentage, { emitEvent: false });
      } else {
        discPctCtrl?.setValue(0, { emitEvent: false });
      }
      isUpdating = false;
    });

    this.salesInvoiceDetails.push(itemForm);
  }

  // Check stock for a specific item in warehouse
  checkItemStock(warehouseId: number, itemId: number, product: any) {
    this.posService.getItemStockByWarehouse(warehouseId, itemId).subscribe({
      next: (response) => {
        console.log(`Stock for item ${itemId} in warehouse ${warehouseId}:`, response);
        // Update product with stock information if needed
        if (response && response.length > 0) {
          const stockInfo = response[0];
          // You can update the product with stock information here
          product.currentStock = stockInfo.currentStock || stockInfo.availableQty || 0;
          product.stockLevel = stockInfo.stockLevel || 0;
        }
      },
      error: (error) => {
        console.error(`Error checking stock for item ${itemId}:`, error);
      }
    });
  }

  // Removed kg conversion; keeping qty as decimal units

  removeFromList(index: number) {
    this.salesInvoiceDetails.removeAt(index);
    this.posService.removeFromCart(index);
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

  getTotalItemDiscounts(): number {
    return this.salesInvoiceDetails.controls.reduce((acc, ctrl) => {
      const discount = ctrl.get("discount")?.value || 0;
      return acc + discount;
    }, 0);
  }

  formatPrice(value: number): string {
    return `PKR ${value.toFixed(2)}`;
  }

  // Check if payment mode is credit
  get isPaymentModeCredit(): boolean {
    const selectedMode = this.paymentTerms.find(
      (p) => p.id === this.purchaseForm.value.paymentModeId
    );
    return selectedMode?.name.toLowerCase() === 'credit';
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

    try {
      const freeze = (window as any).abp?.ui?.setBusy || (window as any).FreezeUI;
      if (typeof freeze === 'function') {
        // Prefer ABP busy if available
        if ((window as any).abp?.ui?.setBusy) {
          (window as any).abp.ui.setBusy(undefined, 'Saving...', 0);
        } else {
          (window as any).FreezeUI({ text: 'Saving...' });
        }
      }
    } catch (_) {}

    this.posService
      .create({ ...this.purchaseForm.value }, "SalesInvoice")
      .pipe(
        finalize(() => {
          try {
            const clear = (window as any).abp?.ui?.clearBusy || (window as any).UnFreezeUI;
            if (typeof clear === 'function') {
              if ((window as any).abp?.ui?.clearBusy) {
                (window as any).abp.ui.clearBusy(undefined, 0);
              } else {
                (window as any).UnFreezeUI({});
              }
            }
          } catch (_) {}
        }),
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
        next: (response: any) => {
          // Print receipt after successful save
          this.printReceipt(response);

          // Clear cart items and form array
          this.salesInvoiceDetails.clear();
          this.posService.clearCart();
          
          // Reset form with default values
          this.purchaseForm.patchValue({
            id: 0,
            issueDate: new Date().toISOString(),
            remarks: "",
            referenceNumber: "",
            paymentModeId: this.paymentTerms.length > 0 ? this.paymentTerms[0].id : null,
            customerCOALevel04Id: this.customer.length > 0 ? this.customer[0].id : null,
            advanceAmountBankCOALevl04Id: null,
            taxCOALevel04Id: 0,
            employeeName: "",
            commissionAmount: 0,
            grandTotal: 0,
            advanceAmount: 0,
            discountPercentage: 0,
            discountAmount: 0,
            freightAmount: 0,
            taxAmount: 0,
            selectedWarehouseId: this.wareHouse.length > 0 
              ? (this.wareHouse.find(w => w.name.toLowerCase().includes('dukkan'))?.id || this.wareHouse[0].id)
              : null,
          });

          // Reset payment modal values
          this.receivedAmount = 0;
          this.RemainingAmount = 0;
          this.displayModal = false;
          
          this.cdr.detectChanges();
        },
      });
  }

  // Save the sale but do not print
  saveWithoutPrint() {
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

    try {
      const freeze = (window as any).abp?.ui?.setBusy || (window as any).FreezeUI;
      if (typeof freeze === 'function') {
        if ((window as any).abp?.ui?.setBusy) {
          (window as any).abp.ui.setBusy(undefined, 'Saving...', 0);
        } else {
          (window as any).FreezeUI({ text: 'Saving...' });
        }
      }
    } catch (_) {}

    this.posService
      .create({ ...this.purchaseForm.value }, "SalesInvoice")
      .pipe(
        finalize(() => {
          try {
            const clear = (window as any).abp?.ui?.clearBusy || (window as any).UnFreezeUI;
            if (typeof clear === 'function') {
              if ((window as any).abp?.ui?.clearBusy) {
                (window as any).abp.ui.clearBusy(undefined, 0);
              } else {
                (window as any).UnFreezeUI({});
              }
            }
          } catch (_) {}
        }),
        catchError((error) => {
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: error.error?.error?.message,
            life: 2000,
          });
          return throwError(() => error.error?.error?.message || error);
        })
      )
      .subscribe({
        next: () => {
          // Clear cart items and form array
          this.salesInvoiceDetails.clear();
          this.posService.clearCart();

          // Reset form with default values
          this.purchaseForm.patchValue({
            id: 0,
            issueDate: new Date().toISOString(),
            remarks: "",
            referenceNumber: "",
            paymentModeId: this.paymentTerms.length > 0 ? this.paymentTerms[0].id : null,
            customerCOALevel04Id: this.customer.length > 0 ? this.customer[0].id : null,
            advanceAmountBankCOALevl04Id: null,
            taxCOALevel04Id: 0,
            employeeName: "",
            commissionAmount: 0,
            grandTotal: 0,
            advanceAmount: 0,
            discountPercentage: 0,
            discountAmount: 0,
            freightAmount: 0,
            taxAmount: 0,
            selectedWarehouseId: this.wareHouse.length > 0 
              ? (this.wareHouse.find(w => w.name.toLowerCase().includes('dukkan'))?.id || this.wareHouse[0].id)
              : null,
          });

          // Reset payment modal values
          this.receivedAmount = 0;
          this.RemainingAmount = 0;
          this.displayModal = false;

          this.msgService.add({
            severity: 'success',
            summary: 'Saved',
            detail: 'Sale saved successfully',
            life: 1500,
          });

          this.cdr.detectChanges();
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

  printReceipt(response?: any) {
    // Get customer name
    const selectedCustomer = this.customer.find(
      (c) => c.id === this.purchaseForm.value.customerCOALevel04Id
    );
    
    // Get payment mode name
    const selectedPayment = this.paymentTerms.find(
      (p) => p.id === this.purchaseForm.value.paymentModeId
    );

    // Get warehouse name
    const selectedWarehouse = this.wareHouse.find(
      (w) => w.id === this.purchaseForm.value.selectedWarehouseId
    );

    // Calculate bill discount
    const billDiscountAmt = this.purchaseForm.get("discountAmount")?.value || 0;
    const billDiscountPct = this.purchaseForm.get("discountPercentage")?.value || 0;
    const billDiscountFromPct = +(this.subtotal * (billDiscountPct / 100)).toFixed(2);
    const totalBillDiscount = billDiscountAmt + billDiscountFromPct;

    // Prepare receipt data
    const receiptData: ReceiptData = {
      invoiceNumber: response?.result?.id?.toString() || 'N/A',
      date: moment().format('DD/MM/YYYY HH:mm'),
      customer: selectedCustomer?.name || 'Walk-in Customer',
      paymentMode: selectedPayment?.name || 'Cash',
      warehouse: selectedWarehouse?.name || '',
      items: this.salesInvoiceDetails.controls.map((ctrl) => {
        const qty = Number(ctrl.get('invoiceQty')?.value) || 0;
        // Use rate as unit price (this is the actual unit price)
        const unitPrice = Number(ctrl.get('rate')?.value) || 0;
        // Use the already calculated discount amount from the form (no double calculation)
        const discountAmount = Number(ctrl.get('discount')?.value) || 0;
        // Use the lineTotal which already has the discount applied
        const lineTotal = Number(ctrl.get('lineTotal')?.value) || 0;

        return {
          name: ctrl.get('itemName')?.value || '',
          quantity: qty,
          price: unitPrice,
          discount: discountAmount,
          total: lineTotal
        };
      }),
      subtotal: this.subtotal,
      discount: totalBillDiscount,
      tax: 0, // Tax if applicable
      total: this.payableAmount,
      received: this.receivedAmount,
      change: selectedPayment?.name.toLowerCase() === 'cash' && this.receivedAmount > this.payableAmount
        ? this.receivedAmount - this.payableAmount
        : 0
    };

    // Print using thermal printer service
    this.thermalPrinter.printReceipt(receiptData);
  }

  // Method to manually trigger print (can be called from a button)
  manualPrint() {
    // Validate cart has items
    if (this.salesInvoiceDetails.length === 0) {
      this.msgService.add({
        severity: "warn",
        summary: "Warning",
        detail: "No items to print",
        life: 2000,
      });
      return;
    }

    // Validate form
    if (!this.purchaseForm.valid) {
      this.msgService.add({
        severity: "error",
        summary: "Error",
        detail: "Please fill all required fields",
        life: 2000,
      });
      return;
    }

    // Set default received amount to payable amount for direct print
    this.receivedAmount = this.payableAmount;
    this.calculatePending();

    // Prepare form data
    this.purchaseForm.patchValue({
      salesInvoiceDetails: this.salesInvoiceDetails.value,
      issueDate: moment(this.purchaseForm.value.issueDate).format("YYYY-MM-DD"),
      viAmount: 0,
      commissionAmount: this.purchaseForm.value.commissionAmount || 0,
      netTotal: this.nettotal,
      grandTotal: this.payableAmount,
    });

    // Call CreatePos API
    try {
      const freeze = (window as any).abp?.ui?.setBusy || (window as any).FreezeUI;
      if (typeof freeze === 'function') {
        if ((window as any).abp?.ui?.setBusy) {
          (window as any).abp.ui.setBusy(undefined, 'Processing...', 0);
        } else {
          (window as any).FreezeUI({ text: 'Processing...' });
        }
      }
    } catch (_) {}

    this.posService
      .create({ ...this.purchaseForm.value }, "SalesInvoice")
      .pipe(
        finalize(() => {
          try {
            const clear = (window as any).abp?.ui?.clearBusy || (window as any).UnFreezeUI;
            if (typeof clear === 'function') {
              if ((window as any).abp?.ui?.clearBusy) {
                (window as any).abp.ui.clearBusy(undefined, 0);
              } else {
                (window as any).UnFreezeUI({});
              }
            }
          } catch (_) {}
        }),
        catchError((error) => {
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: error.error?.error?.message || "Failed to create sales invoice",
            life: 3000,
          });
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response: any) => {
          // Check if response is successful
          if (response) {
            // Print receipt only if API response is successful
            this.printReceipt(response);

            // Clear cart items and form array
            this.salesInvoiceDetails.clear();
            this.posService.clearCart();
            
            // Reset form with default values
            this.purchaseForm.patchValue({
              id: 0,
              issueDate: new Date().toISOString(),
              remarks: "",
              referenceNumber: "",
              paymentModeId: this.paymentTerms.length > 0 ? this.paymentTerms[0].id : null,
              customerCOALevel04Id: this.customer.length > 0 ? this.customer[0].id : null,
              advanceAmountBankCOALevl04Id: null,
              taxCOALevel04Id: 0,
              employeeName: "",
              commissionAmount: 0,
              grandTotal: 0,
              advanceAmount: 0,
              discountPercentage: 0,
              discountAmount: 0,
              freightAmount: 0,
              taxAmount: 0,
              selectedWarehouseId: this.wareHouse.length > 0 
                ? (this.wareHouse.find(w => w.name.toLowerCase().includes('dukkan'))?.id || this.wareHouse[0].id)
                : null,
            });

            // Reset payment modal values
            this.receivedAmount = 0;
            this.RemainingAmount = 0;
            
            this.cdr.detectChanges();
          } else {
            this.msgService.add({
              severity: "error",
              summary: "Error",
              detail: "Failed to create sales invoice",
              life: 2000,
            });
          }
        },
      });
  }

  // Listen for Shift key press to trigger print receipt from anywhere
  @HostListener('window:keydown.shift', ['$event'])
  handleShiftKey(event: KeyboardEvent) {
    // If payment modal is open, do not auto-print
    if (this.displayModal) { return; }

    // Proceed even if focus is in an input; prevent browser side effects
    if (this.cartItems.length > 0) {
      event.preventDefault();
      this.manualPrint();
    }
  }

  // -------- Hold Orders Functionality --------
  
  loadHoldOrdersFromStorage() {
    const storedOrders = localStorage.getItem('pos_hold_orders');
    if (storedOrders) {
      this.holdOrders = JSON.parse(storedOrders);
    }
  }

  saveHoldOrdersToStorage() {
    localStorage.setItem('pos_hold_orders', JSON.stringify(this.holdOrders));
  }

  holdCurrentOrder() {
    if (this.salesInvoiceDetails.length === 0) {
      this.msgService.add({
        severity: "warn",
        summary: "Warning",
        detail: "No items to hold",
        life: 2000,
      });
      return;
    }

    // Save current order to hold orders
    const orderData = {
      ...this.purchaseForm.value,
      salesInvoiceDetails: this.salesInvoiceDetails.value,
      timestamp: new Date().toISOString(),
      cartItems: this._cartItems
    };

    this.holdOrders.push(orderData);
    this.saveHoldOrdersToStorage();

    this.msgService.add({
      severity: "success",
      summary: "Success",
      detail: "Order held successfully",
      life: 2000,
    });

    // Clear current cart and form
    this.salesInvoiceDetails.clear();
    this.posService.clearCart();
    this.purchaseForm.patchValue({
      id: 0,
      issueDate: new Date().toISOString(),
      remarks: "",
      referenceNumber: "",
      paymentModeId: this.paymentTerms.length > 0 ? this.paymentTerms[0].id : null,
      customerCOALevel04Id: this.customer.length > 0 ? this.customer[0].id : null,
      advanceAmountBankCOALevl04Id: null,
      taxCOALevel04Id: 0,
      employeeName: "",
      commissionAmount: 0,
      grandTotal: 0,
      advanceAmount: 0,
      discountPercentage: 0,
      discountAmount: 0,
      freightAmount: 0,
      taxAmount: 0,
      selectedWarehouseId: this.wareHouse.length > 0 
        ? (this.wareHouse.find(w => w.name.toLowerCase().includes('dukkan'))?.id || this.wareHouse[0].id)
        : null,
    });
    this.receivedAmount = 0;
    this.RemainingAmount = 0;
    this.cdr.detectChanges();
  }

  showHoldOrdersDialog() {
    this.loadHoldOrdersFromStorage();
    this.displayHoldOrdersDialog = true;
  }

  loadHoldOrder(index: number) {
    const order = this.holdOrders[index];
    if (!order) return;

    // Clear current cart
    this.salesInvoiceDetails.clear();
    this.posService.clearCart();

    // Load the held order into form
    this.purchaseForm.patchValue({
      id: order.id || 0,
      issueDate: order.issueDate,
      remarks: order.remarks || "",
      referenceNumber: order.referenceNumber || "",
      paymentModeId: order.paymentModeId,
      customerCOALevel04Id: order.customerCOALevel04Id,
      advanceAmountBankCOALevl04Id: order.advanceAmountBankCOALevl04Id,
      taxCOALevel04Id: order.taxCOALevel04Id || 0,
      employeeName: order.employeeName || "",
      commissionAmount: order.commissionAmount || 0,
      grandTotal: order.grandTotal || 0,
      advanceAmount: order.advanceAmount || 0,
      discountPercentage: order.discountPercentage || 0,
      discountAmount: order.discountAmount || 0,
      freightAmount: order.freightAmount || 0,
      taxAmount: order.taxAmount || 0,
      selectedWarehouseId: order.selectedWarehouseId,
    });

    // Restore cart items
    if (order.cartItems && order.cartItems.length > 0) {
      order.cartItems.forEach((item: any) => {
        this.posService.addToCart(item);
      });
    }

    // Remove from hold orders
    this.holdOrders.splice(index, 1);
    this.saveHoldOrdersToStorage();

    this.displayHoldOrdersDialog = false;

    this.msgService.add({
      severity: "success",
      summary: "Success",
      detail: "Order loaded successfully",
      life: 2000,
    });

    this.cdr.detectChanges();
  }

  deleteHoldOrder(index: number, event: Event) {
    event.stopPropagation();
    
    this.holdOrders.splice(index, 1);
    this.saveHoldOrdersToStorage();

    this.msgService.add({
      severity: "success",
      summary: "Success",
      detail: "Hold order deleted",
      life: 2000,
    });
  }

  getCustomerName(customerId: any): string {
    const customer = this.customer.find(c => c.id === customerId);
    return customer ? customer.name : 'Unknown';
  }

  onCartFieldKeyDown(event: KeyboardEvent, index: number, controlName: 'invoiceQty' | 'lineTotal' | 'discount' | 'discountPercentage') {
    const fg = this.salesInvoiceDetails.at(index) as FormGroup;
    const ctrl = fg?.get(controlName);
    if (!ctrl) { return; }

    const key = event.key;
    const code = (event as any).code as string | undefined;
    const isPlus = key === '+' || code === 'NumpadAdd' || (key === '=' && event.shiftKey);
    const isMinus = key === '-' || code === 'NumpadSubtract' || (key === '_' && event.shiftKey);
    if (!isPlus && !isMinus) { return; }

    event.preventDefault();
    event.stopPropagation();

    let val = parseFloat((ctrl.value as any)) || 0;
    val = isPlus ? val + 1 : val - 1;

    if (controlName === 'discountPercentage') {
      if (val < 0) val = 0;
      if (val > 100) val = 100;
      ctrl.setValue(+val.toFixed(2));
      return;
    }

    if (val < 0) val = 0;

    if (controlName === 'invoiceQty') {
      if (val < 0.001) val = 0.001;
      ctrl.setValue(+val.toFixed(3));
      return;
    }

    ctrl.setValue(+val.toFixed(2));
  }

  onBillFieldKeyDown(event: KeyboardEvent, controlName: 'discountAmount' | 'discountPercentage') {
    const ctrl = this.purchaseForm.get(controlName);
    if (!ctrl) { return; }

    const key = event.key;
    const code = (event as any).code as string | undefined;
    const isPlus = key === '+' || code === 'NumpadAdd' || (key === '=' && event.shiftKey);
    const isMinus = key === '-' || code === 'NumpadSubtract' || (key === '_' && event.shiftKey);
    if (!isPlus && !isMinus) { return; }

    event.preventDefault();
    event.stopPropagation();

    let val = parseFloat((ctrl.value as any)) || 0;
    val = isPlus ? val + 1 : val - 1;

    if (controlName === 'discountPercentage') {
      if (val < 0) val = 0;
      if (val > 100) val = 100;
      ctrl.setValue(+val.toFixed(2));
      return;
    }

    if (val < 0) val = 0;
    ctrl.setValue(+val.toFixed(2));
  }

  trackByCartItem(index: number, _ctrl: any) {
    // Prefer stable keys if present in control value
    const val = _ctrl?.value || {};
    return val.id || val.itemId || index;
  }

  // Increment quantity for a cart item
  incrementQuantity(index: number) {
    if (index < 0 || index >= this.salesInvoiceDetails.length) return;
    
    const itemForm = this.salesInvoiceDetails.at(index) as FormGroup;
    const qtyCtrl = itemForm.get('invoiceQty');
    
    if (qtyCtrl) {
      const currentQty = parseFloat(qtyCtrl.value) || 0;
      const newQty = +(currentQty + 1).toFixed(3);
      qtyCtrl.setValue(newQty);
    }
  }

  // Decrement quantity for a cart item
  decrementQuantity(index: number) {
    if (index < 0 || index >= this.salesInvoiceDetails.length) return;
    
    const itemForm = this.salesInvoiceDetails.at(index) as FormGroup;
    const qtyCtrl = itemForm.get('invoiceQty');
    
    if (qtyCtrl) {
      const currentQty = parseFloat(qtyCtrl.value) || 0;
      const newQty = Math.max(0.001, +(currentQty - 1).toFixed(3)); // Minimum 0.001
      qtyCtrl.setValue(newQty);
    }
  }
}
