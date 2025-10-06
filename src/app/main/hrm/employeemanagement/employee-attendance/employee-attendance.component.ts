import { Component, Injector, OnInit } from "@angular/core";
import { MessageService, ConfirmationService } from "primeng/api";
import { catchError, finalize, throwError } from "rxjs";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { HrmService } from "../../shared/services/hrm.service";
import { Table } from "primeng/table";
import * as moment from "moment";
import type { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
import { ChangeDetectorRef } from "@angular/core";

@Component({
  selector: "app-employee-attendance",
  templateUrl: "./employee-attendance.component.html",
  styleUrl: "./employee-attendance.component.css",
})
export class EmployeeAttendanceComponent implements OnInit {
  editMode: boolean;
  displayModal: boolean;
  displayFilterModal: boolean;
  target: string = "AttendanceManagement";
  tableData: any[] = [];
  count: number;
  today: Date = new Date();
  currentPage: number = 1;
  skipCount: number = 0;
  maxCount: number = 10;
  saving: boolean;
  baseUrl: string = "http://173.249.23.108:6063";
  showSupplierDetails = false;
  dto = {
    name: "",
  };
  dataForEdit: any;
  employeeErpId: number;
  vehicleForm: FormGroup;
  loading: boolean;
  rowSelection: string;
  protected gridApi: GridApi;
  protected setParms;
  rowCount: number;
  pStartDate: string;
  pEndDate: string;
  aStartDate: string;
  aEndDate: string;
  fStartDate: string;
  fEndDate: string;
  employeeId: number;

  employees: { id: number; name: string }[] = [];
  constructor(
    injector: Injector,
    private fb: FormBuilder,
    private _hrmService: HrmService,
    private msgService: MessageService,
    private cdr: ChangeDetectorRef,
    private confirmationService: ConfirmationService
  ) {
    this.vehicleForm = this.fb.group({
      employeeIds: [[], Validators.required],
      checkIn_Time: [""],
      checkOut_Time: [""],
      attendanceDate: [null, [Validators.required]],
      isActive: [""],
    });
  }
  ngOnInit(): void {
    this.setDefaultTimes();
  }

  fetchEmployee() {
    this._hrmService.getAllSuggestion("Employee").subscribe(
      (response: any) => {
        this.employees = response.items.map((employee: any) => ({
          id: employee?.id,
          name: employee?.name,
        }));
      },
      (error) => {
        this.msgService.add({
          severity: "error",
          summary: "Error",
          detail: error.error.error.message,
          life: 2000,
        });
        return throwError(error.error.error.message);
      }
    );
  }

  // colDefs: ColDef[] = [
  //   {
  //     headerName: "SrNo",
  //     editable: false,
  //     field: "srNo",
  //     sortable: true,
  //     width: 90,
  //     valueGetter: "node.rowIndex+1",
  //     suppressSizeToFit: true,
  //   },
  //   {
  //     headerName: "Vehicle Id",
  //     editable: false,
  //     field: "vehicleId",
  //     resizable: true,
  //     width: 120,
  //     suppressSizeToFit: true,
  //   },
  //   {
  //     headerName: "Vehicle Title",
  //     editable: false,
  //     field: "vehicleName",
  //     resizable: true,
  //     width: 200,
  //     suppressSizeToFit: true,
  //   },
  // ];
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  show(id?: number) {
    if (id) {
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
            this.vehicleForm
              .get("attendanceDate")
              .setValue(new Date(this.dataForEdit.attendanceDate));
            this.vehicleForm
              .get("employeeId")
              .setValue(this.dataForEdit.employeeId);
            this.vehicleForm
              .get("checkInTime")
              .setValue(this.dataForEdit.checkInTime);
            this.vehicleForm
              .get("checkOutTime")
              .setValue(this.dataForEdit.checkOutTime);
            this.vehicleForm
              .get("isActive")
              .setValue(this.dataForEdit.isActive);
            this.displayModal = true;
          },
        });
    } else {
      this.editMode = false;
      this.displayModal = true;
      this.vehicleForm.reset();
      this.vehicleForm.get("attendanceDate").setValue(this.today);
      this.vehicleForm.get("isActive").setValue(true);
      this.setDefaultTimes();
      this.fetchEmployee();
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
    this.vehicleForm.patchValue({
      attendanceDate: moment(this.vehicleForm.value.attendanceDate).format(
        "YYYY-MM-DD"
      ),
      checkIn_Time: moment(this.vehicleForm.value.checkIn_Time).format(
        "YYYY-MM-DD hh:mm A"
      ),
      checkOut_Time: moment(this.vehicleForm.value.checkOut_Time).format(
        "YYYY-MM-DD hh:mm A"
      ),
    });
    this._hrmService
      .submitAttendance(this.vehicleForm.value, this.target)
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
          // this.getAll();
          this.fetchEmployee();
          this.saving = false;
          this.displayModal = false;
        },
      });
  }

  update() {
    this.saving = true;
    this.vehicleForm.patchValue({
      attendanceDate: moment(this.vehicleForm.value.attendanceDate).format(
        "YYYY-MM-DD"
      ),
    });
    const updateData = {
      ...this.vehicleForm.value,
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
          // this.getAll();
          this.saving = false;
          this.displayModal = false;
        },
      });
  }

  setDefaultTimes() {
    const today = new Date();
    this.vehicleForm
      .get("checkInTime")
      ?.setValue(new Date(today.setHours(9, 0, 0, 0)));
    this.vehicleForm
      .get("checkOutTime")
      ?.setValue(new Date(today.setHours(20, 0, 0, 0)));
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
                // this.getAll();
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

  searchAbsentEmployee() {
    this.loading = true;
    this._hrmService
      .getAllAbsentEmployees(this.target, this.aStartDate, this.aEndDate)
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
          this.tableData = response.items.map((item) => ({
            employeeId: item.employeeId,
            name: item.name,
            absenteesCount: item.absenteesCount,
            absenteesDates: item.absenteesDates.join(", "), // Convert dates array to a string
            dataType: "absent", // Mark as absent data
          }));
          this.count = response.items.length;
          this.cdr.detectChanges();
        },
      });
  }

  searchPresentEmployee() {
    this.loading = true;
    this._hrmService
      .getAllPresentEmployees(this.target, this.pStartDate, this.pEndDate)
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
          this.tableData = response.items.map((item) => ({
            employeeId: item.employeeId,
            name: item.employeeName,
            checkIn_Time: item.checkIn_Time,
            checkOut_Time: item.checkOut_Time,
            attendanceDate: item.attendanceDate,
            dataType: "present", // Mark as present data
          }));
          this.count = response.items.length;
          this.cdr.detectChanges();
        },
      });
  }

  openFilterModel() {
    this.displayFilterModal = true;
    this.fetchEmployee();
  }

  downloadReports() {
    this._hrmService
      .attendanceReport("AttendanceReporting", this.fStartDate, this.fEndDate)
      .subscribe((response: any) => {
        if (response && response.success && response.result) {
          const fileUrl = `${this.baseUrl}/${response.result}`;
          window.open(fileUrl, "_blank"); // Open in new tab
        } else {
          console.error("Failed to download the report.");
        }
      });
    this.displayFilterModal = false;
  }

  // onPageChange(event: any) {
  //
  //   this.maxCount = event.rows;
  //   this.currentPage = event.page + 1;
  //   this.loading = true;
  //   this.skipCount = (this.currentPage - 1) * 10;
  //   this._hrmService
  //     .getAll(this.target, this.skipCount, this.maxCount)
  //     .subscribe({
  //       next: (response) => {
  //

  //         this.tableData = response.items;
  //         this.count = response.totalCount;

  //         this.loading = false;
  //       },
  //     });
  // }
}
