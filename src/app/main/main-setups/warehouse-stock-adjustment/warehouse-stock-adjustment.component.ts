import { Component, ChangeDetectorRef, input } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MessageService, ConfirmationService } from "primeng/api";
import { SalesService } from "../../sales/shared/services/sales.service";
import { Table } from "primeng/table";
import {
  catchError,
  finalize,
  forkJoin,
  map,
  Subscription,
  switchMap,
  throwError,
} from "rxjs";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
import * as moment from "moment";
import { MainSetupsService } from "../shared/services/main-setups.service";
import { ProductSearchEditorComponent } from "../../search-component/product-search-editor.component";

@Component({
  selector: "app-warehouse-stock-adjustment",
  templateUrl: "./warehouse-stock-adjustment.component.html",
  styleUrl: "./warehouse-stock-adjustment.component.css",
})
export class WarehouseStockAdjustmentComponent {
  StokAdjustmentform: FormGroup;
  target: string = "WarehouseStockAdjustment";
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
  frameworkComponents = {
    productSearchEditor: ProductSearchEditorComponent,
  };
  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    name: "",
    VoucherNumber: "",
  };
  wareHouse: { id: any; name: string }[] = [];
  item: { id: any; name: string }[] = [];
  units: {
    id: any;
    name: string;
    additional: string;
  }[] = [];
  count: number;

  constructor(
    // injector: Injector,
    private fb: FormBuilder,
    private _salesService: SalesService,
    private _mainSetupService: MainSetupsService,
    private cdr: ChangeDetectorRef,
    private msgService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.StokAdjustmentform = this.fb.group({
      id: [""],
      remarks: "",
      issueDate: ["", [Validators.required]],
      voucherNumber: [""],
      warehouseStockAdjustmentDetails: [[]],
    });
  }

  colDefs: ColDef[] = [
    {
      headerName: "Sr No",
      editable: false,
      field: "srNo",
      sortable: true,
      width: 50,
      valueGetter: "node.rowIndex+1",
      suppressSizeToFit: true,
    },
    // product column (keep as you posted)
    {
      headerName: "Product",
      field: "inventoryItemId",
      editable: true,
      resizable: true,
      width: 120,
      cellEditor: "productSearchEditor",
      cellEditorParams: () => ({ valuesRaw: this.item }),
      valueGetter: (p) => {
        const itm = this.item.find((i) => i.id === p.data.inventoryItemId);
        return itm?.name ?? "";
      },
      valueSetter: (p) => {
        const sel = this.item.find((i) => i.id === p.newValue);
        if (sel) {
          p.data.inventoryItemId = sel.id;
          this.onProductChange(p);
          return true;
        }
        return false;
      },
    },
    {
      headerName: "Size",
      field: "unitId",
      editable: true,
      resizable: true,
      width: 120,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: (params) => {
        return {
          values: params.data.unitOptions?.length
            ? params.data.unitOptions
            : this.units.map((unit) => unit.name), // fallback
        };
      },
      valueGetter: (params) => {
        const unit = this.units.find((unit) => unit.id === params.data.unitId);
        return unit ? unit.name : "";
      },
      valueSetter: (params) => {
        const selectedUnit = this.units.find(
          (unit) => unit.name === params.newValue
        );
        if (selectedUnit) {
          params.data.unitId = selectedUnit.id;
          this.fetchCurrentStock(params);
          this.onUnitChange(params);
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
      width: 100,
    },
    {
      headerName: "Min",
      field: "min",
      editable: false,
      resizable: true,
      width: 100,
    },
    {
      headerName: "Max",
      field: "max",
      editable: false,
      resizable: true,
      width: 100,
    },
    {
      headerName: "In",
      field: "credit",
      editable: true,
      resizable: true,
      width: 100,
    },
    {
      headerName: "Out",
      field: "debit",
      editable: true,
      resizable: true,
      width: 100,
    },
    {
      headerName: "Cost Rate",
      field: "costRate",
      editable: true,
      resizable: true,
      width: 100,
    },
    {
      headerName: "Warehouse",
      field: "warehouseId",
      editable: true,
      resizable: true,
      width: 120,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: (params) => {
        return {
          values: this.wareHouse.map((warehouse) => warehouse.name),
        };
      },
      valueGetter: (params) => {
        const warehouse = this.wareHouse.find(
          (warehouse) => warehouse.id === params.data.warehouseId
        );
        return warehouse ? warehouse.name : "";
      },
      valueSetter: (params) => {
        const selectedItem = this.wareHouse.find(
          (warehouse) => warehouse.name === params.newValue
        );
        if (selectedItem) {
          params.data.warehouseId = selectedItem.id;
          return true;
        }
        return false;
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
    this.getAll();
    this.fetchDropdownData("Item");
    this.fetchDropdownData("Unit");
    this.fetchDropdownData("Warehouse");
  }

  fetchDropdownData(target) {
    this._salesService.getAllSuggestion(target).subscribe((response: any) => {
      const mappedData = response.items.map((item: any) => ({
        id: item?.id,
        name: item?.name,
        additional: item?.additional,
      }));
      switch (target) {
        case "Item":
          this.item = mappedData;
          break;
        case "Unit":
          this.units = mappedData;
          break;
        case "Warehouse":
          this.wareHouse = mappedData;
          break;
        default:
          break;
      }
      this.cdr.detectChanges();
    });
  }

  onUnitChange(params: any) {
    const unitId = params.data.unitId;
    const itemId = params.data.inventoryItemId;

    if (!unitId || !itemId) return;

    const selectedUnit = this.units.find((u) => u.id === unitId);
    const lowerUnitName = selectedUnit?.name?.toLowerCase() || "";

    if (lowerUnitName === "1kg") {
      const openWarehouse = this.wareHouse.find(
        (w) => w.name.toLowerCase() === "open warehouse"
      );
      if (openWarehouse) {
        params.data.warehouseId = openWarehouse.id;
        params.node.setDataValue("warehouseId", openWarehouse.id);
      }
    } else {
      const dukaanWarehouse = this.wareHouse.find(
        (w) => w.name.toLowerCase() === "dukkan"
      );
      if (dukaanWarehouse) {
        params.data.warehouseId = dukaanWarehouse.id;
        params.node.setDataValue("warehouseId", dukaanWarehouse.id);
      }
    }

    // ✅ Get item pricing details
    this._salesService
      .getDetailsForItem(itemId, unitId, "SalesOrder")
      .subscribe({
        next: (response) => {
          debugger;
          this.dataForEdit = response;
          params.data.costRate = this.dataForEdit.rate || 0;
          params.data.min = this.dataForEdit.minPrice || 0;
          params.data.max = this.dataForEdit.maxPrice || 0;

          this.cdr.detectChanges();
          this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
        },
      });
  }

  fetchCurrentStock(params: any) {
    const unitId = params.data.unitId;
    const itemId = params.data.inventoryItemId;
    if (!unitId && !itemId) return;

    this._salesService.getMinStockLevel(itemId, unitId).subscribe({
      next: (response) => {
        params.data.minStockLevel = response || 0;
        this.cdr.detectChanges();
        this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
      },
    });
  }

  updateVisibility(value: number) {
    this.showAmount = value === 1;
    this.showPercentage = value === 2;
    this.showGrid = value === 3;
  }

  getVoucherNumber() {
    this._salesService
      .getVoucherNumber(
        "WSA",
        this.StokAdjustmentform.value.issueDate,
        this.target
      )
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
          if (this.StokAdjustmentform.value.issueDate) {
            this.StokAdjustmentform.get("voucherNumber").setValue(response);
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
    const control = this.StokAdjustmentform.get(field);
    return control ? control.invalid && control.touched : false;
  }
  onDateChange(value?: any) {
    if (value) {
      this.StokAdjustmentform.value.issueDate = value;
    }
    if (this.StokAdjustmentform.value.issueDate) {
      this.getVoucherNumber();
    }
  }
  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }
  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.loading = true;
    this.filters.VoucherNumber = inputValue;
    this._salesService.getAllRecord(this.target, this.filters).subscribe({
      next: (response) => {
        this.tableData = response.items;
        this.count = response.totalCount;

        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  show(id?: number) {
    if (id) {
      // Edit Mode
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
            this.dataForEdit = response;
            this.StokAdjustmentform.patchValue({
              issueDate: new Date(this.dataForEdit.issueDate),
              voucherNumber: this.dataForEdit.voucherNumber,
              inventoryItemId: this.dataForEdit.inventoryItemId,
              minStockLevel: this.dataForEdit.minStockLevel,
              credit: this.dataForEdit.credit,
              debit: this.dataForEdit.debit,
              costRate: this.dataForEdit.costRate,
              remarks: this.dataForEdit.remarks,
              id: this.dataForEdit.id,
              warehouseStockAdjustmentDetails:
                this.dataForEdit.warehouseStockAdjustmentDetails || [],
            });

            // ✅ Ensure all rows have `remarks` initialized
            this.rowData = (
              this.dataForEdit.warehouseStockAdjustmentDetails || []
            )
              .map((row) => ({ ...row, remarks: row.remarks ?? "" }))
              .reverse();

            this.displayModal = true;
            this.cdr.detectChanges();

            console.log("Form Values:", this.StokAdjustmentform.value);
            console.log("Warehouse ID (Response):", response);
            console.log("Warehouse ID (DataForEdit):", this.dataForEdit.id);
          },
        });
    } else {
      this.editMode = false;
      this.viewMode = false;
      this.StokAdjustmentform.reset();
      this.StokAdjustmentform.enable();
      this.rowData = [];
      this.displayModal = true;

      this.StokAdjustmentform.value.issueDate = moment(
        this.getTodayDate(),
        "MM/DD/YYYY"
      ).toDate();

      this.getVoucherNumber();
      this.StokAdjustmentform.patchValue({
        issueDate: this.today,
      });
    }
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
    this.StokAdjustmentform.patchValue({
      warehouseStockAdjustmentDetails: this.rowData,
      id: 0,
    });
    this._salesService
      .create(this.StokAdjustmentform.value, this.target)
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
    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      this.rowData.unshift(node.data); // insert at beginning for reverse order
    });

    this.StokAdjustmentform.patchValue({
      warehouseStockAdjustmentDetails: this.rowData,
    });
    const updateData = {
      ...this.StokAdjustmentform.value,
      id: this.StokAdjustmentform.value.id,
    };
    console.log(updateData);
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

  private getDefaultWarehouseId(): number | null {
    const dukkan = this.wareHouse.find(
      (w) => (w.name || "").toUpperCase() === "DUKKAN"
    );
    return dukkan ? dukkan.id : this.wareHouse[0]?.id ?? null;
  }
  onAddRow() {
    const newItem: Record<string, any> = {};

    this.colDefs.forEach((colDef) => {
      if (colDef.field) {
        newItem[colDef.field] = null;
      }
    });
    newItem.warehouseId = this.getDefaultWarehouseId();
    this.gridApi.applyTransaction({ add: [newItem], addIndex: 0 });
    this.gridApi.refreshCells({ force: true });
  }

  // onAddRow() {
  //
  //   const newItem: Record<string, any> = {};
  //   this.colDefs.forEach((colDef) => {
  //     if (colDef.field) {
  //       newItem[colDef.field] = null;
  //     }
  //   });
  //   this.gridApi.applyTransaction({ add: [newItem], addIndex: 0 });
  //   this.gridApi.refreshCells({ force: true });
  // }
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
  onCellValueChanged(params) {
    if (params.colDef.field === "credit") {
      params.data.debit = 0;
    } else if (params.colDef.field === "debit") {
      params.data.credit = 0;

      // Optional: Prevent debit > current stock
      const currentStock = params.data.minStockLevel || 0;
      const enteredDebit = params.data.debit || 0;

      if (enteredDebit > currentStock) {
        this.msgService.add({
          severity: "warn",
          summary: "Invalid Entry",
          detail: `Cannot debit more than available stock (${currentStock})`,
          life: 2500,
        });

        params.data.debit = 0;
        this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
      }
    }
  }
  onProductChange(params: any) {
    const itemId = params.data.inventoryItemId;
    if (!itemId) return;

    this._salesService.getItemUnits(itemId, "Item").subscribe({
      next: (response) => {
        this.dataForEdit = response;
        params.data.unitId = this.dataForEdit[0]?.unitId || null;

        // Store unit options in row-specific data
        params.data.unitOptions = this.dataForEdit.map((u) => u.unitName);
        this.onUnitChange(params);
        this.fetchCurrentStock(params);
        this.cdr.detectChanges();
        this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
      },
    });
  }

  edit(id: any) {
    debugger;
    this.editMode = true;
    this.viewMode = false;
    this.show(id);
    this.StokAdjustmentform.enable();
  }

  viewOnly(id: any) {
    this.viewMode = true;
    this.displayModal = true;
    this.editMode = false;
    this.show(id);
    this.StokAdjustmentform.disable();
  }

  approve(id: number) {
    this.confirmationService.confirm({
      message: "Are you sure?",
      header: "Confirmation",
      icon: "pi pi-exclamation-triangle",
      rejectButtonStyleClass: "p-button-text",
      accept: () => {
        // Step 1: Get adjustment by ID
        this._salesService.getDataForEdit(id, this.target).subscribe({
          next: (adjustment: any) => {
            const details = adjustment.warehouseStockAdjustmentDetails;

            // Step 2: Group changes by itemId and unitId
            const itemMap = new Map<
              number,
              { itemId: number; changes: { unitId: number; delta: number }[] }
            >();

            for (const detail of details) {
              const itemId = detail.inventoryItemId;
              const unitId = detail.unitId;
              const delta = (detail.credit || 0) - (detail.debit || 0);

              // Conversion logic if needed (currently assumes same unit)
              const conversionFactor = this.getUnitConversionMultiplier(
                unitId,
                unitId
              );
              const adjustedDelta = delta * conversionFactor;

              if (!itemMap.has(itemId)) {
                itemMap.set(itemId, { itemId, changes: [] });
              }

              itemMap.get(itemId).changes.push({
                unitId,
                delta: adjustedDelta,
              });
            }

            // Step 3: Prepare update observables for all items
            const updateObservables = Array.from(itemMap.values()).map(
              (group) =>
                this._mainSetupService
                  .getDataForEdit(group.itemId, "Item")
                  .pipe(
                    map((item: any) => {
                      group.changes.forEach((chg) => {
                        const itemDetail = item.itemDetails.find(
                          (d: any) => d.unitId === chg.unitId
                        );
                        if (itemDetail) {
                          itemDetail.minStockLevel =
                            (itemDetail.minStockLevel || 0) + chg.delta;
                        } else {
                          item.itemDetails.push({
                            unitId: chg.unitId,
                            minStockLevel: chg.delta,
                          });
                        }
                      });
                      return item;
                    }),
                    switchMap((updatedItem) =>
                      this._mainSetupService.update(updatedItem, "Item")
                    )
                  )
            );

            // Step 4: Apply all item updates, then approve adjustment
            forkJoin(updateObservables).subscribe({
              next: () => {
                this._salesService
                  .Approve(id, this.target)
                  .pipe()
                  .subscribe(() => {
                    this.msgService.add({
                      severity: "success",
                      summary: "Confirmed",
                      detail: "Stock levels updated and adjustment approved",
                      life: 2000,
                    });
                    this.getAll();
                  });
              },
              error: (err) => {
                this.msgService.add({
                  severity: "error",
                  summary: "Stock Update Failed",
                  detail:
                    err?.message || "Error occurred while updating item stock",
                  life: 2000,
                });
              },
            });
          },
          error: () => {
            this.msgService.add({
              severity: "error",
              summary: "Error",
              detail: "Could not fetch adjustment data",
              life: 2000,
            });
          },
        });
      },
    });
  }

  getUnitConversionMultiplier(fromUnitId: number, toUnitId: number): number {
    const fromUnit = this.units.find((u) => u.id === fromUnitId);
    const toUnit = this.units.find((u) => u.id === toUnitId);

    const fromValue = Number(fromUnit?.additional || 1);
    const toValue = Number(toUnit?.additional || 1);

    return fromValue / toValue;
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
}
