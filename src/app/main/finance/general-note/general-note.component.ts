import { Component, Injector, OnInit } from "@angular/core";
import { ConfirmationService, MessageService } from "primeng/api";
import { catchError, finalize, throwError } from "rxjs";
import { UrlHelper } from "@shared/helpers/UrlHelper";
import { Table } from "@node_modules/primeng/table";
import { HrmService } from "../../hrm/shared/services/hrm.service";
import { ProductSearchEditorComponent } from "../../search-component/product-search-editor.component";
import { ChangeDetectorRef } from "@angular/core";
import { FinanceService } from "../Service/finance.service";
import * as moment from "moment";
import {
  FormBuilder,
  FormGroup,
  Validators,
} from "@node_modules/@angular/forms";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";

@Component({
  selector: "app-journal-voucher",
  templateUrl: "./general-note.component.html",
})
export class GeneralNoteComponent implements OnInit {
  GeneralNoteForm: FormGroup;
  target: string = "GeneralNote";
  loading: boolean = false;
  gridApi: GridApi;
  today: Date = new Date();
  generalNoteTypeOptions: any[];
  rowSelection: string = 'single';
  tableData: any[] = [];
  rowData: any[] = [];
  rowCount: number = 0;
  saving: boolean = false;
  currentPage: number = 1;
  skipCount: number = 0;
  maxCount: number = 10;
  editMode: boolean = false;
  viewMode: boolean = false;
  displayModal: boolean = false;
  dataForEdit: any;

