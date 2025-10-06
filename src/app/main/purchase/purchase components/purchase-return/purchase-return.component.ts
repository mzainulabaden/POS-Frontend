import { ChangeDetectorRef, Component } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
import { PurchaseService } from "../../shared/services/purchase.service";
import { MessageService, ConfirmationService } from "primeng/api";
import {
  catchError,
  finalize,
  forkJoin,
  map,
  Subscription,
  switchMap,
  throwError,
} from "rxjs";
import { Table } from "primeng/table";
import * as moment from "moment";
import { MainSetupsService } from "@app/main/main-setups/shared/services/main-setups.service";
import { ProductSearchEditorComponent } from "../../../search-component/product-search-editor.component";

@Component({
  selector: "app-purchase-return",
  templateUrl: "./purchase-return.component.html",
  styleUrl: "./purchase-return.component.css",
})
export class PurchaseReturnComponent {
  displayModal: boolean;
  currentDate: Date = new Date();
  loading: boolean;
  salesReturnForm: FormGroup;
  saving: boolean;
  protected gridApi: GridApi;
  rowSelection: string;

  count: number;
  editMode: boolean;
  PurchaseReturnForm: FormGroup;

  viewMode: boolean;
  currentPage: number = 1;
  units: { id: any; name: string; additional: string }[] = [];
  item: { id: any; name: string }[] = [];
  paymentTerms: { id: any; name: string }[] = [];
  coaLvl4: { id: any; name: string }[] = [];
  broker: { id: any; name: string }[] = [];
  supplier: { id: any; name: string }[] = [];
  tax: { id: any; name: string }[] = [];
  wareHouse: { id: any; name: string }[] = [];
  tableData: any;
  baseurl: string = "http://173.249.23.108:6063";
  rowCount: number;
  piRowCount: number;
  rowData: any;
  piRowData: any;
  skipCount: number = 0;
  maxCount: number = 10;
  target: string = "PurchaseReturn";
  displayPIModal: boolean;
  piTableData: any;
  prDataForEdit: any;
  selectedDate: Date;
  dataForEdit: any;
  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    name: "",
    VoucherNumber: "",
  };
  frameworkComponents = {
    productSearchEditor: ProductSearchEditorComponent,
  };

  getTodayDate(): Date {
    return new Date(); // Return current date
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
      width: 150,
      cellEditor: "productSearchEditor", // 👈 Custom search dropdown
      cellEditorParams: () => ({
        valuesRaw: this.item, // [{ id, name }]
      }),
      valueGetter: (params) => {
        const item = this.item.find((i) => i.id === params.data.itemId);
        return item ? item.name : "";
      },
      valueSetter: (params) => {
        const selectedItem = this.item.find((i) => i.id === params.newValue);
        if (selectedItem) {
          params.data.itemId = selectedItem.id;
          this.onProductChange(params);
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
      width: 200,
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
          return true;
        }
        return false;
      },
    },
    {
      headerName: "Price per KG",
      field: "pricePerKg",
      editable: true,
      resizable: true,
      width: 120,
    },
    {
      headerName: "Price per Bag",
      field: "pricePerBag",
      editable: true,
      resizable: true,
      width: 120,
    },
    {
      headerName: "Quantity (Bag)",
      field: "quantity",
      editable: true,
      resizable: true,
      width: 120,
    },
    {
      headerName: "Total Quantity (KG)",
      field: "actualQuantity",
      editable: false,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Returned Quantity",
      field: "quantityReturned",
      editable: true,
      resizable: true,
      width: 120,
      valueParser: function (params) {
        const newValue = parseFloat(params.newValue);
        return isNaN(newValue) ? null : newValue;
      },
    },
    {
      headerName: "Last Purchase Rate",
      field: "lastPurchaseRate",
      editable: false,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Total",
      field: "grandTotal",
      editable: false,
      resizable: false,
      width: 120,
      valueParser: function (params) {
        const newValue = parseFloat(params.newValue);
        return isNaN(newValue) ? null : newValue;
      },
    },
  ];

  onAddRow() {
    const newItem: Record<string, any> = { manualEntry: true };
    this.colDefs.forEach((colDef) => {
      if (colDef.field) {
        newItem[colDef.field] = null;
      }
    });

    // Add the row to top
    this.rowData.unshift(newItem);

    // Reset rowData in AG Grid to refresh SrNo
    if (this.gridApi) {
      this.gridApi.setRowData(this.rowData);
    }
  }
  onRemoveSelected() {
    const selectedNodes = this.gridApi.getSelectedNodes();
    if (selectedNodes.length > 0) {
      const dataToRemove = selectedNodes.map((node) => node.data);
      this.gridApi.applyTransaction({ remove: dataToRemove });
      this.rowData = [];
      this.gridApi.forEachNode((node) => this.rowData.push(node.data));
    }
    this.calculatePRTotalAmount();
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.rowData = [];
    this.rowSelection = "multiple";
  }

  onCellValueChanged(params) {
    const data = params.data;
    if (params.colDef.field === "pricePerKg") {
      params.data.perBagPrice = params.data.pricePerKg;
    }
    data.quantity = Number(data.quantity) || 0;
    const selectedUnit = this.units.find((unit) => unit.id === data.unitId);
    const unitMultiplier = selectedUnit
      ? Number(selectedUnit["additional"]) || 0
      : 0;
    data.actualQuantity = Math.max(data.quantity * unitMultiplier, 0);
    if (data.quantityReturned && data.pricePerKg) {
      if (data.quantityReturned > data.quantity) {
        data.quantityReturned = 0;
        data.grandTotal = 0;
        this.msgService.add({
          severity: "error",
          detail: "Returned Quantity cannot exceed Invoice Quantity",
          life: 2000,
        });
      }

      const Amount = data.quantityReturned * data.pricePerBag;
      data.grandTotal = Amount;
    }
    this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
    this.calculatePRTotalAmount();
  }
  onProductChange(params: any) {
    const itemId = params.data.itemId;
    if (!itemId) return;

    this._hrmService.getItemUnits(itemId, "Item").subscribe({
      next: (response) => {
        const units = response || [];

        // Default to first unit (make sure units actually exist)
        const unitId = units[0]?.unitId;
        if (!unitId) return;

        // Update grid row data
        params.data.unitId = unitId;
        params.data.unitOptions = units.map((u) => u.unitName);

        // Get supplier ID from form
        const supplierId = this.PurchaseReturnForm.get(
          "supplierCOALevel04Id"
        )?.value;
        if (!supplierId) return;

        // Call API to get latest rate
        this._hrmService
          .getLastPurchaseRate(this.target, itemId, unitId, supplierId)
          .subscribe({
            next: (rate: number) => {
              params.data.lastPurchaseRate = rate ?? 0;

              // Force grid to refresh this cell
              this.gridApi.refreshCells({
                rowNodes: [params.node],
                columns: ["lastPurchaseRate"],
                force: true,
              });
            },
            error: (err) => {
              console.error("Failed to fetch rate:", err);
            },
          });

        // Refresh unit column after assigning unit options
        this.cdr.detectChanges();
        this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
      },
      error: (err) => {
        console.error("Unit fetch error:", err);
      },
    });
  }
  calculatePRTotalAmount() {
    let totalAmount = 0;
    if (this.gridApi) {
      this.gridApi.forEachNode((node) => {
        if (node.data.grandTotal) {
          totalAmount += Number(node.data.grandTotal);
        }
      });
      this.PurchaseReturnForm.get("total").setValue(totalAmount);
      this.cdr.detectChanges();
    }
  }

  constructor(
    private fb: FormBuilder,
    private _hrmService: PurchaseService,
    private _mainSetupService: MainSetupsService,
    private cdr: ChangeDetectorRef,
    private msgService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.PurchaseReturnForm = this.fb.group({
      issueDate: [new Date(), [Validators.required]],
      remarks: "",
      supplierCOALevel04Id: ["", [Validators.required]],
      referenceNumber: "",
      voucherNumber: "",
      warehouseId: "",
      total: "",
      purchaseReturnDetails: [[]],
    });
  }

  ngOnInit(): void {
    this.getAll();
    this.fetchDropdownData("Tax");
    this.fetchDropdownData("Broker");
    this.fetchDropdownData("Supplier");
    this.fetchDropdownData("PaymentMode");
    this.fetchDropdownData("Unit");
    this.fetchDropdownData("Item");
    this.fetchDropdownData("Warehouse");
    // this.prSetupCalculations();
  }
  isFieldInvalid(field: string): any {
    // const control = this.vehicleForm.get(field);
    // return control ? control.invalid && control.touched : false;
  }
  onDateChange() {
    //
    // if (value) {
    this.PurchaseReturnForm.value.issueDate = this.selectedDate;
    // }
    if (this.PurchaseReturnForm.value.issueDate) {
      this.getVoucherNumber();
    }
  }
  getVoucherNumber() {
    this._hrmService
      .getVoucherNumber(
        "PR",
        this.PurchaseReturnForm.value.issueDate,
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
          if (this.PurchaseReturnForm.value.issueDate) {
            this.PurchaseReturnForm.get("voucherNumber").setValue(response);
          }
        },
        error: (err) => {
          console.log("An error occurred", err);
        },
      });
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
          this.tableData = response.items;

          this.count = response.totalCount;
          this.cdr.detectChanges();
        },
      });
  }
  getAllPurchaseInvoice() {
    let supplierId = this.PurchaseReturnForm.get("supplierCOALevel04Id").value;
    if (supplierId != null) {
      this._hrmService
        .getAllBySupplier(
          "PurchaseInvoice",
          this.PurchaseReturnForm.get("supplierCOALevel04Id").value
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
            this.piTableData = response.items.filter(
              (item) => item.status == "APPROVED"
            );
            console.log(this.piTableData);
            this.cdr.markForCheck();
          },
        });
    } else {
      this._hrmService
        .getAll("PurchaseInvoice")
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
            this.piTableData = response.items.filter(
              (item) => item.status == "APPROVED"
            );
            console.log(this.piTableData);
            this.cdr.markForCheck();
          },
        });
    }
  }
  save() {
    this.saving = true;
    this.gridApi.stopEditing();

    if (!this.PurchaseReturnForm.valid) {
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
      const row = { ...node.data };
      this.rowData.push({
        ...row,
        id: 0,
        purchaseOrderDetailId: row.id,
        lastPurchaseRate: row.lastPurchaseRate ?? 0,
      });
    });

    // Reset to force SrNo recalculation
    this.gridApi.setRowData(this.rowData);
    this.PurchaseReturnForm.patchValue({
      purchaseReturnDetails: this.rowData,
      issueDate: moment(this.PurchaseReturnForm.value.issueDate).format(
        "YYYY-MM-DD"
      ),
      discountAmount: 0,
      discountPercentage: 0,
    });
    this._hrmService
      .create({ ...this.PurchaseReturnForm.value }, this.target)
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

  show(id?: number) {
    if (id) {
      // Edit Mode
      this._hrmService
        .getData(id, this.target)
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
            this.PurchaseReturnForm.patchValue({
              supplierCOALevel04Id: this.dataForEdit.supplierCOALevel04Id,
              brokerCOALevel04Id: this.dataForEdit.brokerCOALevel04Id,
              taxCOALevel04Id: this.dataForEdit.taxCOALevel04Id,
              warehouseId: this.dataForEdit.warehouseId,
              tax: this.dataForEdit.tax,
              brokerAmount: this.dataForEdit.brokerAmount,
              brokerPercentage: this.dataForEdit.brokerPercentage,
              veAmount: this.dataForEdit.veAmount,
              voucherNumber: this.dataForEdit.voucherNumber,
              referenceNumber: this.dataForEdit.referenceNumber,
              // issueDate: new Date(this.dataForEdit.issueDate),
              paymentModeId: this.dataForEdit.paymentModeId,
              total: this.dataForEdit.total,
              freight: this.dataForEdit.freight,
              remarks: this.dataForEdit.remarks,
            });
            this.rowData = (response.purchaseReturnDetails || [])
              .slice()
              .reverse();

            if (this.gridApi) {
              this.gridApi.setRowData(this.rowData);
            }

            // ✅ Recalculate total immediately on load
            this.calculatePRTotalAmount();

            this.displayModal = true;

            this.cdr.detectChanges();
          },
        });
    } else {
      // Create Mode
      this.editMode = false;
      this.viewMode = false;
      this.PurchaseReturnForm.reset();
      this.PurchaseReturnForm.enable();
      this.PurchaseReturnForm.patchValue({
        issueDate: this.currentDate,
      });
      this.getVoucherNumber();
      this.rowData = [];
      this.displayModal = true;
    }
  }
  edit(id: any) {
    this.editMode = true;
    this.viewMode = false;
    this.show(id);
    this.PurchaseReturnForm.enable();
  }
  update() {
    this.saving = true;
    this.rowData = [];
    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      const row = { ...node.data };
      this.rowData.push({
        ...row,
        id: row.id || 0,
        purchaseOrderDetailId: row.purchaseOrderDetailId || row.id || 0,
        lastPurchaseRate: row.lastPurchaseRate ?? 0,
      });
    });

    // Force grid refresh to update SrNo
    this.gridApi.setRowData(this.rowData);
    this.PurchaseReturnForm.patchValue({
      purchaseReturnDetails: this.rowData,
      issueDate: moment(this.PurchaseReturnForm.value.issueDate).format(
        "YYYY-MM-DD"
      ),
    });
    const updateData = {
      ...this.PurchaseReturnForm.value,
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
  openPurchaseInvoice() {
    this.displayPIModal = true;
    this.getAllPurchaseInvoice();
  }

  selectPurchaseInvoice(id: number) {
    this._hrmService
      .getData(id, "PurchaseInvoice")
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
          this.prDataForEdit = response;
          this.PurchaseReturnForm.patchValue({
            supplierCOALevel04Id: this.prDataForEdit.supplierCOALevel04Id,
            brokerCOALevel04Id: this.prDataForEdit.brokerCOALevel04Id,
            taxCOALevel04Id: this.prDataForEdit.taxCOALevel04Id,
            warehouseId: this.prDataForEdit.warehouseId,
            tax: this.prDataForEdit.tax,
            brokerAmount: this.prDataForEdit.brokerAmount,
            brokerPercentage: this.prDataForEdit.brokerPercentage,
            veAmount: this.prDataForEdit.veAmount,
            referenceNumber: this.prDataForEdit.voucherNumber,
            issueDate: new Date(this.prDataForEdit.issueDate),
            paymentModeId: this.prDataForEdit.paymentModeId,
            total: this.prDataForEdit.total,
            freight: this.prDataForEdit.freight,
            remarks: this.prDataForEdit.remarks,
            localExpense: this.prDataForEdit?.localExpense,
            builtyExpense: this.prDataForEdit?.builtyExpense,
            netTotal: this.prDataForEdit.netTotal,
          });
          this.rowData = this.prDataForEdit.purchaseInvoiceDetails.map(
            (row) => {
              const price = row.perBagPrice ?? row.pricePerKg ?? 0;
              return {
                ...row,
                manualEntry: false,
                pricePerKg: price, // visible in grid
                perBagPrice: price, // sent to API
              };
            }
          );

          if (this.prDataForEdit.netTotal > this.prDataForEdit.total) {
            // Get the total quantity from the grid
            let totalQuantity = this.rowData.reduce(
              (sum, row) => sum + (Number(row.actualQuantity) || 0),
              0
            );
            let price = this.prDataForEdit.netTotal - this.prDataForEdit.total;

            if (totalQuantity > 0 && price > 0) {
              // Update the grid values
              this.rowData = this.rowData.map((row) => {
                return {
                  ...row,
                  costRate:
                    row.pricePerKg + +(totalQuantity / price).toFixed(2), // Set costRate
                };
              });

              // Refresh the grid with updated values
              this.gridApi.refreshCells(this.rowData);
            }
          } else {
            this.rowData = this.rowData.map((row) => {
              return {
                ...row,
                costRate: row.pricePerKg, // Set costRate
              };
            });

            // Refresh the grid with updated values
            this.gridApi.setRowData(this.rowData);
          }
          this.displayPIModal = false;
          this.cdr.detectChanges();
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
  approve(id: number) {
    this.confirmationService.confirm({
      message: "Are you sure?",
      header: "Confirmation",
      icon: "pi pi-exclamation-triangle",
      rejectButtonStyleClass: "p-button-text",
      accept: () => {
        this._hrmService.getData(id, this.target).subscribe({
          next: (invoiceData: any) => {
            const details = invoiceData.purchaseReturnDetails;

            const itemMap = new Map<
              number,
              { itemId: number; changes: { unitId: number; delta: number }[] }
            >();

            for (const detail of details) {
              const itemId = detail.itemId;
              const unitId = detail.unitId;
              const qty = Number(detail.quantityReturned || 0);

              if (!itemId || qty <= 0) continue;

              const adjustedQty =
                qty * this.getUnitConversionMultiplier(unitId, unitId); // if same unit

              if (!itemMap.has(itemId)) {
                itemMap.set(itemId, { itemId, changes: [] });
              }

              itemMap.get(itemId).changes.push({
                unitId,
                delta: -adjustedQty, // Subtracting from minStockLevel
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
                this._hrmService.Approve(id, this.target).subscribe(() => {
                  this.msgService.add({
                    severity: "success",
                    summary: "Confirmed",
                    detail: "Purchase return approved & stock updated.",
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
                    err?.message ||
                    "Error occurred while updating stock levels",
                  life: 2000,
                });
              },
            });
          },
          error: () => {
            this.msgService.add({
              severity: "error",
              summary: "Error",
              detail: "Could not fetch purchase return data",
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

  viewOnly(id: any) {
    this.viewMode = true;
    this.editMode = false;
    this.show(id);
    this.PurchaseReturnForm.disable();
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

  fetchDropdownData(target) {
    this._hrmService.getAllSuggestion(target).subscribe((response: any) => {
      const mappedData = response.items.map((item: any) => ({
        id: item?.id,
        name: item?.name,
        additional: item?.additional,
      }));
      switch (target) {
        case "Unit":
          this.units = mappedData;
          break;
        case "Item":
          this.item = mappedData;
          break;
        case "Tax":
          this.tax = mappedData;
          break;
        case "Supplier":
          this.supplier = mappedData;
          break;
        case "Broker":
          this.broker = mappedData;
          break;
        case "PaymentMode":
          this.paymentTerms = mappedData;
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

  downloadReport(purchaseReturnId: number) {
    const reportName = "Purchase Return Report";
    const reportUrl = "%2fPreviews%2fRPT_Preview_Purchase_Return";
    const reportFormat = 0;

    const queryParams = `ReportName=${encodeURIComponent(
      reportName
    )}&ReportUrl=${encodeURIComponent(reportUrl)}&format=${reportFormat}`;
    const fullUrl = `${this.baseurl}/api/services/app/Reporting/DownloadReport?${queryParams}`;

    const bodyParams = [
      {
        parameterName: "PurchaseReturnId", // Or PurchaseInvoiceCode if your backend expects that
        parameterValue: purchaseReturnId.toString(),
      },
    ];

    this._hrmService.generateReport(fullUrl, bodyParams).subscribe({
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
