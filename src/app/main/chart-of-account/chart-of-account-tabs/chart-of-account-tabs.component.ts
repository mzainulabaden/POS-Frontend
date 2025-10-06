import { Component, Injector, OnInit } from "@angular/core";
import { AppComponentBase } from "@shared/app-component-base";

@Component({
  selector: "app-chart-of-account-tabs",
  templateUrl: "./chart-of-account-tabs.component.html",
})
export class ChartOfAccountTabsComponent implements OnInit {
  constructor(injector: Injector) {}
  ngOnInit() {
    this.activeIndex = +localStorage.getItem("activeTabIndex") || 0;
  }
  activeIndex: number;
  onTabChange(event: any): void {
    this.activeIndex = event.index;
    localStorage.setItem("activeTabIndex", this.activeIndex.toString());
  }
}