  // Filters for data fetching
  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    VoucherNumber: "",
  };

  // Chart of Account levels
  coaLvl4: { id: any; name: string }[] = [];
  coaLvl1: { id: any; name: string }[] = [];
  coaLvl2: { id: any; name: string }[] = [];
  coaLvl3: { id: any; name: string }[] = [];
  count: number = 0;

  frameworkComponents = {
    productSearchEditor: ProductSearchEditorComponent,
  };

  // Column definitions for AG Grid
  colDefs: ColDef[] = [
    {
      headerName: "SrNo",
      editable: false,
      field: "srNo",
      sortable: true,
      width: 90,
      valueGetter: "node.rowIndex + 1",
      suppressSizeToFit: true,
    },
    {
      headerName: "COA Level 1",
      field: "coAlvl1Id",
      cellEditor: "productSearchEditor",
      cellEditorParams: () => ({
        valuesRaw: this.coaLvl1,
      }),
      valueGetter: (params) => {
        const item = this.coaLvl1.find(i => i.id === params.data.coAlvl1Id);
        return item ? item.name : "";
      },
      valueSetter: (params) => {
        const selected = this.coaLvl1.find(i => i.id === params.newValue);
        if (selected) {
          // Clear other COA level fields when one is selected
          params.data.coAlvl2Id = null;
          params.data.coAlvl3Id = null;
          params.data.coAlvl4Id = null;
          params.data.coAlvl1Id = selected.id;
          return true;
        }
        return false;
      },
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "COA Level 2",
      field: "coAlvl2Id",
      cellEditor: "productSearchEditor",
      cellEditorParams: () => ({
        valuesRaw: this.coaLvl2,
      }),
      valueGetter: (params) => {
        const item = this.coaLvl2.find(i => i.id === params.data.coAlvl2Id);
        return item ? item.name : "";
      },
      valueSetter: (params) => {
        const selected = this.coaLvl2.find(i => i.id === params.newValue);
        if (selected) {
          // Clear other COA level fields when one is selected
          params.data.coAlvl1Id = null;
          params.data.coAlvl3Id = null;
          params.data.coAlvl4Id = null;
          params.data.coAlvl2Id = selected.id;
          return true;
        }
        return false;
      },
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "COA Level 3",
      field: "coAlvl3Id",
      cellEditor: "productSearchEditor",
      cellEditorParams: () => ({
        valuesRaw: this.coaLvl3,
      }),
      valueGetter: (params) => {
        const item = this.coaLvl3.find(i => i.id === params.data.coAlvl3Id);
        return item ? item.name : "";
      },
      valueSetter: (params) => {
        const selected = this.coaLvl3.find(i => i.id === params.newValue);
        if (selected) {
          // Clear other COA level fields when one is selected
          params.data.coAlvl1Id = null;
          params.data.coAlvl2Id = null;
          params.data.coAlvl4Id = null;
          params.data.coAlvl3Id = selected.id;
          return true;
        }
        return false;
      },
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "COA Level 4",
      field: "coAlvl4Id",
      cellEditor: "productSearchEditor",
      cellEditorParams: () => ({
        valuesRaw: this.coaLvl4,
      }),
      valueGetter: (params) => {
        const item = this.coaLvl4.find(i => i.id === params.data.coAlvl4Id);
        return item ? item.name : "";
      },
      valueSetter: (params) => {
        const selected = this.coaLvl4.find(i => i.id === params.newValue);
        if (selected) {
          // Clear other COA level fields when one is selected
          params.data.coAlvl1Id = null;
          params.data.coAlvl2Id = null;
          params.data.coAlvl3Id = null;
          params.data.coAlvl4Id = selected.id;
          return true;
        }
        return false;
      },
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "GeneralNoteVoucherPrefix",
      editable: true,
      field: "generalNoteVoucherPrefix",
      resizable: true,
      suppressSizeToFit: true,
    },
    {
      headerName: "GeneralNoteVoucherIndex",
      editable: true,
      field: "generalNoteVoucherIndex",
      resizable: true,
      suppressSizeToFit: true,
    },
    {
      headerName: "StockVoucherPrefix ",
      editable: true,
      field: "stockVoucherPrefix",
      resizable: true,
      suppressSizeToFit: true,
    },
    {
      headerName: "StockVoucherIndex",
      editable: true,
      field: "stockVoucherIndex",
      resizable: true,
      suppressSizeToFit: true,
    },
    {
      headerName: "FixedAssetVoucherPrefix",
      editable: true,
      field: "fixedAssetVoucherPrefix",
      resizable: true,
      suppressSizeToFit: true,
    },
    {
      headerName: "FixedAssetVoucherIndex",
      editable: true,
      field: "fixedAssetVoucherIndex",
      resizable: true,
      suppressSizeToFit: true,
    },
    {
      headerName: "Transaction Type",
      field: "transactionType",
      editable: true,
      resizable: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: ["Debit", "Credit", "Both"],
      },
      valueGetter: (params) => {
        switch (params.data.transactionType) {
          case 0: return "Debit";
          case 1: return "Credit";
          case 2: return "Both";
          default: return "";
        }
      },
      valueSetter: (params) => {
        let newValue;
        switch (params.newValue) {
          case "Debit": newValue = 0; break;
          case "Credit": newValue = 1; break;
          case "Both": newValue = 2; break;
          default: newValue = null;
        }
        params.data.transactionType = newValue;
        return true;
      }
    },
  ];

  isFieldInvalid(field: string): boolean {
    const control = this.GeneralNoteForm.get(field);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  onCellValueChanged(params: any) {
    // Handle cell value changes if needed
    console.log('Cell value changed:', params);
  }

  constructor(
    injector: Injector,
    private cdr: ChangeDetectorRef,
    private _financeService: FinanceService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder,
    private _hrmService: HrmService,
  ) {
    this.GeneralNoteForm = this.fb.group({
      issueDate: [this.today, Validators.required],
      voucherNumber: [null, Validators.required],
      remarks: [""],
      title: ["", Validators.required],
      noteIndex: ["", Validators.required],
      generalNoteType: [0, Validators.required],
      generalNoteDetails: [[]],
    });
  }

  ngOnInit() {
    this.getAllData();
    this.fetchDropdownData("COALevel01");
    this.fetchDropdownData("COALevel02");
    this.fetchDropdownData("COALevel03");
    this.fetchDropdownData("COALevel04");

    this.generalNoteTypeOptions = [
      { name: "TRIAL_BALANCE", value: 0 },
      { name: "PROFIT_AND_LOSS", value: 1 },
    ];
  }

  fetchDropdownData(target: string) {
    this._financeService.getAllSuggestion(target).subscribe({
      next: (response: any) => {
        const mappedData = response.items.map((item: any) => ({
          id: item?.id,
          name: item?.name,
        }));

        switch (target) {
          case "COALevel01":
            this.coaLvl1 = mappedData;
            break;
          case "COALevel02":
            this.coaLvl2 = mappedData;
            break;
          case "COALevel03":
            this.coaLvl3 = mappedData;
            break;
          case "COALevel04":
            this.coaLvl4 = mappedData;
            break;
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Failed to load dropdown data",
          life: 2000,
        });
      }
    });
  }

  getVoucherNumber() {
    if (!this.GeneralNoteForm.value.issueDate) return;

    this._financeService
      .getVoucherNumber("GN", this.GeneralNoteForm.value.issueDate, this.target)
      .pipe(
        catchError((error) => {
          this.messageService.add({
            severity: "error",
            summary: "Error",
            detail: error.error?.error?.message || "Failed to get voucher number",
            life: 2000,
          });
          return throwError(error);
        })
      )
      .subscribe({
        next: (response) => {
          this.GeneralNoteForm.get("voucherNumber")?.setValue(response);
        }
      });
  }

  onDateChange(value?: any) {
    if (value) {
      this.GeneralNoteForm.patchValue({ issueDate: value });
    }
    this.getVoucherNumber();
  }

  getAllData() {
    this.loading = true;
    this._financeService
      .getAllData(this.target, this.skipCount, this.maxCount)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        catchError((error) => {
          this.messageService.add({
            severity: "error",
            summary: "Error",
            detail: error.error?.error?.message || "Failed to load data",
            life: 2000,
          });
          return throwError(error);
        })
      )
      .subscribe({
        next: (response) => {
          this.tableData = response.items || [];
          this.count = response.totalCount || 0;
          this.cdr.detectChanges();
        }
      });
  }

  show(id?: number) {
    if (id) {
      // Edit Mode
      this._financeService
        .getForEditData(id, this.target)
        .pipe(
          catchError((error) => {
            this.messageService.add({
              severity: "error",
              summary: "Error",
              detail: error.error?.error?.message || "Failed to load data",
              life: 2000,
            });
            return throwError(error);
          })
        )
        .subscribe({
          next: (response) => {
            this.dataForEdit = response;
            this.GeneralNoteForm.patchValue({
              id: this.dataForEdit.id,
              voucherNumber: this.dataForEdit.voucherNumber,
              issueDate: new Date(this.dataForEdit.issueDate),
              remarks: this.dataForEdit.remarks,
              title: this.dataForEdit.title,
              noteIndex: this.dataForEdit.noteIndex,
              generalNoteType: this.dataForEdit.generalNoteType,
              generalNoteDetails: this.dataForEdit.generalNoteDetails || [],
            });

            // In the show() method where you handle edit mode:
            this.rowData = this.dataForEdit.generalNoteDetails.map((item: any) => ({
              ...item,
            }));
            if (this.gridApi) {
              this.gridApi.setRowData(this.rowData);
            }

            this.displayModal = true;
            this.editMode = true;
            this.cdr.detectChanges();
          }
        });
    } else {
      // Create Mode
      this.editMode = false;
      this.viewMode = false;
      this.GeneralNoteForm.reset();
      this.GeneralNoteForm.patchValue({
        issueDate: this.today,
        generalNoteDetails: []
      });
      this.GeneralNoteForm.enable();
      this.rowData = [];
      this.displayModal = true;
      this.getVoucherNumber();
    }
  }

  validateForm(): boolean {
    // Validate main form
    if (!this.GeneralNoteForm.valid) {
      this.messageService.add({
        severity: "error",
        summary: "Error",
        detail: "Please fill all required fields",
        life: 2000,
      });
      return false;
    }

    // Validate grid data
    if (!this.gridApi || this.gridApi.getDisplayedRowCount() === 0) {
      this.messageService.add({
        severity: "error",
        summary: "Error",
        detail: "Please add at least one entry in the table",
        life: 2000,
      });
      return false;
    }

    // Validate COA levels - only one should be selected per row
    let isValid = true;
    const rowData: any[] = [];

    this.gridApi.forEachNodeAfterFilterAndSort(node => {
      const data = node.data;

      rowData.push(data);
      if (data.transactionType === null || data.transactionType === undefined) {
        isValid = false;
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Each row must have a transaction type selected",
          life: 2000,
        });
      }
      // Check that exactly one COA level is selected
      const coaFields = ['coAlvl1Id', 'coAlvl2Id', 'coAlvl3Id', 'coAlvl4Id'];
      const selectedCoaFields = coaFields.filter(field => !!data[field]);

      if (selectedCoaFields.length !== 1) {
        isValid = false;
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Each row must have exactly one COA level selected",
          life: 2000,
        });
      }
    });

    if (!isValid) return false;

    // Update form with current grid data
    this.GeneralNoteForm.patchValue({
      generalNoteDetails: rowData,
      issueDate: moment(this.GeneralNoteForm.value.issueDate).format("YYYY-MM-DD")
    });

    return true;
  }

  save() {
    if (!this.validateForm()) {
      this.saving = false;
      return;
    }

    this.saving = true;
    const formData = this.GeneralNoteForm.value;

    this._financeService
      .create(formData, this.target)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        catchError((error) => {
          this.messageService.add({
            severity: "error",
            summary: "Error",
            detail: error.error?.error?.message || "Failed to save data",
            life: 2000,
          });
          return throwError(error);
        })
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: "success",
            summary: "Success",
            detail: "Saved successfully",
            life: 2000,
          });
          this.getAllData();
          this.displayModal = false;
        }
      });
  }

  update() {
    if (!this.validateForm()) {
      this.saving = false;
      return;
    }

    this.saving = true;
    const updateData = {
      ...this.GeneralNoteForm.value,
      id: this.dataForEdit.id,
    };

    this._financeService
      .updateEdit(updateData, this.target)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        catchError((error) => {
          this.messageService.add({
            severity: "error",
            summary: "Error",
            detail: error.error?.error?.message || "Failed to update data",
            life: 2000,
          });
          return throwError(error);
        })
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: "success",
            summary: "Success",
            detail: "Updated successfully",
            life: 2000,
          });
          this.getAllData();
          this.displayModal = false;
        }
      });
  }

  delete(id: number) {
    this.confirmationService.confirm({
      message: "Are you sure you want to delete this record?",
      header: "Confirmation",
      icon: "pi pi-exclamation-triangle",
      accept: () => {
        this._financeService
          .delete(id, this.target)
          .pipe(
            catchError((error) => {
              this.messageService.add({
                severity: "error",
                summary: "Error",
                detail: error.error?.error?.message || "Failed to delete",
                life: 2000,
              });
              return throwError(error);
            })
          )
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: "success",
                summary: "Success",
                detail: "Deleted successfully",
                life: 2000,
              });
              this.getAllData();
            }
          });
      }
    });
  }

  onPageChange(event: any) {
    this.maxCount = event.rows;
    this.currentPage = event.page + 1;
    this.skipCount = (this.currentPage - 1) * this.maxCount;
    this.getAllData();
  }

  onAddRow() {
    if (!this.gridApi) return;

    const newItem: any = {
      coAlvl1Id: null,
      coAlvl2Id: null,
      coAlvl3Id: null,
      coAlvl4Id: null,
      transactionType: null
    };

    this.gridApi.applyTransaction({ add: [newItem] });
  }

  onRemoveSelected() {
    if (!this.gridApi) return;

    const selectedNodes = this.gridApi.getSelectedNodes();
    if (selectedNodes.length > 0) {
      this.gridApi.applyTransaction({ remove: selectedNodes.map(node => node.data) });
    }
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    if (this.rowData && this.rowData.length > 0) {
      this.gridApi.setRowData(this.rowData);
    }
  }

  edit(id: any) {
    this.editMode = true;
    this.viewMode = false;
    this.show(id);
    this.GeneralNoteForm.enable();
  }

  viewOnly(id: any) {
    this.viewMode = true;
    this.editMode = false;
    this.show(id);
    this.GeneralNoteForm.disable();
  }

  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.filters.VoucherNumber = inputValue;
    this.getAllData();
  }
}