import { Component, Renderer2 } from "@angular/core";
import { Router } from "@node_modules/@angular/router";
import { PosService } from "../../core/services/pos.service";

@Component({
  selector: "app-pos-layout",
  templateUrl: "./pos-layout.component.html",
  styleUrl: "./pos-layout.component.css",
})
export class PosLayoutComponent {
  isFullScreen = false;
  cartItems: any[] = [];
  searchItems: string = "";

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
}
