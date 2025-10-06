import { Component, Input, ChangeDetectionStrategy } from "@angular/core";

@Component({
  selector: "sidebar-logo",
  templateUrl: "./sidebar-logo.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarLogoComponent {
  @Input() sidebarExpanded: boolean = true;
  constructor() {
    console.log("SideBaar Logo ", this.sidebarExpanded);
  }
}
