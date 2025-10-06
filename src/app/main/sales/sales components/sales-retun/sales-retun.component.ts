import { ChangeDetectorRef, Component } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { PurchaseService } from "@app/main/purchase/shared/services/purchase.service";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
import { MessageService, ConfirmationService } from "primeng/api";
import { SalesService } from "../../shared/services/sales.service";
import {
  catchError,
  finalize,
  forkJoin,
  map,
  switchMap,
  throwError,
} from "rxjs";
import moment from "@node_modules/moment-timezone";
import { Table } from "@node_modules/primeng/table";
import { MainSetupsService } from "@app/main/main-setups/shared/services/main-setups.service";
import { ProductSearchEditorComponent } from "../../../search-component/product-search-editor.component";
import { ReportsService } from "@app/main/reports/services/reports.service";

@Component({
  selector: "app-sales-retun",
  templateUrl: "./sales-retun.component.html",
})
export class SalesRetunComponent {
  displayModal: boolean;
  baseurl: string = "http://173.249.23.108:6063";
  loading: boolean;
  salesReturnForm: FormGroup;
  saving: boolean;
  protected gridApi: GridApi;
  rowSelection: string;
  count: number;
  editMode: boolean;
  today: Date = new Date();
  siTableData: any;
  viewMode: boolean;
  currentPage: number = 1;
  unit: { id: any; name: string; additional: string }[] = [];
  item: { id: any; name: string }[] = [];
  paymentTerms: { id: any; name: string }[] = [];
  coaLvl4: { id: any; name: string }[] = [];
  target: string = "SalesReturn";
  tax: { id: any; name: string }[] = [];
  wareHouse: { id: any; name: string }[] = [];
  tableData: any;
  displaySIModal: boolean;
  rowCount: number;
  piRowCount: number;
  rowData: any;
  piRowData: any;
  siDataForEdit: any;
  dataForEdit: any;
  skipCount: number = 0;
  maxCount: number = 10;
  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    name: "",
    VoucherNumber: "",
  };
  frameworkComponents = {
    productSearchEditor: ProductSearchEditorComponent,
  };

  constructor(
    // injector: Injector,
    private fb: FormBuilder,
    private _salesService: SalesService,
    private _hrmService: PurchaseService,
    private _mainSetupService: MainSetupsService,
    private cdr: ChangeDetectorRef,
    private msgService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.salesReturnForm = this.fb.group({
      customerCOALevel04Id: ["", [Validators.required]],
      referenceNumber: [""],
      issueDate: ["", [Validators.required]],
      isReturnAgainstSalesInvoice: [false],
      voucherNumber: [""],
      totalAmount: [""],
      remarks: "",
      salesReturnDetails: [[]],
    });
  }

  ngOnInit(): void {
    this.getAll();
    this.fetchDropdownData("Client");
    this.fetchDropdownData("Warehouse");
    this.fetchDropdownData("Unit");
    this.fetchDropdownData("Item");
  }

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
      headerName: "Product",
      field: "itemId",
      editable: true,
      resizable: true,
      width: 220,
      cellEditor: "productSearchEditor", // 👈 Custom searchable dropdown
      cellEditorParams: () => ({
        valuesRaw: this.item, // 👈 Pass full [{ id, name }] list
      }),
      valueGetter: (params) => {
        const item = this.item.find((i) => i.id === params.data.itemId);
        return item ? item.name : "";
      },
      valueSetter: (params) => {
        const selectedItem = this.item.find((i) => i.id === params.newValue);
        if (selectedItem) {
          params.data.itemId = selectedItem.id;
          this.onProductChange(params); // 🔁 Triggers unit fetch
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
          values: params.data.unitOptions || [], // <- use per-row unit options
        };
      },
      valueGetter: (params) => {
        const unit = this.unit.find((unit) => unit.id === params.data.unitId);
        return unit ? unit.name : "";
      },
      valueSetter: (params) => {
        const selectedUnit = this.unit.find(
          (unit) => unit.name === params.newValue
        );
        if (selectedUnit) {
          params.data.unitId = selectedUnit.id;
          this.onUnitChange(params);
          return true;
        }
        return false;
      },
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
      headerName: "Invoice Qty",
      field: "salesInvoiceQty",
      editable: false,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Returned Qty",
      field: "returnedQty",
      editable: true,
      resizable: true,
      width: 120,
      valueParser: function (params) {
        const newValue = parseFloat(params.newValue);
        return isNaN(newValue) ? null : newValue;
      },
    },
    {
      headerName: "Rate",
      field: "rate",
      editable: true,
      resizable: true,
      width: 120,
    },
    {
      headerName: "Last Sale Rate",
      field: "lastSaleRate",
      editable: false,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Total Amount",
      field: "grandTotal",
      editable: false,
      resizable: true,
      width: 150,
      valueParser: function (params) {
        const newValue = parseFloat(params.newValue);
        return isNaN(newValue) ? null : newValue;
      },
    },
  ];
  private getDefaultWarehouseId(): number | null {
    const dukkan = this.wareHouse.find(
      (w) => (w.name || "").toUpperCase() === "DUKKAN"
    );
    return dukkan ? dukkan.id : this.wareHouse[0]?.id ?? null;
  }
  onAddRow() {
    const newItem: Record<string, any> = {
      salesInvoiceQty: 0,
    };

    // create empty fields for every column
    this.colDefs.forEach((colDef) => {
      if (colDef.field) newItem[colDef.field] = null;
    });

    /* 🔹 default warehouse = “DUKKAN” */
    newItem.warehouseId = this.getDefaultWarehouseId();

    // push row to top & refresh grid
    this.rowData.unshift(newItem);
    if (this.gridApi) this.gridApi.setRowData(this.rowData);

    this.rowCount = this.gridApi.getDisplayedRowCount();
    this.calculateTotalAmount();
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
  calculateTotalAmount() {
    let totalAmount = 0;
    if (this.gridApi) {
      this.gridApi.forEachNode((node) => {
        if (node.data.grandTotal) {
          totalAmount += Number(node.data.grandTotal);
        }
      });
      this.salesReturnForm.get("totalAmount").setValue(totalAmount);
    }
  }
  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.rowData = [];
    this.rowSelection = "multiple";
  }

  onCellValueChanged(params) {
    const data = params.data;

    // Only validate returned quantity if this is a return against sales invoice
    if (
      this.salesReturnForm.get("isReturnAgainstSalesInvoice").value &&
      data.returnedQty &&
      data.salesInvoiceQty
    ) {
      if (data.returnedQty > data.salesInvoiceQty) {
        data.returnedQty = 0;
        data.grandTotal = 0;
        this.msgService.add({
          severity: "error",
          detail: "Returned Quantity Cannot be greater than Invoice Qty",
          life: 2000,
        });
      }
    }

    // Always calculate amount if returnedQty exists
    if (data.returnedQty) {
      const Amount = data.returnedQty * (data.rate || data.lastSaleRate || 0);
      data.grandTotal = Amount;
    }

    this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
    this.calculateTotalAmount();
  }
  onUnitChange(params: any) {
    const unitId = params.data.unitId;
    const itemId = params.data.itemId;

    if (!unitId || !itemId) return;

    // 1️⃣ Auto-set warehouse based on unit
    const selectedUnit = this.unit.find((u) => u.id === unitId);
    const unitName = selectedUnit?.name?.toLowerCase();

    if (unitName === "1kg") {
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

    // 2️⃣ Fetch item pricing details
    this._salesService
      .getDetailsForItem(itemId, unitId, "SalesOrder")
      .subscribe({
        next: (response) => {
          let respData = response;

          const price = respData.perBagPrice ?? respData.rate ?? 0;

          params.data.rate = price;
          params.data.perBagPrice = price;

          this.cdr.detectChanges();
          this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
        },
      });
  }

  onProductChange(params: any) {
    const itemId = params.data.itemId;
    if (!itemId) return;

    this._salesService.getItemUnits(itemId, "Item").subscribe({
      next: (response) => {
        this.dataForEdit = response;
        // this.dataForEdit = response;
        params.data.unitId = this.dataForEdit[0]?.unitId;

        // 🔑 Store unit options in the current row
        params.data.unitOptions = this.dataForEdit.map((u) => u.unitName);

        const supplierId = this.salesReturnForm.get(
          "customerCOALevel04Id"
        )?.value;
        if (!supplierId) return;

        this._salesService
          .getLastSalesRate(this.target, itemId, params.data.unitId, supplierId)
          .subscribe({
            next: (rate: number) => {
              params.data.lastSaleRate = rate;

              // Force grid to refresh this cell
              this.gridApi.refreshCells({
                rowNodes: [params.node],
                columns: ["lastSaleRate"],
                force: true,
              });
              this.onUnitChange(params);
            },
            error: (err) => {
              console.error("Failed to fetch rate:", err);
            },
          });
      },
    });
  }

  save() {
    this.saving = true;

    if (!this.salesReturnForm.valid) {
      this.msgService.add({
        severity: "error",
        detail: "Please fill all Required fields",
        life: 2000,
      });
      this.saving = false;
      return;
    }
    this.rowData = [];
    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      const rowData = node.data;
      rowData.salesInvoiceQty = rowData.salesInvoiceQty || 0;
      this.rowData.push(rowData);
    });
    this.gridApi.setRowData(this.rowData); // Force SrNo recalculation
    this.salesReturnForm.patchValue({
      salesReturnDetails: this.rowData,
      issueDate: moment(this.salesReturnForm.value.issueDate).format(
        "YYYY-MM-DD"
      ),
    });
    this._hrmService
      .create({ ...this.salesReturnForm.value }, this.target)
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
  fetchDropdownData(target) {
    this._salesService.getAllSuggestion(target).subscribe((response: any) => {
      const mappedData = response.items.map((item: any) => ({
        id: item?.id,
        name: item?.name,
        additional: item?.additional,
      }));
      switch (target) {
        case "Warehouse":
          this.wareHouse = mappedData;
          break;
        case "Client":
          this.coaLvl4 = mappedData;
          break;
        case "Item":
          this.item = mappedData;
          break;
        case "Unit":
          this.unit = mappedData;
          break;
        default:
          break;
      }
      this.cdr.detectChanges();
    });
  }
  isFieldInvalid(field: string): any {
    const control = this.salesReturnForm.get(field);
    return control ? control.invalid && control.touched : false;
  }
  onDateChange(value?: any) {
    if (value) {
      this.salesReturnForm.value.issueDate = value;
    }
    if (this.salesReturnForm.value.issueDate) {
      this.getVoucherNumber();
    }
  }
  getAll() {
    this._salesService
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
          this.cdr.detectChanges();
        },
      });
  }
  getVoucherNumber() {
    this._salesService
      .getVoucherNumber("SR", this.salesReturnForm.value.issueDate, this.target)
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
          if (this.salesReturnForm.value.issueDate) {
            this.salesReturnForm.get("voucherNumber").setValue(response);
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
            this.salesReturnForm.patchValue({
              customerCOALevel04Id: this.dataForEdit.customerCOALevel04Id,
              voucherNumber: this.dataForEdit.voucherNumber,
              issueDate: new Date(this.dataForEdit.issueDate),
              referenceNumber: this.dataForEdit.referenceNumber,
              remarks: this.dataForEdit.remarks,
            });

            this.rowData = this.dataForEdit.salesReturnDetails
              .map((item) => ({
                ...item,
                salesInvoiceDetailId: item.salesInvoiceDetailId,
                salesInvoiceQty: item.salesInvoiceQty,
                returnedQty: item.returnedQty,
                rate: item.rate,
                lastSaleRate: item.lastSaleRate,
                grandTotal: item.grandTotal,
                itemId: item.itemId,
                itemName: item.itemName,
                unitId: item.unitId,
                unitName: item.unitName,
              }))
              .slice()
              .reverse();
            this.calculateTotalAmount();
            this.displayModal = true;
            this.cdr.detectChanges();
          },
        });
    } else {
      // Create Mode
      this.editMode = false;
      this.viewMode = false;
      this.salesReturnForm.reset();
      this.salesReturnForm.enable();
      this.rowData = [];
      this.salesReturnForm.value.issueDate = moment(
        this.getTodayDate(),
        "MM/DD/YYYY"
      ).toDate();
      this.getVoucherNumber();
      this.salesReturnForm.patchValue({
        isReturnAgainstSalesInvoice: false,
        issueDate: this.today,
      });
      this.displayModal = true;

      console.log(this.salesReturnForm);
    }
  }
  edit(id: any) {
    this.editMode = true;
    this.viewMode = false;
    this.show(id);
    this.salesReturnForm.enable();
  }
  // onGlobalFilter(table: Table, event: Event) {
  //     table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  //   }

  update() {
    this.saving = true;
    this.rowData = [];
    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      this.rowData.push(node.data);
    });
    this.gridApi.setRowData(this.rowData); // Refresh SrNo
    this.salesReturnForm.patchValue({
      salesReturnDetails: this.rowData,
      issueDate: moment(this.salesReturnForm.value.issueDate).format(
        "YYYY-MM-DD"
      ),
    });
    const updateData = {
      ...this.salesReturnForm.value,
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
  approve(id: number) {
    this.confirmationService.confirm({
      message: "Are you sure?",
      header: "Confirmation",
      icon: "pi pi-exclamation-triangle",
      rejectButtonStyleClass: "p-button-text",
      accept: () => {
        this._salesService.getDataForEdit(id, this.target).subscribe({
          next: (returnData: any) => {
            const details = returnData.salesReturnDetails;

            const itemMap = new Map<
              number,
              { itemId: number; changes: { unitId: number; delta: number }[] }
            >();

            for (const detail of details) {
              const itemId = detail.itemId;
              const unitId = detail.unitId;
              const qty = Number(detail.returnedQty || 0);

              // Skip if invalid itemId
              if (!itemId || qty <= 0) continue;

              const adjustedQty =
                qty * this.getUnitConversionMultiplier(unitId, unitId); // Optional

              if (!itemMap.has(itemId)) {
                itemMap.set(itemId, { itemId, changes: [] });
              }

              itemMap.get(itemId).changes.push({
                unitId,
                delta: adjustedQty, // ⬆️ Add to stock
              });
            }

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

            forkJoin(updateObservables).subscribe({
              next: () => {
                this._salesService.Approve(id, this.target).subscribe(() => {
                  this.msgService.add({
                    severity: "success",
                    summary: "Confirmed",
                    detail: "Sales return approved & stock updated.",
                    life: 2000,
                  });
                  this.getAll();
                });
              },
              error: (err) => {
                this.msgService.add({
                  severity: "error",
                  summary: "Stock Update Failed",
                  detail: err?.message || "Error occurred while updating stock",
                  life: 2000,
                });
              },
            });
          },
          error: () => {
            this.msgService.add({
              severity: "error",
              summary: "Error",
              detail: "Could not fetch sales return data",
              life: 2000,
            });
          },
        });
      },
    });
  }

  getUnitConversionMultiplier(fromUnitId: number, toUnitId: number): number {
    const fromUnit = this.unit.find((u) => u.id === fromUnitId);
    const toUnit = this.unit.find((u) => u.id === toUnitId);
    const fromValue = Number(fromUnit?.additional || 1);
    const toValue = Number(toUnit?.additional || 1);
    return fromValue / toValue;
  }
  viewOnly(id: any) {
    this.viewMode = true;
    this.editMode = false;
    this.show(id);
    this.salesReturnForm.disable();
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
          this.cdr.detectChanges();
        },
      });
  }
  openSI() {
    this.displaySIModal = true;
    this.getAllSaleInvoice();
  }
  getAllSaleInvoice() {
    let customerCOALevel04Id = this.salesReturnForm.value.customerCOALevel04Id;
    if (customerCOALevel04Id != null) {
      this._salesService
        .getAllByCustomer("SalesInvoice", customerCOALevel04Id)
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
            this.siTableData = response.items.filter(
              (item) => item.status == "APPROVED"
            );
            this.cdr.markForCheck();
          },
        });
    } else {
      this._salesService
        .getAll("SalesInvoice")
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
            this.siTableData = response.items.filter(
              (item) => item.status == "APPROVED"
            );
            this.cdr.markForCheck();
          },
        });
    }
  }
  selectPurchaseOrder(id: number) {
    debugger;
    this._salesService
      .getDataForEdit(id, "SalesInvoice")
      .pipe(
        finalize(() => {}),
        catchError((error) => {
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: error.error?.error?.message,
            life: 2000,
          });
          return throwError(error.error?.error?.message);
        })
      )
      .subscribe({
        next: (response) => {
          this.siDataForEdit = response;
          this.salesReturnForm.patchValue({
            customerCOALevel04Id: this.siDataForEdit.customerCOALevel04Id,
            referenceNumber: this.siDataForEdit.voucherNumber,
            remarks: this.siDataForEdit.remarks,
            isReturnAgainstSalesInvoice: true,
            issueDate: this.today, // ✅ Add this line
          });

          this.rowData = this.siDataForEdit.salesInvoiceDetails.map((item) => {
            const returnedQty = 0;
            const lastSaleRate = item.lastSaleRate || 0;

            return {
              ...item,
              id: item.salesInvoiceDetailId,
              salesInvoiceQty: item.invoiceQty,
              itemId: item.itemId,
              itemName: item.itemName,
              unitId: item.unitId,
              unitName: item.unitName,
              returnedQty: returnedQty,
              lastSaleRate: lastSaleRate,
              grandTotal: 0,
            };
          });

          this.calculateTotalAmount();
          this.displaySIModal = false;
          this.cdr.detectChanges();
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
    this._hrmService.getAllRecord(this.target, this.filters).subscribe({
      next: (response) => {
        this.tableData = response.items;
        this.count = response.totalCount;

        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  isReturnAgainstSalesInvoiceEnabled(): boolean {
    return (
      this.salesReturnForm.get("isReturnAgainstSalesInvoice").value === false
    );
  }

  downloadReport(salesReturnId: number) {
    const reportName = "Sales Return Report";
    const reportUrl = "%2fPreviews%2fRPT_Preview_Sale_Return";
    const reportFormat = 0;

    const queryParams = `ReportName=${encodeURIComponent(
      reportName
    )}&ReportUrl=${encodeURIComponent(reportUrl)}&format=${reportFormat}`;
    const fullUrl = `${this.baseurl}/api/services/app/Reporting/DownloadReport?${queryParams}`;

    const bodyParams = [
      {
        parameterName: "SalesReturnId", // Or PurchaseInvoiceCode if your backend expects that
        parameterValue: salesReturnId.toString(),
      },
    ];

    this._salesService.generateReport(fullUrl, bodyParams).subscribe({
      next: (response: Blob) => {
        const blob = new Blob([response], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");
      },
      error: () => {
        this.msgService.add({
          severity: "error",
          summary: "Report Error",
          detail: "Failed to generate the report.",
        });
      },
    });
  }
}
