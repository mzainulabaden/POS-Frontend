import { Component, Injector, OnInit } from "@angular/core";
import { ConfirmationService, MessageService } from "primeng/api";
import { catchError, finalize, throwError } from "rxjs";
import { UrlHelper } from "@shared/helpers/UrlHelper";
import { Table } from "@node_modules/primeng/table";
import { HrmService } from "../../hrm/shared/services/hrm.service";
import { ProductSearchEditorComponent } from "../../search-component/product-search-editor.component";
import { ChangeDetectorRef } from "@angular/core";
import { FinanceService } from "../Service/finance.service";
import * as moment from "moment";

import {
  FormBuilder,
  FormGroup,
  Validators,
} from "@node_modules/@angular/forms";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
@Component({
  selector: "app-journal-voucher",
  templateUrl: "./journal-voucher.component.html",
  styleUrl: "./journal-voucher.component.css",
})
export class JournalVoucherComponent {
  journalVoucherForm: FormGroup;
  target: string = "JournalVoucher";
  loading: boolean;
  GridApi: GridApi;
  protected gridApi: GridApi;
  protected setParms;
  today: Date = new Date();
  rowSelection: string;
  tableData: any;
  rowData: any;
  rowCount: number;
  saving: boolean;
  currentPage: number = 1;
  skipCount: number = 0;
  maxCount: number = 10;
  editMode: boolean;
  viewMode: boolean;
  displayModal: boolean;
  showAmount = false;
  showPercentage = false;
  showGrid = false;
  dataForEdit: any;
  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    name: "",
    VoucherNumber: "",
  };
  coaLvl4: { id: any; name: string }[] = [];
  count: number;

  frameworkComponents = {
    productSearchEditor: ProductSearchEditorComponent,
  };

  constructor(
    injector: Injector,
    private cdr: ChangeDetectorRef,
    private _financeService: FinanceService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder,
    private _hrmService: HrmService
  ) {
    this.journalVoucherForm = this.fb.group({
      voucherNumber: [""],
      issueDate: [new Date(), [Validators.required]], // Set today's date correctly
      remarks: "",
      journalVoucherDetails: [],
    });
  }
  colDefs: ColDef[] = [
    {
      headerName: "Sr No",
      editable: false,
      field: "srNo",
      sortable: true,
      width: 90,
      valueGetter: "node.rowIndex+1",
      suppressSizeToFit: true,
    },
    {
      headerName: "Party",
      field: "coAlvl4Id",
      cellEditor: "productSearchEditor",
      cellEditorParams: () => ({
        valuesRaw: this.coaLvl4,
      }),
      valueGetter: (params) => {
        console.log("valueGetter params.data:", params.data);
        const item = this.coaLvl4.find((i) => i.id === params.data.coAlvl4Id);
        console.log(item);
        return item ? item.name : "";
      },
      valueSetter: (params) => {
        const item = this.coaLvl4.find((i) => i.id === params.data.coAlvl4Id);
        const selected = this.coaLvl4.find((i) => i.id === params.newValue);
        if (selected) {
          params.data.coAlvl4Id = selected.id;
          return true;
        }
        return false;
      },
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Credit",
      field: "credit",
      editable: true,
      resizable: true,
      width: 120,
      valueSetter: (params) => {
        const value = parseFloat(params.newValue);
        params.data.credit = isNaN(value) ? 0 : value;
        return true;
      },
    },
    {
      headerName: "Debit",
      field: "debit",
      editable: true,
      resizable: true,
      width: 120,
      valueSetter: (params) => {
        const value = parseFloat(params.newValue);
        params.data.debit = isNaN(value) ? 0 : value;
        return true;
      },
    },

    {
      headerName: "Remarks",
      field: "remarks",
      editable: true,
      resizable: true,
      width: 150,
    },
  ];

  ngOnInit() {
    this.getAllData();
    this.fetchDropdownData("COALevel04");
  }

  getSuppliersAndClients() {
    this._hrmService.getAllSuppliersAndClients().subscribe((response: any) => {
      this.coaLvl4 = response.items.map((x: any) => ({
        id: x.id,
        name: x.name,
      }));
      this.cdr.detectChanges();
    });
  }

  fetchDropdownData(target) {
    this._financeService.getAllSuggestion(target).subscribe((response: any) => {
      const mappedData = response.items.map((item: any) => ({
        id: item?.id,
        name: item?.name,
      }));
      switch (target) {
        case "COALevel04":
          this.coaLvl4 = mappedData;
          break;
        default:
          break;
      }
      this.cdr.detectChanges();
    });
  }

  updateVisibility(value: number) {
    this.showAmount = value === 1;
    this.showPercentage = value === 2;
    this.showGrid = value === 3;
  }

  getVoucherNumber() {
    this._financeService
      .getVoucherNumber(
        "JV",
        this.journalVoucherForm.value.issueDate,
        this.target
      )
      .pipe(
        finalize(() => {}),
        catchError((error) => {
          this.messageService.add({
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
          if (this.journalVoucherForm.value.issueDate) {
            this.journalVoucherForm.get("voucherNumber").setValue(response);
          }
        },
        error: (err) => {
          console.log("An error occurred", err);
        },
      });
  }

  getTodayDate(): Date {
    return new Date(); // Return current date
  }

  isFieldInvalid(field: string): any {
    const control = this.journalVoucherForm.get(field);
    return control ? control.invalid && control.touched : false;
  }

  onDateChange(value?: any) {
    if (value) {
      this.journalVoucherForm.value.issueDate = value;
    }
    if (this.journalVoucherForm.value.issueDate) {
      this.getVoucherNumber();
    }
  }

  getAllData() {
    this.loading = true;
    this._financeService
      .getAllData(this.target, this.skipCount, this.maxCount)
      .pipe(
        finalize(() => {}),
        catchError((error) => {
          this.messageService.add({
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
      // Edit Mode
      this._financeService
        .getForEditData(id, this.target)
        .pipe(
          finalize(() => {}),
          catchError((error) => {
            this.messageService.add({
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
            this.journalVoucherForm.patchValue({
              id: this.dataForEdit.id,
              voucherNumber: this.dataForEdit.voucherNumber,
              issueDate: new Date(this.dataForEdit.issueDate),
              remarks: this.dataForEdit.remarks,
              credit: this.dataForEdit.credit,
              debit: this.dataForEdit.debit,
              coaLevel04Id: this.dataForEdit.coaLevel04Id,
              journalVoucherDetails:
                this.dataForEdit.journalVoucherDetails || [],
            });
            this.rowData = this.dataForEdit.journalVoucherDetails;

            this.rowData = response.journalVoucherDetails || [];
            if (this.gridApi) {
              this.gridApi.setRowData(this.rowData);
            }
            this.displayModal = true;
            this.cdr.detectChanges();
          },
        });
    } else {
      this.editMode = false;
      this.viewMode = false;
      this.journalVoucherForm.reset();
      this.journalVoucherForm.enable();
      this.rowData = [];
      this.displayModal = true;

      this.journalVoucherForm.value.issueDate = moment(
        this.getTodayDate(),
        "MM/DD/YYYY"
      ).toDate();
      this.getVoucherNumber();
      this.journalVoucherForm.patchValue({
        issueDate: this.today,
      });
    }
  }

  validateCreditEqualsDebit(): boolean {
    const details = this.journalVoucherForm.value.journalVoucherDetails;
    if (!details || !Array.isArray(details)) return false;

    const totalCredit = details.reduce(
      (sum, item) => sum + (parseFloat(item.credit) || 0),
      0
    );
    const totalDebit = details.reduce(
      (sum, item) => sum + (parseFloat(item.debit) || 0),
      0
    );

    // Fix floating-point issues by rounding to 2 decimal places
    const creditRounded = Math.round(totalCredit * 100) / 100;
    const debitRounded = Math.round(totalDebit * 100) / 100;

    return creditRounded === debitRounded;
  }

  save() {
    this.saving = true;
    this.rowData = [];
    if (this.gridApi) {
      this.gridApi.forEachNodeAfterFilterAndSort((node) => {
        node.data.credit = node.data.credit || 0;
        node.data.debit = node.data.debit || 0;
        this.rowData.unshift(node.data);
      });
    }
    if (!this.journalVoucherForm.valid) {
      this.messageService.add({
        severity: "error",
        detail: "Please fill all Required fields",
        life: 2000,
      });
      this.saving = false;
      return;
    }

    // ✅ First get fresh data from the grid
    this.rowData = [];
    this.gridApi.forEachNode((node) => {
      this.rowData.push({
        ...node.data,
        id: 0,
      });
    });

    // ✅ Then update form before validation
    this.journalVoucherForm.patchValue({
      journalVoucherDetails: this.rowData,
    });

    // ✅ Now validate on the correct data
    if (!this.validateCreditEqualsDebit()) {
      this.messageService.add({
        severity: "error",
        summary: "Error",
        detail: "Total Credit and Debit must be equal",
        life: 2000,
      });
      this.saving = false;
      return;
    }

    // Continue with date formatting and API call
    this.journalVoucherForm.patchValue({
      issueDate: moment(this.journalVoucherForm.value.issueDate).format(
        "YYYY-MM-DD"
      ),
    });

    this._financeService
      .create({ ...this.journalVoucherForm.value }, this.target)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        catchError((error) => {
          this.messageService.add({
            severity: "error",
            summary: "Error",
            detail: error.error.error.message,
            life: 2000,
          });
          return throwError(error.error.error.message);
        })
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: "success",
            summary: "Confirmed",
            detail: "SavedSuccessfully",
            life: 2000,
          });
          this.getAllData();
          this.displayModal = false;
        },
      });
  }

  update() {
    this.saving = true;
    this.rowData = [];
    this.gridApi.forEachNode((node) => {
      this.rowData.push({
        ...node.data,
        id: 0,
      });
    });
    this.journalVoucherForm.patchValue({
      journalVoucherDetails: this.rowData,
      issueDate: moment(this.journalVoucherForm.value.issueDate).format(
        "YYYY-MM-DD"
      ),
    });
    const updateData = {
      ...this.journalVoucherForm.value,
      id: this.dataForEdit.id,
    };
    this._financeService
      .updateEdit(updateData, this.target)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        catchError((error) => {
          this.messageService.add({
            severity: "error",
            summary: "Error",
            detail: error.message,
            life: 2000,
          });
          return throwError(error.message);
        })
      )
      .subscribe({
        next: (response) => {
          this.messageService.add({
            severity: "success",
            summary: "Confirmed",
            detail: "UpdatedSuccessfully",
            life: 2000,
          });
          this.getAllData();
          this.saving = false;
          this.displayModal = false;
        },
      });
  }
  // update() {
  //   this.saving = true;

  //   // Ensure journalVoucherDetails are assigned from rowData
  //   this.journalVoucherForm.get('journalVoucherDetails')?.setValue(this.rowData);

  //   console.log('Payload being sent:', this.journalVoucherForm.value); // Debug log

  //   this._financeService
  //     .update({ ...this.journalVoucherForm.value }, this.target)
  //     .pipe(
  //       finalize(() => {
  //         this.saving = false;
  //       }),
  //       catchError((error) => {
  //         this.messageService.add({
  //           severity: "error",
  //           summary: "Error",
  //           detail: error.message,
  //           life: 2000,
  //         });
  //         return throwError(error.message);
  //       })
  //     )
  //     .subscribe({
  //       next: (response) => {
  //         this.messageService.add({
  //           severity: "success",
  //           summary: "Confirmed",
  //           detail: "Updated Successfully",
  //           life: 2000,
  //         });
  //         this.getAllData();
  //         this.displayModal = false;
  //       },
  //     });
  // }

  delete(id: number) {
    this.confirmationService.confirm({
      message: "Are you sure?",
      header: "Confirmation",
      icon: "pi pi-exclamation-triangle",
      rejectButtonStyleClass: "p-button-text",
      accept: () => {
        this._financeService
          .delete(id, this.target)
          .pipe(
            finalize(() => {}),
            catchError((error) => {
              this.messageService.add({
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
                this.messageService.add({
                  severity: "info",
                  summary: "Confirmed",
                  detail: "Deleted Successfully",
                  life: 2000,
                });
                this.getAllData();
              }
            },
          });
      },
    });
  }
  onPageChange(event: any) {
    this.maxCount = event.rows;
    this.currentPage = event.page + 1;
    this.loading = true;
    this.skipCount = (this.currentPage - 1) * 10;
    this._financeService.getAll(this.target, this.filters).subscribe({
      next: (response) => {
        this.tableData = response.items;
        this.count = response.totalCount;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
  onAddRow() {
    const newItem: Record<string, any> = {};
    this.colDefs.forEach((colDef) => {
      if (colDef.field) {
        newItem[colDef.field] = null;
      }
    });
    this.gridApi.applyTransaction({ add: [newItem] });
    this.rowCount = this.gridApi.getDisplayedRowCount();
  }
  onRemoveSelected() {
    const selectedNodes = this.gridApi.getSelectedNodes();
    if (selectedNodes.length > 0) {
      const dataToRemove = selectedNodes.map((node) => node.data);
      this.gridApi.applyTransaction({ remove: dataToRemove });
      this.rowData = [];
      this.gridApi.forEachNode((node) => this.rowData.push(node.data));
    }
  }
  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.rowData = [];
    this.rowSelection = "multiple";
  }
  onCellValueChanged(params) {}

  edit(id: any) {
    this.editMode = true;
    this.viewMode = false;
    this.show(id);
    this.journalVoucherForm.enable();
  }

  viewOnly(id: any) {
    this.viewMode = true;
    this.displayModal = true;
    this.editMode = false;
    this.show(id);
    this.journalVoucherForm.disable();
  }

  approve(id) {
    this.confirmationService.confirm({
      message: "Are you sure?",
      header: "Confirmation",
      icon: "pi pi-exclamation-triangle",
      rejectButtonStyleClass: "p-button-text",
      accept: () => {
        this._financeService
          .Approve(id, this.target)
          .pipe(
            finalize(() => {}),
            catchError((error) => {
              this.messageService.add({
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
                this.messageService.add({
                  severity: "info",
                  summary: "Confirmed",
                  detail: "Approved Successfully",
                  life: 2000,
                });
                this.getAllData();
              }
            },
          });
      },
    });
  }
  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }
  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.loading = true;
    this.filters.VoucherNumber = inputValue;
    this._financeService.getAllRecord(this.target, this.filters).subscribe({
      next: (response) => {
        this.tableData = response.items;
        this.count = response.totalCount;

        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
