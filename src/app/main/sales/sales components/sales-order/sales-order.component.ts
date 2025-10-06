import { ChangeDetectorRef, Component, Injector } from "@angular/core";
import { Table } from "primeng/table";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { SalesService } from "../../shared/services/sales.service";
import { MessageService, ConfirmationService } from "primeng/api";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
import { catchError, finalize, throwError } from "rxjs";
import * as moment from "moment";
import { toDate } from "@node_modules/date-fns/toDate";
import { AbpSessionService } from "abp-ng2-module";
import { ProductSearchEditorComponent } from "../../../search-component/product-search-editor.component";

@Component({
  selector: "app-sales-order",
  templateUrl: "./sales-order.component.html",
  styleUrl: "./sales-order.component.css",
})
export class SalesOrderComponent {
  loading: boolean;
  tableData: any;
  saving: boolean;
  addRow: boolean;
  dataForEdit: any;
  piDataForEdit: any;
  currentPage: number = 1;
  skipCount: number = 0;
  maxCount: number = 10;
  target: string = "SalesOrder";
  protected gridApi: GridApi;
  protected setParms;
  rowSelection: string;
  piRowSelection: string;
  rowCount: number;
  rowData: any;
  today: Date = new Date();
  displayModal: boolean;
  salesOrderForm: FormGroup;
  displayPIModal: boolean;
  poTableData: any;
  count: number;
  displayModal1: boolean;
  designations: any;
  editMode: boolean;
  viewMode: boolean;
  units: { id: any; name: string; additional: string }[] = [];
  item: { id: any; name: string }[] = [];
  paymentTerms: { id: any; name: string }[] = [];
  coaLvl4: { id: any; name: string }[] = [];
  client: { id: any; name: string }[] = [];
  tax: { id: any; name: string }[] = [];
  userId: number;
  wareHouse: { id: any; name: string }[] = [];
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
    private _hrmService: SalesService,
    private _sessionService: AbpSessionService,
    private cdr: ChangeDetectorRef,
    private msgService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.salesOrderForm = this.fb.group({
      issueDate: ["", [Validators.required]],
      remarks: "",
      referenceNumber: ["", [Validators.required]],
      paymentModeId: ["", [Validators.required]],
      customerCOALevel04Id: ["", [Validators.required]],

      employeeId: [""],
      employeeName: [""],
      commissionAmount: [""],
      totalAmount: "",
      salesOrderDetails: [[]],
    });
  }
  ngOnInit(): void {
    this.getAll();
    this.fetchDropdownData("Item");
    this.fetchDropdownData("PaymentMode");
    this.fetchDropdownData("Unit");
    this.fetchDropdownData("Client");
    this.fetchDropdownData("Warehouse");
    this.fetchDropdownData("Employee");
  }

  colDefs: ColDef[] = [
    {
      headerName: "SrNo",
      editable: false,
      field: "srNo",
      sortable: true,
      width: 70,
      valueGetter: "node.rowIndex+1",
      suppressSizeToFit: true,
    },
    {
      headerName: "Product",
      field: "itemId",
      editable: true,
      resizable: true,
      width: 150,
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
      headerName: "Unit",
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
      headerName: "Rate (Per KG)",
      field: "pricePerKg",
      editable: true,
      resizable: true,
      width: 90,
    },
    {
      headerName: "Min Price (KG)",
      field: "itemMinRate",
      editable: true,
      resizable: true,
      width: 120,
    },
    {
      headerName: "Max Price (KG)",
      field: "itemMaxRate",
      editable: true,
      resizable: true,
      width: 120,
    },
    {
      headerName: "Stock",
      field: "minStockLevel",
      editable: false,
      resizable: true,
      width: 90,
    },
    {
      headerName: "Qty",
      field: "orderedQty",
      editable: true,
      resizable: true,
      width: 90,
      valueParser: function (params) {
        const newValue = parseFloat(params.newValue);
        return isNaN(newValue) ? null : newValue;
      },
    },
    // {
    //   headerName: "Bag Qty",
    //   field: "bagQty",
    //   editable: true,
    //   resizable: true,
    //   width: 90,
    //   valueParser: function (params) {
    //     const newValue = parseFloat(params.newValue);
    //     return isNaN(newValue) ? null : newValue;
    //   },
    // },

    {
      headerName: "Last Sale Rate",
      field: "lastSaleRate",
      editable: false,
      resizable: true,
      width: 160,
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
      headerName: "Rate (Per Bag)",
      field: "rate",
      editable: true,
      resizable: true,
      width: 90,
    },
    {
      headerName: "Total Price",
      field: "grandTotal",
      editable: false,
      resizable: true,
      width: 180,
    },
  ];
  // grid for invoice:

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
    this.rowData.unshift(newItem);
    if (this.gridApi) {
      this.gridApi.setRowData(this.rowData);
    }
    this.calculateTotalAmount();
    this.recalculateCommission();
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
    this.recalculateCommission();
  }
  recalculateCommission() {
    const grandTotal = Number(this.salesOrderForm.get("totalAmount")?.value);
    const commission = this.calculateCommission(grandTotal);

    this.salesOrderForm.patchValue({
      commissionAmount: commission,
    });
    this.cdr.detectChanges();
  }
  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.rowData = [];
    this.rowSelection = "multiple";
  }
  onCellValueChanged(params) {
    const data = params.data;

    // ✅ Handle unit change
    if (params.colDef.field === "unitId") {
      const itemId = data.itemId;
      const unitId = data.unitId;
    }

    // ✅ Handle rate (per bag) updates and bounds
    if (params.colDef.field === "rate") {
      data.perBagPrice = data.rate;

      const minRate = data.itemMinRate || 0;
      const maxRate = data.itemMaxRate || 0;

      if (data.rate < minRate) {
        data.rate = data.perBagPrice = minRate;
      } else if (data.rate > maxRate) {
        data.rate = data.perBagPrice = maxRate;
      }
    }

    // ✅ Clamp and apply pricePerKg
    if (params.colDef.field === "pricePerKg") {
      const min = data.itemMinRate || 0;
      const max = data.itemMaxRate || 0;
      const unit = this.units.find((u) => u.id === data.unitId);
      const multiplier = parseFloat(unit?.additional) || 1;

      let enteredPricePerKg = parseFloat(data.pricePerKg);

      if (isNaN(enteredPricePerKg)) {
        data.pricePerKg = null;
        data.rate = 0;
        this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
        return;
      }

      // Clamp to min/max bounds
      if (enteredPricePerKg < min) {
        this.msgService.add({
          severity: "warn",
          summary: "Adjusted",
          detail: `Price per Kg was below minimum. Adjusted to ${min}`,
          life: 2500,
        });
        enteredPricePerKg = min;
      } else if (enteredPricePerKg > max) {
        this.msgService.add({
          severity: "warn",
          summary: "Adjusted",
          detail: `Price per Kg exceeded maximum. Adjusted to ${max}`,
          life: 2500,
        });
        enteredPricePerKg = max;
      }

      data.pricePerKg = enteredPricePerKg;
      data.rate = parseFloat((enteredPricePerKg * multiplier).toFixed(2));
      data.perBagPrice = data.rate;
      data.grandTotal = (data.orderedQty || 0) * data.rate;

      this.calculateTotalAmount();
      this.recalculateCommission();
      this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
    }

    // ✅ Handle orderedQty or rate edits
    if (["orderedQty", "rate"].includes(params.colDef.field)) {
      data.orderedQty = Number(data.orderedQty) || 0;
      data.grandTotal = data.orderedQty * data.rate;
      this.calculateTotalAmount();
      this.recalculateCommission();
      this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
    }

    // ✅ Validate against stock level
    const orderQty = data.orderedQty || 0;
    const currentStock = data.minStockLevel || 0;
    if (orderQty > currentStock) {
      this.msgService.add({
        severity: "warn",
        summary: "Invalid Entry",
        detail: `Cannot order more than available stock (${currentStock})`,
        life: 2500,
      });
      data.orderedQty = 0;
      data.grandTotal = 0;
      this.salesOrderForm.get("totalAmount").setValue(0);
      this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
    }
  }

  calculateTotalAmount() {
    let totalAmount = 0;
    if (this.gridApi) {
      this.gridApi.forEachNode((node) => {
        if (node.data.grandTotal) {
          totalAmount += Number(node.data.grandTotal);
        }
      });
      this.salesOrderForm.get("totalAmount").setValue(totalAmount);
    }
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
        case "Client":
          this.client = mappedData;
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
  onProductChange(params: any) {
    const itemId = params.data.itemId;
    if (!itemId) return;

    this._hrmService.getItemUnits(itemId, "Item").subscribe({
      next: (response) => {
        this.dataForEdit = response;
        // this.dataForEdit = response;
        params.data.unitId = this.dataForEdit[0]?.unitId;

        // 🔑 Store unit options in the current row
        params.data.unitOptions = this.dataForEdit.map((u) => u.unitName);
        this.fetchCurrentStock(params);
        this.cdr.detectChanges();
        this.gridApi.refreshCells({ rowNodes: [params.node], force: true });

        const supplierId = this.salesOrderForm.get(
          "customerCOALevel04Id"
        )?.value;
        if (!supplierId) return;

        this._hrmService
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

  onUnitChange(params: any) {
    const { unitId, itemId } = params.data;
    if (!unitId || !itemId) return;

    // Get selected unit
    const selectedUnit = this.units.find((unit) => unit.id === unitId);
    const unitName = selectedUnit?.name?.toLowerCase();

    // 1️⃣ Auto-select warehouse based on unit
    if (unitName === "1kg") {
      const openWarehouse = this.wareHouse.find(
        (warehouse) => warehouse.name.toLowerCase() === "open warehouse"
      );
      if (openWarehouse) {
        params.data.warehouseId = openWarehouse.id;
        params.node.setDataValue("warehouseId", openWarehouse.id);
      }
    } else {
      const dukaanWarehouse = this.wareHouse.find(
        (warehouse) => warehouse.name.toLowerCase() === "dukkan"
      );
      if (dukaanWarehouse) {
        params.data.warehouseId = dukaanWarehouse.id;
        params.node.setDataValue("warehouseId", dukaanWarehouse.id);
      }
    }

    // 2️⃣ Load item details and update fields
    this._hrmService.getDetailsForItem(itemId, unitId, this.target).subscribe({
      next: (response) => {
        const respData = response;

        const price = respData.perBagPrice ?? 0;
        params.data.rate = price;
        params.data.perBagPrice = price;
        params.data.itemMinRate = respData.minPrice || 0;
        params.data.itemMaxRate = respData.maxPrice || 0;
        this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
        this.cdr.detectChanges();
      },
    });
  }

  fetchCurrentStock(params: any) {
    const unitId = params.data.unitId;
    const itemId = params.data.itemId;
    if (!unitId && !itemId) return;

    this._hrmService.getMinStockLevel(itemId, unitId).subscribe({
      next: (response) => {
        params.data.minStockLevel = response || 0;
        this.cdr.detectChanges();
        this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
      },
    });
  }

  show(id?: number) {
    if (id) {
      // Edit Mode
      this._hrmService
        .dataForEdit(id, this.target)
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
            this.salesOrderForm.patchValue({
              issueDate: new Date(this.dataForEdit.issueDate),
              remarks: this.dataForEdit.remarks,
              referenceNumber: this.dataForEdit.referenceNumber,
              paymentModeId: this.dataForEdit.paymentModeId,
              customerCOALevel04Id: this.dataForEdit.customerCOALevel04Id,
              minStockLevel: this.dataForEdit.minStockLevel,
              employeeName: this.dataForEdit.employeeName,
              commissionAmount: this.dataForEdit.commissionAmount,
              totalAmount: this.dataForEdit.totalAmount,
            });

            this.userId = this._sessionService.userId;
            this.fetchCommissionPolicy(this.userId);
            this.rowData = (this.dataForEdit.salesOrderDetails || [])
              .slice()
              .reverse();
            console.log(this.salesOrderForm.value);
            this.displayModal = true;
            this.cdr.detectChanges();
          },
        });
    } else {
      // Create Mode
      this.editMode = false;
      this.viewMode = false;
      this.salesOrderForm.reset();
      this.salesOrderForm.enable();
      this.rowData = [];
      this.salesOrderForm.patchValue({
        issueDate: this.today,
      });
      this.userId = this._sessionService.userId;
      this.fetchCommissionPolicy(this.userId);
      this.displayModal = true;
      // this.salesOrderForm.value.issueDate =   moment(this.getTodayDate(), "MM/DD/YYYY").toDate();
    }
  }

  edit(id: any) {
    this.editMode = true;
    this.viewMode = false;
    this.show(id);
    this.salesOrderForm.enable();
  }
  getTodayDate(): Date {
    return new Date(); // Return current date
  }

  viewOnly(id: any) {
    this.viewMode = true;
    this.editMode = false;
    this.show(id);
    this.salesOrderForm.disable();
  }
  update() {
    this.saving = true;
    this.rowData = [];
    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      this.rowData.push(node.data);
    });
    this.gridApi.setRowData(this.rowData); // Refresh grid to update SrNo
    this.salesOrderForm.patchValue({
      salesOrderDetails: this.rowData,
      issueDate: moment(this.salesOrderForm.value.issueDate).format(
        "YYYY-MM-DD"
      ),
      employeeId: this.salesOrderForm.value.employeeId || 0,
      commissionAmount: this.salesOrderForm.value.commissionAmount || 0,
    });
    const updateData = {
      ...this.salesOrderForm.value,
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
  save() {
    this.saving = true;

    if (!this.salesOrderForm.valid) {
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
      this.rowData.push(node.data);
    });
    this.gridApi.setRowData(this.rowData); // Refresh grid to update SrNo
    this.salesOrderForm.patchValue({
      salesOrderDetails: this.rowData,
      issueDate: moment(this.salesOrderForm.value.issueDate).format(
        "YYYY-MM-DD"
      ),
      employeeId: this.salesOrderForm.value.employeeId || 0,
    });
    // if (!this.salesOrderForm.value.employeeId) {
    //   this.salesOrderForm.value.employeeId = null;
    // }
    this._hrmService
      .create({ ...this.salesOrderForm.value }, this.target)
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
  onDateChange(value?: any) {
    if (value) {
      this.salesOrderForm.value.issueDate = value;
    }
    if (this.salesOrderForm.value.issueDate) {
      this.getVoucherNumber();
    }
  }

  getVoucherNumber() {
    this._hrmService
      .getVoucherNumber("SO", this.salesOrderForm.value.issueDate, this.target)
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
          if (this.salesOrderForm.value.issueDate) {
            this.salesOrderForm.get("referenceNumber").setValue(response);
          }
        },
        error: (err) => {
          console.log("An error occurred", err);
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
  approve(id) {
    this.confirmationService.confirm({
      message: "Are you sure?",
      header: "Confirmation",
      icon: "pi pi-exclamation-triangle",
      rejectButtonStyleClass: "p-button-text",
      accept: () => {
        this._hrmService
          .Approve(id, this.target)
          .pipe(
            finalize(() => {
              this.getAll();
            }),
            catchError((error) => {
              this.msgService.add({
                severity: "error",
                summary: "Error",
                detail:
                  error.error.error.message ||
                  "This record was already approved.",
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
              }
            },
          });
      },
    });
  }
  isFieldInvalid(field: string): any {
    // const control = this.salesOrderForm.get(field);
    // return control ? control.invalid && control.touched : false;
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

  commissionPolicy: any = {};
  fetchCommissionPolicy(userId: number) {
    if (!userId) {
      this.msgService.add({
        severity: "error",
        summary: "Error",
        detail: "User ID is not available.",
        life: 2000,
      });
      return;
    }

    this._hrmService.getCommissionPolicyByUserId(userId).subscribe({
      next: (response) => {
        console.log("Raw Commission Policy Response:", response);

        if (response) {
          this.commissionPolicy = {
            id: response.id,
            name: response.name,
            employeeId: response.employeeIdu ?? null,
            employeeName: response.employeeName,
            policyType: response.policyType,
            commisionAmount: response.commisionAmount,
            commisionPercentage: response.commisionPercentage,
            commissionPolicyDetails: response.commissionPolicyDetails || [],
          };

          const grandTotal = this.salesOrderForm.get("totalAmount")?.value || 0;
          const calculatedCommission = this.calculateCommission(grandTotal);
          this.salesOrderForm.patchValue({
            employeeId: this.commissionPolicy.employeeId,
            employeeName: this.commissionPolicy.employeeName,
            commissionAmount: calculatedCommission,
          });
        }
        this.cdr.detectChanges();
      },
    });
  }

  calculateCommission(grandTotal: number): number {
    if (!this.commissionPolicy) return 0;
    if (this.commissionPolicy.policyType === "Bill") {
      return this.commissionPolicy.commisionAmount;
    }
    // If the policy type is Percentage
    if (this.commissionPolicy.policyType === "Percentage") {
      return (grandTotal * this.commissionPolicy.commisionPercentage) / 100;
    }
    // If the policy type is Slab
    if (this.commissionPolicy.policyType === "Slabe") {
      const slab = this.commissionPolicy.commissionPolicyDetails.find(
        (detail: any) =>
          grandTotal >= detail.fromAmount && grandTotal <= detail.toAmount
      );
      if (slab) {
        return slab.salesCommisionAmount;
      }
    }

    return 0; // Default if no policy matched
  }
}
