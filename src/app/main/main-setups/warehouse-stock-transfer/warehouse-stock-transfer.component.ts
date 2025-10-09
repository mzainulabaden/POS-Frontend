import { Component, ChangeDetectorRef } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MessageService, ConfirmationService } from "primeng/api";
import { Table } from "primeng/table";
import { catchError, finalize, throwError } from "rxjs";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
import * as moment from "moment";
import { MainSetupsService } from "../shared/services/main-setups.service";
import { SalesService } from "../../sales/shared/services/sales.service";
import { ProductSearchEditorComponent } from "../../search-component/product-search-editor.component";

@Component({
  selector: "app-warehouse-stock-transfer",
  templateUrl: "./warehouse-stock-transfer.component.html",
  styleUrl: "./warehouse-stock-transfer.component.css",
})
export class WarehouseStockTransferComponent {
  form: FormGroup;
  target: string = "WarehouseStockTransfer";
  loading: boolean;
  gridApi: GridApi;
  rowSelection: string;
  tableData: any;
  rowData: any = [];
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

  warehouses: { id: any; name: string }[] = [];
  departments: { id: any; name: string }[] = [];
  employees: { id: any; name: string }[] = [];
  items: { id: any; name: string }[] = [];
  units: { id: any; name: string; additional: string }[] = [];

  colDefs: ColDef[] = [
    {
      headerName: "Sr No",
      editable: false,
      field: "srNo",
      sortable: true,
      width: 60,
      valueGetter: "node.rowIndex+1",
      suppressSizeToFit: true,
    },
    {
      headerName: "Product",
      field: "inventoryItemId",
      editable: true,
      resizable: true,
      width: 160,
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
      cellEditorParams: (params) => {
        return {
          values: params.data.unitOptions?.length
            ? params.data.unitOptions
            : this.units.map((unit) => unit.name),
        };
      },
      valueGetter: (params) => {
        const unit = this.units.find((u) => u.id === params.data.unitId);
        return unit ? unit.name : "";
      },
      valueSetter: (params) => {
        const selectedUnit = this.units.find((u) => u.name === params.newValue);
        if (selectedUnit) {
          params.data.unitId = selectedUnit.id;
          this.fetchCurrentStock(params);
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
      width: 140,
    },
  ];

  constructor(
    private fb: FormBuilder,
    private _mainSetupService: MainSetupsService,
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
      warehouseStockTransferDetails: [[]],
    });
  }

  ngOnInit() {
    this.getAll();
    this.fetchDropdownData("Warehouse");
    this.fetchDropdownData("Department");
    this.fetchDropdownData("Employee");
    this.fetchDropdownData("Item");
    this.fetchDropdownData("Unit");
    this.form.patchValue({ issueDate: this.getTodayDate() });
  }

  getWarehouseName(id: any): string {
    const found = this.warehouses.find((w) => w.id === id);
    return found ? found.name : "";
  }
  getDepartmentName(id: any): string {
    const found = this.departments.find((d) => d.id === id);
    return found ? found.name : "";
  }
  getEmployeeName(id: any): string {
    const found = this.employees.find((e) => e.id === id);
    return found ? found.name : "";
  }

  fetchDropdownData(target: string) {
    this._salesService.getAllSuggestion(target).subscribe((response: any) => {
      const mapped = (response.items || []).map((x: any) => ({
        id: x?.id,
        name: x?.name,
        additional: x?.additional,
      }));
      switch (target) {
        case "Warehouse":
          this.warehouses = mapped;
          break;
        case "Department":
          this.departments = mapped;
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
    const newItem: Record<string, any> = {};
    this.colDefs.forEach((colDef) => {
      if (colDef.field) {
        newItem[colDef.field] = null;
      }
    });
    this.gridApi.applyTransaction({ add: [newItem], addIndex: 0 });
    this.gridApi.refreshCells({ force: true });
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
        this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
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
    this._salesService.getMinStockLevel(itemId, unitId).subscribe({
      next: (response) => {
        params.data.minStockLevel = response || 0;
        this.cdr.detectChanges();
        this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
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
            const data = response || {};
            this.form.patchValue({
              id: data.id,
              warehouseId: data.warehouseId,
              departmentId: data.departmentId,
              receiverEmployeeId: data.receiverEmployeeId,
              issueDate: data.issueDate ? new Date(data.issueDate) : this.getTodayDate(),
              remarks: data.remarks,
              warehouseStockTransferDetails: data.warehouseStockTransferDetails || [],
            });
            this.rowData = (data.warehouseStockTransferDetails || []).map((r: any) => ({
              ...r,
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
    }
  }

  save() {
    this.saving = true;
    this.rowData = [];
    if (this.gridApi) {
      this.gridApi.forEachNodeAfterFilterAndSort((node) => {
        this.rowData.unshift(node.data);
      });
    }
    this.form.patchValue({
      warehouseStockTransferDetails: this.rowData,
      id: 0,
    });
    this._salesService
      .create(this.form.value, this.target)
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
        next: () => {
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
      this.gridApi.forEachNodeAfterFilterAndSort((node) => {
        this.rowData.unshift(node.data);
      });
    }
    this.form.patchValue({
      warehouseStockTransferDetails: this.rowData,
    });
    const payload = { ...this.form.value };
    this._salesService
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
        next: () => {
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

  approve(id: number) {
    this.confirmationService.confirm({
      message: "Are you sure?",
      header: "Confirmation",
      icon: "pi pi-exclamation-triangle",
      rejectButtonStyleClass: "p-button-text",
      accept: () => {
        this._salesService
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
            next: () => {
              this.msgService.add({
                severity: "success",
                summary: "Confirmed",
                detail: "Approved Successfully",
                life: 2000,
              });
              this.getAll();
            },
          });
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
}


