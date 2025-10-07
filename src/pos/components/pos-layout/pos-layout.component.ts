import { Component, Renderer2, ViewChild, ElementRef, AfterViewInit, HostListener } from "@angular/core";
import { Router } from "@node_modules/@angular/router";
import { PosService } from "../../core/services/pos.service";

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

  ngAfterViewInit() {
    // Ensure the barcode input is focused so scans go straight here
    setTimeout(() => this.barcodeScanInput?.nativeElement?.focus(), 0);
  }

  // onBarcodeInput removed to prevent double-trigger with global listener

  // Global listener to capture barcode scans even if input loses focus
  @HostListener('document:keydown', ['$event'])
  handleDocumentKeydown(event: KeyboardEvent) {
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    const now = Date.now();

    if (event.key === 'Enter') {
      if (this.scanBuffer) {
        if (this.scanTimeout) {
          clearTimeout(this.scanTimeout);
          this.scanTimeout = null;
        }
        this.sidebarService.emitBarcodeScan(this.scanBuffer);
        this.scanBuffer = "";
        if (this.barcodeScanInput?.nativeElement) {
          this.barcodeScanInput.nativeElement.value = "";
          this.barcodeScanInput.nativeElement.focus();
        }
        event.preventDefault();
      }
      return;
    }

    if (event.key && event.key.length === 1) {
      const delta = now - this.lastKeyTime;
      this.lastKeyTime = now;

      this.scanBuffer += event.key;

      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
      }

      this.scanTimeout = setTimeout(() => {
        const code = this.scanBuffer.trim();
        if (code) {
          this.sidebarService.emitBarcodeScan(code);
        }
        this.scanBuffer = "";
        if (this.barcodeScanInput?.nativeElement) {
          this.barcodeScanInput.nativeElement.value = "";
          this.barcodeScanInput.nativeElement.focus();
        }
      }, 120);
    }
  }
}
