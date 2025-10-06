import { Component, ChangeDetectorRef, input } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MessageService, ConfirmationService } from "primeng/api";
import { SalesService } from "../../shared/services/sales.service";
import { Table } from "primeng/table";
import { catchError, finalize, Subscription, throwError } from "rxjs";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
import * as moment from "moment";
@Component({
  selector: "app-sale-commition-policy",
  templateUrl: "./sale-commition-policy.component.html",
  styleUrl: "./sale-commition-policy.component.css",
})
export class SaleCommitionPolicyComponent {
  constructor(
    // injector: Injector,
    private fb: FormBuilder,
    private _salesService: SalesService,
    private cdr: ChangeDetectorRef,
    private msgService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.SalesInvoiceForm = this.fb.group({
      name: ["", [Validators.required]],
      policyType: "",
      commisionAmount: "",
      commisionPercentage: "",
      commissionPolicyDetails: [],
    });
  }
  target: string = "CommissionPolicy";
  SalesInvoiceForm: FormGroup;
  loading: boolean;
  GridApi: GridApi;
  protected gridApi: GridApi;
  protected setParms;
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
  };
  count: number;
  policyTypes = [
    { name: "By Amount", id: 1 },
    { name: "By Percentage", id: 2 },
    { name: "By Slab", id: 3 },
  ];
  colDefs: ColDef[] = [
    {
      headerName: "SrNo",
      editable: false,
      field: "srNo",
      sortable: true,
      width: 90,
      valueGetter: "node.rowIndex+1",
      suppressSizeToFit: true,
    },
    {
      headerName: "From Amount",
      field: "fromAmount",
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "To Amount",
      field: "toAmount",
      editable: true,
      resizable: true,
      width: 200,
    },
    {
      headerName: "Commission Amount",
      field: "salesCommisionAmount",
      editable: true,
      resizable: true,
      width: 180,
    },
  ];

  ngOnInit() {
    this.getAll();
  }

  fetchDropdownData(target) {
    this._salesService.getAllSuggestion(target).subscribe((response: any) => {
      const mappedData = response.items.map((item: any) => ({
        id: item?.id,
        name: item?.name,
        additional: item?.additional,
      }));

      switch (target) {
        case "Bank":
          //  this.allBanks = mappedData;
          break;

        default:
          break;
      }
      this.cdr.detectChanges();
    });
  }

  updateVisibility(value: number) {
    if (value == 1) {
      this.showAmount = true;
      this.showPercentage = false;
      this.showGrid = false;
    }
    if (value == 2) {
      this.showAmount = false;
      this.showPercentage = true;
      this.showGrid = false;
    }
    if (value == 3) {
      this.showAmount = false;
      this.showPercentage = false;
      this.showGrid = true;
    }
  }

  show(id?: number) {
    this.getAll();

    if (id) {
      this.editMode = true;
      this._salesService
        .getDataById(id, this.target)
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
            this.SalesInvoiceForm.patchValue({
              name: this.dataForEdit.name,
              policyType: this.dataForEdit.policyType,
            });
            if (this.dataForEdit.policyType == 1) {
              this.updateVisibility(this.dataForEdit.policyType);
              this.SalesInvoiceForm.patchValue({
                commisionAmount: this.dataForEdit.commisionAmount,
              });
            }
            if (this.dataForEdit.policyType == 2) {
              this.updateVisibility(this.dataForEdit.policyType);
              this.SalesInvoiceForm.patchValue({
                commisionPercentage: this.dataForEdit.commisionPercentage,
              });
            }
            if (this.dataForEdit.policyType == 3) {
              this.updateVisibility(this.dataForEdit.policyType);

              // Defer assignment until grid is fully rendered
              setTimeout(() => {
                this.rowData = this.dataForEdit.commissionPolicyDetails;
                this.cdr.detectChanges();
              }, 100);
            }
            this.cdr.detectChanges();
            this.displayModal = true;
          },
        });
    } else {
      this.editMode = false;
      this.SalesInvoiceForm.get("policyType")?.valueChanges.subscribe(
        (value: number) => {
          this.updateVisibility(value);
        }
      );
      this.SalesInvoiceForm.reset();
      this.rowData = [];
      this.displayModal = true;
    }
  }

  edit(id: any) {
    this.editMode = true;
    this.viewMode = false;
    this.show(id);
    this.SalesInvoiceForm.enable();
  }

  viewOnly(id: any) {
    this.viewMode = true;
    this.editMode = false;
    this.show(id);
    this.SalesInvoiceForm.disable();
  }

  delete(id: number) {
    //
    this.confirmationService.confirm({
      message: "Are you sure?",
      header: "Confirmation",
      icon: "pi pi-exclamation-triangle",
      rejectButtonStyleClass: "p-button-text",
      accept: () => {
        this._salesService
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
    this.saving = true;
    this.rowData = [];
    if (this.gridApi) {
      this.gridApi.forEachNode((node) => {
        this.rowData.push(node.data);
      });
    }
    this.SalesInvoiceForm.value.commissionPolicyDetails = this.rowData;
    this._salesService
      .create(this.SalesInvoiceForm.value, this.target)
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
    this.rowData = [];
    if (this.gridApi) {
      this.gridApi.forEachNode((node) => {
        this.rowData.push(node.data);
      });
    }
    this.SalesInvoiceForm.value.commissionPolicyDetails = this.rowData;
    const updateData = {
      ...this.SalesInvoiceForm.value,
      id: this.dataForEdit.id,
    };
    this._salesService
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

  getAll() {
    this._salesService
      .getAllRecord(this.target, this.filters)
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

  onPageChange(event: any) {
    this.maxCount = event.rows;
    this.currentPage = event.page + 1;
    this.loading = true;
    this.skipCount = (this.currentPage - 1) * 10;
    this._salesService.getAllRecord(this.target, this.filters).subscribe({
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
    // this.calculateTotalAmount();
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.rowData = [];
    this.rowSelection = "multiple";
  }
  onCellValueChanged(params) {}

  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.loading = true;
    // this.filters.VoucherNumber = inputValue;
    this._salesService.getAllRecord(this.target, this.filters).subscribe({
      next: (response) => {
        this.tableData = response.items;
        this.count = response.totalCount;

        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  getPolicyTypeName(policyTypeId: number): string {
    const policy = this.policyTypes.find((p) => p.id === policyTypeId);
    return policy ? policy.name : "";
  }
}
