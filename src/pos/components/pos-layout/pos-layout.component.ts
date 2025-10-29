import { Component, ViewChild, ElementRef, AfterViewInit, HostListener, OnDestroy } from "@angular/core";
import { Router } from "@node_modules/@angular/router";
import { PosService } from "../../core/services/pos.service";
import { PosCartSidebarComponent } from "../pos-cart-sidebar/pos-cart-sidebar.component";
import { KeyboardNavigationService, NavigationState } from "../../core/services/keyboard-navigation.service";
import { takeUntil } from "rxjs/operators";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import { Subject } from "rxjs";

@Component({
  selector: "app-pos-layout",
  templateUrl: "./pos-layout.component.html",
  styleUrl: "./pos-layout.component.css",
})
export class PosLayoutComponent implements AfterViewInit, OnDestroy {
  isFullScreen = false;
  cartItems: any[] = [];
  searchItems: string = "";
  barcodeInput: string = "";
  showBarcodeInput = false;
  // Disable any programmatic focusing in POS screen
  private enableProgrammaticFocus = false;
  @ViewChild("barcodeScan") barcodeScanInput!: ElementRef<HTMLInputElement>;
  @ViewChild(PosCartSidebarComponent) cartSidebar!: PosCartSidebarComponent;
  @ViewChild('posItems') posItemsComponent!: any;
  private scanBuffer: string = "";
  private scanTimeout: any;
  private lastKeyTime = 0;

  // Search dropdown properties
  searchResults: any[] = [];
  showSearchDropdown = false;
  selectedSearchIndex = -1;
  allProducts: any[] = [];
  @ViewChild("searchInput") searchInput!: ElementRef<HTMLInputElement>;
  // Cache products per warehouse to avoid repeated API calls
  private productsCache = new Map<any, any[]>();
  // Debounced search stream
  private searchInput$ = new Subject<string>();

  // Keyboard navigation properties
  private destroy$ = new Subject<void>();
  navigationState: NavigationState = {
    currentSection: 'search',
    selectedProductIndex: -1,
    selectedCartItemIndex: -1,
    isSearchFocused: false,
    isBarcodeFocused: false,
    lastAction: undefined
  };
  private debugMode = false; // Set to false in production

