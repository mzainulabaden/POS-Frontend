import { Component, OnInit } from "@angular/core";

@Component({
  selector: "app-new-reports",
  templateUrl: "./new-reports.component.html",
  styleUrls: ["./new-reports.component.css"],
})
export class NewReportsComponent implements OnInit {
  activeIndex: number = 0;

  constructor() {}

  ngOnInit(): void {}

  onTabChange(event: any) {
    this.activeIndex = event.index;
  }
}

