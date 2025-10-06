import { ChangeDetectorRef, Component, Injector } from "@angular/core";
import { Table } from "primeng/table";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { FinanceService } from "../Service/finance.service";
import { MessageService, ConfirmationService } from "primeng/api";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
import { catchError, finalize, throwError } from "rxjs";
import * as moment from "moment";
import { PurchaseService } from "../../purchase/shared/services/purchase.service";
import { HrmService } from "../../hrm/shared/services/hrm.service";
import { getDate } from "@node_modules/date-fns/getDate";
import { ProductSearchEditorComponent } from "../../search-component/product-search-editor.component";

@Component({
  selector: "app-cash-receipt",

  templateUrl: "./cash-receipt.component.html",
  styleUrl: "./cash-receipt.component.css",
})
export class CashReceiptComponent {
  constructor(
    // injector: Injector,
    private fb: FormBuilder,
    private _financeService: FinanceService,
    private _purchaseService: PurchaseService,
    private _hrmService: HrmService,
    private cdr: ChangeDetectorRef,
    private msgService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.bankPaymentForm = this.fb.group({
      referenceNumber: [""],
      voucherNumber: [""],
      issueDate: [this.getTodayDate(), [Validators.required]], // Set today's date correctly
      referenceDate: [""],
      isCheque: [false], // default boolean value
      isCrossedCheque: [false], // also corrected
      chequeTitle: [""],
      chequeNumber: [""],
      totalAmount: [""],
      bankCOALevel04Id: [""],
      linkedDocument: ["2"],
      remarks: "",
      maturityDate: [this.getTodayDate()], // ✅ Just add this lines
      generalPaymentDetails: [[]],
    });
  }

  displayAdjustModal: boolean = false;
  adjustTableData: any;
  selectData: any;
  loading: boolean;
  saving: boolean;
  RowData: any;
  protected gridApi: GridApi;
  protected piGridApi: GridApi;
  protected setParms;
  rowSelection: string;
  RowCount: number;
  skipCount: number = 0;
  maxCount: number = 10;
  TableData: any;
  target: string = "GeneralPayment";
  tableData: any;
  count: number;
  displayModal: boolean;
  editMode: boolean;
  viewMode: boolean;
  selectedDate: Date;
  selectedRefDate: Date;
  dataForEdit: any;
  bankPaymentForm: FormGroup;
  rowData: any;
  tempRowData: any;
  currentPage: number = 1;
  allBanks: [];
  createPurchaseInvoiceGrid: boolean;
  rowCount: number;

  coaLevel04Id: { id: any; name: string }[] = [];
  coaLevel04: { id: any; name: string; additional: string }[] = [];
  supplier: { id: any; name: string }[] = [];
  tax: { id: any; name: string }[] = [];
  othertax: { id: any; name: string }[] = [];
  frameworkComponents = {
    productSearchEditor: ProductSearchEditorComponent,
  };

