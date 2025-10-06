import { ChangeDetectorRef, Component, Injector, OnInit } from "@angular/core";
import { MessageService, ConfirmationService } from "primeng/api";
import { catchError, finalize, throwError } from "rxjs";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { HrmService } from "../../shared/services/hrm.service";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
import { Table } from "primeng/table";
import * as moment from "moment";
import { validateHeaderName } from "http";
import { SalesService } from "@app/main/sales/shared/services/sales.service";

@Component({
  selector: "app-create-or-edit-employee",
  templateUrl: "./create-or-edit-employee.component.html",
  styleUrl: "./create-or-edit-employee.component.css",
})
export class CreateOrEditEmployeeComponent implements OnInit {
  editMode: boolean;
  displayModal: boolean;
  policyModel: boolean;
  selectedPolicy: string = "";
  selectedUser: string = "";
  policyOptions: { label: string; value: string }[] = [];
  usersOptions: { label: string; value: string }[] = [];
  target: string = "EmployeeManagement";
  tableData: any;
  designations: any;
  count: number;
  currentPage: number = 1;
  skipCount: number = 0;
  maxCount: number = 10;
  saving: boolean;
  showSupplierDetails = false;
  gridApi: any;
  setParms: any;
  rowSelection: string;
  dto = {
    name: "",
  };

  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    name: "",
    fatherName: "",
  };
  dataForEdit: any;
  employeeErpId: number;
  employeeIdForDropdown: number;
  employeeForm: FormGroup;
  loading: boolean;
  constructor(
    injector: Injector,
    private fb: FormBuilder,
    private _hrmService: HrmService,
    private _salesService: SalesService,
    private cdr: ChangeDetectorRef,
    private changeDetector: ChangeDetectorRef,
    private msgService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.employeeForm = this.fb.group({
      name: ["", [Validators.required]],
      fatherName: [""],
      cnic: [""],
      phoneNumber: [""],
      joiningDate: [""],
      dateOfBirth: [""],
      dailyWageRate: [{ value: "", disabled: false }],
      monthlySalary: [{ value: "", disabled: false }],
      employeeType: [""],
      commissionPolicyId: [""],
      designationId: [""],
      restDays: [[]],
      isActive: [""],
      userId: [""],
    });
    this.employeeForm.get("dailyWageRate")?.valueChanges.subscribe((value) => {
      if (value) {
        this.employeeForm.get("monthlySalary")?.disable();
      } else {
        this.employeeForm.get("monthlySalary")?.enable();
      }
    });
    this.employeeForm.get("monthlySalary")?.valueChanges.subscribe((value) => {
      if (value) {
        this.employeeForm.get("dailyWageRate")?.disable();
      } else {
        this.employeeForm.get("dailyWageRate")?.enable();
      }
    });
  }
  ngOnInit(): void {
    this.getAll();
  }

  employeeType = [
    { id: 1, name: "Daily Wages" },
    { id: 2, name: "Monthly" },
  ];
  commissionPolicyId = [
    { id: 1, name: "By Amount" },
    { id: 2, name: "By Percentage" },
    { id: 3, name: "By Slab" },
  ];
  weekDays = [
    { name: "Monday", id: 1 },
    { name: "Tuesday", id: 2 },
    { name: "Wednesday", id: 3 },
    { name: "Thursday", id: 4 },
    { name: "Friday", id: 5 },
    { name: "Saturday", id: 6 },
    { name: "Sunday", id: 0 },
  ];
  getAll() {
    this.loading = true;
    this._hrmService
      .getAll(this.target, this.skipCount, this.maxCount)
      .pipe(
        finalize(() => {
          setTimeout(() => {
            this.loading = false;
            this.cdr.detectChanges(); // fixes ExpressionChangedAfterItHasBeenCheckedError
          });
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
          console.log(response);
          this.tableData = response.items;
          this.count = response.totalCount;
        },
      });
  }

  show(id?: number) {
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
            // Fetch designations before setting values to ensure dropdown is populated
            this._hrmService
              .getAllSuggestion("Designation")
              .subscribe((designationResponse) => {
                this.designations = designationResponse.items;

                // Format the dates to 'yyyy-MM-dd'
                const formattedDateOfBirth = this.formatDateForInput(
                  this.dataForEdit.dateOfBirth
                );
                const formattedJoiningDate = this.formatDateForInput(
                  this.dataForEdit.joiningDate
                );

                this.employeeForm.patchValue({
                  name: this.dataForEdit.name,
                  fatherName: this.dataForEdit.fatherName,
                  phoneNumber: this.dataForEdit.phoneNumber,
                  designationId: this.dataForEdit.designationId, // Preselect ID
                  joiningDate: formattedJoiningDate,
                  dateOfBirth: formattedDateOfBirth,
                  monthlySalary: this.dataForEdit.monthlySalary,
                  dailyWageRate: this.dataForEdit.dailyWageRate,
                  cnic: this.dataForEdit.cnic,
                  employeeType: this.dataForEdit.employeeType,
                  isActive: this.dataForEdit.isActive,
                  restDays: this.dataForEdit.restDays || [],
                });

                console.log(this.employeeForm.value);
                this.displayModal = true;
              });

            this.displayModal = true;
            this.changeDetector.detectChanges();
          },
        });
    } else {
      // Create Mode
      this.editMode = false;

      this._hrmService
        .getAllSuggestion("Designation")
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
            this.designations = response.items;
            console.log(this.designations);

            this.employeeForm.reset();
            this.employeeForm.patchValue({
              isActive: true,
              restDays: [],
            });
            this.displayModal = true;
          },
        });
    }
  }

  formatDateForInput(dateString: string): string | null {
    if (!dateString) {
      return null;
    }
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  save() {
    this.saving = true;

    // this.employeeForm.patchValue({
    //   joiningDate: moment(this.employeeForm.value.joiningDate).format(
    //     "YYYY-MM-DD"
    //   ),
    //   dateOfBirth: moment(this.employeeForm.value.dateOfBirth).format(
    //     "YYYY-MM-DD"
    //   ),
    // });
    // if (!this.employeeForm.value.dailyWageRate) {
    //   this.employeeForm.patchValue({
    //     dailyWageRate: 0,
    //   });
    // }
    // if (!this.employeeForm.value.monthlySalary) {
    //   this.employeeForm.patchValue({
    //     monthlySalary: 0,
    //   });
    // }

    this._hrmService
      .create({ ...this.employeeForm.value }, this.target)
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
    this.employeeForm.patchValue({
      joiningDate: moment(this.employeeForm.value.joiningDate).format(
        "YYYY-MM-DD"
      ),
      dateOfBirth: moment(this.employeeForm.value.dateOfBirth).format(
        "YYYY-MM-DD"
      ),
    });
    if (!this.employeeForm.value.dailyWageRate) {
      this.employeeForm.patchValue({
        dailyWageRate: 0,
      });
    }
    if (!this.employeeForm.value.monthlySalary) {
      this.employeeForm.patchValue({
        monthlySalary: 0,
      });
    }
    const updateData = {
      ...this.employeeForm.value,
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
    const control = this.employeeForm.get(field);
    return control ? control.invalid && control.touched : false;
  }
  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }
  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.filters.fatherName = inputValue;
    this._hrmService.getAllRecord(this.target, this.filters).subscribe({
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

  //   policyModelShow(id: number) {
  //     this.selectedPolicy = null;
  //     this.selectedUser = null;
  //     this.employeeIdForDropdown = null;
  //     this.policyModel = true;
  //     this.employeeIdForDropdown = id;
  //     this._salesService
  //       .getAllRecord("CommissionPolicy")
  //       .pipe(
  //         finalize(() => {}),
  //         catchError((error) => {
  //
  //           this.msgService.add({
  //             severity: "error",
  //             summary: "Error",
  //             detail: error.error.error.message,
  //             life: 2000,
  //           });
  //           return throwError(error.error.error.message);
  //         })
  //       )
  //       .subscribe({
  //         next: (response) => {
  //
  //           this.policyOptions = response.items.map((item: any) => ({
  //             label: item.name, // replace `name` with your actual display field
  //             value: item.id, // replace `id` with your actual ID field
  //           }));
  //           this.cdr.detectChanges();
  //         },
  //       });
  //     this._salesService
  //       .getAllRecord("User")
  //       .pipe(
  //         finalize(() => {}),
  //         catchError((error) => {
  //
  //           this.msgService.add({
  //             severity: "error",
  //             summary: "Error",
  //             detail: error.error.error.message,
  //             life: 2000,
  //           });
  //           return throwError(error.error.error.message);
  //         })
  //       )
  //       .subscribe({
  //         next: (response) => {
  //
  // /*************  ✨ Windsurf Command ⭐  *************/
  //         /**
  //          * This function is called when the request to get all users is resolved.
  //          * It maps the response to a array of objects with label and value properties
  //          * and assigns it to the usersOptions variable.
  //          * It also calls change detection to update the UI.
  //          * @param response The response from the api.
  //          */
  // /*******  266f121e-05c9-4efe-a137-6a548d3a8b19  *******/          this.usersOptions = response.items.map((item: any) => ({
  //             label: item.name, // replace `name` with your actual display field
  //             value: item.id, // replace `id` with your actual ID field
  //           }));
  //           this.cdr.detectChanges();
  //         },
  //       });
  //   }

  policyModelShow(id: number) {
    this.selectedPolicy = null;
    this.selectedUser = null;
    this.employeeIdForDropdown = id;
    this.policyModel = true;

    const pagination = { skipCount: 0, maxCount: 1000 }; // fetch all users

    this._salesService
      .getAllRecord("CommissionPolicy", pagination)
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
          this.policyOptions = response.items.map((item: any) => ({
            label: item.name,
            value: item.id,
          }));
          this.cdr.detectChanges();
        },
      });

    this._salesService
      .getAllRecord("User", pagination)
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
          this.usersOptions = response.items.map((item: any) => ({
            label: item.name,
            value: item.id,
          }));
          this.cdr.detectChanges();
        },
      });
  }

  // userModelShow(id:number){
  //   this.policyModel = true;
  //   this._salesService
  //   .getAllRecord("User",this.filters)
  //   .pipe(
  //     finalize(() => {}),
  //     catchError((error) => {
  //
  //       this.msgService.add({
  //         severity: "error",
  //         summary: "Error",
  //         detail: error.error.error.message,
  //         life: 2000,
  //       });
  //       return throwError(error.error.error.message);
  //     })
  //   )
  //   .subscribe({
  //     next: (response) => {
  //
  //       this.usersOptions = response.items.map((item: any) => ({
  //         label: item.name,  // replace `name` with your actual display field
  //         value: item.id     // replace `id` with your actual ID field
  //       }));
  //       this.cdr.detectChanges();
  //     },
  //   });
  // }

  savePolicy() {
    if (!this.policyOptions) {
      return;
    }
    if (!this.selectedUser) {
      return;
    }
    let object = {
      policyId: this.selectedPolicy,
      UserId: this.selectedUser,
      employeeId: this.employeeIdForDropdown,
    };

    this._hrmService
      .savePolicy(object, "CommissionPolicy")
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
          this.saving = false;
          this.policyModel = false;
        },
      });
  }
}
