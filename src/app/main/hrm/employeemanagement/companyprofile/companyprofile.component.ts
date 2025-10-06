import { ChangeDetectorRef, Component, Injector, OnInit } from "@angular/core";
import { MessageService, ConfirmationService } from "primeng/api";
import { catchError, finalize, throwError } from "rxjs";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { HrmService } from "../../shared/services/hrm.service";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
import { Table } from "primeng/table";
import * as moment from "moment";
import { newBaseUrl } from "../../../../../shared/AppBaseUrl/appBaseURL";

@Component({
  selector: "app-companyprofile",
  templateUrl: "./companyprofile.component.html",
  styleUrl: "./companyprofile.component.css",
})
export class CompanyprofileComponent {
  editMode: boolean;
  displayModal: boolean;
  target: string = "CompanyProfile";
  previewUrl: string | ArrayBuffer | null = null;
  selectedFile: File | null = null;
  base64Image: string = "";
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
  baseURl: string;

  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    name: "",
    VoucherNumber: "",
  };
  dataForEdit: any;
  companyProfileform: FormGroup;
  loading: boolean;
  constructor(
    injector: Injector,
    private fb: FormBuilder,
    private _hrmService: HrmService,
    private changeDetector: ChangeDetectorRef,
    private msgService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.companyProfileform = this.fb.group({
      name: ["", [Validators.required]],
      logo: [""],
      ntn: [""],
      phoneNumber: [""],
      email: [""],
      address: [""],
    });
  }
  ngOnInit(): void {
    this.getAll();
    this.baseURl = newBaseUrl;
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
          console.log(response);
          this.tableData = response.items;
          this.count = response.totalCount;
          this.changeDetector.detectChanges();
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

                this.companyProfileform.patchValue({
                  name: this.dataForEdit.name,
                  logo: this.dataForEdit.logo,
                  ntn: this.dataForEdit.ntn,
                  phoneNumber: this.dataForEdit.phoneNumber,
                  email: this.dataForEdit.email,
                  address: this.dataForEdit.address,
                });

                console.log(this.companyProfileform.value);
                this.displayModal = true;
                this.previewUrl = this.baseURl + this.dataForEdit.logo;
              });

            this.displayModal = true;
            this.changeDetector.detectChanges();
          },
        });
    } else {
      // Create Mode
      // this.companyProfileform.get("isActive")?.setValue(true);
      // this.companyProfileform.value.isActive=true;
      this.editMode = false;
      this.companyProfileform.reset();
      this.previewUrl = null;
      this.displayModal = true;
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

    const payload = {
      ...this.companyProfileform.value,
    };
    this._hrmService
      .create(payload, this.target)
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
      ...this.companyProfileform.value,
      id: this.dataForEdit.id,
    };
    debugger;
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
    const control = this.companyProfileform.get(field);
    return control ? control.invalid && control.touched : false;
  }
  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }
  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.loading = true;
    this.filters.VoucherNumber = inputValue;
    this._hrmService.getAllRecord(this.target, this.filters).subscribe({
      next: (response) => {
        this.tableData = response.items;
        this.count = response.totalCount;

        this.loading = false;
        this.changeDetector.detectChanges();
      },
    });
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
          this.changeDetector.detectChanges();
        },
      });
  }

  // onFileSelected(event: Event) {
  //   const file = (event.target as HTMLInputElement).files?.[0];
  //   if (file) {
  //     this.selectedFile = file;
  //     const reader = new FileReader();
  //     reader.onload = () => {
  //       this.previewUrl = reader.result;
  //     };
  //     reader.readAsDataURL(file); // for preview only  }}
  //   }
  // }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = (reader.result as string).split(",")[1];
        const payload = { base64Images: [base64Data] };

        this._hrmService.UploadImage(payload).subscribe({
          next: (res: any) => {
            const imagePath = res.result?.imagePaths?.[0];
            debugger;
            if (imagePath) {
              debugger;
              this.companyProfileform.patchValue({ logo: imagePath });
              this.previewUrl = this.baseURl + imagePath;
            }
          },
          error: () => {
            this.msgService.add({
              severity: "error",
              summary: "Image Upload Failed",
              detail: "Could not upload image",
              life: 2000,
            });
          },
        });
      };
      reader.readAsDataURL(file);
    }
  }
}