  ngOnInit(): void {
    this.getAll();
    this.getSuppliersAndClients();
    this.fetchDropdownData("Supplier");
    this.fetchDropdownData("Tax");
    this.fetchDropdownData("COALevel04");
  }
  getSuppliersAndClients() {
    this._hrmService.getAllSuppliersAndClients().subscribe((response: any) => {
      this.coaLevel04Id = response.items.map((x: any) => ({
        id: x.id,
        name: x.name,
      }));
      this.cdr.detectChanges();
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
        case "Tax":
          this.tax = mappedData;
          break;
        case "Supplier":
          this.coaLevel04Id = mappedData;
          break;
        case "COALevel04":
          this.coaLevel04 = mappedData.filter((item) =>
            item.additional?.includes("05-003-001")
          );
          break;
        default:
          break;
      }
      this.cdr.detectChanges();
    });
  }

  getAll() {
    this._financeService
      .getAll("GeneralPayment", this.filters)
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

  getTodayDate(): Date {
    return new Date(); // Return current date
  }

  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    name: "",
    VoucherNumber: "",
    linkedDocument: 2,
  };

  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  getVoucherNumber() {
    this._financeService
      .getVoucherNumber("CR", this.bankPaymentForm.value.issueDate, this.target)
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
          if (this.bankPaymentForm.value.issueDate) {
            this.bankPaymentForm.get("voucherNumber").setValue(response);
          }
        },
        error: (err) => {
          console.log("An error occurred", err);
        },
      });
  }

  show(id?: number) {
    if (id) {
      // Edit Mode
      this._hrmService
        .getForEdit(id, this.target)
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
            this.bankPaymentForm.patchValue({
              bankCOALevel04Id: this.dataForEdit.bankCOALevel04Id,
              referenceNumber: this.dataForEdit.referenceNumber,
              voucherNumber: this.dataForEdit.voucherNumber,
              issueDate: new Date(this.dataForEdit.issueDate),
              referenceDate: this.dataForEdit.referenceDate
                ? new Date(this.dataForEdit.referenceDate)
                : null,
              isCheque: this.dataForEdit.isCheque,
              isCrossedCheque: this.dataForEdit.isCrossedCheque,
              chequeTitle: this.dataForEdit.chequeTitle,
              chequeNumber: this.dataForEdit.chequeNumber,
              totalAmount: this.dataForEdit.totalAmount,
              remarks: this.dataForEdit.remarks,
              generalPaymentDetails:
                this.dataForEdit.generalPaymentDetails || [],
            });
            this.rowData = this.dataForEdit.generalPaymentDetails;
            console.log(this.bankPaymentForm.value);
            this.displayModal = true;
            this.cdr.detectChanges();
          },
        });
    } else {
      // Create Mode
      this.editMode = false;
      this.viewMode = false;
      this.bankPaymentForm.reset();
      this.bankPaymentForm.enable();
      this.selectedDate = moment(this.getTodayDate(), "MM/DD/YYYY").toDate();
      this.bankPaymentForm.value.issueDate = this.selectedDate;
      this.getVoucherNumber();
      this.rowData = [];
      this.displayModal = true;
    }
  }

  edit(id: any) {
    this.editMode = true;
    this.viewMode = false;
    this.show(id);
    this.bankPaymentForm.enable();
  }

  viewOnly(id: any) {
    this.viewMode = true;
    this.displayModal = true;
    this.editMode = false;
    this.show(id);
    this.bankPaymentForm.disable();
  }

  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.loading = true;
    this.filters.VoucherNumber = inputValue;
    this._financeService.getAll(this.target, this.filters).subscribe({
      next: (response) => {
        this.tableData = response.items;
        this.count = response.totalCount;

        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  delete(id: number) {
    //
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

  save() {
    this.bankPaymentForm.patchValue({
      linkedDocument: 2,
    });
    this.saving = true;
    console.log("Saving Cash Receipt:", this.bankPaymentForm.value);

    if (!this.bankPaymentForm.valid) {
      this.msgService.add({
        severity: "error",
        detail: "Please fill all Required fields",
        life: 2000,
      });
      this.saving = false;
      return;
    }

    this.tempRowData = [];
    this.gridApi.forEachNode((node) => {
      this.tempRowData.push(node.data);
    });

    const formValue = this.bankPaymentForm.value;
    const fallbackDate = formValue.issueDate || new Date();

    const finalReferenceDate =
      formValue.referenceDate && moment(formValue.referenceDate).isValid()
        ? moment(formValue.referenceDate).format("YYYY-MM-DD")
        : moment(fallbackDate).format("YYYY-MM-DD");

    this.bankPaymentForm.patchValue({
      generalPaymentDetails: this.tempRowData,
      issueDate: moment(fallbackDate).format("YYYY-MM-DD"),
      referenceDate: finalReferenceDate,
      maturityDate: moment(fallbackDate).format("YYYY-MM-DD"),
      isCheque: !!formValue.isCheque,
      isCrossedCheque: !!formValue.isCrossedCheque,
    });

    const payload = { ...this.bankPaymentForm.value };

    this._financeService
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
        next: () => {
          this.msgService.add({
            severity: "success",
            summary: "Confirmed",
            detail: "SavedSuccessfully",
            life: 2000,
          });
          this.getAll();
          this.displayModal = false;
        },
      });
  }

  update() {
    this.saving = true;
    this.rowData = [];
    this.gridApi.forEachNode((node) => {
      this.rowData.push(node.data);
    });

    const formValue = this.bankPaymentForm.value;
    const fallbackDate = formValue.issueDate || new Date();

    const finalReferenceDate =
      formValue.referenceDate && moment(formValue.referenceDate).isValid()
        ? moment(formValue.referenceDate).format("YYYY-MM-DD")
        : moment(fallbackDate).format("YYYY-MM-DD");

    this.bankPaymentForm.patchValue({
      generalPaymentDetails: this.rowData,
      issueDate: moment(fallbackDate).format("YYYY-MM-DD"),
      referenceDate: finalReferenceDate,
      maturityDate: moment(fallbackDate).format("YYYY-MM-DD"),
      isCheque: !!formValue.isCheque,
      isCrossedCheque: !!formValue.isCrossedCheque,
      discountAmount: 0,
      discountPercentage: 0,
    });

    const updateData = {
      ...this.bankPaymentForm.value,
      id: this.dataForEdit.id,
    };

    this._financeService
      .update(updateData, this.target)
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
        next: () => {
          this.msgService.add({
            severity: "success",
            summary: "Confirmed",
            detail: "UpdatedSuccessfully",
            life: 2000,
          });
          this.getAll();
          this.displayModal = false;
        },
      });
  }

  saveInvoice() {
    console.log({ ...this.bankPaymentForm.value });
    this.saving = true;

    if (!this.bankPaymentForm.valid) {
      this.msgService.add({
        severity: "error",
        detail: "Please fill all Required fields",
        life: 2000,
      });
      this.saving = false;
      return;
    }
    this.RowData = [];
    this.gridApi.forEachNode((node) => {
      this.RowData.push({
        ...node.data,
        id: 0,
        purchaseOrderDetailId: node.data.id,
      });
    });

    this.bankPaymentForm.patchValue({
      // purchaseInvoiceDetails: this.RowData,
      issueDate: moment(this.bankPaymentForm.value.issueDate).format(
        "YYYY-MM-DD"
      ),
      viAmount: 0,
    });
    this._financeService
      .create({ ...this.bankPaymentForm.value }, "PurchaseInvoice")
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
          // this.getAll();
          this.displayModal = false;
          this.saving = false;
        },
      });
  }

  onDateChange() {
    // if (value) {

    // }
    this.bankPaymentForm.value.issueDate = this.selectedDate;
    if (this.bankPaymentForm.value.issueDate) {
      this.getVoucherNumber();
    }
  }

  isFieldInvalid(field: string): any {
    // const control = this.purchaseOrderForm.get(field);
    // return control ? control.invalid && control.touched : false;
  }

  // onAddRow() {
  //
  //   const newItem: Record<string, any> = {};
  //   this.colDefs.forEach((colDef) => {
  //     if (colDef.field) {
  //       newItem[colDef.field] = null;
  //     }
  //   });
  //   this.gridApi.applyTransaction({ add: [newItem] });
  //   this.rowCount = this.gridApi.getDisplayedRowCount();
  // }
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
    this.calculateTotalAmount();
  }

  getAllPurchaseOrder() {
    let supplierCOALevel04Id;
    if (supplierCOALevel04Id != null) {
      this._purchaseService
        .getAllPendingBySupplierId("SalesInvoice", supplierCOALevel04Id)
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
            this.adjustTableData = response.items.filter(
              (item) => item.status == "APPROVED"
            );
            this.cdr.markForCheck();
          },
        });
    } else {
      this._purchaseService
        .getAllPendingBySupplierId("SalesInvoice")
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
            this.adjustTableData = response.items.filter(
              (item) => item.status == "APPROVED"
            );
            this.cdr.markForCheck();
          },
        });
    }
  }

  selectPayment(adjustid: number) {
    const selectedPayment = this.adjustTableData.find((p) => p.id === adjustid);

    if (!selectedPayment) {
      console.error("Payment not found with ID:", adjustid);
      return;
    }

    const { id, ...paymentWithoutId } = selectedPayment;

    this.bankPaymentForm.patchValue({
      invoiceNumber: selectedPayment.voucherNumber,
      generalPaymentDetails: [paymentWithoutId],
    });

    this.rowData = [paymentWithoutId];

    if (this.gridApi) {
      this.gridApi.setRowData(this.rowData);
      this.gridApi.refreshCells();
    }

    this.displayAdjustModal = false;
    this.cdr.detectChanges();
  }

  openAdjustModal() {
    this.displayAdjustModal = true;
    this.getAllPurchaseOrder();
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

  onPageChange(event: any) {
    this.maxCount = event.rows;
    this.currentPage = event.page + 1;
    this.loading = true;
    this.skipCount = (this.currentPage - 1) * 10;
    this._financeService.getAll(this.target, this.skipCount).subscribe({
      next: (response) => {
        this.tableData = response.items;
        this.count = response.totalCount;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  colDefs: ColDef[] = [
    {
      headerName: "SrNo",
      editable: false,
      field: "srNo",
      sortable: true,
      width: 160,
      valueGetter: "node.rowIndex+1",
      suppressSizeToFit: true,
    },
    {
      headerName: "Invoice Number",
      field: "voucherNumber",
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Party",
      field: "coaLevel04Id",
      cellEditor: "productSearchEditor",
      cellEditorParams: () => ({
        valuesRaw: this.coaLevel04Id,
      }),
      valueGetter: (params) => {
        const item = this.coaLevel04Id.find(
          (i) => i.id === params.data.coaLevel04Id
        );
        return item ? item.name : params.data.supplierName || "";
      },
      valueSetter: (params) => {
        const selected = this.coaLevel04Id.find(
          (i) => i.id === params.newValue
        );
        if (selected) {
          params.data.coaLevel04Id = selected.id;
          params.data.customerName = selected.name;
          return true;
        }
        return false;
      },
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Advance Amount",
      field: "advanceAmount",
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Paid Amount",
      field: "paidAmount",
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Pending Amount",
      field: "pendingAmount",
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Amount",
      field: "netAmount",
      editable: true,
      resizable: true,
      width: 120,
    },
    {
      headerName: "Tax COA",
      field: "taxCOALevel04Id",
      cellEditor: "agSelectCellEditor",
      cellEditorParams: (params) => {
        return {
          values: this.tax.map((item) => item.name),
        };
      },
      valueGetter: (params) => {
        const item = this.tax.find(
          (item) => item.id === params.data.taxCOALevel04Id
        );
        return item ? item.name : "";
      },
      valueSetter: (params) => {
        const selected = this.tax.find((item) => item.name === params.newValue);
        if (selected) {
          params.data.taxCOALevel04Id = selected.id;
          return true;
        }
        return false;
      },
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Tax Amount",
      field: "taxAmount",
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Other Tax COA",
      field: "otherTaxCOALevel04Id",
      cellEditor: "agSelectCellEditor",
      cellEditorParams: (params) => {
        return {
          values: this.tax.map((item) => item.name),
        };
      },
      valueGetter: (params) => {
        const item = this.tax.find(
          (item) => item.id === params.data.otherTaxCOALevel04Id
        );
        return item ? item.name : "";
      },
      valueSetter: (params) => {
        const selected = this.tax.find((item) => item.name === params.newValue);
        if (selected) {
          params.data.otherTaxCOALevel04Id = selected.id;
          return true;
        }
        return false;
      },
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Other Tax Amount",
      field: "otherTaxAmount",
      editable: true,
      resizable: true,
      width: 120,
    },
    {
      headerName: "Remarks",
      field: "remarks",
      editable: true,
      resizable: true,
      width: 150,
    },
  ];

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.rowData = [];
    this.rowSelection = "multiple";
  }

  onCellValueChanged(event: any) {
    const data = event.data;

    const base = Number(data.netAmount) || 0;
    const tax = Number(data.taxAmount) || 0;
    const otherTax = Number(data.otherTaxAmount) || 0;

    if (base > 0) {
      data.netAmount = base + tax + otherTax;

      this.calculateTotalAmount();
      this.gridApi.refreshCells({
        rowNodes: [event.node],
        columns: ["netAmount"],
        force: true,
      });
    }
  }

  calculateTotalAmount() {
    let totalAmount = 0;
    if (this.gridApi) {
      this.gridApi.forEachNode((node) => {
        if (node.data.netAmount) {
          totalAmount += Number(node.data.netAmount);
        }
      });
      this.bankPaymentForm.get("totalAmount").setValue(totalAmount);
    }
  }
}
