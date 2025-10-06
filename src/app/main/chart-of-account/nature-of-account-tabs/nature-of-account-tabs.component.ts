import { Component } from "@angular/core";

@Component({
  selector: "app-nature-of-account-tabs",
  templateUrl: "./nature-of-account-tabs.component.html",
  styleUrl: "./nature-of-account-tabs.component.css",
})
export class NatureOfAccountTabsComponent {
  ngOnInit(): void {
    this.activeIndex = +localStorage.getItem("activeTabIndex") || 0;
  }
  activeIndex: number;
  onTabChange(event: any): void {
    this.activeIndex = event.index;
    localStorage.setItem("activeTabIndex", this.activeIndex.toString());
  }
}
