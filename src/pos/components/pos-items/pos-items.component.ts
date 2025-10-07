import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Output,
} from "@angular/core";
import { finalize, catchError, throwError } from "rxjs";
import { PosService } from "pos/core/services/pos.service";

@Component({
  selector: "app-pos-items",
  templateUrl: "./pos-items.component.html",
  styleUrl: "./pos-items.component.css",
})
export class PosItemsComponent {
  baseurl: string = "http://173.249.23.108:6063";
  products = [];
  filteredProducts = [];
  isOpen: boolean = false;
  menuItems: any[] = [];
  searchTerm: string = "";

  constructor(
    public sidebarService: PosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.getAllCategory();
    this.getAllItem();
    this.sidebarService.sidebarOpen$.subscribe((isOpen) => {
      this.isOpen = isOpen;
    });

    // Subscribe to search term updates
    this.sidebarService.searchTerm$.subscribe((term) => {
      if (!term) {
        this.filteredProducts = this.products;
      } else {
        this.filteredProducts = this.products.filter((p) =>
          p.name.toLowerCase().includes(term.toLowerCase())
        );
      }
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

  fetchItems(id: any) {
    console.log("Fetching products for category:", id);

    this.sidebarService
      .getAll1("Item", { ItemCategoryId: id })
      .pipe(
        finalize(() => {}),
        catchError((error) => {
          return throwError(error.error.error.message);
        })
      )
      .subscribe({
        next: (response) => {
          console.log(response.items);
          this.products = response.items;
          this.filteredProducts = this.products;
          this.cdr.detectChanges();
        },
      });
  }

  getAllCategory() {
    this.sidebarService
      .getAll("ItemCategory")
      .pipe(
        finalize(() => {}),
        catchError((error) => {
          return throwError(error.error.error.message);
        })
      )
      .subscribe({
        next: (response) => {
          this.menuItems = response.items;
          this.cdr.detectChanges();
        },
      });
  }

  getAllItem() {
    this.sidebarService
      .getAll("Item")
      .pipe(
        finalize(() => {}),
        catchError((error) => {
          return throwError(error.error.error.message);
        })
      )
      .subscribe({
        next: (response) => {
          console.log(response.items);
          this.products = response.items;
          this.filteredProducts = this.products;
          this.cdr.detectChanges();
        },
      });
  }

  selectMenuItem(item) {
    this.menuItems.forEach((menuItem) => {
      menuItem.selected = false;
      this.fetchItems(item.id);
    });
    item.selected = true;
  }

  addToCart(product) {
    console.log("Product", product);
    const cartItem = {
      ...product,
      qty: 1, // default
      discount: 0, // default
    };
    // this.productAdded.emit(cartItem);
    this.sidebarService.addToCart(cartItem);
  }

  filteredMenuItems() {
    if (!this.searchTerm) {
      return this.menuItems;
    }
    return this.menuItems.filter((item) =>
      item.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
}
