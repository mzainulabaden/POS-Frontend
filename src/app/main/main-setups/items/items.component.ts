import { Component } from "@angular/core";

@Component({
  selector: "app-items",
  templateUrl: "./items.component.html",
  styleUrl: "./items.component.css",
})
export class ItemsComponent {
  activeIndex: number = 0;
  handleChangeTab(index) {
    this.activeIndex = index;
  }
}
