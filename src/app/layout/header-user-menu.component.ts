import { Component, ChangeDetectionStrategy, OnInit } from "@angular/core";
import { AbpSessionService } from "abp-ng2-module";
import { ChangeDetectorRef } from '@angular/core';
import { AppAuthService } from "@shared/auth/app-auth.service";
import { UserServiceProxy } from "@shared/service-proxies/service-proxies";

@Component({
  selector: "header-user-menu",
  templateUrl: "./header-user-menu.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderUserMenuComponent implements OnInit {
  username: string = "";
  constructor(
    private _authService: AppAuthService,
    private _sessionService: AbpSessionService,
    private _userService: UserServiceProxy,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const userId = this._sessionService.userId;
    if (userId) {
      this._userService.get(userId).subscribe((user) => {
        this.username = user.userName || "Guest";
        this.cd.markForCheck(); 
      });
    }
  }
  
  logout(): void {
    this._authService.logout();
  }
}
