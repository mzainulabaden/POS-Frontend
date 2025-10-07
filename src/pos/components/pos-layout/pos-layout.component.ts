import { Component, Renderer2, ViewChild, ElementRef, AfterViewInit } from "@angular/core";
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

  onBarcodeInput() {
    debugger
    // Debounce to detect end of scan without requiring Enter key
    if (this.barcodeTimer) {
      clearTimeout(this.barcodeTimer);
    }

    this.barcodeTimer = setTimeout(() => {
      const code = (this.barcodeInput || "").trim();
      if (code) {
        this.sidebarService.emitBarcodeScan(code);
      }
      this.barcodeInput = "";
      this.barcodeScanInput?.nativeElement?.focus();
    }, 200); // adjust delay if scanner needs more/less time
  }
}
