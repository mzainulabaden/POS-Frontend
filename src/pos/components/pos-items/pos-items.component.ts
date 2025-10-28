import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { catchError, throwError } from "rxjs";
import { PosService } from "pos/core/services/pos.service";
import { KeyboardNavigationService, NavigationState } from "../../core/services/keyboard-navigation.service";
import { takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";

@Component({
  selector: "app-pos-items",
  templateUrl: "./pos-items.component.html",
  styleUrl: "./pos-items.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosItemsComponent implements OnInit, OnDestroy {
  products = [];
  filteredProducts = [];
  selectedProductIndex = -1;
  private destroy$ = new Subject<void>();

  constructor(
    public sidebarService: PosService,
    private cdr: ChangeDetectorRef,
    private keyboardNavService: KeyboardNavigationService
  ) {}

  ngOnInit() {
    // this.getAllCategory(); // Removed - not showing categories
    this.getAllItem();

    // Subscribe to search term updates
    this.sidebarService.searchTerm$.subscribe((term) => {
      this.filterProducts(term);
      this.cdr.markForCheck();
    });

    // Subscribe to barcode scans and add matching item to cart
    this.sidebarService.barcodeScan$.subscribe((code) => {
      if (!code) return;
      // Find in current product list by barcode
      const matched = this.products.find((p: any) => {
        const itemCode = (p.barcode || p.Barcode || "").toString().trim();
        return itemCode && itemCode.toLowerCase() === code.toLowerCase();
      });
      if (matched) {
        this.addToCart(matched);
      }
    });

    // Subscribe to navigation state changes
    this.keyboardNavService.navigationState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.handleNavigationStateChange(state);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private handleNavigationStateChange(state: NavigationState) {
    if (state.currentSection === 'products') {
      if (state.selectedProductIndex >= 0 && state.selectedProductIndex < this.filteredProducts.length) {
        this.selectedProductIndex = state.selectedProductIndex;
        this.scrollToSelectedProduct();
        this.cdr.markForCheck();
      }
    } else {
      this.selectedProductIndex = -1;
      this.cdr.markForCheck();
    }
  }

  private scrollToSelectedProduct() {
    if (this.selectedProductIndex >= 0) {
      setTimeout(() => {
        const selectedElement = document.querySelector(`[data-product-index="${this.selectedProductIndex}"]`);
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

  navigateProductGrid(direction: 'up' | 'down') {
    if (this.filteredProducts.length === 0) return;

    if (this.selectedProductIndex === -1) {
      this.selectedProductIndex = 0;
    } else {
      if (direction === 'up') {
        this.selectedProductIndex = Math.max(0, this.selectedProductIndex - 1);
      } else {
        this.selectedProductIndex = Math.min(this.filteredProducts.length - 1, this.selectedProductIndex + 1);
      }
    }

    this.keyboardNavService.updateNavigationState({
      selectedProductIndex: this.selectedProductIndex,
      currentSection: 'products'
    });
    this.cdr.markForCheck();
  }

  addSelectedProductToCart() {
    if (this.selectedProductIndex >= 0 && this.selectedProductIndex < this.filteredProducts.length) {
      const product = this.filteredProducts[this.selectedProductIndex];
      this.addToCart(product);
    }
  }

  isProductSelected(index: number): boolean {
    return this.selectedProductIndex === index;
  }

  // Optimized filter method - searches by name, SKU, or barcode
  private filterProducts(term: string): void {
    if (!term) {
      this.filteredProducts = this.products;
    } else {
      const lowerTerm = term.toLowerCase();
      this.filteredProducts = this.products.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const sku = (p.sku || p.SKU || '').toString().toLowerCase();
        const barcode = (p.barcode || p.Barcode || '').toString().toLowerCase();
        
        return name.includes(lowerTerm) || 
               sku.includes(lowerTerm) || 
               barcode.includes(lowerTerm);
      });
    }
  }

  // TrackBy function for better performance
  trackByProductId(index: number, product: any): any {
    return product.id || index;
  }

  // Removed - not using category filtering
  // fetchItems(id: any) {
  //   this.sidebarService
  //     .getAll1("Item", { ItemCategoryId: id })
  //     .pipe(
  //       catchError((error) => {
  //         return throwError(error.error.error.message);
  //       })
  //     )
  //     .subscribe({
  //       next: (response) => {
  //         this.products = response.items;
  //         this.filteredProducts = this.products;
  //         this.cdr.markForCheck();
  //       },
  //     });
  // }

  // Removed - not using categories in POS
  // getAllCategory() {
  //   this.sidebarService
  //     .getAll("ItemCategory")
  //     .pipe(
  //       finalize(() => {}),
  //       catchError((error) => {
  //         return throwError(error.error.error.message);
  //       })
  //     )
  //     .subscribe({
  //       next: (response) => {
  //         this.menuItems = response.items;
  //         this.cdr.detectChanges();
  //       },
  //     });
  // }
 
  getAllItem() {
    debugger;
    // Get warehouse ID from the API call
    this.sidebarService.getCurrentWarehouseId().subscribe({
      next: (warehouseId) => {
        console.log('Getting items with warehouse ID:', warehouseId);
        
        if (warehouseId) {
          // Call the new API with warehouse parameter
          this.sidebarService
            .getItemsWithStockByWarehouse(warehouseId)
            .pipe(
              catchError((error) => {
                console.error('Error fetching items with warehouse:', error);
                return throwError(error.error.error.message);
              })
            )
            .subscribe({
              next: (response) => {
                console.log('Items loaded with warehouse stock:', response);
                this.products = response.items || response;
                this.filteredProducts = this.products;
                this.cdr.markForCheck();
              },
            });
        } else {
          // No warehouse available - clear products
          console.log('No warehouse ID available, clearing products');
          this.products = [];
          this.filteredProducts = [];
          this.cdr.markForCheck();
        }
      },
      error: (error) => {
        console.error('Error getting warehouse ID:', error);
        this.products = [];
        this.filteredProducts = [];
        this.cdr.markForCheck();
      }
    });
  }

  // Removed - not using category selection
  // selectMenuItem(item) {
  //   this.menuItems.forEach((menuItem) => {
  //     menuItem.selected = false;
  //     this.fetchItems(item.id);
  //   });
  //   item.selected = true;
  // }

  addToCart(product) {
    const cartItem = {
      ...product,
      qty: 1,
      discount: 0,
    };
    this.sidebarService.addToCart(cartItem);
  }
}
