import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { ConfirmationService, MessageService } from "primeng/api";
import { catchError, finalize, throwError } from "rxjs";
import { ChangeDetectorRef } from "@angular/core";
import { FormGroup, FormBuilder } from "@angular/forms";
import { DashboardService } from "../services/dashboard.service";
import { DataRefreshComponent } from "../../../../shared/components/data-refresh/data-refresh.component";
import { BackgroundSyncService } from "../../../../shared/services/background-sync.service";

@Component({
  selector: "app-todo-list-enhanced",
  templateUrl: "./todo-list-enhanced.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataRefreshComponent]
})
export class TodoListEnhancedComponent implements OnInit {
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

  // Enhanced refresh configuration
  refreshConfig = {
    enableAutoRefresh: true,
    refreshInterval: 300000, // 5 minutes
    enableCaching: true,
    cacheKey: 'todo_list',
    showLastUpdated: true,
    showSyncStatus: true,
    enableRetry: true,
    maxRetries: 3
  };

  constructor(
    private cdr: ChangeDetectorRef,
    private _todoListService: DashboardService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder,
    private backgroundSync: BackgroundSyncService
  ) {
    this.todoListForm = this.fb.group({
      name: [""],
      description: [""],
    });
  }

  ngOnInit() {
    this.getAllData();
    this.setupBackgroundSync();
  }

  /**
   * Enhanced data loading with error handling and caching
   */
  getAllData() {
    this.loading = true;
    this._todoListService
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
        },
      });
  }

  /**
   * Handle data refresh events from the refresh component
   */
  onDataRefreshed() {
    this.getAllData();
  }

  /**
   * Handle refresh errors
   */
  onRefreshError(error: any) {
    console.error('Refresh error:', error);
    // Error handling is already done in the service
  }

  /**
   * Handle retry attempts
   */
  onRetryAttempted() {
    console.log('Retry attempted for todo list');
  }

  /**
   * Setup background synchronization
   */
  private setupBackgroundSync() {
    this.backgroundSync.registerSyncOperation(
      'todo_list_sync',
      () => this._todoListService.getAllData(this.target, this.skipCount, this.maxCount),
      1, // Priority
      {
        enableBackgroundSync: true,
        enableCaching: true,
        cacheKey: 'todo_list'
      }
    );
  }

  /**
   * Force refresh data
   */
  forceRefresh() {
    this._todoListService.forceRefreshData(
      this.target, 
      this.skipCount, 
      this.maxCount,
      undefined,
      {
        enableCaching: true,
        cacheKey: 'todo_list',
        enableErrorHandling: true,
        maxRetries: 3
      }
    ).subscribe({
      next: (response) => {
        this.tableData = response.items || [];
        this.count = response.totalCount || 0;
        this.cdr.detectChanges();
        this.messageService.add({
          severity: "success",
          summary: "Success",
          detail: "Data refreshed successfully",
          life: 2000,
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Failed to refresh data",
          life: 2000,
        });
      }
    });
  }

  /**
   * Get data with diff updates
   */
  getDataWithDiff() {
    this._todoListService.getAllDataWithDiff(
      this.target,
      this.skipCount,
      this.maxCount,
      undefined,
      {
        enableCaching: true,
        cacheKey: 'todo_list',
        enableErrorHandling: true,
        maxRetries: 3
      }
    ).subscribe({
      next: (response) => {
        this.tableData = response.items || [];
        this.count = response.totalCount || 0;
        this.cdr.detectChanges();
      }
    });
  }

  // ... rest of the existing methods remain the same
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
              detail: error.error?.error?.message || "Failed to load data",
              life: 2000,
            });
            return throwError(error);
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
            this.editMode = true;
            this.viewMode = false;
            this.displayModal = true;
            this.cdr.detectChanges();
          },
        });
    } else {
      // Add Mode
      this.todoListForm.reset();
      this.editMode = false;
      this.viewMode = false;
      this.displayModal = true;
      this.cdr.detectChanges();
    }
  }

  save() {
    if (this.todoListForm.valid) {
      this.saving = true;
      const formData = this.todoListForm.value;

      const operation = this.editMode
        ? this._todoListService.update(formData, this.target)
        : this._todoListService.create(formData, this.target);

      operation
        .pipe(
          finalize(() => {
            this.saving = false;
          }),
          catchError((error) => {
            this.messageService.add({
              severity: "error",
              summary: "Error",
              detail: error.error?.error?.message || "Operation failed",
              life: 2000,
            });
            return throwError(error);
          })
        )
        .subscribe({
          next: (response) => {
            this.messageService.add({
              severity: "success",
              summary: "Success",
              detail: this.editMode ? "Updated successfully" : "Created successfully",
              life: 2000,
            });
            this.displayModal = false;
            this.getAllData();
          },
        });
    }
  }

  delete(id: number) {
    this.confirmationService.confirm({
      message: "Are you sure you want to delete this item?",
      header: "Confirm",
      icon: "pi pi-exclamation-triangle",
      accept: () => {
        this._todoListService
          .delete(id, this.target)
          .pipe(
            catchError((error) => {
              this.messageService.add({
                severity: "error",
                summary: "Error",
                detail: error.error?.error?.message || "Delete failed",
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
}
