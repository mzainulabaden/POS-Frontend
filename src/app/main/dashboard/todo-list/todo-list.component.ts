import { Component } from "@angular/core";
import { ConfirmationService, MessageService } from "primeng/api";
import { catchError, finalize, throwError } from "rxjs";
import { ChangeDetectorRef } from "@angular/core";
import { FormGroup, FormBuilder } from "@angular/forms";
import { DashboardService } from "../services/dashboard.service";

@Component({
  selector: "app-todo-list",
  templateUrl: "./todo-list.component.html",
})
export class TodoListComponent {
  todoListForm: FormGroup;
  target: string = "Todo";
  loading: boolean;
  tableData: any;
  rowData: any;
  saving: boolean;
  currentPage: number = 1;
  skipCount: number = 0;
  maxCount: number = 10;
  editMode: boolean;
  viewMode: boolean;
  displayModal: boolean;
  dataForEdit: any;
  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    name: "",
    description: "",
  };
  count: number;

  constructor(
    private cdr: ChangeDetectorRef,
    private _todoListService: DashboardService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder
  ) {
    this.todoListForm = this.fb.group({
      name: [""],
      description: [""],
    });
  }

  ngOnInit() {
    this.getAllData();
  }

  getAllData() {
    this.loading = true;
    this._todoListService
      .getAllData(this.target, this.skipCount, this.maxCount)
      .pipe(
        finalize(() => {}),
        catchError((error) => {
          this.messageService.add({
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
    this.loading = false;
  }

  show(id?: number) {
    if (id) {
      // Edit Mode
      this._todoListService
        .getData(id, this.target)
        .pipe(
          finalize(() => {}),
          catchError((error) => {
            this.messageService.add({
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
            this.todoListForm.patchValue({
              id: this.dataForEdit.id,
              name: this.dataForEdit.name,
              description: this.dataForEdit.description,
            });
            this.displayModal = true;
            this.cdr.detectChanges();
          },
        });
    } else {
      this.editMode = false;
      this.viewMode = false;
      this.todoListForm.reset();
      this.todoListForm.enable();
      this.rowData = [];
      this.displayModal = true;
    }
  }

  save() {
    this.saving = true;
    if (!this.todoListForm.valid) {
      this.messageService.add({
        severity: "error",
        detail: "Please fill all Required fields",
        life: 2000,
      });
      this.saving = false;
      return;
    }
    this.rowData = [];

    this.todoListForm.patchValue({ ...this.rowData });
    this._todoListService
      .create({ ...this.todoListForm.value }, this.target)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        catchError((error) => {
          this.messageService.add({
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
          this.messageService.add({
            severity: "success",
            summary: "Confirmed",
            detail: "SavedSuccessfully",
            life: 2000,
          });
          this.getAllData();
          this.saving = false;
          this.displayModal = false;
        },
      });
  }

  update() {
    this.saving = true;
    this.rowData = [];
    this.todoListForm.patchValue({ ...this.rowData });
    const updateData = {
      ...this.todoListForm.value,
      id: this.dataForEdit.id,
    };
    this._todoListService
      .update(updateData, this.target)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        catchError((error) => {
          this.messageService.add({
            severity: "error",
            summary: "Error",
            detail: error.message,
            life: 2000,
          });
          return throwError(error.message);
        })
      )
      .subscribe({
        next: (response) => {
          this.messageService.add({
            severity: "success",
            summary: "Confirmed",
            detail: "UpdatedSuccessfully",
            life: 2000,
          });
          this.getAllData();
          this.saving = false;
          this.displayModal = false;
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
        this._todoListService
          .delete(id, this.target)
          .pipe(
            finalize(() => {}),
            catchError((error) => {
              this.messageService.add({
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
                this.messageService.add({
                  severity: "info",
                  summary: "Confirmed",
                  detail: "Deleted Successfully",
                  life: 2000,
                });
                this.getAllData();
              }
            },
          });
      },
    });
  }
  onPageChange(event: any) {
    this.maxCount = event.rows;
    this.currentPage = event.page + 1;
    this.loading = true;
    this.skipCount = (this.currentPage - 1) * 10;
    this._todoListService.getAll(this.target, this.filters).subscribe({
      next: (response) => {
        this.tableData = response.items;
        this.count = response.totalCount;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  edit(id: any) {
    this.editMode = true;
    this.viewMode = false;
    this.show(id);
    this.todoListForm.enable();
  }

  viewOnly(id: any) {
    this.viewMode = true;
    this.displayModal = true;
    this.editMode = false;
    this.show(id);
    this.todoListForm.disable();
  }
}
