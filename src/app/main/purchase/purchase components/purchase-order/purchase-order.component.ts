import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Injector,
} from "@angular/core";
import { Table } from "primeng/table";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { PurchaseService } from "../../shared/services/purchase.service";
import { MessageService, ConfirmationService } from "primeng/api";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
import { catchError, finalize, throwError } from "rxjs";
import * as moment from "moment";
import { getDate } from "@node_modules/date-fns/getDate";
import { ProductSearchEditorComponent } from "../../../search-component/product-search-editor.component";

@Component({
  selector: "app-purchase-order",
  templateUrl: "./purchase-order.component.html",
  styleUrl: "./purchase-order.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderComponent {
  loading: boolean;
  tableData: any;
  saving: boolean;
  addRow: boolean;
  dataForEdit: any;
  piDataForEdit: any;
  currentPage: number = 1;
  skipCount: number = 0;
  maxCount: number = 10;
  target: string = "PurchaseOrder";
  protected gridApi: GridApi;
  protected piGridApi: GridApi;
  protected setParms;
  rowSelection: string;
  piRowSelection: string;
  rowCount: number;
  piRowCount: number;
  rowData: any;
  piRowData: any;
  displayModal: boolean;
  purchaseOrderForm: FormGroup;
  displayPIModal: boolean;
  piTableData: any;
  designations: any;
  baseurl: string = "http://173.249.23.108:6063";
  editMode: boolean;
  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    name: "",
    VoucherNumber: "",
  };
  viewMode: boolean;
  createPurchaseInvoiceGrid: boolean;
  units: {
    id: any;
    name: string;
    additional: string;
  }[] = [];
  item: { id: any; name: string }[] = [];
  paymentTerms: { id: any; name: string }[] = [];
  coaLvl4: { id: any; name: string }[] = [];
  supplier: { id: any; name: string }[] = [];
  broker: { id: any; name: string }[] = [];
  tax: { id: any; name: string }[] = [];
  wareHouse: { id: any; name: string }[] = [];
  frameworkComponents = {
    productSearchEditor: ProductSearchEditorComponent,
  };

  colDefs: ColDef[] = [
    {
      headerName: "SrNo",
      field: "srNo",
      valueGetter: (params) => {
        return params.node ? params.node.rowIndex + 1 : "";
      },
      editable: false,
      sortable: false,
      width: 90,
      suppressSizeToFit: true,
    },
    {
      headerName: "Product",
      field: "itemId",
      editable: true,
      resizable: true,
      width: 200,
      cellEditor: "productSearchEditor", // 👈 custom searchable dropdown
      cellEditorParams: () => ({
        valuesRaw: this.item, // 👈 full list of products
      }),
      valueGetter: (params) => {
        const item = this.item.find((i) => i.id === params.data.itemId);
        return item ? item.name : "";
      },
      valueSetter: (params) => {
        const selectedItem = this.item.find((i) => i.id === params.newValue);
        if (selectedItem) {
          params.data.itemId = selectedItem.id;
          this.onProductChange(params); // 👈 trigger unit fetch
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
      headerName: "Price / 1Kg",
      field: "pricePerKg",
      editable: true,
      resizable: true,
      width: 120,
    },
    {
      headerName: "Price / 40Kg",
      field: "pricePerBag40Kg",
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Price per Bag",
      field: "pricePerBag",
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Last Purchase Rate",
      field: "lastPurchaseRate",
      editable: false,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Quantity (Bags)",
      field: "quantity",
      editable: true,
      resizable: true,
      width: 120,
      valueParser: function (params) {
        const newValue = parseFloat(params.newValue);
        return isNaN(newValue) ? null : newValue;
      },
    },
    {
      headerName: "Total Quantity (KG)",
      field: "actualQuantity",
      editable: false,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Total Price",
      field: "grandTotal",
      editable: false,
      resizable: true,
      width: 150,
    },
  ];

  // grid for invoice:

  selectedDate: Date;

  getTodayDate(): Date {
    return new Date(); // Return current date
  }

  count: number;
  displayModal1: boolean;
  constructor(
    // injector: Injector,
    private fb: FormBuilder,
    private _hrmService: PurchaseService,
    private cdr: ChangeDetectorRef,
    private msgService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.purchaseOrderForm = this.fb.group({
      id: [""],
      supplierCOALevel04Id: ["", [Validators.required]],
      referenceNumber: [""],
      voucherNumber: [""],
      issueDate: [this.getTodayDate(), [Validators.required]], // Set today's date correctly
      paymentModeId: ["", [Validators.required]],
      total: [""],
      netTotal: "",
      localExpense: "",
      builtyExpense: "",
      remarks: "",
      purchaseOrderDetails: [[]],
      attachedDocuments: [[]],
    });
  }
  ngOnInit(): void {
    this.getAll();
    this.fetchDropdownData("Item");
    this.fetchDropdownData("PaymentMode");
    this.fetchDropdownData("Unit");
    this.fetchDropdownData("Tax");
    this.fetchDropdownData("Supplier");
    this.fetchDropdownData("Broker");
    this.fetchDropdownData("Warehouse");
    this.setupCalculations();
  }
  setupCalculations(): void {
    this.purchaseOrderForm.valueChanges.subscribe((values) => {
      const total = Number(values.total) || 0;
      const taxPercentage = Number(values.tax) || 0;
      const freight = Number(values.freight) || 0;
      const brokerCOALevel04Id = values.brokerCOALevel04Id || null;
      let brokerPercentage = values.brokerPercentage
        ? Number(values.brokerPercentage)
        : null;
      let brokerAmount = Number(values.brokerAmount) || 0;
      const taxCOALevel04Id = values.taxCOALevel04Id || null;
      const isBrokerSelected = !!brokerCOALevel04Id;
      const isTaxSelected = !!taxCOALevel04Id;

      let taxAmount = 0;
      if (isTaxSelected && taxPercentage > 0) {
        taxAmount = (total * taxPercentage) / 100;
      }
      let brokerAmountUpdated = brokerAmount;
      if (isBrokerSelected) {
        if (brokerPercentage && brokerPercentage > 0) {
          brokerAmountUpdated = (total * brokerPercentage) / 100;
        }
      } else {
        brokerPercentage = null;
        brokerAmountUpdated = 0;
      }

      // Ensure broker amount is empty when broker percentage is removed
      if (brokerPercentage === null) {
        brokerAmountUpdated = null;
      }

      const veAmount = total + taxAmount;
      const netTotal = veAmount + freight + (brokerAmountUpdated || 0);
      this.purchaseOrderForm.patchValue(
        {
          tax:
            isTaxSelected && taxPercentage > 0
              ? taxPercentage.toFixed(2)
              : null,
          veAmount,
          netTotal,
          brokerPercentage:
            isBrokerSelected && brokerPercentage > 0
              ? brokerPercentage?.toFixed(2)
              : null,
          brokerAmount:
            brokerAmountUpdated !== null
              ? brokerAmountUpdated.toFixed(2)
              : null,
        },
        { emitEvent: false }
      );
      if (isBrokerSelected) {
        this.purchaseOrderForm
          .get("brokerPercentage")
          ?.enable({ emitEvent: false });
        this.purchaseOrderForm
          .get("brokerAmount")
          ?.enable({ emitEvent: false });
      } else {
        this.purchaseOrderForm
          .get("brokerPercentage")
          ?.disable({ emitEvent: false });
        this.purchaseOrderForm
          .get("brokerAmount")
          ?.disable({ emitEvent: false });
      }
      if (isTaxSelected) {
        this.purchaseOrderForm.get("tax")?.enable({ emitEvent: false });
      } else {
        this.purchaseOrderForm.get("tax")?.disable({ emitEvent: false });
      }
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
          console.log(response);
          this.tableData = response.items;
          this.count = response.totalCount;
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

    // Add the new row at the top of the rowData array
    this.rowData.unshift(newItem);

    // Reset the grid data to update row indexes (SrNo)
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
    this.calculateTotalAmount();
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.rowData = [];
    this.rowSelection = "multiple";
  }
  onCellValueChanged(params) {
    const data = params.data;
    data.pricePerKg = Number(data.pricePerKg) || 0;
    data.quantity = Number(data.quantity) || 0;
    const selectedUnit = this.units.find((unit) => unit.id === data.unitId);
    const unitMultiplier = selectedUnit
      ? Number(selectedUnit.additional) || 0
      : 0;
    if (params.column.getId() === "pricePerKg" && data.pricePerKg) {
      data.pricePerBag40Kg = data.pricePerKg * 40;
    } else if (
      params.column.getId() === "pricePerBag40Kg" &&
      data.pricePerBag40Kg
    ) {
      data.pricePerKg = data.pricePerBag40Kg / 40;
    }
    data.pricePerBag = data.pricePerKg * unitMultiplier;
    data.actualQuantity = data.quantity * unitMultiplier;
    data.grandTotal = data.actualQuantity * data.pricePerKg;
    this.calculateTotalAmount();
    this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
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
        const supplierId = this.purchaseOrderForm.get(
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
  calculateTotalAmount() {
    let totalAmount = 0;
    if (this.gridApi) {
      this.gridApi.forEachNode((node) => {
        if (node.data.grandTotal) {
          totalAmount += Number(node.data.grandTotal);
        }
      });
      this.purchaseOrderForm.get("total").setValue(totalAmount);
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
            this.purchaseOrderForm.patchValue({
              supplierCOALevel04Id: this.dataForEdit.supplierCOALevel04Id,
              brokerCOALevel04Id: this.dataForEdit.brokerCOALevel04Id,
              taxCOALevel04Id: this.dataForEdit.taxCOALevel04Id,
              warehouseId: this.dataForEdit.warehouseId,
              tax: this.dataForEdit.tax,
              brokerAmount: this.dataForEdit.brokerAmount,
              brokerPercentage: this.dataForEdit.brokerPercentage,
              veAmount: this.dataForEdit.veAmount,
              referenceNumber: this.dataForEdit.referenceNumber,
              voucherNumber: this.dataForEdit.voucherNumber,
              issueDate: new Date(this.dataForEdit.issueDate),
              paymentModeId: this.dataForEdit.paymentModeId,
              total: this.dataForEdit.total,
              freight: this.dataForEdit.freight,
              localExpense: this.dataForEdit.localExpense,
              builtyExpense: this.dataForEdit.builtyExpense,
              remarks: this.dataForEdit.remarks,
              id: this.dataForEdit.id,
            });
            // Load raw document paths
            this.rawAttachedDocuments = response.attachedDocuments || [];

            // Convert paths to preview-friendly objects
            this.uploadedImages = this.rawAttachedDocuments.map(
              (path, index) => ({
                name: `Document ${index + 1}`,
                url: this.baseurl + path,
              })
            );
            this.rowData = (this.dataForEdit.purchaseOrderDetails || [])
              .slice()
              .reverse();
            console.log(this.purchaseOrderForm.value);
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
      this.purchaseOrderForm.reset();
      this.purchaseOrderForm.enable();
      this.selectedDate = moment(this.getTodayDate(), "MM/DD/YYYY").toDate();
      this.purchaseOrderForm.value.issueDate = this.selectedDate;
      this.getVoucherNumber();
      this.rowData = [];

      this.purchaseOrderForm.patchValue({
        localExpense: 0,
        builtyExpense: 0,
      });
      this.displayModal = true;
    }
  }
  edit(id: any) {
    this.editMode = true;
    this.viewMode = false;
    this.show(id);
    this.purchaseOrderForm.enable();
  }
  viewOnly(id: any) {
    this.viewMode = true;
    this.editMode = false;
    this.show(id);
    this.purchaseOrderForm.disable();
  }
  update() {
    this.saving = true;
    this.rowData = [];
    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      this.rowData.push({
        ...node.data,
        lastPurchaseRate: node.data.lastPurchaseRate || 0,
      });
    });

    // Optional: Refresh grid to ensure SrNo is correct
    this.gridApi.setRowData(this.rowData);
    this.purchaseOrderForm.patchValue({
      purchaseOrderDetails: this.rowData,
      issueDate: moment(this.purchaseOrderForm.value.issueDate).format(
        "YYYY-MM-DD"
      ),
      discountAmount: 0,
      discountPercentage: 0,
    });
    const updateData = {
      ...this.purchaseOrderForm.value,
      id: this.purchaseOrderForm.value.id,
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
    if (!this.purchaseOrderForm.valid) {
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
      this.rowData.push({
        ...node.data,
        lastPurchaseRate: node.data.lastPurchaseRate || 0,
      });
    });
    this.purchaseOrderForm.patchValue({
      purchaseOrderDetails: this.rowData,
      discountAmount: 0,
      discountPercentage: 0,
      id: 0,
    });
    if (
      this.purchaseOrderForm.value.brokerCOALevel04Id &&
      !this.purchaseOrderForm.value.brokerPercentage
    ) {
      this.msgService.add({
        severity: "error",
        summary: "Error",
        detail: "Please give broker percentage before saving",
        life: 2000,
      });
    }
    this._hrmService
      .create({ ...this.purchaseOrderForm.value }, this.target)
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
  // onDateChange() {
  //
  //   // if (value) {

  //   // }
  //   this.purchaseOrderForm.value.issueDate = this.selectedDate;
  //   if (this.purchaseOrderForm.value.issueDate) {
  //     this.getVoucherNumber();
  //   }
  // }
  onDateChange(value?: any) {
    if (value) {
      this.purchaseOrderForm.value.issueDate = value;
    }
    if (this.purchaseOrderForm.value.issueDate) {
      this.getVoucherNumber();
    }
  }

  getVoucherNumber() {
    this._hrmService
      .getVoucherNumber(
        "PO",
        this.purchaseOrderForm.value.issueDate,
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
          if (this.purchaseOrderForm.value.issueDate) {
            this.purchaseOrderForm.get("voucherNumber").setValue(response);
          }
        },
        error: (err) => {
          console.log("An error occurred", err);
        },
      });
  }

  getAllPurchaseOrder() {
    this._hrmService
      .getAll("PurchaseOrder")
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
          this.cdr.markForCheck();
        },
      });
    this.cdr.detectChanges();
  }
  openPurchaseOrder() {
    this.displayPIModal = true;
    this.getAllPurchaseOrder();
  }

  selectPurchaseOrder(id: number) {
    this._hrmService
      .getData(id, "PurchaseOrder")
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
          this.piDataForEdit = response;
          console.log("purchase Order Response Data", this.piDataForEdit);

          this.piRowData = this.piDataForEdit.purchaseOrderDetails;
          this.displayPIModal = false;
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
    // const control = this.purchaseOrderForm.get(field);
    // return control ? control.invalid && control.touched : false;
  }
  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }
  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.loading = true;
    this.filters.VoucherNumber = inputValue;
    this._hrmService.getAll1(this.target, this.filters).subscribe({
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

  //Image Upload
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
        return this._hrmService
          .uploadDocuments("PurchaseInvoice", base64Strings)
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

        this.purchaseOrderForm.patchValue({
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

    this.purchaseOrderForm.patchValue({
      attachedDocuments: [...this.rawAttachedDocuments],
    });
  }

  resetForm() {
    this.previewImageModal = false;
    this.isSuccessUpload = false;
  }
}
