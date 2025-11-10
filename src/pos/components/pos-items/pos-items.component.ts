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
  categories: any[] = [];
  selectedCategoryId: number | null = null;
  private destroy$ = new Subject<void>();
  // Feature: prioritize these item IDs to appear first (up to 10)
  featuredItemIds: number[] = [];
  // Reorder UI state
  reorderModalVisible = false;
  tempFeaturedIds: number[] = [];

  constructor(
    public sidebarService: PosService,
    private cdr: ChangeDetectorRef,
    private keyboardNavService: KeyboardNavigationService
  ) {}

  ngOnInit() {
    this.getAllCategory();
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

  getAllCategory() {
    this.sidebarService
      .getAll("ItemCategory")
      .pipe(
        catchError((error) => {
          console.error('Error fetching categories:', error);
          return throwError(error.error?.error?.message || error.message);
        })
      )
      .subscribe({
        next: (response) => {
          this.categories = response?.items || response || [];
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          this.categories = [];
          this.cdr.markForCheck();
        }
      });
  }
  
  onCategoryChange() {
    // Reload items with selected category filter
    this.getAllItem();
  }
 
  getAllItem() {
    debugger;
    // Get warehouse ID from the API call
    this.sidebarService.getCurrentWarehouseId().subscribe({
      next: (warehouseId) => {
        console.log('Getting items with warehouse ID:', warehouseId);
        
        if (warehouseId) {
          // Call the new API with warehouse parameter and optional category filter
          const categoryId = this.selectedCategoryId && this.selectedCategoryId > 0 ? this.selectedCategoryId : undefined;
          this.sidebarService
            .getItemsWithStockByWarehouse(warehouseId, undefined, categoryId)
            .pipe(
              catchError((error) => {
                console.error('Error fetching items with warehouse:', error);
                return throwError(error.error?.error?.message || error.message);
              })
            )
            .subscribe({
              next: (response) => {
                console.log(response)
                console.log('Items loaded with warehouse stock:', response);
                const rawItems = response.items || response || [];
                // Explicitly map all fields to ensure correct mapping, especially stockQty
                this.products = (Array.isArray(rawItems) ? rawItems : []).map((item: any) => {
                  // Determine stockQty value - check multiple possible field names, prioritize stockQty
                  let stockQtyValue = 0;
                  if (item.stockQty !== undefined && item.stockQty !== null) {
                    stockQtyValue = item.stockQty;
                  } else if (item.StockQty !== undefined && item.StockQty !== null) {
                    stockQtyValue = item.StockQty;
                  } else if (item.finalStockQty !== undefined && item.finalStockQty !== null) {
                    stockQtyValue = item.finalStockQty;
                  } else if (item.FinalStockQty !== undefined && item.FinalStockQty !== null) {
                    stockQtyValue = item.FinalStockQty;
                  } else if (item.currentStock !== undefined && item.currentStock !== null) {
                    stockQtyValue = item.currentStock;
                  } else if (item.availableQty !== undefined && item.availableQty !== null) {
                    stockQtyValue = item.availableQty;
                  }
                  
                  // Create mapped object with all required fields
                  const mappedItem: any = {
                    id: item.id ?? item.itemId ?? 0,
                    name: item.name ?? item.itemName ?? '',
                    sku: item.sku ?? item.SKU ?? '',
                    unitId: item.unitId ?? 0,
                    unitName: item.unitName ?? item.unit ?? '',
                    barcode: item.barcode ?? item.Barcode ?? '',
                    unitPrice: item.unitPrice ?? item.price ?? item.rate ?? 0,
                    // Explicitly set stockQty to ensure it's never overwritten
                    stockQty: stockQtyValue,
                    finalStockQty: item.finalStockQty ?? item.FinalStockQty ?? stockQtyValue,
                  };
                  
                  // Preserve all other fields from the original item
                  Object.keys(item).forEach((key: string) => {
                    // Only add fields that aren't already explicitly mapped
                    if (!mappedItem.hasOwnProperty(key)) {
                      mappedItem[key] = item[key];
                    }
                  });
                  
                  // Final safeguard: ensure stockQty is set correctly (override any overwritten value)
                  mappedItem.stockQty = stockQtyValue;
                  
                  return mappedItem;
                });
                console.log(this.products)
                this.loadFeaturedFromLocalStorage();
                this.filteredProducts = this.orderWithFeaturedFirst(this.products);
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

  // Load featured IDs from localStorage (comma-separated), keep only first 10
  private loadFeaturedFromLocalStorage() {
    try {
      const raw = localStorage.getItem('pos.featuredItemIds') || '';
      const ids = raw
        .split(',')
        .map((v) => parseInt(v.trim(), 10))
        .filter((n) => !isNaN(n));
      this.featuredItemIds = ids.slice(0, 10);
    } catch {
      this.featuredItemIds = [];
    }
  }

  // Reorder list to put featured items first, preserving featured order
  private orderWithFeaturedFirst(items: any[]) {
    if (!Array.isArray(items) || !this.featuredItemIds?.length) return items;
    const idToProduct = new Map<any, any>();
    items.forEach((p) => idToProduct.set(p.id, p));
    const featured = this.featuredItemIds
      .map((id) => idToProduct.get(id))
      .filter((p) => !!p);
    const featuredSet = new Set(featured.map((p) => p.id));
    const rest = items.filter((p) => !featuredSet.has(p.id));
    return [...featured, ...rest];
  }

  // Utility: build image URL from relative or absolute paths
  getProductImageUrl(product: any): string | null {
    const path = product?.imageUrl || product?.ImageUrl || '';
    if (!path) return null;
    return path.startsWith('http') ? path : (this.sidebarService.baseUrl?.replace(/api\/services\/app\/$/, '') || '') + path;
  }

  // ----- Reorder UI actions -----
  openReorderModal() {
    this.loadFeaturedFromLocalStorage();
    this.tempFeaturedIds = [...this.featuredItemIds];
    this.reorderModalVisible = true;
    this.cdr.markForCheck();
  }

  addToFeatured(product: any) {
    const id = product?.id;
    if (!id) return;
    if (!this.tempFeaturedIds.includes(id)) {
      if (this.tempFeaturedIds.length < 10) {
        this.tempFeaturedIds.push(id);
      } else {
        // replace the last one if over limit
        this.tempFeaturedIds[this.tempFeaturedIds.length - 1] = id;
      }
      this.cdr.markForCheck();
    }
  }

  removeFromFeatured(id: number) {
    this.tempFeaturedIds = this.tempFeaturedIds.filter((x) => x !== id);
    this.cdr.markForCheck();
  }

  moveUp(index: number) {
    if (index <= 0) return;
    const arr = this.tempFeaturedIds;
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    this.cdr.markForCheck();
  }

  moveDown(index: number) {
    if (index >= this.tempFeaturedIds.length - 1) return;
    const arr = this.tempFeaturedIds;
    [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
    this.cdr.markForCheck();
  }

  saveFeaturedOrder() {
    localStorage.setItem('pos.featuredItemIds', this.tempFeaturedIds.join(','));
    this.featuredItemIds = [...this.tempFeaturedIds];
    this.filteredProducts = this.orderWithFeaturedFirst(this.products);
    this.reorderModalVisible = false;
    this.cdr.markForCheck();
  }

  cancelReorder() {
    this.reorderModalVisible = false;
    this.cdr.markForCheck();
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
      // keep other fields first
      ...product,
      // then normalize fields expected by cart sidebar
      id: product?.id ?? product?.itemId,
      itemId: product?.itemId ?? product?.id,
      itemName: product?.itemName ?? product?.name ?? '',
      unitPrice: Number(product?.unitPrice ?? product?.price ?? product?.rate ?? 0),
      barcode: product?.barcode ?? product?.Barcode ?? product?.sku ?? product?.SKU ?? '',
      unitId: product?.unitId || 0,
      unitName: product?.unitName ?? product?.unit ?? '',
      qty: 1,
      discount: 0,
    };
    this.sidebarService.addToCart(cartItem);
  }
}
