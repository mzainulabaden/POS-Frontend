import { Component } from "@angular/core";

@Component({
  selector: "app-account-openings",
  templateUrl: "./account-openings.component.html",
})
export class AccountOpeningsComponent {
  activeIndex: number = 0;
  handleChangeTab(index) {
    this.activeIndex = index;
  }
}
