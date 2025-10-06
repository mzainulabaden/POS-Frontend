import {
  Component,
  OnInit,
  EventEmitter,
  Output,
  ChangeDetectorRef,
} from "@angular/core";
import { BsModalRef } from "ngx-bootstrap/modal";
import { PurchaseService } from "@app/main/purchase/shared/services/purchase.service";
import { MessageService, ConfirmationService } from "primeng/api";
import { catchError, finalize, throwError } from "rxjs";
@Component({
  selector: "app-policy",
  templateUrl: "./policy.component.html",
})
export class PolicyComponent implements OnInit {
  target: string = "CommissionPolicy";
  saving: boolean;
  displayModal: boolean;
  userId: number;
  selectedPolicyId: string;
  policies: { id: number; name: string; policyType: number }[] = [];

  @Output() onSave = new EventEmitter<any>();

  constructor(
    public bsModalRef: BsModalRef,
    private _policyService: PurchaseService,
    private cdr: ChangeDetectorRef,
    private msgService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    debugger;
    this._policyService.getAll(this.target).subscribe((result) => {
      this.policies = result?.items || [];
      this.cdr.detectChanges();
      console.log(this.policies);
    });
  }

  save(): void {
    if (!this.selectedPolicyId) {
      this.msgService.add({
        severity: "error",
        summary: "error",
        detail: "Please Select Policy!",
      });
      return;
    }
    const selectedPolicy = this.policies.find(
      (p) => p.id === +this.selectedPolicyId
    );
    debugger;
    if (!selectedPolicy) return;

    const request = {
      userId: this.userId,
      policyType: selectedPolicy.id,
    };

    this._policyService
      .savePolicies(this.target, request)
      .pipe(
        finalize(() => {}),
        catchError((error) => {
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: error.error.error.message,
            life: 2000,
          });
          return throwError(error.error.error.message);
        })
      )
      .subscribe({
        next: (response) => {
          this.msgService.add({
            severity: "success",
            summary: "Confirmed",
            detail: "SavedSuccessfully",
            life: 2000,
          });
        },
      });
    this.bsModalRef.hide();
    this.onSave.emit();
  }
}
