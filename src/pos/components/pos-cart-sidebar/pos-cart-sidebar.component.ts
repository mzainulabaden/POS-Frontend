import { ChangeDetectorRef, Component, Input, HostListener, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { PurchaseService } from "@app/main/purchase/shared/services/purchase.service";
import { FormArray, FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MessageService } from "primeng/api";
import { finalize, catchError, throwError, takeUntil } from "rxjs";
import * as moment from "moment";
import { PosService } from "pos/core/services/pos.service";
import { ThermalPrinterService, ReceiptData } from "pos/core/services/thermal-printer.service";
import { KeyboardNavigationService, NavigationState } from "../../core/services/keyboard-navigation.service";
import { Subject } from "rxjs";
import { Dropdown } from "primeng/dropdown";

@Component({
  selector: "app-pos-cart-sidebar",
  templateUrl: "./pos-cart-sidebar.component.html",
  styleUrl: "./pos-cart-sidebar.component.css",
})
export class PosCartSidebarComponent implements OnInit, OnDestroy {
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
  isEditingDiscountAmount: { [index: number]: boolean } = {};
  
  // ViewChild references for dropdowns
  @ViewChild('customerDropdown') customerDropdown!: Dropdown;
  @ViewChild('paymentDropdown') paymentDropdown!: Dropdown;
  @ViewChild('warehouseDropdown') warehouseDropdown!: Dropdown;

  set cartItems(value: any[]) {
    this._cartItems = value || [];
    this.salesInvoiceDetails.clear();

    if (this._cartItems.length > 0) {
      this._cartItems.forEach((product) => this.addItemToForm(product));
    }
    // items updated; form rebuilt accordingly
    try { this.cdr.detectChanges(); } catch {}
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
    // Setup global keyboard listener for Tab + number shortcuts
    this.setupTabNumberShortcuts();

    // Subscribe to shared cart: update form in place when possible for visible qty increments
    this.posService.cartItems$.subscribe((items) => {
      this.syncFormWithCart(items || []);
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

  // Keep form rows in sync with cart items while preserving and updating existing controls
  private syncFormWithCart(items: any[]) {
    // If counts or identities differ, rebuild via setter
    const currentCount = this.salesInvoiceDetails.length;
    const incomingCount = items.length;

    const formIds = new Set(
      Array.from({ length: currentCount }, (_, i) => (this.salesInvoiceDetails.at(i) as FormGroup)?.get('itemId')?.value)
    );
    const incomingIds = new Set(items.map((it: any) => it?.id));

    const sameShape = currentCount === incomingCount && [...incomingIds].every((id) => formIds.has(id));

    if (!sameShape) {
      // Fall back to existing setter which rebuilds form from scratch
      this.cartItems = items as any[];
      return;
    }

    // Update existing rows in place (qty, price, discounts)
    const byId: Record<string, any> = {};
    for (const it of items) {
      if (it && it.id != null) byId[String(it.id)] = it;
    }

    for (let i = 0; i < this.salesInvoiceDetails.length; i++) {
      const fg = this.salesInvoiceDetails.at(i) as FormGroup;
      const id = fg.get('itemId')?.value;
      const key = id != null ? String(id) : undefined;
      const fromCart = key ? byId[key] : undefined;
      if (!fromCart) { continue; }

      const qtyCtrl = fg.get('invoiceQty');
      const rateCtrl = fg.get('rate');
      const discAmtCtrl = fg.get('discount');
      const discPctCtrl = fg.get('discountPercentage');
      const unitNameCtrl = fg.get('unitName');

      // Update unitName if available
      if (fromCart.unitName && unitNameCtrl && unitNameCtrl.value !== fromCart.unitName) {
        unitNameCtrl.setValue(fromCart.unitName);
      }

      // Only set when different to avoid loops
      let newQty = Number(fromCart.qty || 1);
      
      // If unit is "per item", round to whole number
      const unitName = (unitNameCtrl?.value || fromCart.unitName || '').toString().toLowerCase().trim();
      const isPerItem = unitName === 'per item' || unitName.includes('per item');
      if (isPerItem) {
        newQty = Math.round(newQty);
        if (newQty < 1) newQty = 1;
      }
      
      if ((Number(qtyCtrl?.value) || 0) !== newQty) {
        qtyCtrl?.setValue(newQty);
      }

      const newRate = Number(fromCart.unitPrice || 0);
      if ((Number(rateCtrl?.value) || 0) !== newRate) {
        rateCtrl?.setValue(newRate);
      }

      const newDiscAmt = Number(fromCart.discount || 0);
      if ((Number(discAmtCtrl?.value) || 0) !== newDiscAmt) {
        discAmtCtrl?.setValue(newDiscAmt);
      }

      const newDiscPct = Number(fromCart.discountPercentage || 0);
      if ((Number(discPctCtrl?.value) || 0) !== newDiscPct) {
        discPctCtrl?.setValue(newDiscPct);
      }
    }

    try { this.cdr.detectChanges(); } catch {}
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    // Clean up document listener
    if (this.tabKeyHandler) {
      document.removeEventListener('keydown', this.tabKeyHandler);
    }
  }

  // Document-level keyboard handler for Tab + number
  private tabKeyHandler: ((event: KeyboardEvent) => void) | null = null;

  setupTabNumberShortcuts() {
    this.tabKeyHandler = (event: KeyboardEvent) => {
      // Check if Tab key is pressed
      if (event.key === 'Tab') {
        // Set flag to wait for next key
        this.waitingForTabNumber = true;
        
        // Clear any existing timeout
        if (this.tabTimeout) {
          clearTimeout(this.tabTimeout);
        }
        
        // Set timeout to clear flag if no number is pressed within 300ms
        this.tabTimeout = setTimeout(() => {
          this.waitingForTabNumber = false;
        }, 300);
        
        return; // Let Tab work normally
      }
      
      // If we're waiting for a number and a number key is pressed
      if (this.waitingForTabNumber) {
        // Clear the timeout since we got our number
        if (this.tabTimeout) {
          clearTimeout(this.tabTimeout);
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        // Check for number keys 1, 2, 3, 4, or 5
        if (event.key === '1') {
          this.openCustomerDropdown();
        } else if (event.key === '2') {
          this.openPaymentDropdown();
        } else if (event.key === '3') {
          this.openWarehouseDropdown();
        } else if (event.key === '4') {
          this.triggerSale();
        } else if (event.key === '5') {
          this.holdCurrentOrder();
        }
        
        // Clear the flag
        this.waitingForTabNumber = false;
      }
    };
    
    document.addEventListener('keydown', this.tabKeyHandler);
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

  // Helper method to check if unit is "per item"
  private isPerItemUnit(product: any): boolean {
    const unitName = (product.unitName || product.unit || '').toString().toLowerCase().trim();
    return unitName === 'per item' || unitName.includes('per item');
  }

  // Helper method to check if unit is "per item" for a form control
  isPerItemUnitForForm(index: number): boolean {
    const fg = this.salesInvoiceDetails.at(index) as FormGroup;
    const unitNameCtrl = fg?.get('unitName');
    const unitName = (unitNameCtrl?.value || '').toString().toLowerCase().trim();
    return unitName === 'per item' || unitName.includes('per item');
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

    const isPerItem = this.isPerItemUnit(product);

    const itemForm = this.fb.group({
      id: [0],
      itemId: [product.id],
      itemName: [product.itemName],
      itemSKU: [product.barcode || product.Barcode || product.sku || product.SKU || ''],
      rate: [product.unitPrice || 0],
      invoiceQty: [isPerItem ? Math.round(product.qty || 1) : (product.qty || 1)],
      discount: [product.discount || 0], // amount
      discountPercentage: [product.discountPercentage || 0], // percent - preserve from product
      
      unitId: [product.unitId || 0],
      unitName: [product.unitName || product.unit || ''],
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
      let quantity = +qty || 0;
      
      // If unit is "per item", enforce whole numbers
      if (isPerItem) {
        quantity = Math.round(quantity);
        if (quantity < 1) quantity = 1;
        // Update control if value was changed
        if (quantity !== +qty) {
          qtyCtrl?.setValue(quantity, { emitEvent: false });
        }
      }
      
      const unitRate = +(rateCtrl?.value as any) || 0;
      const amount = quantity * unitRate;
      totalCtrl?.setValue(+amount.toFixed(2), { emitEvent: false });
      // Recompute item discount amount from %
      const pct = +(discPctCtrl?.value as any) || 0;
      if (pct > 0) {
        const dAmt = +(amount * (pct / 100)).toFixed(2);
        discAmtCtrl?.setValue(dAmt, { emitEvent: false });
      }
      // Sync qty back to shared cart state
      const currentItems = this.posService.cartItems;
      const targetId = product && product.id != null ? String(product.id) : undefined;
      const itemIndex = currentItems.findIndex((item: any) => (item && item.id != null ? String(item.id) : undefined) === targetId);
      if (itemIndex >= 0) {
        const newQty = quantity;
        if (currentItems[itemIndex].qty !== newQty) {
          currentItems[itemIndex].qty = newQty;
          this.posService.updateCartItems([...currentItems]);
        }
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
      // Sync unit price back to shared cart state
      const currentItems = this.posService.cartItems;
      const targetId = product && product.id != null ? String(product.id) : undefined;
      const itemIndex = currentItems.findIndex((item: any) => (item && item.id != null ? String(item.id) : undefined) === targetId);
      if (itemIndex >= 0) {
        const newUnitPrice = unitRate;
        if (currentItems[itemIndex].unitPrice !== newUnitPrice) {
          currentItems[itemIndex].unitPrice = newUnitPrice;
          this.posService.updateCartItems([...currentItems]);
        }
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
        let quantity = amount / unitRate;
        
        // If unit is "per item", round to whole number
        if (isPerItem) {
          quantity = Math.round(quantity);
          if (quantity < 1) quantity = 1;
        } else {
          quantity = +(quantity.toFixed(3));
        }
        
        qtyCtrl?.setValue(quantity, { emitEvent: false });
      }
      isUpdating = false;
    });

    // When discount % changes: recompute discount amount
    discPctCtrl?.valueChanges.subscribe((pct) => {
      if (this.isEditingDiscountAmount[this.salesInvoiceDetails.length - 1]) return; // Do not overwrite while editing
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

    // Sync discount values back to cart item when they change (only if value actually changed)
    discAmtCtrl?.valueChanges.subscribe((discountAmt) => {
      const currentItems = this.posService.cartItems;
      const itemIndex = currentItems.findIndex((item: any) => item.id === product.id);
      if (itemIndex >= 0) {
        const newValue = discountAmt || 0;
        // Only update if value actually changed to prevent infinite loops
        if (currentItems[itemIndex].discount !== newValue) {
          currentItems[itemIndex].discount = newValue;
          this.posService.updateCartItems([...currentItems]);
        }
      }
    });

    discPctCtrl?.valueChanges.subscribe((discountPct) => {
      const currentItems = this.posService.cartItems;
      const itemIndex = currentItems.findIndex((item: any) => item.id === product.id);
      if (itemIndex >= 0) {
        const newValue = discountPct || 0;
        // Only update if value actually changed to prevent infinite loops
        if (currentItems[itemIndex].discountPercentage !== newValue) {
          currentItems[itemIndex].discountPercentage = newValue;
          this.posService.updateCartItems([...currentItems]);
        }
      }
    });

    this.salesInvoiceDetails.push(itemForm);

    // Ensure UI reflects latest qty/rate immediately (handles DOM reuse cases)
    setTimeout(() => {
      try {
        qtyCtrl?.setValue(product.qty || 1);
        rateCtrl?.setValue(product.unitPrice || 0);
        this.cdr.detectChanges();
      } catch {}
    }, 0);
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
      return acc + qty * price;
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
    const billDiscountFromPct = +(this.subtotal * (billDiscountPct / 100)).toFixed(2);
    const itemDiscounts = this.getTotalItemDiscounts();
    const total = this.subtotal - itemDiscounts - billDiscountAmt - billDiscountFromPct;
    return total < 0 ? 0 : total; // prevent negative totals
  }

  getTotalItemDiscounts(): number {
    return this.salesInvoiceDetails.controls.reduce((acc, ctrl) => {
      const discountAmount = +(ctrl.get("discount")?.value || 0);
      const discountPercentage = +(ctrl.get("discountPercentage")?.value || 0);
      const lineTotal = +(ctrl.get("lineTotal")?.value || 0);

      // Use either percentage-based discount OR fixed amount, not both
      const effectiveDiscount = discountPercentage > 0
        ? +(lineTotal * (discountPercentage / 100)).toFixed(2)
        : discountAmount;

      return acc + effectiveDiscount;
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
  private buildApiPayload() {
    const form = this.purchaseForm.value;
    const details = (this.salesInvoiceDetails.value || []).map((d: any) => {
      const qty = Number(d.invoiceQty || 0);
      const rate = Number(d.rate || 0);
      const gross = +(qty * rate).toFixed(2);
      const discountPct = Number(d.discountPercentage || 0);
      const discountAmtCtrl = Number(d.discount || 0);
      const pctDiscount = discountPct > 0 ? +(gross * (discountPct / 100)).toFixed(2) : 0;
      const discountAmount = discountPct > 0 ? pctDiscount : discountAmtCtrl;
      const lineGrandTotal = Math.max(0, +(gross - discountAmount).toFixed(2));
      return {
        id: 0,
        itemId: d.itemId,
        unitId: Number(d.unitId || 0),
        rate: rate,
        pricePerKg: 0,
        invoiceQty: qty,
        discountPercentage: discountPct,
        discountAmount: +(discountAmount || 0).toFixed(2),
        grandTotal: lineGrandTotal,
        salesOrderDetailId: Number(d.salesOrderDetailId || 0)
      };
    });
    return {
      id: 0,
      issueDate: moment(form.issueDate).toISOString(true),
      remarks: form.remarks || "",
      referenceNumber: form.referenceNumber || "",
      paymentModeId: Number(form.paymentModeId || 0),
      customerCOALevel04Id: Number(form.customerCOALevel04Id || 0),
      warehouseId: Number(form.selectedWarehouseId || this.posService.getEffectiveWarehouseId() || 0),
      advanceAmountBankCOALevl04Id: Number(form.advanceAmountBankCOALevl04Id || 0),
      grandTotal: Number(this.payableAmount || 0),
      advanceAmount: Number(form.advanceAmount || 0),
      discountPercentage: Number(form.discountPercentage || 0),
      discountAmount: Number(form.discountAmount || 0),
      netTotal: Number(this.nettotal || 0),
      salesInvoiceDetails: details
    };
  }

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
      issueDate: moment(this.purchaseForm.value.issueDate).toISOString(true),
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
      .create(this.buildApiPayload(), "SalesInvoice")
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
      issueDate: moment(this.purchaseForm.value.issueDate).toISOString(true),
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
      .create(this.buildApiPayload(), "SalesInvoice")
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

    // Resolve voucher/bill number from API response or form
    const voucherNumber = (
      response?.result?.voucherNumber ||
      response?.voucherNumber ||
      response?.result?.voucherNo ||
      response?.result?.VoucherNumber ||
      response?.result?.id ||
      this.purchaseForm.get('referenceNumber')?.value ||
      this.purchaseForm.get('voucherNumber')?.value
    );

    // Prepare receipt data
    const receiptData: ReceiptData = {
      invoiceNumber: (voucherNumber != null ? voucherNumber : 'N/A').toString(),
      date: moment().format('DD/MM/YYYY HH:mm'),
      customer: selectedCustomer?.name || 'Walk-in Customer',
      paymentMode: selectedPayment?.name || 'Cash',
      warehouse: selectedWarehouse?.name || '',
      items: this.salesInvoiceDetails.controls.map((ctrl, index) => {
        const qty = Number(ctrl.get('invoiceQty')?.value) || 0;
        const unitPrice = Number(ctrl.get('rate')?.value) || 0;
        const gross = +(qty * unitPrice).toFixed(2);
        const discountAmountCtrl = Number(ctrl.get('discount')?.value) || 0;
        const discountPct = Number(ctrl.get('discountPercentage')?.value) || 0;
        const pctDiscount = +((discountPct > 0 ? gross * (discountPct / 100) : 0)).toFixed(2);
        const effectiveDiscount = discountPct > 0 ? pctDiscount : discountAmountCtrl;
        const net = Math.max(0, +(gross - effectiveDiscount).toFixed(2));

        return {
          name: ctrl.get('itemName')?.value || '',
          quantity: qty,
          price: unitPrice,
          discount: +(effectiveDiscount || 0).toFixed(2) as unknown as number,
          total: net
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
    // Prefer silent ESC/POS printing via local middleware; automatically
    // falls back to browser print dialog if the service isn't available.
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
      issueDate: moment(this.purchaseForm.value.issueDate).toISOString(true),
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
      .create(this.buildApiPayload(), "SalesInvoice")
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
    // Enter navigates between fields within the current cart item
    if (key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();

      const isFirstItem = index === 0;
      const isLastItem = index === (this.cartItems?.length ?? 0) - 1;
      const isFirstField = controlName === 'invoiceQty';
      const isLastField = controlName === 'discountPercentage';

      // At boundaries, keep focus on the same field (do not blur)
      if ((!event.shiftKey && isLastItem && isLastField) || (event.shiftKey && isFirstItem && isFirstField)) {
        const target = event.target as HTMLInputElement | null;
        // Defer to ensure the browser doesn't steal focus on Enter
        setTimeout(() => {
          if (target) {
            target.focus();
            target.select?.();
          }
        }, 0);
        return;
      }

      this.selectedCartItemIndex = index;
      const fieldIndexMap: Record<'invoiceQty' | 'lineTotal' | 'discount' | 'discountPercentage', number> = {
        invoiceQty: 0,
        lineTotal: 1,
        discount: 2,
        discountPercentage: 3
      };
      this.selectedCartFieldIndex = fieldIndexMap[controlName];
      this.navigateCartFields(event.shiftKey ? 'prev' : 'next');

      // Fallback: ensure focus lands on intended target after navigation
      setTimeout(() => {
        const selectors = [
          'input[formControlName="invoiceQty"]',
          'input[formControlName="lineTotal"]',
          'input[formControlName="discount"]',
          'input[formControlName="discountPercentage"]'
        ];
        const container = document.querySelector(`[data-cart-item-index="${this.selectedCartItemIndex}"]`) as HTMLElement | null;
        if (!container) { return; }
        const sel = selectors[this.selectedCartFieldIndex];
        const el = container.querySelector(sel) as HTMLInputElement | null;
        if (el) {
          el.focus();
          el.select?.();
        }
      }, 0);
      return;
    }
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
      // Check if this item has "per item" unit
      const fg = this.salesInvoiceDetails.at(index) as FormGroup;
      const unitNameCtrl = fg?.get('unitName');
      const unitName = (unitNameCtrl?.value || '').toString().toLowerCase().trim();
      const isPerItem = unitName === 'per item' || unitName.includes('per item');
      
      if (isPerItem) {
        // For "per item" units, enforce whole numbers
        val = Math.round(val);
        if (val < 1) val = 1;
        ctrl.setValue(val);
      } else {
        // For other units, allow decimals
        if (val < 0.001) val = 0.001;
        ctrl.setValue(+val.toFixed(3));
      }
      return;
    }

    ctrl.setValue(+val.toFixed(2));
  }

  onQuantityInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const fg = this.salesInvoiceDetails.at(index) as FormGroup;
    const unitNameCtrl = fg?.get('unitName');
    const qtyCtrl = fg?.get('invoiceQty');
    
    if (!qtyCtrl) return;
    
    const unitName = (unitNameCtrl?.value || '').toString().toLowerCase().trim();
    const isPerItem = unitName === 'per item' || unitName.includes('per item');
    
    if (isPerItem) {
      const value = parseFloat(input.value);
      if (!isNaN(value)) {
        const rounded = Math.round(value);
        const finalValue = rounded < 1 ? 1 : rounded;
        if (finalValue !== value) {
          input.value = finalValue.toString();
          qtyCtrl.setValue(finalValue, { emitEvent: false });
        }
      }
    }
  }

  onDiscountFieldFocus(index: number) {
    this.isEditingDiscountAmount[index] = true;
  }

  onDiscountFieldBlur(index: number) {
    this.isEditingDiscountAmount[index] = false;
    // Force sync of the displayed value to the control (in case user typed then blurred)
    const ctrl = this.salesInvoiceDetails.at(index)?.get('discount');
    if (ctrl) {
      const input = (document.querySelectorAll('input[formControlName="discount"]')[index] as HTMLInputElement);
      if (input) ctrl.setValue(Number(input.value), { emitEvent: true });
    }
  }

  onBillFieldKeyDown(event: KeyboardEvent, controlName: 'discountAmount' | 'discountPercentage') {
    const ctrl = this.purchaseForm.get(controlName);
    if (!ctrl) { return; }

    const key = event.key;
    const code = (event as any).code as string | undefined;
    // Prevent blur on Enter for bill discount fields; keep focus on same input
    if (key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const target = event.target as HTMLInputElement | null;
      setTimeout(() => {
        target?.focus();
        target?.select?.();
      }, 0);
      return;
    }

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

  onPaymentFieldKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const target = event.target as HTMLInputElement | null;
      setTimeout(() => {
        target?.focus();
        target?.select?.();
      }, 0);
    }
  }

  // Track if we're waiting for a number after Tab
  private waitingForTabNumber: boolean = false;
  private tabTimeout: any;

  openCustomerDropdown() {
    if (this.customerDropdown) {
      setTimeout(() => {
        this.customerDropdown.show();
      }, 0);
    }
  }

  openPaymentDropdown() {
    if (this.paymentDropdown) {
      setTimeout(() => {
        this.paymentDropdown.show();
      }, 0);
    }
  }

  openWarehouseDropdown() {
    if (this.warehouseDropdown) {
      setTimeout(() => {
        this.warehouseDropdown.show();
      }, 0);
    }
  }

  triggerSale() {
    // Validate cart has items
    if (this.salesInvoiceDetails.length === 0) {
      this.msgService.add({
        severity: "warn",
        summary: "Warning",
        detail: "No items in cart to complete sale",
        life: 2000,
      });
      return;
    }

    // Trigger the sales button
    this.saveWithoutPrint();
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
    const unitNameCtrl = itemForm.get('unitName');
    
    if (qtyCtrl) {
      const currentQty = parseFloat(qtyCtrl.value) || 0;
      const unitName = (unitNameCtrl?.value || '').toString().toLowerCase().trim();
      const isPerItem = unitName === 'per item' || unitName.includes('per item');
      
      let newQty: number;
      if (isPerItem) {
        newQty = Math.round(currentQty) + 1;
      } else {
        newQty = +(currentQty + 1).toFixed(3);
      }
      qtyCtrl.setValue(newQty);
    }
  }

  // Decrement quantity for a cart item
  decrementQuantity(index: number) {
    if (index < 0 || index >= this.salesInvoiceDetails.length) return;
    
    const itemForm = this.salesInvoiceDetails.at(index) as FormGroup;
    const qtyCtrl = itemForm.get('invoiceQty');
    const unitNameCtrl = itemForm.get('unitName');
    
    if (qtyCtrl) {
      const currentQty = parseFloat(qtyCtrl.value) || 0;
      const unitName = (unitNameCtrl?.value || '').toString().toLowerCase().trim();
      const isPerItem = unitName === 'per item' || unitName.includes('per item');
      
      let newQty: number;
      if (isPerItem) {
        newQty = Math.max(1, Math.round(currentQty) - 1); // Minimum 1 for per item
      } else {
        newQty = Math.max(0.001, +(currentQty - 1).toFixed(3)); // Minimum 0.001 for others
      }
      qtyCtrl.setValue(newQty);
    }
  }
}
