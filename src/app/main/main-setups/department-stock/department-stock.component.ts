import { Component, ChangeDetectorRef } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MessageService, ConfirmationService } from "primeng/api";
import { Table } from "primeng/table";
import { catchError, finalize, throwError } from "rxjs";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
import { SalesService } from "../../sales/shared/services/sales.service";
import { ProductSearchEditorComponent } from "../../search-component/product-search-editor.component";

@Component({
  selector: "app-department-stock",
  templateUrl: "./department-stock.component.html",
  styleUrl: "./department-stock.component.css",
})
export class DepartmentStockComponent {
  form: FormGroup;
  target: string = "Department";
  loading: boolean;
  gridApi: GridApi;
  gridApiIn: GridApi;
  gridApiOut: GridApi;
  rowSelection: string;
  tableData: any;
  rowData: any = [];
  rowDataIn: any[] = [];
  rowDataOut: any[] = [];
  count: number;
  saving: boolean;
  currentPage: number = 1;
  skipCount: number = 0;
  maxCount: number = 10;
  editMode: boolean;
  viewMode: boolean;
  displayModal: boolean;

  frameworkComponents = {
    productSearchEditor: ProductSearchEditorComponent,
  };

  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    name: "",
  };

  departments: { id: any; name: string }[] = [];
  employees: { id: any; name: string }[] = [];
  items: { id: any; name: string }[] = [];
  units: { id: any; name: string }[] = [];

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
      headerName: "Qty In",
      field: "qtyIn",
      editable: true,
      resizable: true,
      width: 140,
    },
    {
      headerName: "Consumed Qty",
      field: "consumedQty",
      editable: true,
      resizable: true,
      width: 140,
    },
  ];

  colDefsIn: ColDef[] = [
    { 
      headerName: "Sr No", 
      editable: false, 
      field: "srNo", 
      width: 80, 
      valueGetter: "node.rowIndex+1", 
      suppressSizeToFit: true 
    },
    { 
      headerName: "Product", 
      field: "inventoryItemId", 
      editable: true, 
      resizable: true,
      width: 180, 
      cellEditor: "productSearchEditor", 
      cellEditorParams: () => ({ valuesRaw: this.items }),
      valueGetter: (p) => this.items.find((i) => i.id === p.data.inventoryItemId)?.name ?? "",
      valueSetter: (p) => { const sel = this.items.find((i) => i.id === p.newValue); if (sel) { p.data.inventoryItemId = sel.id; this.onProductChangeIn(p); return true; } return false; }
    },
    { 
      headerName: "Unit", 
      field: "unitId", 
      editable: true, 
      resizable: true,
      width: 120, 
      cellEditor: "agSelectCellEditor",
      cellEditorParams: (params) => ({ values: params.data.unitOptions?.length ? params.data.unitOptions : this.units.map((u) => u.name) }),
      valueGetter: (p) => this.units.find((u) => u.id === p.data.unitId)?.name ?? "",
      valueSetter: (p) => { const sel = this.units.find((u) => u.name === p.newValue); if (sel) { p.data.unitId = sel.id; this.onUnitChangedIn(p); return true; } return false; }
    },
    { 
      headerName: "Current Stock", 
      field: "minStockLevel", 
      editable: false, 
      resizable: true,
      width: 120 
    },
    { 
      headerName: "Qty In", 
      field: "qtyIn", 
      editable: true, 
      resizable: true,
      width: 120 
    },
  ];

  colDefsOut: ColDef[] = [
    { 
      headerName: "Sr No", 
      editable: false, 
      field: "srNo", 
      width: 80, 
      valueGetter: "node.rowIndex+1", 
      suppressSizeToFit: true 
    },
    { 
      headerName: "Product", 
      field: "inventoryItemId", 
      editable: true, 
      resizable: true,
      width: 180, 
      cellEditor: "productSearchEditor", 
      cellEditorParams: () => ({ valuesRaw: this.items }),
      valueGetter: (p) => this.items.find((i) => i.id === p.data.inventoryItemId)?.name ?? "",
      valueSetter: (p) => { const sel = this.items.find((i) => i.id === p.newValue); if (sel) { p.data.inventoryItemId = sel.id; this.onProductChangeOut(p); return true; } return false; }
    },
    { 
      headerName: "Unit", 
      field: "unitId", 
      editable: true, 
      resizable: true,
      width: 120, 
      cellEditor: "agSelectCellEditor",
      cellEditorParams: (params) => ({ values: params.data.unitOptions?.length ? params.data.unitOptions : this.units.map((u) => u.name) }),
      valueGetter: (p) => this.units.find((u) => u.id === p.data.unitId)?.name ?? "",
      valueSetter: (p) => { const sel = this.units.find((u) => u.name === p.newValue); if (sel) { p.data.unitId = sel.id; this.onUnitChangedOut(p); return true; } return false; }
    },
    { 
      headerName: "Current Stock", 
      field: "minStockLevel", 
      editable: false, 
      resizable: true,
      width: 120 
    },
    { 
      headerName: "Consumed Qty", 
      field: "consumedQty", 
      editable: true, 
      resizable: true,
      width: 120 
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
      departmentId: [null, [Validators.required]],
      receiverEmployeeId: [null, [Validators.required]],
      issueDate: ["", [Validators.required]],
      remarks: [""],
      departmentStockDetails: [[]],
      departmentStockConsumptionDetails: [[]],
    });
  }

  ngOnInit() {
    this.getAll();
    this.fetchDropdownData("Department");
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

  onGridReadyIn(params: GridReadyEvent) { this.gridApiIn = params.api; this.rowSelection = "multiple"; }
  onGridReadyOut(params: GridReadyEvent) { this.gridApiOut = params.api; this.rowSelection = "multiple"; }

  onAddRowIn() { const newItem: any = { qtyIn: 0 }; this.gridApiIn.applyTransaction({ add: [newItem], addIndex: 0 }); this.gridApiIn.refreshCells({ force: true }); }
  onAddRowOut() { const newItem: any = { consumedQty: 0 }; this.gridApiOut.applyTransaction({ add: [newItem], addIndex: 0 }); this.gridApiOut.refreshCells({ force: true }); }

  onRemoveSelectedIn() { const sel = this.gridApiIn.getSelectedNodes(); if (sel.length) { const toRemove = sel.map(n=>n.data); this.gridApiIn.applyTransaction({ remove: toRemove }); this.rowDataIn = []; this.gridApiIn.forEachNode(n=>this.rowDataIn.push(n.data)); } }
  onRemoveSelectedOut() { const sel = this.gridApiOut.getSelectedNodes(); if (sel.length) { const toRemove = sel.map(n=>n.data); this.gridApiOut.applyTransaction({ remove: toRemove }); this.rowDataOut = []; this.gridApiOut.forEachNode(n=>this.rowDataOut.push(n.data)); } }

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

  onProductChangeIn(params: any) { this.onProductChange(params); }
  onProductChangeOut(params: any) { this.onProductChange(params); }

  onUnitChangedIn(params: any) { this.onUnitChanged(params); }
  onUnitChangedOut(params: any) { this.onUnitChanged(params); }

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
          next: (data) => {
            const response: any = data || {};
            this.form.patchValue({
              id: response.id,
              departmentId: response.departmentId,
              receiverEmployeeId: response.receiverEmployeeId,
              issueDate: response.issueDate ? new Date(response.issueDate) : "",
              remarks: response.remarks,
            });
            // Merge both detail arrays into a single editable grid dataset
            const combined = [] as any[];
            (response.departmentStockDetails || []).forEach((d: any) => {
              combined.push({
                inventoryItemId: d.inventoryItemId,
                unitId: d.unitId,
                minStockLevel: d.stockLevel,
                qtyIn: d.qtyIn,
                consumedQty: null,
              });
            });
            (response.departmentStockConsumptionDetails || []).forEach((c: any) => {
              const idx = combined.findIndex(
                (x) => x.inventoryItemId === c.inventoryItemId && x.unitId === c.unitId
              );
              if (idx > -1) {
                combined[idx].consumedQty = c.consumedQty;
                combined[idx].minStockLevel = c.stockLevel ?? combined[idx].minStockLevel;
              } else {
                combined.push({
                  inventoryItemId: c.inventoryItemId,
                  unitId: c.unitId,
                  minStockLevel: c.stockLevel,
                  qtyIn: null,
                  consumedQty: c.consumedQty,
                });
              }
            });
            this.rowData = combined;
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
    }
  }

  save() {
    this.saving = true;
    this.rowDataIn = []; this.rowDataOut = [];
    if (this.gridApiIn) { this.gridApiIn.forEachNodeAfterFilterAndSort(n=>this.rowDataIn.unshift(n.data)); }
    if (this.gridApiOut) { this.gridApiOut.forEachNodeAfterFilterAndSort(n=>this.rowDataOut.unshift(n.data)); }
    const detailsIn = this.rowDataIn
      .filter((r: any) => (r.qtyIn || 0) > 0)
      .map((r: any) => ({
        id: 0,
        inventoryItemId: r.inventoryItemId,
        unitId: r.unitId,
        stockLevel: r.minStockLevel || 0,
        qtyIn: r.qtyIn || 0,
      }));

    const detailsOut = this.rowDataOut
      .filter((r: any) => (r.consumedQty || 0) > 0)
      .map((r: any) => ({
        id: 0,
        inventoryItemId: r.inventoryItemId,
        unitId: r.unitId,
        stockLevel: r.minStockLevel || 0,
        consumedQty: r.consumedQty || 0,
      }));

    const payload = {
      ...this.form.value,
      id: 0,
      departmentStockDetails: detailsIn,
      departmentStockConsumptionDetails: detailsOut,
    };

    this._salesService
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
    this.rowDataIn = []; this.rowDataOut = [];
    if (this.gridApiIn) { this.gridApiIn.forEachNodeAfterFilterAndSort(n=>this.rowDataIn.unshift(n.data)); }
    if (this.gridApiOut) { this.gridApiOut.forEachNodeAfterFilterAndSort(n=>this.rowDataOut.unshift(n.data)); }

    const detailsIn = this.rowDataIn
      .filter((r: any) => (r.qtyIn || 0) > 0)
      .map((r: any) => ({
        id: 0,
        inventoryItemId: r.inventoryItemId,
        unitId: r.unitId,
        stockLevel: r.minStockLevel || 0,
        qtyIn: r.qtyIn || 0,
      }));

    const detailsOut = this.rowDataOut
      .filter((r: any) => (r.consumedQty || 0) > 0)
      .map((r: any) => ({
        id: 0,
        inventoryItemId: r.inventoryItemId,
        unitId: r.unitId,
        stockLevel: r.minStockLevel || 0,
        consumedQty: r.consumedQty || 0,
      }));

    const payload = {
      ...this.form.value,
      departmentStockDetails: detailsIn,
      departmentStockConsumptionDetails: detailsOut,
    };

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


