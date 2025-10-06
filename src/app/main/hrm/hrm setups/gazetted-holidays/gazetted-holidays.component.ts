import { Component, Injector, OnInit } from "@angular/core";
import { MessageService, ConfirmationService } from "primeng/api";
import { catchError, finalize, throwError } from "rxjs";
import { HrmService } from "../../shared/services/hrm.service";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Table } from "primeng/table";
import { ChangeDetectorRef } from "@angular/core";
import * as moment from "moment";

@Component({
  selector: "app-gazetted-holidays",
  templateUrl: "./gazetted-holidays.component.html",
})
export class GazettedHolidaysComponent implements OnInit {
  editMode: boolean;
  displayModal: boolean;
  target: string = "GazettedHoliday";
  tableData: any;
  count: number;
  currentPage: number = 1;
  skipCount: number = 0;
  maxCount: number = 10;
  saving: boolean;
  showSupplierDetails = false;
  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    name: "",
    description: "",
  };
  dataForEdit: any;
  employeeErpId: number;
  vehicleForm: FormGroup;
  loading: boolean;
  constructor(
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private _rentalService: HrmService,
    private msgService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.vehicleForm = this.fb.group({
      eventStartDate: ["", Validators.required],
      eventEndDate: ["", Validators.required],
      name: ["", [Validators.required]],
      isRecurring: ["true"],
      description: "",
    });
  }
  ngOnInit(): void {
    this.getAll();
  }

  getAll() {
    this.loading = true;
    this._rentalService
      .getAll(this.target)
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
    this.loading = false;
  }
  show(id?: number) {
    if (id) {
      this.editMode = true;
      this._rentalService
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
            this.vehicleForm.patchValue({
              name: this.dataForEdit.name,
              eventStartDate: this.dataForEdit.eventStartDate
                ? new Date(this.dataForEdit.eventStartDate)
                : null,
              eventEndDate: this.dataForEdit.eventEndDate
                ? new Date(this.dataForEdit.eventEndDate)
                : null,
              description: this.dataForEdit.description,
              isRecurring: this.dataForEdit.isRecurring,
            });
            this.displayModal = true;
            this.cdr.detectChanges();
          },
        });
    } else {
      this.editMode = false;
      this.displayModal = true;
      this.vehicleForm.reset();
      this.vehicleForm.get("isRecurring").setValue(true);
    }
  }

  save() {
    this.saving = true;
    if (!this.vehicleForm.valid) {
      this.msgService.add({
        severity: "error",
        detail: "Please fill all Required fields",
        life: 2000,
      });
      this.saving = false;
      return;
    }
    const formData = { ...this.vehicleForm.value };
    if (formData.eventStartDate) {
      formData.eventStartDate = moment(formData.eventStartDate).format(
        "YYYY-MM-DD"
      );
    }
    if (formData.eventEndDate) {
      formData.eventEndDate = moment(formData.eventEndDate).format(
        "YYYY-MM-DD"
      );
    }
    this._rentalService
      .create(formData, this.target)
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
      ...this.vehicleForm.value,
      id: this.dataForEdit.id,
    };
    if (updateData.eventStartDate) {
      updateData.eventStartDate = moment(updateData.eventStartDate).format(
        "YYYY-MM-DD"
      );
    }
    if (updateData.eventEndDate) {
      updateData.eventEndDate = moment(updateData.eventEndDate).format(
        "YYYY-MM-DD"
      );
    }
    this._rentalService
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
        this._rentalService
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
    const control = this.vehicleForm.get(field);
    return control ? control.invalid && control.touched : false;
  }
  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }
  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.filters.description = inputValue;
    this._rentalService.getAllRecord(this.target, this.filters).subscribe({
      next: (response) => {
        this.tableData = response.items;
        this.count = response.totalCount;
        this.cdr.detectChanges();
      },
    });
  }
  onPageChange(event: any) {
    this.maxCount = event.rows;
    this.currentPage = event.page + 1;
    this.skipCount = (this.currentPage - 1) * 10;
    this._rentalService
      .getAll(this.target, this.skipCount, this.maxCount)
      .subscribe({
        next: (response) => {
          this.tableData = response.items;
          this.count = response.totalCount;
        },
      });
  }
}
