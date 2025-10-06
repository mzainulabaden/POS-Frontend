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
  selector: "app-profit-loss-note",
  templateUrl: "./profit-loss-note.component.html",
  styleUrl: "./profit-loss-note.component.css",
})
export class ProfitLossNoteComponent {
  profitLossNoteForm: FormGroup;
  target: string = "ProfitLoseNote";
  loading: boolean = false;
  gridApi: GridApi;
  today: Date = new Date();
  accountTypeOptions: any[];
  rowSelection: string = "single";
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
    noteNumber: "",
  };

  // Chart of Account levels
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
      flex: 1,
      valueGetter: "node.rowIndex + 1",
      suppressSizeToFit: true,
    },

    {
      headerName: "COA Level 3",
      field: "coaLevel03Id",
      cellEditor: "productSearchEditor",
      cellEditorParams: () => ({
        valuesRaw: this.coaLvl3,
      }),
      valueFormatter: (params) => {
        const item = this.coaLvl3.find((i) => i.id === params.value);
        return item ? item.name : params.data.coAlevel03Name || "";
      },
      editable: true,
      resizable: true,
      flex: 3,
    },
  ];

  onCellValueChanged(params: any) {
    if (params.colDef.field === "coaLevel03Id") {
      const selected = this.coaLvl3.find((x) => x.id === params.value);
      if (selected) {
        params.data.coaLevel03Id = selected.id;
        params.data.coAlevel03Name = selected.name;
      }
    }
  }

  isFieldInvalid(field: string): boolean {
    const control = this.profitLossNoteForm.get(field);
    return control
      ? control.invalid && (control.dirty || control.touched)
      : false;
  }

  constructor(
    injector: Injector,
    private cdr: ChangeDetectorRef,
    private _financeService: FinanceService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder,
    private _hrmService: HrmService
  ) {
    this.profitLossNoteForm = this.fb.group({
      noteNumber: [null, Validators.required],
      accountType: [null, Validators.required],
      name: ["", Validators.required],
      profitLoseNoteDetails: [[]],
    });
  }

  ngOnInit() {
    this.getAllData();
    this.fetchDropdownData("COALevel03");

    this.accountTypeOptions = [
      { name: "Revenue", value: 1 },
      { name: "Expense", value: 2 },
      { name: "OtherIncome", value: 3 },
      { name: "Tax", value: 4 },
      { name: "Finance", value: 5 },
    ];
  }

  fetchDropdownData(target: string) {
    this._financeService.getAllSuggestion(target).subscribe({
      next: (response: any) => {
        const mappedData = response.items.map((item: any) => ({
          id: item?.id,
          name: item?.name,
        }));

        this.coaLvl3 = mappedData;
        console.log(this.coaLvl3);

        this.cdr.detectChanges();
      },
      error: (error) => {
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Failed to load dropdown data",
          life: 2000,
        });
      },
    });
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
          console.log("================ Profit Loss Data ", this.tableData);

          this.count = response.totalCount || 0;
          this.cdr.detectChanges();
        },
      });
  }

  show(id?: number) {
    if (id) {
      // Edit Mode
      this._financeService
        .getData(id, this.target)
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
            this.profitLossNoteForm.patchValue({
              id: this.dataForEdit.id,
              noteNumber: this.dataForEdit.noteNumber,
              accountType: this.dataForEdit.accountType,
              name: this.dataForEdit.name,
              profitLoseNoteDetails:
                this.dataForEdit.profitLoseNoteDetails || [],
            });

            this.rowData = (this.dataForEdit.profitLoseNoteDetails || [])
              .slice()
              .reverse();

            console.log("Row Data at line 255", this.rowData);
            if (this.gridApi) {
              this.gridApi.setRowData(this.rowData);
            }

            console.log(this.profitLossNoteForm.value);

            this.displayModal = true;
            this.editMode = true;
            this.cdr.detectChanges();
          },
        });
    } else {
      // Create Mode
      this.editMode = false;
      this.viewMode = false;
      this.profitLossNoteForm.reset();
      this.profitLossNoteForm.patchValue({
        profitLoseNoteDetails: [],
      });
      this.profitLossNoteForm.enable();
      this.rowData = [];
      this.displayModal = true;
    }
  }

  validateForm(): boolean {
    if (!this.profitLossNoteForm.valid) {
      this.messageService.add({
        severity: "error",
        summary: "Error",
        detail: "Please fill all required fields",
        life: 2000,
      });
      return false;
    }

    if (!this.gridApi || this.gridApi.getDisplayedRowCount() === 0) {
      this.messageService.add({
        severity: "error",
        summary: "Error",
        detail: "Please add at least one entry in the table",
        life: 2000,
      });
      return false;
    }

    const rowData: any[] = [];
    this.gridApi.forEachNode((node) => {
      rowData.push({
        id: node.data.id || null,
        coaLevel03Id: node.data.coaLevel03Id,
        coAlevel03Name: node.data.coAlevel03Name,
      });
    });

    const hasInvalidRows = rowData.some((row) => {
      return !row.coaLevel03Id;
    });

    if (hasInvalidRows) {
      this.messageService.add({
        severity: "error",
        summary: "Error",
        detail: "Each row must have a COA Level 3 selected",
        life: 2000,
      });
      return false;
    }

    console.log("Row Data", rowData);

    this.profitLossNoteForm.patchValue({
      profitLoseNoteDetails: rowData,
    });

    return true;
  }

  save() {
    if (!this.validateForm()) {
      this.saving = false;
      return;
    }

    this.saving = true;
    const formData = this.profitLossNoteForm.value;

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
        },
      });
  }

  update() {
    if (!this.validateForm()) {
      this.saving = false;
      return;
    }

    console.log("In update", this.profitLossNoteForm.value);

    this.saving = true;
    const updateData = {
      ...this.profitLossNoteForm.value,
      id: this.dataForEdit.id,
    };

    this._financeService
      .update(updateData, this.target)
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
        },
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
            },
          });
      },
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
      coAlvl3Id: null,
    };

    this.gridApi.applyTransaction({ add: [newItem] });
  }

  onRemoveSelected() {
    if (!this.gridApi) return;

    const selectedNodes = this.gridApi.getSelectedNodes();
    if (selectedNodes.length > 0) {
      const dataToRemove = selectedNodes.map((node) => node.data);
      this.gridApi.applyTransaction({ remove: dataToRemove });
      this.rowData = [];
      this.gridApi.forEachNode((node) => this.rowData.push(node.data));
    }

    console.log(this.rowData, "In Remove Selected");
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
    this.profitLossNoteForm.enable();
  }

  viewOnly(id: any) {
    this.viewMode = true;
    this.editMode = false;
    this.show(id);
    this.profitLossNoteForm.disable();
  }

  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.filters.noteNumber = inputValue;
    this.getAllData();
  }

  getAccountTypeName(value: number): string {
    const option = this.accountTypeOptions.find((opt) => opt.value === value);
    return option ? option.name : "Unknown";
  }
}
