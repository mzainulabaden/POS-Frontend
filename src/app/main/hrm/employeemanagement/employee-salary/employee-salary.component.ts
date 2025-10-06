import { Component, Injector, OnInit } from "@angular/core";
import { MessageService, ConfirmationService } from "primeng/api";
import { catchError, finalize, throwError } from "rxjs";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { HrmService } from "../../shared/services/hrm.service";
import { ChangeDetectorRef } from "@angular/core";
import { Table } from "primeng/table";
import * as moment from "moment";
@Component({
  selector: "app-employee-salary",
  templateUrl: "./employee-salary.component.html",
  styleUrl: "./employee-salary.component.css",
})
export class EmployeeSalaryComponent implements OnInit {
  editMode: boolean;
  viewMode: boolean;
  displayModal: boolean;
  target: string = "EmployeeSalary";
  tableData: any;
  tableDataGenerateSalary: any;
  count: number;
  currentPage: number = 1;
  skipCount: number = 0;
  maxCount: number = 10;
  saving: boolean;
  dataForEdit: any;
  showSupplierDetails = false;
  vehicleForm: FormGroup;
  employeeErpId: number;
  loading: boolean;
  startDate: string;
  endDate: string;
  remarks: string;
  issueDate: string;
  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    name: "",
    voucherNumber: "",
  };

  employeeType = [
    { label: "Daily Wages", value: 1 },
    { label: "Monthly", value: 2 },
  ];
  selectedEmployeeType: string | null = null;
  constructor(
    private _rentalService: HrmService,
    private cdr: ChangeDetectorRef,
    private msgService: MessageService,
    private confirmationService: ConfirmationService
  ) {}
  ngOnInit(): void {
    this.getAll();
  }

  getAll() {
    this._rentalService
      .getAllSalaries(this.target, this.skipCount, this.maxCount)
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

  show(id?: number) {
    if (id) {
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
            this.startDate = moment(this.dataForEdit.startDate).format(
              "YYYY-MM-DD"
            );
            this.endDate = moment(this.dataForEdit.endDate).format(
              "YYYY-MM-DD"
            );
            this.issueDate = moment(this.dataForEdit.issueDate).format(
              "YYYY-MM-DD"
            );
            this.selectedEmployeeType = this.dataForEdit.employeeType || [];
            this.remarks = this.dataForEdit.remarks || "";
            this.tableDataGenerateSalary =
              this.dataForEdit.employeeSalaryDetails || [];
            this.displayModal = true;
            this.cdr.detectChanges();
          },
        });
    } else {
      this.editMode = false;
      this.viewMode = false;
      this.displayModal = true;
      this.selectedEmployeeType = null;
      this.startDate = null;
      this.endDate = null;
      this.issueDate = null;
      this.tableDataGenerateSalary = [];
    }
  }

  save() {
    this.saving = true;
    if (
      !this.issueDate ||
      !this.startDate ||
      !this.endDate ||
      !this.selectedEmployeeType
    ) {
      this.msgService.add({
        severity: "error",
        detail: "Please fill all required fields",
        life: 2000,
      });
      this.saving = false;
      return;
    }
    const payload = {
      issueDate: moment(this.issueDate).format("YYYY-MM-DD"),
      startDate: moment(this.startDate).format("YYYY-MM-DD"),
      endDate: moment(this.endDate).format("YYYY-MM-DD"),
      employeeType: this.selectedEmployeeType,
      employeeSalaryDetails: this.tableDataGenerateSalary,
    };
    this._rentalService
      .create(payload, this.target)
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
    const payload = {
      id: this.dataForEdit.id,
      issueDate: moment(this.issueDate).format("YYYY-MM-DD"),
      startDate: moment(this.startDate).format("YYYY-MM-DD"),
      endDate: moment(this.endDate).format("YYYY-MM-DD"),
      employeeType: this.selectedEmployeeType,
      employeeSalaryDetails: this.tableDataGenerateSalary,
    };
    this._rentalService
      .update(payload, this.target)
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
    this.loading = true;
    this.filters.voucherNumber = inputValue;
    this._rentalService.getAllRecord(this.target, this.filters).subscribe({
      next: (response) => {
        this.tableData = response.items;
        this.count = response.totalCount;

        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
  onPageChange(event: any) {
    this.maxCount = event.rows;
    this.currentPage = event.page + 1;
    this.loading = true;
    this.skipCount = (this.currentPage - 1) * 10;
    this._rentalService
      .getAllSalaries(this.target, this.skipCount, this.maxCount)
      .subscribe({
        next: (response) => {
          this.tableData = response.items;
          this.count = response.totalCount;
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }
  onSalaryPageChange(event: any) {
    this.maxCount = event.rows;
    this.currentPage = event.page + 1;
    this.loading = true;
    this.skipCount = (this.currentPage - 1) * 10;
    this._rentalService
      .getAllSalaries(this.target, this.skipCount, this.maxCount)
      .subscribe({
        next: (response) => {
          this.tableData = response.items;
          this.count = response.totalCount;
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }
  generateSalaries() {
    this._rentalService
      .generateEmployeeSalary(
        "EmployeeSalary",
        this.startDate,
        this.endDate,
        this.selectedEmployeeType
      )
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
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
          this.tableDataGenerateSalary = response.map((item) => ({
            employeeId: item.employeeId,
            employeeName: item.employeeName,
            attendanceDays: item.attendanceDays,
            dailyWageRate: item.dailyWageRate,
            netPayable: item.netPayable,
            payableDays: item.payableDays,
            restDays: item.restDays,
            gazettedHolidays: item.gazettedHolidays,
            leaveDays: item.leaveDays,
          }));
          this.cdr.detectChanges();
        },
      });
  }
  onIssueDateChange(newDate: string) {
    this.issueDate = newDate;
    localStorage.setItem("issueDate", this.issueDate);
    this.getAll();
  }
  approve(id) {
    this.confirmationService.confirm({
      message: "Are you sure?",
      header: "Confirmation",
      icon: "pi pi-exclamation-triangle",
      rejectButtonStyleClass: "p-button-text",
      accept: () => {
        this._rentalService
          .Approve(id, this.target)
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
                  detail: "Approved Successfully",
                  life: 2000,
                });
                this.getAll();
              }
            },
          });
      },
    });
  }
  edit(id: number) {
    this.editMode = true;
    this.viewMode = false;
    this.show(id);
  }
  viewOnly(id: number) {
    this.viewMode = true;
    this.editMode = false;
    this.show(id);
  }
}
