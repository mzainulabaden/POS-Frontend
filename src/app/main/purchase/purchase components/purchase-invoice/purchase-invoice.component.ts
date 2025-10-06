import {
  Component,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MessageService, ConfirmationService } from "primeng/api";
import { PurchaseService } from "../../shared/services/purchase.service";
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
import { MainSetupsService } from "@app/main/main-setups/shared/services/main-setups.service";
import { ProductSearchEditorComponent } from "../../../search-component/product-search-editor.component";
import { error } from "console";

@Component({
  selector: "app-purchase-invoice",
  templateUrl: "./purchase-invoice.component.html",
  styleUrl: "./purchase-invoice.component.css",
  // imports: [IconFieldModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseInvoiceComponent {
  loading: boolean;
  tableData: any;
  baseurl: string = "http://173.249.23.108:6063";
  saving: boolean;
  currentPage: number = 1;
  skipCount: number = 0;
  maxCount: number = 10;
  currentDate: Date = new Date();
  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    name: "",
    voucherNumber: "",
  };

  target: string = "PurchaseInvoice";
  protected gridApi: GridApi;
  units: { id: any; name: string; additional: string }[] = [];
  item: { id: any; name: string }[] = [];
  paymentTerms: { id: any; name: string }[] = [];
  supplier: { id: any; name: string }[] = [];
  broker: { id: any; name: string }[] = [];
  tax: { id: any; name: string }[] = [];
  wareHouse: { id: any; name: string }[] = [];
  advanceAmountCOA: { id: any; name: string }[] = [];
  displayModal: boolean;
  selectData: any;
  PurchaseInvoiceForm: FormGroup;
  designations: any;
  piDataForEdit: any;
  selectedDate: Date;
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
  frameworkComponents = {
    productSearchEditor: ProductSearchEditorComponent,
  };

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
      cellEditor: "productSearchEditor", // ✅ use custom searchable dropdown
      cellEditorPopup: true, // ✅ to allow full control of the popup
      cellEditorParams: (params) => ({
        valuesRaw: this.item, // ✅ full list of { id, name }
      }),
      valueGetter: (params) => {
        const item = this.item.find((item) => item.id === params.data.itemId);
        return item ? item.name : "";
      },
      valueSetter: (params) => {
        const selectedItem = this.item.find(
          (item) => item.id === params.newValue
        );
        if (selectedItem) {
          params.data.itemId = selectedItem.id;
          this.onProductChange(params); // ✅ Load dependent unit options
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
      valueFormatter: (params) => params.value ?? 0,
      width: 140,
    },

    {
      headerName: "Quantity (Bag)",
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
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Adjustment",
      field: "adjustment",
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Total Price",
      field: "grandTotal",
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Unit Cost",
      field: "costRate",
      editable: false,
      resizable: true,
      width: 150,
    },
  ];
  constructor(
    // injector: Injector,
    private fb: FormBuilder,
    private _purchaseService: PurchaseService,
    private _mainSetupService: MainSetupsService,
    private cdr: ChangeDetectorRef,
    private msgService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.PurchaseInvoiceForm = this.fb.group({
      issueDate: [new Date(), [Validators.required]],
      remarks: "",
      referenceNumber: "",
      voucherNumber: "",
      paymentModeId: "",
      supplierCOALevel04Id: ["", [Validators.required]],
      taxCOALevel04Id: [""],
      brokerCOALevel04Id: [""],
      warehouseId: [""],
      discountPercentage: "",
      discountAmount: [""],
      tax: "",
      taxAmount: "",
      total: "",
      brokerPercentage: "",
      brokerAmount: "",
      builtyExpense: "",
      localExpense: "",
      netTotal: "",
      grandTotal: "",
      advanceAmount: "",
      veAmount: "",
      viAmount: "",
      advanceAmountBankCOALevl04Id: "",
      // freight: "",
      purchaseInvoiceDetails: [[]],
      attachedDocuments: [[]],
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
    this.fetchDropdownData("Bank");
    this.poSetupCalculations();
  }

  getAll() {
    this._purchaseService
      .getAll(this.target, this.skipCount, this.maxCount)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        catchError((error) => {
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: error.error?.error?.message || "Error loading data",
            life: 2000,
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

  private poValueChangesSubscription: Subscription;

  poSetupCalculations(): void {
    this.poValueChangesSubscription =
      this.PurchaseInvoiceForm.valueChanges.subscribe((values) => {
        const total = Number(values.total) || 0;
        let grandTotal = Number(values.total) || 0;
        const veAmount = Number(values.veAmount) || 0;

        let netTotal = Number(values.total) || 0;
        let viTotal = Number(values.total) || 0;
        let localExpense = Number(values.localExpense) || 0;
        let builtyExpense = Number(values.builtyExpense) || 0;
        const freight = Number(values.freight) || 0;
        const brokerCOALevel04Id = values.brokerCOALevel04Id || null;
        const taxCOALevel04Id = values.taxCOALevel04Id || null;
        const veTotal = values.veAmount;
        const discountPercentage = Math.max(
          0,
          Number(values.discountPercentage) || 0
        ); // Prevent negative discount

        const brokerPercentage = Math.max(
          0,
          Number(values.brokerPercentage) || 0
        ); // Prevent negative discount
        const taxPercentage = Math.max(0, Number(values.tax) || 0); // Prevent negative discount

        // let brokerPercentage = values.brokerPercentage
        //   ? Number(values.brokerPercentage)
        //   : null;
        // let brokerAmount = Number(values.brokerAmount) || 0;
        const isBrokerSelected = !!brokerCOALevel04Id;
        const isTaxSelected = !!taxCOALevel04Id;
        if (veTotal) {
          viTotal = veTotal + total;
        }
        const discountAmount = (total * discountPercentage) / 100;
        let taxAmount = (total * taxPercentage) / 100;
        let brokerAmount = (total * brokerPercentage) / 100;

        if (!values.brokerCOALevel04Id) {
          brokerAmount = 0;
        }
        if (!values.taxCOALevel04Id) {
          taxAmount = 0;
        }
        let brokerAmountUpdated = brokerAmount;
        if (localExpense || builtyExpense || viTotal) {
          netTotal = viTotal + +localExpense + +builtyExpense;
        }

        // netTotal = viTotal + +values.localExpense + +values.builtyExpense;
        if (netTotal) {
          grandTotal = netTotal;
        }
        if (discountAmount) {
          grandTotal = netTotal - +discountAmount;
        }
        if (brokerAmount) {
          grandTotal += brokerAmount;
        }
        if (taxAmount) {
          grandTotal += taxAmount;
        }
        console.log(this.rowData);
        if (grandTotal >= total) {
          // Get the total quantity from the grid
          let totalQuantity = this.rowData.reduce(
            (sum, row) => sum + (Number(row.actualQuantity) || 0),
            0
          );
          let price = grandTotal - total;

          if (totalQuantity > 0 && price > 0) {
            // Update the grid values

            this.rowData = this.rowData.map((row) => {
              return {
                ...row,
                costRate: Math.round(row.pricePerKg + price / totalQuantity), // Set costRate
              };
            });
            console.log(this.rowData);
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

        // if (discountPercentage) {
        //   netTotal = viTotal + +localExpense + +builtyExpense ;
        // }
        // if (viTotal) {
        //   grandTotal = viTotal;
        // }
        //  grandTotal = netTotal + +discountAmount + +taxAmount + +brokerAmount;
        this.PurchaseInvoiceForm.patchValue(
          {
            // tax:
            //   isTaxSelected && taxPercentage > 0
            //     ? taxPercentage.toFixed(2)
            //     : null,
            discountAmount: discountAmount.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            // veAmount,
            viAmount: viTotal,
            grandTotal: Math.round(grandTotal),
            netTotal,
            // brokerPercentage:
            //   isBrokerSelected && brokerPercentage !== null
            //     ? brokerPercentage.toFixed(2)
            //     : null,
            brokerAmount: brokerAmount.toFixed(2),
          },
          { emitEvent: false }
        );
        if (isBrokerSelected) {
          this.PurchaseInvoiceForm.get("brokerPercentage")?.enable({
            emitEvent: false,
          });
          this.PurchaseInvoiceForm.get("brokerAmount")?.enable({
            emitEvent: false,
          });
        } else {
          this.PurchaseInvoiceForm.get("brokerPercentage")?.disable({
            emitEvent: false,
          });
          this.PurchaseInvoiceForm.get("brokerAmount")?.disable({
            emitEvent: false,
          });
        }
        if (isTaxSelected) {
          this.PurchaseInvoiceForm.get("tax")?.enable({ emitEvent: false });
        } else {
          this.PurchaseInvoiceForm.get("tax")?.disable({ emitEvent: false });
        }
        this.updateCostRateFromExpenses();
      });
  }

  getTodayDate(): Date {
    return new Date(); // Return current date
  }
  update() {
    this.saving = true;
    this.rowData = [];
    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      this.rowData.push({
        ...node.data,
      });
    });

    // Refresh grid to update SrNo
    this.gridApi.setRowData(this.rowData);

    this.PurchaseInvoiceForm.patchValue({
      purchaseInvoiceDetails: this.rowData,
      issueDate: moment(this.PurchaseInvoiceForm.value.issueDate).format(
        "YYYY-MM-DD"
      ),
      viAmount: 0,
    });
    this.PurchaseInvoiceForm.patchValue({
      attachedDocuments: [...this.rawAttachedDocuments],
    });
    const updateData = {
      ...this.PurchaseInvoiceForm.value,
      id: this.dataForEdit.id,
    };
    this._purchaseService
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
    this.PurchaseInvoiceForm.enable();
  }

  viewOnly(id: any) {
    this.viewMode = true;
    this.editMode = false;
    this.show(id);
    this.PurchaseInvoiceForm.disable();
  }

  save() {
    console.log(this.PurchaseInvoiceForm.value);
    this.saving = true;

    if (!this.PurchaseInvoiceForm.valid) {
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
      console.log(node.data);
      this.rowData.push({
        ...node.data,
        id: 0,
        purchaseOrderDetailId: node.data.purchaseOrderDetailId || 0, // Include purchaseOrderDetailId from grid data
      });
    });

    // Refresh grid so SrNo is accurate
    this.gridApi.setRowData(this.rowData);

    this.PurchaseInvoiceForm.patchValue({
      purchaseInvoiceDetails: this.rowData,
      issueDate: moment(this.PurchaseInvoiceForm.value.issueDate).format(
        "YYYY-MM-DD"
      ),
      viAmount: 0,
    });
    this.PurchaseInvoiceForm.patchValue({
      attachedDocuments: [...this.rawAttachedDocuments],
    });
    if (!this.PurchaseInvoiceForm.value.builtyExpense) {
      this.PurchaseInvoiceForm.patchValue({
        builtyExpense: 0,
      });
    }
    if (!this.PurchaseInvoiceForm.value.localExpense) {
      this.PurchaseInvoiceForm.patchValue({
        localExpense: 0,
      });
    }

    if (!this.PurchaseInvoiceForm.value.advanceAmount) {
      this.PurchaseInvoiceForm.patchValue({
        advanceAmount: 0,
      });
    }

    if (!this.PurchaseInvoiceForm.value.veAmount) {
      this.PurchaseInvoiceForm.patchValue({
        veAmount: 0,
      });
    }

    this._purchaseService
      .create({ ...this.PurchaseInvoiceForm.value }, this.target)
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

  onAddRow() {
    const newItem: Record<string, any> = {};
    this.colDefs.forEach((colDef) => {
      if (colDef.field) {
        newItem[colDef.field] = null;
      }
    });

    // Insert the new item at the top of rowData
    this.rowData.unshift(newItem);

    // Refresh grid with new row data to update SrNo
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
    this.calculatePOTotalAmount();
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.rowData = [];
    this.rowSelection = "multiple";
  }

  getAllPurchaseOrder() {
    let supplierCOALevel04Id =
      this.PurchaseInvoiceForm.value.supplierCOALevel04Id;
    if (supplierCOALevel04Id != null) {
      this._purchaseService
        .getAllBySupplierId("PurchaseOrder", supplierCOALevel04Id)
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
      this._purchaseService
        .getAllBySupplierId("PurchaseOrder")
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
    // Find the selected PO from the array
    const selectedPO = this.poTableData.find((po) => po.id === id);

    // Ensure a match was found
    if (!selectedPO) {
      console.error("Sale Order not found with ID:", id);
      return;
    }

    this.selectData = selectedPO; // Now a single PO object

    // Populate the form with data
    this.PurchaseInvoiceForm.patchValue({
      supplierCOALevel04Id: selectedPO.supplierCOALevel04Id,
      brokerCOALevel04Id: selectedPO.brokerCOALevel04Id,
      taxCOALevel04Id: selectedPO.taxCOALevel04Id,
      warehouseId: selectedPO.warehouseId,
      tax: selectedPO.tax,
      brokerAmount: selectedPO.brokerAmount,
      brokerPercentage: selectedPO.brokerPercentage,
      veAmount: selectedPO.veAmount,
      referenceNumber: selectedPO.voucherNumber,
      paymentModeId: selectedPO.paymentModeId,
      total: selectedPO.total,
      freight: selectedPO.freight,
      remarks: selectedPO.remarks,
      localExpense: selectedPO?.localExpense,
      builtyExpense: selectedPO?.builtyExpense,
      netTotal: selectedPO.netTotal,
      advanceAmount: selectedPO.advanceAmount,
      advanceAmountBankCOALevl04Id: selectedPO.advanceAmountBankCOALevl04Id,
    });

    // Set purchaseOrderDetailId for each detail
    this.rowData = selectedPO.purchaseOrderDetails.map((item) => ({
      ...item,
      purchaseOrderDetailId: item.id, // Set the purchaseOrderDetailId from PO detail
    }));

    console.log("Data for Reference Number is: ", this.rowData);
    if (selectedPO.netTotal > selectedPO.total) {
      // Get the total quantity from the grid
      let totalQuantity = this.rowData.reduce(
        (sum, row) => sum + (Number(row.actualQuantity) || 0),
        0
      );
      let price = selectedPO.netTotal - selectedPO.total;

      if (totalQuantity > 0 && price > 0) {
        // Update the grid values
        this.rowData = this.rowData.map((row) => {
          return {
            ...row,
            costRate: Math.round(row.pricePerKg + price / totalQuantity), // Set costRate
            purchaseOrderDetailId: row.purchaseOrderDetailId, // Preserve the ID
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
          purchaseOrderDetailId: row.purchaseOrderDetailId, // Preserve the ID
        };
      });

      // Refresh the grid with updated values
      this.gridApi.setRowData(this.rowData);
    }
    this.displayPOModal = false;
    this.cdr.detectChanges();
  }
  // this._purchaseService
  //   .getData(id, "PurchaseOrder")
  //   .pipe(
  //     finalize(() => { }),
  //     catchError((error) => {
  //
  //       this.msgService.add({
  //         severity: "error",
  //         summary: "Error",
  //         detail: error.error?.error?.message,
  //         life: 2000,
  //       });
  //       return throwError(error.error?.error?.message);
  //     })
  //   )
  //   .subscribe({
  //     next: (response) => {
  //       this.piDataForEdit = response;
  //       this.PurchaseInvoiceForm.patchValue({
  //         supplierCOALevel04Id: this.piDataForEdit.supplierCOALevel04Id,
  //         brokerCOALevel04Id: this.piDataForEdit.brokerCOALevel04Id,
  //         taxCOALevel04Id: this.piDataForEdit.taxCOALevel04Id,
  //         warehouseId: this.piDataForEdit.warehouseId,
  //         tax: this.piDataForEdit.tax,
  //         brokerAmount: this.piDataForEdit.brokerAmount,
  //         brokerPercentage: this.piDataForEdit.brokerPercentage,
  //         veAmount: this.piDataForEdit.veAmount,
  //         referenceNumber: this.piDataForEdit.voucherNumber,
  //         paymentModeId: this.piDataForEdit.paymentModeId,
  //         total: this.piDataForEdit.total,
  //         freight: this.piDataForEdit.freight,
  //         remarks: this.piDataForEdit.remarks,
  //         localExpense: this.piDataForEdit?.localExpense,
  //         builtyExpense: this.piDataForEdit?.builtyExpense,
  //         netTotal: this.piDataForEdit.netTotal,
  //       });
  //       this.rowData = this.piDataForEdit.purchaseOrderDetails;
  //       console.log("Data for Reference Number is: ", this.rowData);
  //       if (this.piDataForEdit.netTotal > this.piDataForEdit.total) {
  //
  //         // Get the total quantity from the grid
  //         let totalQuantity = this.rowData.reduce(
  //           (sum, row) => sum + (Number(row.actualQuantity) || 0),
  //           0
  //         );
  //         let price = this.piDataForEdit.netTotal - this.piDataForEdit.total;

  //         if (totalQuantity > 0 && price > 0) {
  //           // Update the grid values
  //           this.rowData = this.rowData.map((row) => {
  //             return {
  //               ...row,
  //               costRate: row.pricePerKg + +(totalQuantity / price), // Set costRate
  //             };
  //           });

  //           // Refresh the grid with updated values
  //           this.gridApi.refreshCells(this.rowData);
  //         }
  //       } else {
  //         this.rowData = this.rowData.map((row) => {
  //           return {
  //             ...row,
  //             costRate: row.pricePerKg, // Set costRate
  //           };
  //         });

  //         // Refresh the grid with updated values
  //         this.gridApi.setRowData(this.rowData);
  //       }
  //       this.displayPOModal = false;
  //       this.cdr.detectChanges();
  //     },
  //   });

  onCellValueChanged(params) {
    const data = params.data;
    data.pricePerKg = Number(data.pricePerKg) || 0;
    data.quantity = Number(data.quantity) || 0;
    data.adjustment = Number(data.adjustment) || 0;
    const selectedUnit = this.units.find((unit) => unit.id === data.unitId);

    const unitMultiplier = selectedUnit
      ? Number(selectedUnit["additional"]) || 0
      : 0;
    if (params.column.getId() === "pricePerKg" && data.pricePerKg) {
      data.pricePerBag40Kg = data.pricePerKg * 40;
    } else if (
      params.column.getId() === "pricePerBag40Kg" &&
      data.pricePerBag40Kg
    ) {
      data.pricePerKg = data.pricePerBag40Kg / 40;
    }
    // data.pricePerBag40Kg = data.pricePerKg * 40;
    data.pricePerBag = data.pricePerKg * unitMultiplier;
    data.actualQuantity = Math.max(
      data.quantity * unitMultiplier + data.adjustment,
      0
    );
    data.grandTotal = Math.round(data.actualQuantity * data.pricePerKg);

    this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
    this.calculatePOTotalAmount();
    this.poSetupCalculations();
  }

  onProductChange(params: any) {
    const itemId = params.data.itemId;
    if (!itemId) return;

    this._purchaseService.getItemUnits(itemId, "Item").subscribe({
      next: (response) => {
        const units = response || [];

        // Default to first unit (make sure units actually exist)
        const unitId = units[0]?.unitId;
        if (!unitId) return;

        // Update grid row data
        params.data.unitId = unitId;
        params.data.unitOptions = units.map((u) => u.unitName);

        // Get supplier ID from form
        const supplierId = this.PurchaseInvoiceForm.get(
          "supplierCOALevel04Id"
        )?.value;
        if (!supplierId) return;

        // Call API to get latest rate
        this._purchaseService
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

  calculatePOTotalAmount() {
    let totalAmount = 0;
    const updatedRowData = [];

    if (this.gridApi) {
      this.gridApi.forEachNode((node) => {
        if (node.data.grandTotal) {
          totalAmount += Number(node.data.grandTotal);
        }
        updatedRowData.push(node.data);
      });

      totalAmount = Math.round(totalAmount);
      this.PurchaseInvoiceForm.get("total").setValue(totalAmount);
      this.rowData = updatedRowData;
    }
  }

  // calculatePOTotalAmount() {
  //   let totalAmount = 0;
  //   if (this.gridApi) {
  //     this.gridApi.forEachNode((node) => {
  //       if (node.data.grandTotal) {
  //         totalAmount += Number(node.data.grandTotal);
  //         totalAmount = Math.round(totalAmount);
  //       }
  //     });
  //     this.PurchaseInvoiceForm.get("total").setValue(totalAmount);
  //   }
  // }
  show(id?: number): void {
    if (id) {
      this.editMode = true;
      this.viewMode = false;
      this.PurchaseInvoiceForm.enable();

      this.uploadedImages = [];
      this.rawAttachedDocuments = [];

      this._purchaseService
        .getData(id, this.target)
        .pipe(
          finalize(() => {}),
          catchError((error) => {
            this.msgService.add({
              severity: "error",
              summary: "Error",
              detail: error.error?.error?.message || "Failed to load data",
              life: 2000,
            });
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (response) => {
            this.dataForEdit = response;

            // Patch form with data
            this.PurchaseInvoiceForm.patchValue({
              supplierCOALevel04Id: response.supplierCOALevel04Id,
              brokerCOALevel04Id: response.brokerCOALevel04Id,
              taxCOALevel04Id: response.taxCOALevel04Id,
              warehouseId: response.warehouseId,
              tax: response.tax,
              brokerAmount: response.brokerAmount,
              brokerPercentage: response.brokerPercentage,
              veAmount: response.veAmount,
              referenceNumber: response.referenceNumber,
              voucherNumber: response.voucherNumber,
              issueDate: new Date(response.issueDate),
              paymentModeId: response.paymentModeId,
              total: response.total,
              freight: response.freight,
              localExpense: response.localExpense,
              builtyExpense: response.builtyExpense,
              remarks: response.remarks,
              netTotal: response.netTotal,
              discountPercentage: response.discountPercentage,
              discountAmount: response.discountAmount,
              viAmount: response.viAmount,
              advanceAmount: response.advanceAmount,
              advanceAmountBankCOALevl04Id:
                response.advanceAmountBankCOALevl04Id,
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

            // Load grid data
            this.rowData = (response.purchaseInvoiceDetails || [])
              .slice()
              .reverse()
              .map((item) => ({
                ...item,
              }));

            this.displayModal = true;
            this.poSetupCalculations();
            this.cdr.detectChanges();
          },
        });
    } else {
      // New entry mode
      this.editMode = false;
      this.viewMode = false;
      this.uploadedImages = [];
      this.rawAttachedDocuments = [];

      this.PurchaseInvoiceForm.reset();
      this.PurchaseInvoiceForm.enable();
      this.PurchaseInvoiceForm.patchValue({
        issueDate: this.currentDate,
      });

      this.getVoucherNumber();
      this.rowData = [];

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
        this._purchaseService
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
    debugger;
    const executeApproval = () => {
      this._purchaseService.getData(id, this.target).subscribe({
        next: (invoiceData: any) => {
          const details = invoiceData.purchaseInvoiceDetails;

          const itemMap = new Map<
            number,
            { itemId: number; changes: { unitId: number; delta: number }[] }
          >();

          for (const detail of details) {
            const itemId = detail.itemId;
            const unitId = detail.unitId;
            const qty = Number(detail.quantity || 0);

            if (!itemId || qty <= 0) continue;

            const adjustedQty =
              qty * this.getUnitConversionMultiplier(unitId, unitId);

            if (!itemMap.has(itemId)) {
              itemMap.set(itemId, { itemId, changes: [] });
            }

            itemMap.get(itemId).changes.push({
              unitId,
              delta: adjustedQty, // ⬆️ Add to stock
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
              this._purchaseService.Approve(id, this.target).subscribe(() => {
                this.msgService.add({
                  severity: "success",
                  summary: "Confirmed",
                  detail: "Purchase invoice approved & stock updated.",
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
            detail: "Could not fetch purchase invoice data",
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
      this._purchaseService.unApprove(id, this.target).subscribe({
        next: () => {
          this.msgService.add({
            severity: "success",
            summary: "Confirmed",
            detail: "Purchase invoice un-approved.",
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
    const control = this.PurchaseInvoiceForm.get(field);
    return control ? control.invalid && control.touched : false;
  }
  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }
  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.loading = true;
    this.filters.voucherNumber = inputValue;
    this._purchaseService.getAll1(this.target, this.filters).subscribe({
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
    this.skipCount = (this.currentPage - 1) * this.maxCount;
    this._purchaseService
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
  onDateChange() {
    //
    // if (value) {
    this.PurchaseInvoiceForm.value.issueDate = this.selectedDate;
    // }
    if (this.PurchaseInvoiceForm.value.issueDate) {
      this.getVoucherNumber();
    }
  }

  downloadReport(purchaseInvoiceId: number) {
    const reportName = "Purchase Invoice Report";
    const reportUrl = "%2fPreviews%2fRPT_Preview_Purchase_Invoice";
    const reportFormat = 0;

    const queryParams = `ReportName=${encodeURIComponent(
      reportName
    )}&ReportUrl=${encodeURIComponent(reportUrl)}&format=${reportFormat}`;
    const fullUrl = `${this.baseurl}/api/services/app/Reporting/DownloadReport?${queryParams}`;

    const bodyParams = [
      {
        parameterName: "PurchaseInvoiceId", // Or PurchaseInvoiceCode if your backend expects that
        parameterValue: purchaseInvoiceId.toString(),
      },
    ];

    this._purchaseService.generateReport(fullUrl, bodyParams).subscribe({
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

  getVoucherNumber() {
    this._purchaseService
      .getVoucherNumber(
        "PI",
        this.PurchaseInvoiceForm.value.issueDate,
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
          if (this.PurchaseInvoiceForm.value.issueDate) {
            this.PurchaseInvoiceForm.get("voucherNumber").setValue(response);
          }
        },
        error: (err) => {
          console.log("An error occurred", err);
        },
      });
  }
  fetchDropdownData(target) {
    this._purchaseService
      .getAllSuggestion(target)
      .subscribe((response: any) => {
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
          case "Bank":
            this.advanceAmountCOA = mappedData;
            break;
          default:
            break;
        }
        this.cdr.detectChanges();
      });
  }

  updateCostRateFromExpenses() {
    const builty = Number(this.PurchaseInvoiceForm.value.builtyExpense) || 0;
    const local = Number(this.PurchaseInvoiceForm.value.localExpense) || 0;
    const ve = Number(this.PurchaseInvoiceForm.value.veAmount) || 0;

    const totalExpense = builty + local + ve;

    const totalActualQuantity = this.rowData.reduce(
      (sum, row) => sum + (Number(row.actualQuantity) || 0),
      0
    );

    const expensePerUnit =
      totalActualQuantity > 0 ? totalExpense / totalActualQuantity : 0;

    this.rowData = this.rowData.map((row) => ({
      ...row,
      costRate: Math.round((Number(row.pricePerKg) || 0) + expensePerUnit),
    }));

    this.gridApi.setRowData(this.rowData);
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
        return this._purchaseService
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

        this.PurchaseInvoiceForm.patchValue({
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

    this.PurchaseInvoiceForm.patchValue({
      attachedDocuments: [...this.rawAttachedDocuments],
    });
  }

  resetForm() {
    this.previewImageModal = false;
    this.isSuccessUpload = false;
  }
}
