import { Component, Renderer2, ViewChild, ElementRef, AfterViewInit, HostListener } from "@angular/core";
import { Router } from "@node_modules/@angular/router";
import { PosService } from "../../core/services/pos.service";
import { PosCartSidebarComponent } from "../pos-cart-sidebar/pos-cart-sidebar.component";

@Component({
  selector: "app-pos-layout",
  templateUrl: "./pos-layout.component.html",
  styleUrl: "./pos-layout.component.css",
})
export class PosLayoutComponent implements AfterViewInit {
  isFullScreen = false;
  cartItems: any[] = [];
  searchItems: string = "";
  barcodeInput: string = "";
  private barcodeTimer: any;
  @ViewChild("barcodeScan") barcodeScanInput!: ElementRef<HTMLInputElement>;
  @ViewChild(PosCartSidebarComponent) cartSidebar!: PosCartSidebarComponent;
  private scanBuffer: string = "";
  private scanTimeout: any;
  private lastKeyTime = 0;

  constructor(private sidebarService: PosService, private router: Router) {}

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
    this.sidebarService.setSearchTerm(this.searchItems);
  }

  showHoldOrders() {
    if (this.cartSidebar) {
      this.cartSidebar.showHoldOrdersDialog();
    }
  }

  ngAfterViewInit() {
    // Barcode scanning now works in background without focus requirement
  }

  // onBarcodeInput removed to prevent double-trigger with global listener

  // Global listener to capture barcode scans in background
  @HostListener('document:keydown', ['$event'])
  handleDocumentKeydown(event: KeyboardEvent) {
    // Ignore modifier key combinations
    if (event.ctrlKey || event.altKey || event.metaKey) {
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
