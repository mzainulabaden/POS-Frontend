import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RoleServiceProxy } from '@shared/service-proxies/service-proxies';

@Component({
  selector: 'account-header',
  templateUrl: './account-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountHeaderComponent {

    constructor(
       private _rolesService: RoleServiceProxy,
 
    ) {
   
    // }
    // ngOnInit(): void {
    //   this._rolesService.getCompanyProfile()
 
     
    // }
    }}
