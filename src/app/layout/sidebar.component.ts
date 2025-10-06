import {
  Component,
  ChangeDetectionStrategy,
  Renderer2,
  OnInit,
  Input,
} from "@angular/core";
import { LayoutStoreService } from "@shared/layout/layout-store.service";

@Component({
  // tslint:disable-next-line:component-selector
  selector: "sidebar",
  templateUrl: "./sidebar.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent implements OnInit {
  // sidebarExpanded: boolean;
  @Input() sidebarExpanded: boolean = true;

  constructor(
    private renderer: Renderer2,
    private _layoutStore: LayoutStoreService
  ) {
    console.log("SideBar Comonnet ", this.sidebarExpanded);
  }

  ngOnInit(): void {
    this._layoutStore.sidebarExpanded.subscribe((value) => {
      this.sidebarExpanded = value;
      this.toggleSidebar();
    });
  }

  toggleSidebar(): void {
    if (this.sidebarExpanded) {
      this.showSidebar();
    } else {
      this.hideSidebar();
    }
  }

  showSidebar(): void {
    this.renderer.removeClass(document.body, "sidebar-collapse");
    this.renderer.addClass(document.body, "sidebar-open");
  }

  hideSidebar(): void {
    this.renderer.removeClass(document.body, "sidebar-open");
    this.renderer.addClass(document.body, "sidebar-collapse");
  }
}
