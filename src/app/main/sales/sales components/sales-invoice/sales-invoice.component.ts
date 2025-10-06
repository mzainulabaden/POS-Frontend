import { Component, ChangeDetectorRef } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MessageService, ConfirmationService } from "primeng/api";
import { SalesService } from "../../shared/services/sales.service";
import { Table } from "primeng/table";
import {
  catchError,
  finalize,
  forkJoin,
  map,
  switchMap,
  throwError,
} from "rxjs";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
import * as moment from "moment";
import { MainSetupsService } from "@app/main/main-setups/shared/services/main-setups.service";
import { AbpSessionService } from "abp-ng2-module";
import { ProductSearchEditorComponent } from "../../../search-component/product-search-editor.component";
import { DatePipe } from "@angular/common";

@Component({
  selector: "app-sales-invoice",
  templateUrl: "./sales-invoice.component.html",
  styleUrl: "./sales-invoice.component.css",
  providers: [DatePipe],
})
export class SalesInvoiceComponent {
  loading: boolean;
  baseurl: string = "http://173.249.23.108:6063";
  tableData: any;
  saving: boolean;
  currentPage: number = 1;
  skipCount: number = 0;
  maxCount: number = 10;
  target: string = "SalesInvoice";
  protected gridApi: GridApi;
  units: { id: any; name: string; additional: string }[] = [];
  item: { id: any; name: string }[] = [];
  paymentTerms: { id: any; name: string }[] = [];
  coaLvl4: { id: any; name: string }[] = [];
  client: { id: any; name: string }[] = [];
  tax: { id: any; name: string }[] = [];
  wareHouse: { id: any; name: string }[] = [];
  advanceAmountCOA: { id: any; name: string }[] = [];
  displayModal: boolean;
  salesInvoiceForm: FormGroup;
  today: Date = new Date();
  designations: any;
  piDataForEdit: any;
  dataForEdit: any;
  rowSelection: string;
  rowCount: number;
  rowData: any;
  editMode: boolean;
  viewMode: boolean;
  poTableData: any;
  count: number;
  displayModal1: boolean;
  displayPOModal: boolean;
  addRow: boolean;
  userId: number;
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
    private _sessionService: AbpSessionService,
    private _mainSetupService: MainSetupsService,
    private cdr: ChangeDetectorRef,
    private msgService: MessageService,
    private confirmationService: ConfirmationService,
    private datePipe: DatePipe
  ) {
    this.salesInvoiceForm = this.fb.group({
      customerCOALevel04Id: ["", [Validators.required]],
      issueDate: ["", [Validators.required]],
      discountAmount: [""],
      discountPercentage: "",
      referenceNumber: "",
      voucherNumber: "",
      freightAmount: "",
      taxAmount: "",
      grandTotal: "",
      netTotal: "",
      taxCOALevel04Id: [""],
      remarks: "",
      paymentModeId: "",
      salesInvoiceDetails: [[]],
      employeeName: [""],
      commissionAmount: [""],
      attachedDocuments: [[]],
      advanceAmount: "",
      advanceAmountBankCOALevl04Id: "",
    });
  }
  ngOnInit(): void {
    this.getAll();
    this.fetchDropdownData("Client");
    this.fetchDropdownData("PaymentMode");
    this.fetchDropdownData("Unit");
    this.fetchDropdownData("Item");
    this.fetchDropdownData("Warehouse");
    this.fetchDropdownData("Tax");
    this.fetchDropdownData("Bank");
    this.siSetupCalculations();
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
          this.tableData = response.items.map((item: any) => ({
            ...item,
            issueDateFormatted: this.datePipe.transform(
              item.issueDate,
              "MMM dd, yyyy"
            ),
          }));
          this.count = response.totalCount;
          this.cdr.detectChanges();
        },
      });
  }
  siSetupCalculations(): void {
    this.salesInvoiceForm.valueChanges.subscribe((values) => {
      const grandTotal = Number(values.grandTotal) || 0;
      const taxPercentage = Number(values.taxAmount) || 0;
      const freight = Number(values.freightAmount) || 0;
      const discountPercentage = Number(values.discountPercentage) || 0;
      const taxCOALevel04Id = values.taxCOALevel04Id || null;
      const isTaxSelected = !!taxCOALevel04Id;
      const discountAmount = (grandTotal * discountPercentage) / 100;
      let taxAmount = 0;
      if (isTaxSelected && taxPercentage > 0) {
        taxAmount = (grandTotal * taxPercentage) / 100;
      }
      const netTotal = grandTotal + taxAmount + freight - discountAmount;
      this.salesInvoiceForm.patchValue(
        {
          taxAmount:
            isTaxSelected && taxPercentage > 0
              ? taxPercentage.toFixed(2)
              : null,
          discountAmount: discountAmount.toFixed(2),
          netTotal: netTotal.toFixed(2),
        },
        { emitEvent: false }
      );
      if (isTaxSelected) {
        this.salesInvoiceForm.get("taxAmount")?.enable({ emitEvent: false });
      } else {
        this.salesInvoiceForm.get("taxAmount")?.disable({ emitEvent: false });
      }
    });
  }

  colDefs: ColDef[] = [
    {
      headerName: "SrNo",
      editable: false,
      field: "srNo",
      sortable: true,
      width: 80,
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
      headerName: "Stock",
      field: "minStockLevel",
      editable: false,
      resizable: true,
      width: 90,
    },
    {
      headerName: "Min",
      field: "itemMinRate",
      editable: false,
      resizable: true,
      width: 90,
    },
    {
      headerName: "Max",
      field: "itemMaxRate",
      editable: false,
      resizable: true,
      width: 90,
    },
    {
      headerName: "Rate (Per Bag)",
      field: "rate",
      editable: true,
      resizable: true,
      width: 90,
    },
    {
      headerName: "Rate (Per KG)",
      field: "pricePerKg",
      editable: true,
      resizable: true,
      width: 90,
    },
    {
      headerName: "Qty",
      field: "invoiceQty",
      editable: true,
      resizable: true,
      width: 120,
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
      headerName: "Last Sale Rate",
      field: "lastSaleRate",
      editable: false,
      resizable: true,
      width: 120,
    },
    {
      headerName: "Total Price",
      field: "grandTotal",
      editable: false,
      resizable: true,
      width: 120,
    },
  ];
  update() {
    this.saving = true;
    this.rowData = [];
    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      this.rowData.push({
        ...node.data,
      });
    });
    this.gridApi.setRowData(this.rowData); // Refresh SrNo after row update

    this.salesInvoiceForm.patchValue({
      salesInvoiceDetails: this.rowData,
      issueDate: moment(this.salesInvoiceForm.value.issueDate).format(
        "YYYY-MM-DD"
      ),
      viAmount: 0,
    });
    this.salesInvoiceForm.patchValue({
      attachedDocuments: [...this.rawAttachedDocuments],
    });
    const updateData = {
      ...this.salesInvoiceForm.value,
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

  edit(id: any) {
    this.editMode = true;
    this.viewMode = false;
    this.show(id);
    this.salesInvoiceForm.enable();
  }
  viewOnly(id: any) {
    this.viewMode = true;
    this.editMode = false;
    this.show(id);
    this.salesInvoiceForm.disable();
  }
  save() {
    console.log(this.salesInvoiceForm.value);
    this.saving = true;

    if (!this.salesInvoiceForm.valid) {
      this.msgService.add({
        severity: "error",
        detail: "Please fill all Required fields",
        life: 2000,
      });
      this.saving = false;
      return;
    }
    if (!this.salesInvoiceForm.value.taxCOALevel04Id) {
      this.salesInvoiceForm.patchValue({ taxCOALevel04Id: 0 });
    }
    this.rowData = [];
    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      this.rowData.push({
        ...node.data,
        id: 0,
        salesOrderDetailId: node.data.id,
        lastSaleRate: node.data.lastSaleRate || 0,
        profitAmount: node.data.profitAmount || 0,
        profitPercentage: node.data.profitPercentage || 0,
      });
    });
    this.gridApi.setRowData(this.rowData); // Refresh SrNo after row collection

    this.salesInvoiceForm.patchValue({
      salesInvoiceDetails: this.rowData,
      issueDate: moment(this.salesInvoiceForm.value.issueDate).format(
        "YYYY-MM-DD"
      ),
      viAmount: 0,
      commissionAmount: this.salesInvoiceForm.value.commissionAmount || 0,
    });
    this.salesInvoiceForm.patchValue({
      attachedDocuments: [...this.rawAttachedDocuments],
    });
    this._salesService
      .create({ ...this.salesInvoiceForm.value }, this.target)
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
        next: (response: any) => {
          this.msgService.add({
            severity: "success",
            summary: "Confirmed",
            detail: "SavedSuccessfully",
            life: 2000,
          });

          debugger;
          if (response && response.success && response.result?.id) {
            this.approve(response.result.id, false);
          }

          this.getAll();
          this.saving = false;
          this.displayModal = false;
        },
      });
  }
  onProductChange(params: any) {
    const itemId = params.data.itemId;
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
  onItemChange(itemId: number, params: any) {
    if (!itemId) return;
    this._salesService.getData(itemId, "Item").subscribe((editData: any) => {
      if (editData?.itemDetails?.length) {
        const itemDetail = editData.itemDetails[0];
        params.data.itemMinRate = itemDetail.minSalePrice;
        params.data.itemMaxRate = itemDetail.maxSalePrice;
      } else {
        params.data.itemMinRate = 0;
        params.data.itemMaxRate = Number.MAX_VALUE;
      }
      this.cdr.detectChanges();
      this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
    });
  }

  onUnitChange(params: any) {
    const { unitId, itemId } = params.data;
    if (!unitId || !itemId) return;

    // Get selected unit
    const selectedUnit = this.units.find((unit) => unit.id === unitId);
    const unitName = selectedUnit?.name?.toLowerCase();

    // 1️⃣ Auto-set warehouse based on unit
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

    // 2️⃣ Get item pricing and stock level
    this._salesService
      .getDetailsForItem(itemId, unitId, "SalesOrder")
      .subscribe({
        next: (response) => {
          const respData = response;
          const price = respData.perBagPrice ?? 0;

          if (price === 0) {
            this.msgService.add({
              severity: "warn",
              summary: "Warning",
              detail: `No Purchase Invoice found against this product!`,
              life: 2000,
            });
          }

          params.data.rate = price;
          params.data.perBagPrice = price;
          params.data.itemMinRate = respData.minPrice || 0;
          params.data.itemMaxRate = respData.maxPrice || 0;
          params.data.lastSaleRate = respData.lastSaleRate || 0;

          // 3️⃣ Get minimum stock level
          this._salesService.getMinStockLevel(itemId, unitId).subscribe({
            next: (stk) => {
              params.data.minStockLevel = stk || 0;

              // Force row update
              this.gridApi.refreshCells({
                rowNodes: [params.node],
                force: true,
              });
              this.cdr.detectChanges();
            },
          });
        },
      });
  }

  fetchCurrentStock(params: any) {
    const unitId = params.data.unitId;
    const itemId = params.data.itemId;
    if (!unitId && !itemId) return;

    this._salesService.getMinStockLevel(itemId, unitId).subscribe({
      next: (response) => {
        params.data.minStockLevel = response || 0;
        this.cdr.detectChanges();
        this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
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

    // initialise every column field
    this.colDefs.forEach((colDef) => {
      if (colDef.field) newItem[colDef.field] = null;
    });

    /* 🔹 Default Warehouse = “DUKKAN” */
    newItem.warehouseId = this.getDefaultWarehouseId();

    // add to top, refresh, recalc
    this.rowData.unshift(newItem);
    if (this.gridApi) this.gridApi.setRowData(this.rowData);

    this.calculateTotalAmount();
    this.recalculateCommission();
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
    this.calculateTotalAmount(); // Update total first
    this.recalculateCommission();
  }
  calculateTotalAmount() {
    let totalAmount = 0;
    if (this.gridApi) {
      this.gridApi.forEachNode((node) => {
        if (node.data.grandTotal) {
          totalAmount += Number(node.data.grandTotal);
        }
      });
      this.salesInvoiceForm.get("grandTotal").setValue(totalAmount);
    }
  }
  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.rowData = [];
    this.rowSelection = "multiple";
  }
  getAllPurchaseOrder() {
    let customerCOALevel04Id = this.salesInvoiceForm.value.customerCOALevel04Id;
    if (customerCOALevel04Id != null) {
      this._salesService
        .getAllByCustomerID("SalesOrder", customerCOALevel04Id)
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
            this.poTableData = response.items.filter(
              (item) => item.status == "APPROVED"
            );

            this.cdr.markForCheck();
          },
        });
    } else {
      this._salesService
        .getAllByCustomerID("SalesOrder")
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
            this.poTableData = response.items.filter(
              (item) => item.status == "APPROVED"
            );
            this.cdr.markForCheck();
          },
        });
    }
  }
  openPurchaseOrder() {
    this.displayPOModal = true;
    this.getAllPurchaseOrder();
  }

  selectPurchaseOrder(id: number) {
    this._salesService
      .dataForEdit(id, "SalesOrder")
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
          this.piDataForEdit = response;
          this.salesInvoiceForm.patchValue({
            customerCOALevel04Id: this.piDataForEdit.customerCOALevel04Id,
            taxCOALevel04Id: this.piDataForEdit.taxCOALevel04Id,
            referenceNumber: this.piDataForEdit.voucherNumber,
            issueDate: new Date(this.piDataForEdit.issueDate),
            paymentModeId: this.piDataForEdit.paymentModeId,
            grandTotal: this.piDataForEdit.totalAmount,
            remarks: this.piDataForEdit.remarks,
            advanceAmount: this.piDataForEdit.advanceAmount,
            advanceAmountBankCOALevl04Id:
              this.piDataForEdit.advanceAmountBankCOALevl04Id,
          });
          console.log("Sale Invoice Response", response);
          this.rowData = this.piDataForEdit.salesOrderDetails.map((item) => ({
            ...item,
            invoiceQty: item.orderedQty,
          }));
          this.userId = this.piDataForEdit.creatorUserId;
          console.log("User ID:", this.userId);
          this.fetchCommissionPolicy(this.userId);
          this.displayPOModal = false;
          this.cdr.detectChanges();
        },
      });
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

    // ✅ Clamp and apply pricePerKg logic with proper calculation
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

      if (enteredPricePerKg < min) {
        this.msgService.add({
          severity: "warn",
          summary: "Invalid Entry",
          detail: `Price per Kg cannot be below minimum. Reset to ${min}`,
          life: 2500,
        });
        enteredPricePerKg = min;
      } else if (enteredPricePerKg > max) {
        this.msgService.add({
          severity: "warn",
          summary: "Invalid Entry",
          detail: `Price per Kg cannot exceed maximum. Reset to ${max}`,
          life: 2500,
        });
        enteredPricePerKg = max;
      }

      data.pricePerKg = enteredPricePerKg;
      data.rate = parseFloat((enteredPricePerKg * multiplier).toFixed(2));
      data.perBagPrice = data.rate;
      data.grandTotal = (data.invoiceQty || 0) * data.rate;

      this.calculateTotalAmount();
      this.recalculateCommission();
      this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
    }

    // ✅ Handle orderedQty or rate edits
    if (["invoiceQty", "rate"].includes(params.colDef.field)) {
      data.invoiceQty = Number(data.invoiceQty) || 0;
      data.grandTotal = data.invoiceQty * data.rate;
      this.calculateTotalAmount();
      this.recalculateCommission();
      this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
    }

    // ✅ Validate against stock level
    const orderQty = data.invoiceQty || 0;
    const currentStock = data.minStockLevel || 0;
    if (orderQty > currentStock) {
      this.msgService.add({
        severity: "warn",
        summary: "Invalid Entry",
        detail: `Cannot order more than available stock (${currentStock})`,
        life: 2500,
      });
      data.invoiceQty = currentStock;
      this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
    }

    this.calculateTotalAmount();
    this.recalculateCommission();
    this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
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
            this.salesInvoiceForm.patchValue({
              commissionAmount: this.dataForEdit.commissionAmount,
              employeeName: this.dataForEdit.employeeName,
              customerCOALevel04Id: this.dataForEdit.customerCOALevel04Id,
              taxCOALevel04Id: this.dataForEdit.taxCOALevel04Id,
              taxAmount: this.dataForEdit.taxAmount,
              referenceNumber: this.dataForEdit.referenceNumber,
              issueDate: new Date(this.dataForEdit.issueDate),
              paymentModeId: this.dataForEdit.paymentModeId,
              grandTotal: this.dataForEdit.grandTotal,
              freightAmount: this.dataForEdit.freightAmount,
              remarks: this.dataForEdit.remarks,
              netTotal: this.dataForEdit.netTotal,
              discountPercentage: this.dataForEdit.discountPercentage,
              discountAmount: this.dataForEdit.discountAmount,
              advanceAmount: this.dataForEdit.advanceAmount,
              advanceAmountBankCOALevl04Id:
                this.dataForEdit.advanceAmountBankCOALevl04Id,
            });
            this.userId = this._sessionService.userId;
            this.fetchCommissionPolicy(this.userId);
            this.rowData = (this.dataForEdit.salesInvoiceDetails || [])
              .slice()
              .reverse();
            this.rawAttachedDocuments = response.attachedDocuments || [];

            // Convert paths to preview-friendly objects
            this.uploadedImages = this.rawAttachedDocuments.map(
              (path, index) => ({
                name: `Document ${index + 1}`,
                url: this.baseurl + path,
              })
            );
            this.displayModal = true;
            this.cdr.detectChanges();
          },
        });
    } else {
      // Create Mode
      this.editMode = false;
      this.viewMode = false;
      this.uploadedImages = [];
      this.rawAttachedDocuments = [];
      this.salesInvoiceForm.reset();
      this.salesInvoiceForm.enable();
      this.rowData = [];
      this.salesInvoiceForm.patchValue({
        issueDate: this.today,
      });
      this.userId = this._sessionService.userId;
      this.fetchCommissionPolicy(this.userId);
      this.getVoucherNumber();
      this.displayModal = true;
    }
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
  approve(id: number, confirm: boolean = true) {
    const executeApproval = () => {
      this._salesService.getDataForEdit(id, this.target).subscribe({
        next: (returnData: any) => {
          const details = Array.isArray(returnData.salesInvoiceDetails)
            ? returnData.salesInvoiceDetails
            : [];

          const itemMap = new Map<
            number,
            { itemId: number; changes: { unitId: number; delta: number }[] }
          >();

          for (const detail of details) {
            const itemId = detail.itemId;
            const unitId = detail.unitId;
            const qty = Number(detail.invoiceQty || 0);

            if (!itemId || qty <= 0) continue;

            const adjustedQty =
              qty * this.getUnitConversionMultiplier(unitId, unitId);

            if (!itemMap.has(itemId)) {
              itemMap.set(itemId, { itemId, changes: [] });
            }

            itemMap.get(itemId).changes.push({
              unitId,
              delta: -adjustedQty, // ⬇️ Subtract from minStockLevel
            });
          }

          const updateObservables = Array.from(itemMap.values()).map((group) =>
            this._mainSetupService.getDataForEdit(group.itemId, "Item").pipe(
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
                  detail: "Sales invoice approved & stock updated.",
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
            detail: "Could not fetch sales invoice data",
            life: 2000,
          });
        },
      });
    };

    if (confirm) {
      this.confirmationService.confirm({
        message: "Are you sure?",
        header: "Confirmation",
        icon: "pi pi-exclamation-triangle",
        rejectButtonStyleClass: "p-button-text",
        accept: executeApproval,
      });
    } else {
      executeApproval();
    }
  }

  unApprove(id: number) {
    if (id) {
      this._salesService.unApprove(id, this.target).subscribe({
        next: () => {
          this.msgService.add({
            severity: "success",
            summary: "Confirmed",
            detail: "Sales invoice un-approved.",
            life: 2000,
          });
          this.getAll();
        },
        error: (err) => {
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: err?.message || "Error occurred while un-approving",
            life: 2000,
          });
        },
      });
    }
  }

  getUnitConversionMultiplier(fromUnitId: number, toUnitId: number): number {
    const fromUnit = this.units.find((u) => u.id === fromUnitId);
    const toUnit = this.units.find((u) => u.id === toUnitId);
    const fromValue = Number(fromUnit?.additional || 1);
    const toValue = Number(toUnit?.additional || 1);
    return fromValue / toValue;
  }

  isFieldInvalid(field: string): any {
    const control = this.salesInvoiceForm.get(field);
    return control ? control.invalid && control.touched : false;
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
        this.tableData = response.items.map((item: any) => ({
          ...item,
          issueDateFormatted: this.datePipe.transform(
            item.issueDate,
            "MMM dd, yyyy"
          ),
        }));
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
    this.skipCount = (this.currentPage - 1) * this.maxCount;
    this._salesService
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
  onDateChange(value?: any) {
    if (value) {
      this.salesInvoiceForm.value.issueDate = value;
    }
    if (this.salesInvoiceForm.value.issueDate) {
      this.getVoucherNumber();
    }
  }
  getVoucherNumber() {
    this._salesService
      .getVoucherNumber(
        "SI",
        this.salesInvoiceForm.value.issueDate,
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
          if (this.salesInvoiceForm.value.issueDate) {
            this.salesInvoiceForm.get("voucherNumber").setValue(response);
          }
        },
        error: (err) => {
          console.log("An error occurred", err);
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
        case "Unit":
          this.units = mappedData;
          break;
        case "Item":
          this.item = mappedData;
          break;
        case "Tax":
          this.tax = mappedData;
          break;
        case "PaymentMode":
          this.paymentTerms = mappedData;
          break;
        case "Warehouse":
          this.wareHouse = mappedData;
          break;
        case "Client":
          this.client = mappedData;
          break;
        case "Bank":
          this.advanceAmountCOA = mappedData;
          break;
        default:
          break;
      }
      this.cdr.detectChanges();
    });
  }

  //Policy
  commissionPolicy: any = {};
  fetchCommissionPolicy(userId) {
    if (!this.userId) {
      this.msgService.add({
        severity: "error",
        summary: "Error",
        detail: "User ID is not available.",
        life: 2000,
      });
      return;
    }

    this._salesService.getCommissionPolicyByUserId(userId).subscribe({
      next: (response) => {
        console.log("Raw Commission Policy Response:", response);

        if (response) {
          this.commissionPolicy = {
            id: response.id,
            name: response.name,
            employeeName: response.employeeName,
            policyType: response.policyType,
            commisionAmount: response.commisionAmount,
            commisionPercentage: response.commisionPercentage,
            commissionPolicyDetails: response.commissionPolicyDetails || [],
          };

          // Calculate commission based on the policy type
          const grandTotal =
            this.salesInvoiceForm.get("grandTotal")?.value || 0;
          const calculatedCommission = this.calculateCommission(grandTotal);

          this.salesInvoiceForm.patchValue({
            employeeName: response.employeeName,
            commissionAmount: calculatedCommission,
          });
        }

        this.cdr.detectChanges(); // Ensure UI is updated
      },
    });
  }

  downloadMasterReport(salesInvoiceId: number) {
    const reportName = "Sales Invoice Report";
    const reportUrl = "%2fPreviews%2fRPT_Preview_Sale_Invoice";
    const reportFormat = 0;

    const queryParams = `ReportName=${encodeURIComponent(
      reportName
    )}&ReportUrl=${encodeURIComponent(reportUrl)}&format=${reportFormat}`;
    const fullUrl = `${this.baseurl}/api/services/app/Reporting/DownloadReport?${queryParams}`;

    const bodyParams = [
      {
        parameterName: "SalesInvoiceId", // Or SalesInvoiceCode if your backend expects that
        parameterValue: salesInvoiceId.toString(),
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

  downloadCustomerReport(salesInvoiceId: number) {
    const reportName = "Sales Invoice Report";
    const reportUrl = "%2fPreviews%2fRPT_Preview_Sale_Invoice_CC"; // Fixed: added missing `%` at the beginning
    const reportFormat = 0;

    const queryParams = `ReportName=${encodeURIComponent(
      reportName
    )}&ReportUrl=${encodeURIComponent(reportUrl)}&format=${reportFormat}`;

    const fullUrl = `${this.baseurl}/api/services/app/Reporting/DownloadReport?${queryParams}`;

    const bodyParams = [
      {
        parameterName: "SalesInvoiceId",
        parameterValue: salesInvoiceId.toString(),
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
          detail: "Failed to generate the customer copy report.",
        });
      },
    });
  }

  // Calculate Commission Based on Policy Type
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

  recalculateCommission() {
    const grandTotal = Number(this.salesInvoiceForm.get("grandTotal")?.value);
    const commission = this.calculateCommission(grandTotal);

    this.salesInvoiceForm.patchValue({
      commissionAmount: commission,
    });
    this.cdr.detectChanges();
  }

  //Image Uploading
  previewUrl: string | null = null;
  rawAttachedDocuments: string[] = []; // image paths
  uploadedImages: { name: string; url: string }[] = [];
  previewImageModal = false;
  previewImageHeader = "Preview Images";
  fileName: string = "";
  isUploadingImages: boolean = false;
  isSuccessUpload: boolean = false;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;

    this.isUploadingImages = true; // Start loader
    this.isSuccessUpload = false;

    const base64Promises = files.map((file) => this.readFileAsBase64(file));

    Promise.all(base64Promises)
      .then((base64Strings) => {
        return this._salesService
          .uploadDocuments(this.target, base64Strings)
          .toPromise();
      })
      .then((res: any) => {
        const newPaths = res?.imagePaths || [];
        newPaths.forEach((path: string, index: number) => {
          this.rawAttachedDocuments.push(path);
          this.uploadedImages.push({
            name:
              files[index].name || `Image ${this.uploadedImages.length + 1}`,
            url: this.baseurl + path,
          });
        });

        this.salesInvoiceForm.patchValue({
          attachedDocuments: [...this.rawAttachedDocuments],
        });

        (event.target as HTMLInputElement).value = "";

        this.cdr.detectChanges();
      })
      .catch(() => {
        this.msgService.add({
          severity: "error",
          summary: "Upload Failed",
          detail: "One or more images failed to upload.",
        });
      })
      .finally(() => {
        this.isUploadingImages = false; // Stop loader
        if (this.isUploadingImages == false) {
          this.isSuccessUpload = true;
        }
        this.cdr.detectChanges();
      });
  }

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  imagePreviewModal(): void {
    if (!this.rawAttachedDocuments.length) {
      this.msgService.add({
        severity: "warn",
        summary: "No Images",
        detail: "No images uploaded.",
      });
      return;
    }

    this.uploadedImages = this.rawAttachedDocuments.map((path, index) => ({
      name: `Image ${index + 1}`,
      url: this.baseurl + path,
    }));

    this.previewImageModal = true;
    this.cdr.detectChanges(); // Force modal update
  }

  openInNewTab(url: string): void {
    window.open(url, "_blank");
  }

  removeImage(index: number): void {
    this.rawAttachedDocuments.splice(index, 1);
    this.uploadedImages.splice(index, 1);

    this.salesInvoiceForm.patchValue({
      attachedDocuments: [...this.rawAttachedDocuments],
    });
  }

  resetForm() {
    this.previewImageModal = false;
    this.isSuccessUpload = false;
  }
}
