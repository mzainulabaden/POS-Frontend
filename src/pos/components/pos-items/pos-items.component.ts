import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
} from "@angular/core";
import { catchError, throwError } from "rxjs";
import { PosService } from "pos/core/services/pos.service";

@Component({
  selector: "app-pos-items",
  templateUrl: "./pos-items.component.html",
  styleUrl: "./pos-items.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosItemsComponent {
  products = [];
  filteredProducts = [];

  constructor(
    public sidebarService: PosService,
    private cdr: ChangeDetectorRef
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
  }

  // Optimized filter method
  private filterProducts(term: string): void {
    if (!term) {
      this.filteredProducts = this.products;
    } else {
      const lowerTerm = term.toLowerCase();
      this.filteredProducts = this.products.filter((p) =>
        p.name.toLowerCase().includes(lowerTerm)
      );
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
    this.sidebarService
      .getAll("Item")
      .pipe(
        catchError((error) => {
          return throwError(error.error.error.message);
        })
      )
      .subscribe({
        next: (response) => {
          this.products = response.items;
          this.filteredProducts = this.products;
          this.cdr.markForCheck();
        },
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
