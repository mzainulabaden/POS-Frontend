import { UnitOfMeasure } from "../shared/dtos/unit-of-measure";
import { ChangeDetectorRef, Component, Injector, OnInit } from "@angular/core";
import { MessageService, ConfirmationService } from "primeng/api";
import { catchError, finalize, throwError } from "rxjs";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { HrmService } from "../../hrm/shared/services/hrm.service";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
import { Table } from "primeng/table";
import * as moment from "moment";
import { validateHeaderName } from "http";

@Component({
  selector: "app-default-integrations",

  templateUrl: "./default-integrations.component.html",
  styleUrl: "./default-integrations.component.css",
})
export class DefaultIntegrationsComponent {
  editMode: boolean;
  displayModal: boolean;
  target: string = "DefaultIntegrations";

  tableData: any;
  count: number;
  currentPage: number = 1;
  skipCount: number = 0;
  maxCount: number = 10;
  saving: boolean;
  showSupplierDetails = false;
  gridApi: any;
  setParms: any;
  rowSelection: string;
  dataForEdit: any;
  chartOfAccounts: any;
  defaulIntegrationform: FormGroup;
  loading: boolean;
  selectedFile: any;
  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    name: "",
    chartOfAccountName: "",
  };

  constructor(
    injector: Injector,
    private fb: FormBuilder,
    private _hrmService: HrmService,
    private changeDetector: ChangeDetectorRef,
    private msgService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.defaulIntegrationform = this.fb.group({
      chartOfAccountId: ["", [Validators.required]],
      name: ["", [Validators.required]],
    });
  }
  ngOnInit(): void {
    this.getAll();
  }

  getAll() {
    this.loading = true;
    this._hrmService
      .getAll(this.target, this.skipCount, this.maxCount)
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
          console.log(response);
          this.tableData = response.items;
          this.count = response.totalCount;
          this.changeDetector.detectChanges();
        },
      });
    this.loading = false;
  }

  show(id?: number) {
    debugger;
    if (id) {
      // Edit Mode
      this.editMode = true;
      this._hrmService
        .getDataForEdit(id, this.target)
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
            this.dataForEdit = response;
            // Fetch designations before setting values to ensure dropdown is populate

            this.defaulIntegrationform.patchValue({
              id: this.dataForEdit.id,
              chartOfAccountId: this.dataForEdit.chartOfAccountId,
              chartOfAccountName: this.dataForEdit.chartOfAccountName,
              remarks: this.dataForEdit.remarks,
              name: this.dataForEdit.name,
            });

            this.displayModal = true;
          },
        });

      this.displayModal = true;
      this.changeDetector.detectChanges();
    } else {
      // Create Mode
      // this.defaulIntegrationform.get("isActive")?.setValue(true);
      // this.companyProfileform.value.isActive=true;
      this.editMode = false;
      this.fetchDropdownData("COALevel04");
      this.displayModal = true;
    }
  }

  save() {
    debugger;
    this.saving = true;

    this._hrmService
      .create({ ...this.defaulIntegrationform.value }, this.target)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        catchError((error) => {
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: error.error?.error?.message,
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
          this.getAll();
          this.saving = false;
          this.displayModal = false;
        },
      });
  }

  update() {
    this.saving = true;
    const updateData = {
      ...this.defaulIntegrationform.value,
      id: this.dataForEdit.id,
    };
    this._hrmService
      .update(updateData, this.target)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
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
            detail: "UpdatedSuccessfully",
            life: 2000,
          });
          this.getAll();
          this.saving = false;
          this.displayModal = false;
        },
      });
  }

  delete(id: number) {
    this.confirmationService.confirm({
      message: "Are you sure?",
      header: "Confirmation",
      icon: "pi pi-exclamation-triangle",
      rejectButtonStyleClass: "p-button-text",
      accept: () => {
        this._hrmService
          .delete(id, this.target)
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
              if (response) {
                this.msgService.add({
                  severity: "info",
                  summary: "Confirmed",
                  detail: "Deleted Successfully",
                  life: 2000,
                });
                this.getAll();
              }
            },
          });
      },
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.defaulIntegrationform.get(field);
    return control ? control.invalid && control.touched : false;
  }
  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }
  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.filters.chartOfAccountName = inputValue;
    this._hrmService.getAllRecord(this.target, this.filters).subscribe({
      next: (response) => {
        this.tableData = response.items;
        this.count = response.totalCount;
        this.changeDetector.detectChanges();
      },
    });
  }
  onPageChange(event: any) {
    this.maxCount = event.rows;
    this.currentPage = event.page + 1;
    this.skipCount = (this.currentPage - 1) * 10;
    this._hrmService
      .getAll(this.target, this.skipCount, this.maxCount)
      .subscribe({
        next: (response) => {
          this.tableData = response.items;
          this.count = response.totalCount;
          this.changeDetector.detectChanges();
        },
      });
  }

  fetchDropdownData(target) {
    this._hrmService.getAllSuggestion(target).subscribe((response: any) => {
      const mappedData = response.items.map((item: any) => ({
        id: item?.id,
        name: item?.name,
        additional: item?.additional,
      }));
      switch (target) {
        case "COALevel04":
          this.chartOfAccounts = mappedData;
          break;
        default:
          break;
      }
      this.changeDetector.detectChanges();
    });
  }
}
