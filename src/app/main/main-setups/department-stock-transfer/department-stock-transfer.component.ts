import { Component, ChangeDetectorRef } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MessageService, ConfirmationService } from "primeng/api";
import { Table } from "primeng/table";
import { catchError, finalize, throwError } from "rxjs";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
import { SalesService } from "../../sales/shared/services/sales.service";
import { ProductSearchEditorComponent } from "../../search-component/product-search-editor.component";

@Component({
  selector: "app-department-stock-transfer",
  templateUrl: "./department-stock-transfer.component.html",
  styleUrl: "./department-stock-transfer.component.css",
})
export class DepartmentStockTransferComponent {
  form: FormGroup;
  target: string = "DepartmentstockTransfer";
  loading: boolean;
  gridApi: GridApi;
  rowSelection: string;
  tableData: any;
  rowData: any[] = [];
  count: number;
  saving: boolean;
  currentPage: number = 1;
  skipCount: number = 0;
  maxCount: number = 10;
  editMode: boolean;
  viewMode: boolean;
  displayModal: boolean;
  today: Date = new Date();

  frameworkComponents = {
    productSearchEditor: ProductSearchEditorComponent,
  };

  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    name: "",
    VoucherNumber: "",
  };

  departments: { id: any; name: string }[] = [];
  warehouses: { id: any; name: string }[] = [];
  employees: { id: any; name: string }[] = [];
  items: { id: any; name: string }[] = [];
  units: { id: any; name: string }[] = [];

  colDefs: ColDef[] = [
    {
      headerName: "Sr No",
      editable: false,
      field: "srNo",
      width: 80,
      valueGetter: "node.rowIndex+1",
      suppressSizeToFit: true,
    },
    {
      headerName: "Product",
      field: "inventoryItemId",
      editable: true,
      resizable: true,
      width: 200,
      cellEditor: "productSearchEditor",
      cellEditorParams: () => ({ valuesRaw: this.items }),
      valueGetter: (p) => {
        const itm = this.items.find((i) => i.id === p.data.inventoryItemId);
        return itm?.name ?? "";
      },
      valueSetter: (p) => {
        const sel = this.items.find((i) => i.id === p.newValue);
        if (sel) {
          p.data.inventoryItemId = sel.id;
          this.onProductChange(p);
          return true;
        }
        return false;
      },
    },
    {
      headerName: "Unit",
      field: "unitId",
      editable: true,
      resizable: true,
      width: 140,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: (params) => ({
        values: params.data.unitOptions?.length
          ? params.data.unitOptions
          : this.units.map((u) => u.name),
      }),
      valueGetter: (p) => {
        const unit = this.units.find((u) => u.id === p.data.unitId);
        return unit ? unit.name : "";
      },
      valueSetter: (p) => {
        const sel = this.units.find((u) => u.name === p.newValue);
        if (sel) {
          p.data.unitId = sel.id;
          this.onUnitChanged(p);
          return true;
        }
        return false;
      },
    },
    {
      headerName: "Current Stock",
      field: "minStockLevel",
      editable: false,
      resizable: true,
      width: 140,
    },
    {
      headerName: "Transferred Qty",
      field: "tranferredQty",
      editable: true,
      resizable: true,
      width: 150,
    },
  ];

  constructor(
    private fb: FormBuilder,
    private _salesService: SalesService,
    private cdr: ChangeDetectorRef,
    private msgService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.form = this.fb.group({
      id: [0],
      warehouseId: [null, [Validators.required]],
      departmentId: [null, [Validators.required]],
      receiverEmployeeId: [null, [Validators.required]],
      issueDate: ["", [Validators.required]],
      remarks: [""],
      voucherNumber: [""],
      departmentStockTransferDetails: [[]],
    });
  }

  ngOnInit() {
    this.getAll();
    this.fetchDropdownData("Department");
    this.fetchDropdownData("Warehouse");
    this.fetchDropdownData("Employee");
    this.fetchDropdownData("Item");
    this.fetchDropdownData("Unit");
  }

  fetchDropdownData(target: string) {
    this._salesService.getAllSuggestion(target).subscribe((response: any) => {
      const mapped = (response.items || []).map((x: any) => ({
        id: x?.id,
        name: x?.name,
        additional: x?.additional,
      }));
      switch (target) {
        case "Department":
          this.departments = mapped;
          break;
        case "Warehouse":
          this.warehouses = mapped;
          break;
        case "Employee":
          this.employees = mapped;
          break;
        case "Item":
          this.items = mapped;
          break;
        case "Unit":
          this.units = mapped;
          break;
      }
      this.cdr.detectChanges();
    });
  }

  getTodayDate(): Date {
    return new Date();
  }

  getVoucherNumber() {
    const issueDate = this.form.get("issueDate")?.value;
    console.log("Getting voucher number with date:", issueDate, "and target:", this.target);
    
    if (!issueDate) {
      console.warn("No issue date available for voucher number generation");
      return;
    }
    
    this._salesService
      .getVoucherNumber(
        "DST",
        issueDate,
        this.target
      )
      .pipe(
        finalize(() => {}),
        catchError((error) => {
          console.error("Error fetching voucher number:", error);
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: error?.error?.error?.message || "Failed to generate voucher number",
            life: 2000,
          });
          return throwError(error?.error?.error?.message || error);
        })
      )
      .subscribe({
        next: (response) => {
          console.log("Voucher number received:", response);
          this.form.get("voucherNumber")?.setValue(response);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error("An error occurred getting voucher number:", err);
        },
      });
  }

  onDateChange(value?: any) {
    if (value) {
      this.form.patchValue({ issueDate: value });
    }
    setTimeout(() => {
      if (this.form.value.issueDate) {
        this.getVoucherNumber();
      }
    }, 0);
  }

  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.loading = true;
    this.filters.name = inputValue;
    this._salesService.getAllRecord(this.target, this.filters).subscribe({
      next: (response) => {
        this.tableData = response.items;
        this.count = response.totalCount;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.rowSelection = "multiple";
  }

  onAddRow() {
    const newItem: any = { tranferredQty: 0 };
    this.gridApi.applyTransaction({ add: [newItem], addIndex: 0 });
    this.gridApi.refreshCells({ force: true });
  }

  onRemoveSelected() {
    const sel = this.gridApi.getSelectedNodes();
    if (sel.length) {
      const toRemove = sel.map((n) => n.data);
      this.gridApi.applyTransaction({ remove: toRemove });
      this.rowData = [];
      this.gridApi.forEachNode((n) => this.rowData.push(n.data));
    }
  }

  onProductChange(params: any) {
    const itemId = params.data.inventoryItemId;
    if (!itemId) return;
    this._salesService.getItemUnits(itemId, "Item").subscribe({
      next: (response) => {
        const units = response || [];
        params.data.unitId = units[0]?.unitId || null;
        params.data.unitOptions = units.map((u: any) => u.unitName);
        this.onUnitChanged(params);
        this.cdr.detectChanges();
        if (this.gridApi) {
          this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
        }
      },
    });
  }

  onUnitChanged(params: any) {
    const unitId = params.data.unitId;
    const itemId = params.data.inventoryItemId;
    if (!unitId || !itemId) return;
    this.fetchCurrentStock(params);
  }

  fetchCurrentStock(params: any) {
    const unitId = params.data.unitId;
    const itemId = params.data.inventoryItemId;
    if (!unitId || !itemId) return;
    this._salesService
      .getDetailsForItem(itemId, unitId, "SalesOrder")
      .subscribe({
        next: (response) => {
          const stock =
            (response && (
              response.minStockLevel ??
              response.stock ??
              response.availableQty ??
              response.availableQuantity ??
              response.currentStock
            )) || 0;
          params.data.minStockLevel = stock;
          this.cdr.detectChanges();
          if (this.gridApi) {
            this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
          }
        },
      });
  }

  show(id?: number) {
    if (id) {
      this.editMode = true;
      this._salesService
        .getDataForEdit(id, this.target)
        .pipe(
          finalize(() => {}),
          catchError((error) => {
            console.error('Error fetching department stock transfer for edit:', error);
            const errorMessage = error?.error?.error?.message || error?.error?.message || error?.message || 'Failed to load department stock transfer';
            this.msgService.add({
              severity: "error",
              summary: "Error",
              detail: errorMessage,
              life: 3000,
            });
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (data) => {
            const response: any = data || {};
            this.form.patchValue({
              id: response.id,
              warehouseId: response.warehouseId,
              departmentId: response.departmentId,
              receiverEmployeeId: response.receiverEmployeeId,
              issueDate: response.issueDate ? new Date(response.issueDate) : this.getTodayDate(),
              remarks: response.remarks,
              voucherNumber: response.voucherNumber,
            });
            
            this.rowData = (response.departmentStockTransferDetails || []).map((d: any) => ({
              inventoryItemId: d.inventoryItemId,
              unitId: d.unitId,
              minStockLevel: d.minStockLevel,
              tranferredQty: d.tranferredQty || 0,
            }));
            
            this.displayModal = true;
            this.cdr.detectChanges();
          },
        });
    } else {
      this.editMode = false;
      this.viewMode = false;
      this.form.reset();
      this.form.enable();
      this.rowData = [];
      this.displayModal = true;
      this.form.patchValue({ issueDate: this.getTodayDate(), id: 0 });
      setTimeout(() => {
        this.getVoucherNumber();
      }, 0);
    }
  }

  save() {
    if (!this.form.valid) {
      this.msgService.add({
        severity: "error",
        summary: "Validation Error",
        detail: "Please fill all required fields",
        life: 3000,
      });
      return;
    }

    const formValue = this.form.value;

    if (!formValue.warehouseId || formValue.warehouseId === 0) {
      this.msgService.add({
        severity: "error",
        summary: "Validation Error",
        detail: "Please select a warehouse",
        life: 3000,
      });
      return;
    }

    if (!formValue.departmentId || formValue.departmentId === 0) {
      this.msgService.add({
        severity: "error",
        summary: "Validation Error",
        detail: "Please select a department",
        life: 3000,
      });
      return;
    }

    if (!formValue.receiverEmployeeId || formValue.receiverEmployeeId === 0) {
      this.msgService.add({
        severity: "error",
        summary: "Validation Error",
        detail: "Please select a receiver employee",
        life: 3000,
      });
      return;
    }

    this.saving = true;
    this.rowData = [];
    if (this.gridApi) {
      this.gridApi.forEachNodeAfterFilterAndSort((n) =>
        this.rowData.unshift(n.data)
      );
    }

    const details = this.rowData
      .filter((r: any) => r.inventoryItemId && r.unitId && (r.tranferredQty || 0) > 0)
      .map((r: any) => ({
        id: 0,
        inventoryItemId: Number(r.inventoryItemId),
        unitId: Number(r.unitId),
        minStockLevel: Number(r.minStockLevel) || 0,
        tranferredQty: Number(r.tranferredQty) || 0,
      }));

    if (details.length === 0) {
      this.msgService.add({
        severity: "warn",
        summary: "Warning",
        detail: "Please add at least one product with quantity",
        life: 3000,
      });
      this.saving = false;
      return;
    }

    const payload = {
      id: 0,
      warehouseId: Number(formValue.warehouseId),
      departmentId: Number(formValue.departmentId),
      receiverEmployeeId: Number(formValue.receiverEmployeeId),
      issueDate: formValue.issueDate ? new Date(formValue.issueDate).toISOString() : new Date().toISOString(),
      remarks: formValue.remarks || "",
      departmentStockTransferDetails: details,
    };

    console.log('Save payload:', JSON.stringify(payload, null, 2));

    this._salesService
      .create(payload, this.target)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        catchError((error) => {
          console.error('Error saving department stock transfer:', error);
          const errorMessage = error?.error?.error?.message || error?.error?.message || error?.message || 'Failed to save department stock transfer';
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: errorMessage,
            life: 3000,
          });
          return throwError(() => error);
        })
      )
      .subscribe({
        next: () => {
          this.msgService.add({
            severity: "success",
            summary: "Confirmed",
            detail: "Saved Successfully",
            life: 2000,
          });
          this.getAll();
          this.saving = false;
          this.displayModal = false;
        },
      });
  }

  update() {
    if (!this.form.valid) {
      this.msgService.add({
        severity: "error",
        summary: "Validation Error",
        detail: "Please fill all required fields",
        life: 3000,
      });
      return;
    }

    const formValue = this.form.value;

    if (!formValue.warehouseId || formValue.warehouseId === 0) {
      this.msgService.add({
        severity: "error",
        summary: "Validation Error",
        detail: "Please select a warehouse",
        life: 3000,
      });
      return;
    }

    if (!formValue.departmentId || formValue.departmentId === 0) {
      this.msgService.add({
        severity: "error",
        summary: "Validation Error",
        detail: "Please select a department",
        life: 3000,
      });
      return;
    }

    if (!formValue.receiverEmployeeId || formValue.receiverEmployeeId === 0) {
      this.msgService.add({
        severity: "error",
        summary: "Validation Error",
        detail: "Please select a receiver employee",
        life: 3000,
      });
      return;
    }

    this.saving = true;
    this.rowData = [];
    if (this.gridApi) {
      this.gridApi.forEachNodeAfterFilterAndSort((n) =>
        this.rowData.unshift(n.data)
      );
    }

    const details = this.rowData
      .filter((r: any) => r.inventoryItemId && r.unitId && (r.tranferredQty || 0) > 0)
      .map((r: any) => ({
        id: 0,
        inventoryItemId: Number(r.inventoryItemId),
        unitId: Number(r.unitId),
        minStockLevel: Number(r.minStockLevel) || 0,
        tranferredQty: Number(r.tranferredQty) || 0,
      }));

    if (details.length === 0) {
      this.msgService.add({
        severity: "warn",
        summary: "Warning",
        detail: "Please add at least one product with quantity",
        life: 3000,
      });
      this.saving = false;
      return;
    }

    const payload = {
      id: formValue.id || 0,
      warehouseId: Number(formValue.warehouseId),
      departmentId: Number(formValue.departmentId),
      receiverEmployeeId: Number(formValue.receiverEmployeeId),
      issueDate: formValue.issueDate ? new Date(formValue.issueDate).toISOString() : new Date().toISOString(),
      remarks: formValue.remarks || "",
      departmentStockTransferDetails: details,
    };

    console.log('Update payload:', JSON.stringify(payload, null, 2));

    this._salesService
      .update(payload, this.target)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        catchError((error) => {
          console.error('Error updating department stock transfer:', error);
          const errorMessage = error?.error?.error?.message || error?.error?.message || error?.message || 'Failed to update department stock transfer';
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: errorMessage,
            life: 3000,
          });
          return throwError(() => error);
        })
      )
      .subscribe({
        next: () => {
          this.msgService.add({
            severity: "success",
            summary: "Confirmed",
            detail: "Updated Successfully",
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
        this._salesService
          .delete(id, this.target)
          .pipe(
            finalize(() => {}),
            catchError((error) => {
              console.error('Error deleting department stock transfer:', error);
              const errorMessage = error?.error?.error?.message || error?.error?.message || error?.message || 'Failed to delete department stock transfer';
              this.msgService.add({
                severity: "error",
                summary: "Error",
                detail: errorMessage,
                life: 3000,
              });
              return throwError(() => error);
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

  getAll() {
    this._salesService
      .getAllRecord(this.target, this.filters)
      .pipe(
        finalize(() => {}),
        catchError((error) => {
          console.error('Error fetching department stock transfer list:', error);
          const errorMessage = error?.error?.error?.message || error?.error?.message || error?.message || 'Failed to load department stock transfer list';
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: errorMessage,
            life: 3000,
          });
          return throwError(() => error);
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

  approve(id: number) {
    this.confirmationService.confirm({
      message: "Are you sure you want to approve this document?",
      header: "Confirmation",
      icon: "pi pi-exclamation-triangle",
      rejectButtonStyleClass: "p-button-text",
      accept: () => {
        this._salesService
          .Approve(id, this.target)
          .pipe(
            finalize(() => {}),
            catchError((error) => {
              const errorMessage = error?.error?.error?.message || error?.error?.message || error?.message || 'Failed to approve document';
              this.msgService.add({
                severity: "error",
                summary: "Error",
                detail: errorMessage,
                life: 3000,
              });
              return throwError(() => error);
            })
          )
          .subscribe({
            next: (response) => {
              if (response) {
                this.msgService.add({
                  severity: "success",
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

  viewOnly(id: any) {
    this.viewMode = true;
    this.displayModal = true;
    this.editMode = false;
    this.show(id);
    this.form.disable();
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
}

