import { Component, ChangeDetectorRef, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MessageService, ConfirmationService } from "primeng/api";
import { SalesService } from "../../sales/shared/services/sales.service";
import { Table } from "primeng/table";
import { catchError, finalize, throwError } from "rxjs";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
import * as moment from "moment";
import { MainSetupsService } from "../shared/services/main-setups.service";
import { ProductSearchEditorComponent } from "@app/main/search-component/product-search-editor.component";

@Component({
  selector: "app-daybook",
  templateUrl: "./daybook.component.html",
})
export class DayBookComponent implements OnInit {
  dayBookForm: FormGroup;
  target: string = "DayBook";
  loading: boolean;
  gridApi: GridApi;
  today: Date = new Date();
  rowData: any[] = [];
  rowCount: number;
  saving: boolean;
  currentPage: number = 1;
  skipCount: number = 0;
  maxCount: number = 10;
  editMode: boolean;
  viewMode: boolean;
  displayModal: boolean;
  dataForEdit: any;
  tableData: any;
  count: number;
  rowSelection: string;

  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    name: "",
  };

  coa: { id: any; name: string }[] = [];

  frameworkComponents = {
    productSearchEditor: ProductSearchEditorComponent,
  };

  colDefs: ColDef[] = [
    {
      headerName: "Sr No",
      editable: false,
      field: "srNo",
      sortable: true,
      width: 90,
      valueGetter: "node.rowIndex+1",
      suppressSizeToFit: true,
    },
    {
      headerName: "Expense",
      field: "coaId",
      cellEditor: "productSearchEditor",
      cellEditorParams: () => ({
        valuesRaw: this.coa,
      }),
      valueGetter: (params) => {
        if (!params.data) return '';
        // First try to get from coaName (for existing data)
        if (params.data.coaName) return params.data.coaName;
        // Then try to find in coa array
        const item = this.coa.find(i => i.id === params.data.coaId);
        return item ? item.name : '';
      },
      valueSetter: (params) => {
        const selected = this.coa.find(i => i.id === params.newValue);
        if (selected) {
          params.data.coaId = selected.id;
          params.data.coaName = selected.name;
          return true;
        }
        return false;
      },
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Amount",
      field: "amount",
      editable: true,
      resizable: true,
      width: 150,
    },
    {
      headerName: "Description",
      field: "description",
      editable: true,
      resizable: true,
      width: 150,
    }
  ];

  constructor(
    private fb: FormBuilder,
    private _salesService: SalesService,
    private _mainSetupService: MainSetupsService,
    private cdr: ChangeDetectorRef,
    private msgService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.dayBookForm = this.fb.group({
      id: [0],
      name: ["", [Validators.required]],
      issueDate: ["", [Validators.required]],
      total: [0],
      dayBookDetails: [[]],
    });
  }

  ngOnInit() {
    this.getAll();
    this.fetchDropdownData('Expense');
  }

  getTodayDate(): Date {
    return new Date();
  }

  fetchDropdownData(target: string) {
    this._mainSetupService.getAllSuggestion(target).subscribe({
      next: (response: any) => {
        const mappedData = response.items.map((item: any) => ({
          id: item?.id,
          name: item?.name,
        }));

        switch (target) {
          case "Expense":
            this.coa = mappedData;
            break;
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.msgService.add({
          severity: "error",
          summary: "Error",
          detail: "Failed to load dropdown data",
          life: 2000,
        });
      }
    });
  }

  isFieldInvalid(field: string): any {
    const control = this.dayBookForm.get(field);
    return control ? control.invalid && control.touched : false;
  }

  onDateChange(value?: any) {
    if (value) {
      this.dayBookForm.patchValue({ issueDate: value });
    }
  }

  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.loading = true;
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
      this._salesService
        .getData(id, this.target)
        .pipe(
          finalize(() => { }),
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
            this.dayBookForm.patchValue({
              id: this.dataForEdit.id,
              name: this.dataForEdit.name,
              total: this.dataForEdit.total,
              issueDate: new Date(this.dataForEdit.issueDate),
              coaId: this.dataForEdit.coaId,
              dayBookDetails: this.dataForEdit.dayBookDetails || []
            });

            this.rowData = (this.dataForEdit.dayBookDetails || [])
              .map((row) => ({ ...row }))
              .reverse();

            this.displayModal = true;
            this.cdr.detectChanges();
          },
        });
    } else {
      this.editMode = false;
      this.viewMode = false;
      this.dayBookForm.reset({
        id: 0,
        issueDate: this.today,
        total: 0 // Initialize total to 0
      });
      this.dayBookForm.enable();
      this.rowData = [{
        id: 0,
        coaId: null,
        coaName: '',
        amount: 0,
        description: ''
      }]; // Initialize with one empty row
      this.displayModal = true;
    }
  }

  calculateTotal() {
    let totalAmount = 0;
    if (this.gridApi) {
      this.gridApi.forEachNode((node) => {
        if (node.data && node.data.amount) {
          totalAmount += Number(node.data.amount) || 0;
        }
      });
      this.dayBookForm.get("total")?.setValue(totalAmount);
    }
    return totalAmount; 
  }

  save() {
    this.calculateTotal();
    this.saving = true;
    this.rowData = [];

    if (this.gridApi) {
      this.gridApi.forEachNodeAfterFilterAndSort((node) => {
        this.rowData.unshift(node.data);
      });
    }

    this.dayBookForm.patchValue({
      dayBookDetails: this.rowData
    });

    const formData = this.dayBookForm.value;

    this._salesService
      .create(formData, this.target)
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
            detail: "Saved Successfully",
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
      this.rowData.unshift(node.data);
    });

    this.dayBookForm.patchValue({
      dayBookDetails: this.rowData
    });

    const updateData = this.dayBookForm.value;

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
            detail: "Updated Successfully",
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
        finalize(() => { }),
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

  onAddRow() {
    const newItem = {
      id: 0,
      coaName: '',
      coAlevel04Id: 0,
      amount: 0,
      description: ''
    };

    if (this.gridApi) {
      this.gridApi.applyTransaction({ add: [newItem], addIndex: 0 });
      this.gridApi.refreshCells({ force: true });
    } else {
      this.rowData.unshift(newItem);
    }
  }

  onRemoveSelected() {
    if (this.gridApi) {
      const selectedNodes = this.gridApi.getSelectedNodes();
      if (selectedNodes.length > 0) {
        const dataToRemove = selectedNodes.map((node) => node.data);
        this.gridApi.applyTransaction({ remove: dataToRemove });
        this.rowData = [];
        this.gridApi.forEachNode((node) => this.rowData.push(node.data));
      }
    }
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.rowSelection = "multiple";

    // Add event listeners for automatic total calculation
    this.gridApi.addEventListener('cellValueChanged', () => {
      this.calculateTotal();
    });

    this.gridApi.addEventListener('rowDataChanged', () => {
      this.calculateTotal();
    });
  }

  edit(id: any) {
    this.editMode = true;
    this.viewMode = false;
    this.show(id);
    this.dayBookForm.enable();
  }

  viewOnly(id: any) {
    this.viewMode = true;
    this.displayModal = true;
    this.editMode = false;
    this.show(id);
    this.dayBookForm.disable();
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
            finalize(() => { }),
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