  constructor(
    private sidebarService: PosService, 
    private router: Router,
    private keyboardNavService: KeyboardNavigationService
  ) {
    // Load all products for search
    this.loadAllProducts();
    
    // Subscribe to navigation state changes
    this.keyboardNavService.navigationState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.navigationState = state;
        this.handleNavigationStateChange();
      });

    // Subscribe to key press events
    this.keyboardNavService.keyPress$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.handleKeyPress(event);
      });

    // Debounce search typing to reduce work
    this.searchInput$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((term) => {
        this.sidebarService.setSearchTerm(term);
        this.performSearch(term);
      });
  }

  // Toggle Sidebar
  toggleSidebar() {
    this.sidebarService.toggleSidebar();
  }

  // Toggle Full-Screen Mode
  toggleFullScreen() {
    if (!this.isFullScreen) {
      this.openFullScreen();
    } else {
      this.closeFullScreen();
    }
  }

  openFullScreen() {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if ((<any>document.documentElement).webkitRequestFullscreen) {
      // For Safari
      (<any>document.documentElement).webkitRequestFullscreen();
    } else if ((<any>document.documentElement).msRequestFullscreen) {
      // For IE11
      (<any>document.documentElement).msRequestFullscreen();
    }
    this.isFullScreen = true;
  }

  closeFullScreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((<any>document).webkitExitFullscreen) {
      // For Safari
      (<any>document).webkitExitFullscreen();
    } else if ((<any>document).msExitFullscreen) {
      // For IE11
      (<any>document).msExitFullscreen();
    }
    this.isFullScreen = false;
  }

  goto(data: string) {
    this.router.navigate([data]);
  }

  onSearchChange() {
    this.searchInput$.next(this.searchItems);
  }

  // Load all products for search functionality
  loadAllProducts() {
    // Get effective warehouse ID (current or dukkan as default)
    const warehouseId:any = this.sidebarService.getCurrentWarehouseId();
    
    if (warehouseId) {
      // Return cached products if available
      const cached = this.productsCache.get(warehouseId);
      if (cached) {
        this.allProducts = cached;
        return;
      }
      // Call the new API with warehouse parameter and cache
      this.sidebarService.getItemsWithStockByWarehouse(warehouseId).subscribe({
        next: (response) => {
          const items = response.items || response || [];
          this.productsCache.set(warehouseId, items);
          this.allProducts = items;
        },
        error: () => {
          this.allProducts = [];
        }
      });
    } else {
      // No warehouse available - clear products
      this.allProducts = [];
    }
  }

  // Perform search and show dropdown
  performSearch(term: string) {
    if (!term || term.trim().length < 2) {
      this.showSearchDropdown = false;
      this.searchResults = [];
      return;
    }

    const lowerTerm = term.toLowerCase().trim();
    this.searchResults = this.allProducts.filter((product) => {
      const name = (product.name || '').toLowerCase();
      const sku = (product.sku || product.SKU || '').toString().toLowerCase();
      const barcode = (product.barcode || product.Barcode || '').toString().toLowerCase();
      
      return name.includes(lowerTerm) || 
             sku.includes(lowerTerm) || 
             barcode.includes(lowerTerm);
    }).slice(0, 8); // Limit to 8 results like Google

    this.showSearchDropdown = this.searchResults.length > 0;
    this.selectedSearchIndex = -1;
  }

  trackByProduct(index: number, product: any) {
    return product.id || product.sku || product.SKU || product.barcode || product.Barcode || index;
  }

  // Handle search result selection
  selectSearchResult(product: any, index: number) {
    this.searchItems = product.name;
    this.showSearchDropdown = false;
    const cartItem = {
      ...product,
      id: product?.id ?? product?.itemId,
      itemId: product?.itemId ?? product?.id,
      itemName: product?.itemName ?? product?.name ?? '',
      unitPrice: Number(product?.unitPrice ?? product?.price ?? product?.rate ?? 0),
      barcode: product?.barcode ?? product?.Barcode ?? product?.sku ?? product?.SKU ?? '',
      qty: 1,
      discount: 0,
    };
    this.sidebarService.addToCart(cartItem);
    if (this.enableProgrammaticFocus && this.searchInput) {
      this.searchInput.nativeElement.focus();
    }
  }

  // Handle keyboard navigation in search dropdown
  onSearchKeyDown(event: KeyboardEvent) {
    if (!this.showSearchDropdown) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedSearchIndex = Math.min(this.selectedSearchIndex + 1, this.searchResults.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedSearchIndex = Math.max(this.selectedSearchIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.selectedSearchIndex >= 0 && this.selectedSearchIndex < this.searchResults.length) {
          this.selectSearchResult(this.searchResults[this.selectedSearchIndex], this.selectedSearchIndex);
        }
        break;
      case 'Escape':
        this.showSearchDropdown = false;
        this.selectedSearchIndex = -1;
        break;
    }
  }

  // Hide dropdown when clicking outside
  onSearchBlur() {
    // Delay to allow click on dropdown items
    setTimeout(() => {
      this.showSearchDropdown = false;
      this.selectedSearchIndex = -1;
    }, 200);
  }

  // Show dropdown when focusing on search input
  onSearchFocus() {
    if (this.searchItems && this.searchItems.trim().length >= 2) {
      this.performSearch(this.searchItems);
    }
  }

  showHoldOrders() {
    if (this.cartSidebar) {
      this.cartSidebar.showHoldOrdersDialog();
    }
  }

  showKeyboardHelp() {
    const shortcuts = `
🎯 POS KEYBOARD NAVIGATION HELP

📍 NAVIGATION:
• Arrow Keys: Move between sections (Search → Products → Cart → Actions)
• Tab / Shift+Tab: Navigate between sections
• Escape: Clear focus and return to search

🔍 SEARCH & BARCODE:
• F3: Focus search input
• F4: Focus barcode scanner
• Arrow Up/Down: Navigate search results
• Enter: Select highlighted search result
• Ctrl+F: Focus search

📦 PRODUCTS:
• F5: Navigate to products section
• Arrow Up/Down: Navigate product list
• Enter: Add selected product to cart

🛒 CART:
• F6: Navigate to cart section
• Arrow Up/Down: Navigate cart items
• Enter: Focus quantity field of selected item

⚡ ACTIONS:
• F7: Navigate to actions section
• F8: Show hold orders
• F9: Complete sale
• F10: Print receipt
• Ctrl+H: Show hold orders
• Ctrl+S: Complete sale
• Ctrl+P: Print receipt

🔧 GENERAL:
• F1: Show this help
• F2: Toggle full screen

💡 TIP: The colored indicator at the top shows your current section!
    `;
    
    // Create a better help dialog
    const helpDialog = document.createElement('div');
    helpDialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #007bff;
      border-radius: 12px;
      padding: 24px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 10000;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      font-family: 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-line;
    `;
    
    helpDialog.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; color: #007bff;">🎯 Keyboard Shortcuts</h3>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer;">
          ✕ Close
        </button>
      </div>
      <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 4px solid #007bff;">
        ${shortcuts}
      </div>
    `;
    
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
    `;
    
    backdrop.onclick = () => {
      helpDialog.remove();
      backdrop.remove();
    };
    
    document.body.appendChild(backdrop);
    document.body.appendChild(helpDialog);
    
    // Auto-close after 30 seconds
    setTimeout(() => {
      if (helpDialog.parentElement) {
        helpDialog.remove();
        backdrop.remove();
      }
    }, 30000);
  }

  ngAfterViewInit() {
    // Barcode scanning now works in background without focus requirement
    // Do not auto-focus any inputs by default
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Keyboard navigation methods
  private handleNavigationStateChange() {
    if (this.debugMode) {
      this.keyboardNavService.logState('Navigation state changed');
    }
    
    // Handle focus changes based on navigation state
    if (this.enableProgrammaticFocus) {
      if (this.navigationState.isSearchFocused && this.searchInput) {
        setTimeout(() => {
          this.searchInput.nativeElement.focus();
          if (this.debugMode) console.log('Focused on search input');
        }, 0);
      } else if (this.navigationState.isBarcodeFocused && this.barcodeScanInput) {
        setTimeout(() => {
          this.barcodeScanInput.nativeElement.focus();
          if (this.debugMode) console.log('Focused on barcode input');
        }, 0);
      }
    }
    
    // Update visual indicators
    this.updateVisualIndicators();
  }

  private updateVisualIndicators() {
    // This will be used to update visual indicators in the template
    // For now, we'll just log the current section
    if (this.debugMode) {
      console.log(`Current section: ${this.navigationState.currentSection}`);
    }
  }

  private handleKeyPress(event: KeyboardEvent) {
    if (this.debugMode) {
      console.log(`Key pressed: ${event.key}, Section: ${this.navigationState.currentSection}`);
    }

    // Skip if user is typing in input fields (except when we want to handle specific keys)
    if (this.isTypingInInput(event) && !this.shouldHandleInInput(event)) {
      return;
    }

    // Handle the key press
    const handled = this.processKeyPress(event);
    
    if (handled && this.debugMode) {
      console.log(`Key ${event.key} handled successfully`);
    }
  }

  private shouldHandleInInput(event: KeyboardEvent): boolean {
    // Handle these keys even when typing in input fields
    const keysToHandleInInput = ['Escape', 'Tab', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'];
    return keysToHandleInInput.includes(event.key) || event.ctrlKey;
  }

  private processKeyPress(event: KeyboardEvent): boolean {
    switch (event.key) {
      case 'ArrowUp':
        this.handleArrowUp();
        return true;
      case 'ArrowDown':
        this.handleArrowDown();
        return true;
      case 'ArrowLeft':
        this.handleArrowLeft();
        return true;
      case 'ArrowRight':
        this.handleArrowRight();
        return true;
      case 'Enter':
        this.handleEnter();
        return true;
      case 'Escape':
        this.handleEscape();
        return true;
      case 'Tab':
        this.handleTab(event);
        return true;
      case 'F1':
        this.showKeyboardHelp();
        return true;
      case 'F2':
        this.toggleFullScreen();
        return true;
      case 'F3':
        this.keyboardNavService.focusSearch();
        return true;
      case 'F4':
        this.keyboardNavService.focusBarcode();
        return true;
      case 'F5':
        this.keyboardNavService.navigateToSection('products');
        return true;
      case 'F6':
        this.keyboardNavService.navigateToSection('cart');
        return true;
      case 'F7':
        this.keyboardNavService.navigateToSection('header');
        return true;
      case 'F8':
        this.showHoldOrders();
        return true;
      case 'F9':
        this.executeSale();
        return true;
      case 'F10':
        this.executePrint();
        return true;
    }

    // Handle Ctrl shortcuts
    if (event.ctrlKey) {
      return this.handleCtrlShortcuts(event);
    }

    return false;
  }

  private handleCtrlShortcuts(event: KeyboardEvent): boolean {
    switch (event.key.toLowerCase()) {
      case 'h':
        this.showHoldOrders();
        return true;
      case 's':
        this.executeSale();
        return true;
      case 'p':
        this.executePrint();
        return true;
      case 'f':
        this.keyboardNavService.focusSearch();
        return true;
    }
    return false;
  }

  private executeSale() {
    if (this.cartSidebar && this.cartItems.length > 0) {
      this.cartSidebar.saveWithoutPrint();
    } else if (this.debugMode) {
      console.log('Cannot execute sale - no items in cart');
    }
  }

  private executePrint() {
    if (this.cartSidebar && this.cartItems.length > 0) {
      this.cartSidebar.manualPrint();
    } else if (this.debugMode) {
      console.log('Cannot print - no items in cart');
    }
  }

  private isTypingInInput(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';
  }

  private handleArrowUp() {
    switch (this.navigationState.currentSection) {
      case 'search':
        if (this.showSearchDropdown && this.searchResults.length > 0) {
          this.selectedSearchIndex = Math.max(0, this.selectedSearchIndex - 1);
        }
        break;
      case 'products':
        // Navigate up in product grid
        this.navigateProductGrid('up');
        break;
      case 'cart':
        // Navigate up in cart items
        this.navigateCartItems('up');
        break;
    }
  }

  private handleArrowDown() {
    switch (this.navigationState.currentSection) {
      case 'search':
        if (this.showSearchDropdown && this.searchResults.length > 0) {
          this.selectedSearchIndex = Math.min(this.searchResults.length - 1, this.selectedSearchIndex + 1);
        }
        break;
      case 'products':
        // Navigate down in product grid
        this.navigateProductGrid('down');
        break;
      case 'cart':
        // Navigate down in cart items
        this.navigateCartItems('down');
        break;
    }
  }

  private handleArrowLeft() {
    switch (this.navigationState.currentSection) {
      case 'search':
        this.keyboardNavService.navigateToSection('actions');
        break;
      case 'products':
        this.keyboardNavService.navigateToSection('cart');
        break;
      case 'cart':
        this.keyboardNavService.navigateToSection('products');
        break;
      case 'actions':
        this.keyboardNavService.navigateToSection('search');
        break;
      case 'header':
        // Move left within header dropdowns
        {
          const idx = (this.navigationState as any).selectedHeaderIndex ?? 0;
          this.keyboardNavService.updateNavigationState({
            selectedHeaderIndex: Math.max(0, idx - 1),
            currentSection: 'header'
          } as any);
        }
        break;
    }
  }

  private handleArrowRight() {
    switch (this.navigationState.currentSection) {
      case 'search':
        this.keyboardNavService.navigateToSection('products');
        break;
      case 'products':
        this.keyboardNavService.navigateToSection('cart');
        break;
      case 'cart':
        this.keyboardNavService.navigateToSection('actions');
        break;
      case 'actions':
        this.keyboardNavService.navigateToSection('search');
        break;
      case 'header':
        // Move right within header dropdowns
        {
          const idx = (this.navigationState as any).selectedHeaderIndex ?? 0;
          this.keyboardNavService.updateNavigationState({
            selectedHeaderIndex: Math.min(2, idx + 1),
            currentSection: 'header'
          } as any);
        }
        break;
    }
  }

  private handleEnter() {
    switch (this.navigationState.currentSection) {
      case 'search':
        if (this.showSearchDropdown && this.selectedSearchIndex >= 0) {
          this.selectSearchResult(this.searchResults[this.selectedSearchIndex], this.selectedSearchIndex);
        }
        break;
      case 'products':
        // Add selected product to cart
        this.addSelectedProductToCart();
        break;
      case 'cart':
        // Focus on quantity field of selected cart item
        this.focusCartItemQuantity();
        break;
      case 'actions':
        // Execute action based on current state
        this.executeAction();
        break;
    }
  }

  private handleEscape() {
    this.keyboardNavService.clearFocus();
    this.showSearchDropdown = false;
    this.selectedSearchIndex = -1;
  }

  private handleTab(event: KeyboardEvent) {
    event.preventDefault();
    // When in cart, Tab cycles through fields within selected cart item
    if (this.navigationState.currentSection === 'cart') {
      if (this.cartSidebar) {
        (this.cartSidebar as any).navigateCartFields(event.shiftKey ? 'prev' : 'next');
      }
      return;
    }
    if (event.shiftKey) {
      this.handleArrowLeft();
    } else {
      this.handleArrowRight();
    }
  }

  private navigateProductGrid(direction: 'up' | 'down') {
    // Get reference to pos-items component and call its navigation method
    const posItemsComponent = (this as any).posItemsComponent;
    if (posItemsComponent) {
      posItemsComponent.navigateProductGrid(direction);
    }
  }

  private navigateCartItems(direction: 'up' | 'down') {
    // Get reference to cart sidebar component and call its navigation method
    if (this.cartSidebar) {
      this.cartSidebar.navigateCartItems(direction);
    }
  }

  private addSelectedProductToCart() {
    // Get reference to pos-items component and call its method
    const posItemsComponent = (this as any).posItemsComponent;
    if (posItemsComponent) {
      posItemsComponent.addSelectedProductToCart();
    }
  }

  private focusCartItemQuantity() {
    // Get reference to cart sidebar component and call its method
    if (this.cartSidebar) {
      this.cartSidebar.focusCartItemQuantity();
    }
  }

  private executeAction() {
    // Execute the appropriate action based on current context
    console.log('Execute action');
  }

  // onBarcodeInput removed to prevent double-trigger with global listener

  // Global listener to capture barcode scans in background
  @HostListener('document:keydown', ['$event'])
  handleDocumentKeydown(event: KeyboardEvent) {
    // Ignore modifier key combinations
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    // Ignore function keys (F1-F10) - these are handled by keyboard navigation
    if (event.key.startsWith('F') && event.key.length <= 3) {
      return;
    }

    // Check if user is actively typing in an input field
    const activeElement = document.activeElement as HTMLElement;
    const isTypingInInput = activeElement && 
      (activeElement.tagName === 'INPUT' || 
       activeElement.tagName === 'TEXTAREA' || 
       activeElement.tagName === 'SELECT' ||
       activeElement.isContentEditable);
    
    // If user presses Enter while in an input field (except barcode scan field), don't process it
    if (event.key === 'Enter' && isTypingInInput) {
      const isBarcodeField = activeElement === this.barcodeScanInput?.nativeElement;
      if (!isBarcodeField) {
        // User pressed Enter in a regular input field (qty, price, discount, etc.)
        // Clear scan buffer and don't process this Enter key
        this.scanBuffer = "";
        if (this.scanTimeout) {
          clearTimeout(this.scanTimeout);
          this.scanTimeout = null;
        }
        return; // Let the input field handle Enter naturally (or be prevented by the field itself)
      }
    }
    
    // If typing in any input fields, don't capture for barcode scanning
    // Exception: Allow if rapid keypresses (barcode scanner speed)
    const now = Date.now();
    const delta = now - this.lastKeyTime;
    const isRapidInput = delta < 50; // Barcode scanners type faster than humans
    
    if (isTypingInInput && !isRapidInput) {
      // User is manually typing, clear any buffer and exit
      this.scanBuffer = "";
      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
        this.scanTimeout = null;
      }
      return;
    }

    this.lastKeyTime = now;

    if (event.key === 'Enter') {
      if (this.scanBuffer && this.scanBuffer.length > 3) {
        // Likely a barcode scan (has substantial content)
        if (this.scanTimeout) {
          clearTimeout(this.scanTimeout);
          this.scanTimeout = null;
        }
        this.sidebarService.emitBarcodeScan(this.scanBuffer);
        this.scanBuffer = "";
        // Update the barcode input display but don't force focus
        if (this.barcodeScanInput?.nativeElement) {
          this.barcodeScanInput.nativeElement.value = "";
        }
        event.preventDefault();
      } else {
        // Short buffer, likely not a barcode - clear it
        this.scanBuffer = "";
      }
      return;
    }

    if (event.key && event.key.length === 1) {
      this.scanBuffer += event.key;

      // Update the barcode input display
      if (this.barcodeScanInput?.nativeElement) {
        this.barcodeScanInput.nativeElement.value = this.scanBuffer;
      }

      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
      }

      this.scanTimeout = setTimeout(() => {
        const code = this.scanBuffer.trim();
        if (code && code.length > 3) {
          // Only process if it looks like a barcode
          this.sidebarService.emitBarcodeScan(code);
        }
        this.scanBuffer = "";
        // Clear the display but don't force focus
        if (this.barcodeScanInput?.nativeElement) {
          this.barcodeScanInput.nativeElement.value = "";
        }
      }, 120);
    }
  }
}
