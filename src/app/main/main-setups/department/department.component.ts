import { Component, Injector, OnInit } from "@angular/core";
import { MainSetupsService } from "../shared/services/main-setups.service";
import { ConfirmationService, MessageService } from "primeng/api";
import { catchError, finalize, throwError } from "rxjs";
import { UrlHelper } from "@shared/helpers/UrlHelper";
import { Table } from "@node_modules/primeng/table";
import { ChangeDetectorRef } from "@angular/core";

interface DepartmentDto {
  id: number;
  name: string;
}

@Component({
  selector: "app-department",
  templateUrl: "./department.component.html",
})
export class DepartmentComponent implements OnInit {
  department: DepartmentDto = { id: 0, name: "" };

  urlHelper = UrlHelper;
  tableData: any;
  count: number;
  displayModal: boolean;
  editMode: boolean;
  saving: boolean;
  loading: boolean;
  target = "Department";
  currentPage = 1;
  filterDto = {
    skipCount: 0,
    maxCount: 10,
    DocOrVocNumber: "",
    name: "",
  };
  constructor(
    injector: Injector,
    private _service: MainSetupsService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.getAll();
  }

  getAll() {
    this.loading = true;
    this._service
      .getAllRecord(this.target, this.filterDto)
      .pipe(
        finalize(() => {
          this.loading = false;
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
          this.tableData = response.items;
          this.count = response.totalCount;
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
        this._service
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
                this.getAll();
              }
            },
          });
      },
    });
  }

  show(id?: number) {
    if (id) {
      this.editMode = true;
      this._service
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
            this.department = response;
            this.displayModal = true;
            this.cdr.detectChanges();
          },
        });
    } else {
      this.editMode = false;
      this.displayModal = true;
      this.department = { id: 0, name: "" };
    }
  }

  save() {
    this.saving = true;
    if (!this.department.name) {
      this.messageService.add({
        severity: "error",
        detail: "Name is Required",
        life: 2000,
      });
      this.saving = false;
      return;
    }
    this._service
      .create(this.department, this.target)
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
        next: () => {
          this.messageService.add({
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

  update() {
    this.saving = true;
    if (!this.department.name) {
      this.messageService.add({
        severity: "error",
        detail: "Name is Required",
        life: 2000,
      });
      this.saving = false;
      return;
    }
    this._service
      .update(this.department, this.target)
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
        next: () => {
          this.messageService.add({
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
  async onPageChange(event: any) {
    this.filterDto.maxCount = event.rows;
    this.currentPage = event.page + 1;
    this.filterDto.skipCount = (this.currentPage - 1) * this.filterDto.maxCount;
    this.getAll();
  }
  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }
  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.loading = true;
    this.filterDto.name = inputValue;
    this._service.getAllRecord(this.target, this.filterDto).subscribe({
      next: (response) => {
        this.tableData = response.items;
        this.count = response.totalCount;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}


