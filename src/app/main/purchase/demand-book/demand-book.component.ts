import { ChangeDetectorRef, Component } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { PurchaseService } from "../shared/services/purchase.service";
import { MessageService, ConfirmationService } from "primeng/api";
import { catchError, finalize, throwError } from "rxjs";
import { Table } from "primeng/table";

import { MainSetupsService } from "@app/main/main-setups/shared/services/main-setups.service";
import { ProductSearchEditorComponent } from "@app/main/search-component/product-search-editor.component";

@Component({
  selector: "app-demand-book",
  templateUrl: "./demand-book.component.html",
  styleUrl: "./demand-book.component.css",
})
export class DemandBookComponent {
  displayModal: boolean;
  currentDate: Date = new Date();
  loading: boolean;
  saving: boolean;
  count: number;
  editMode: boolean;
  DemandBookForm: FormGroup;

  viewMode: boolean;
  currentPage: number = 1;
  item: { id: any; name: string }[] = [];
  wareHouse: { id: any; name: string }[] = [];
  tableData: any;
  baseurl: string = "http://173.249.23.108:6063";
  rowCount: number;
  skipCount: number = 0;
  maxCount: number = 10;
  target: string = "DemandBook";
  dataForEdit: any;
  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    itemName: "",
    warehouseName: "",
  };
  frameworkComponents = {
    productSearchEditor: ProductSearchEditorComponent,
  };

  constructor(
    private fb: FormBuilder,
    private _hrmService: PurchaseService,
    private _mainSetupService: MainSetupsService,
    private cdr: ChangeDetectorRef,
    private msgService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.DemandBookForm = this.fb.group({
      warehouseId: "",
      itemId: "",
    });
  }

  ngOnInit(): void {
    this.getAll();
    this.fetchDropdownData("Item");
    this.fetchDropdownData("Warehouse");
    // this.prSetupCalculations();
  }

  getAll() {
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
          this.tableData = response.items;
          this.count = response.totalCount;
          this.cdr.detectChanges();
        },
      });
  }

  save() {
    this.saving = true;

    if (!this.DemandBookForm.valid) {
      this.msgService.add({
        severity: "error",
        detail: "Please fill all Required fields",
        life: 2000,
      });
      this.saving = false;
      return;
    }

    // Reset to force SrNo recalculation
    this.DemandBookForm.patchValue({});
    this._hrmService
      .create({ ...this.DemandBookForm.value }, this.target)
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

  show(id?: number) {
    if (id) {
      // Edit Mode
      this._hrmService
        .getData(id, this.target)
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
            this.DemandBookForm.patchValue({
              warehouseId: this.dataForEdit.warehouseId,
              itemId: this.dataForEdit.itemId,
            });
            this.displayModal = true;

            this.cdr.detectChanges();
          },
        });
    } else {
      // Create Mode
      this.editMode = false;
      this.viewMode = false;
      this.DemandBookForm.reset();
      this.DemandBookForm.enable();
      this.displayModal = true;
    }
  }
  edit(id: any) {
    this.editMode = true;
    this.viewMode = false;
    this.show(id);
    this.DemandBookForm.enable();
  }
  update() {
    this.saving = true;

    const updateData = {
      ...this.DemandBookForm.value,
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

  viewOnly(id: any) {
    this.viewMode = true;
    this.show(id);
    this.DemandBookForm.disable();
  }
  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  onPageChange(event: any) {
    this.maxCount = event.rows;
    this.currentPage = event.page + 1;
    this.loading = true;
    this.skipCount = (this.currentPage - 1) * 10;
    this._hrmService
      .getAll(this.target, this.skipCount, this.maxCount)
      .subscribe({
        next: (response) => {
          this.tableData = response.items;
          this.count = response.totalCount;
          this.loading = false;
          this.cdr.detectChanges();
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
        case "Warehouse":
          this.wareHouse = mappedData;
          break;
        case "Item":
          this.item = mappedData;
          break;
        default:
          break;
      }
      this.cdr.detectChanges();
    });
  }

  isFieldInvalid(field: string): any {
    // const control = this.vehicleForm.get(field);
    // return control ? control.invalid && control.touched : false;
  }

  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.loading = true;
    this.filters.itemName = inputValue;
    this.filters.warehouseName = inputValue;
    this._hrmService.getAllRecord(this.target, this.filters).subscribe({
      next: (response) => {
        this.tableData = response.items;
        this.count = response.totalCount;

        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
