import { Component, Injector, OnInit, Input, OnChanges } from "@angular/core";
import { ChartOfAccountService } from "../../shared/services/chart-of-account.service";
import { ChartOfAccount } from "../../shared/dtos/chart-of-account";
import { ConfirmationService, MessageService } from "primeng/api";
import { catchError, finalize, throwError } from "rxjs";
import { UrlHelper } from "@shared/helpers/UrlHelper";
import { Table } from "@node_modules/primeng/table";
import { ChangeDetectorRef } from "@angular/core";

@Component({
  selector: "app-bank",
  templateUrl: "./bank.component.html",
})
export class BankComponent implements OnInit, OnChanges {
  ngOnChanges() {
    if (this.activeIndex === 3) this.natureOfAccount = 0; // Bank
  }
  @Input() activeIndex: number;
  natureOfAccount: number = 0;
  materialType: ChartOfAccount = new ChartOfAccount();
  accountType: { id: number; name: string }[] = [];
  coaLevelThree: { id: any; name: string }[] = [];
  currency: { id: any; name: string }[] = [];
  linkwith: { id: any; name: string }[] = [];
  levelTwoSr: string;
  urlHelper = UrlHelper;
  tableData: any;
  count: number;
  displayModal: boolean;
  editMode: boolean;
  saving: boolean;
  loading: boolean;
  target = "COALevel04";
  currentPage = 1;
  filterDto = {
    skipCount: 0,
    maxCount: 10,
    DocOrVocNumber: "",
    natureOfAccount: 0,
    name: "",
  };
  constructor(
    injector: Injector,
    private _materialTypeService: ChartOfAccountService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.getAll();
    this.fetchDropdownData("AccountType");
    this.fetchDropdownData("LinkWith");
    this.fetchDropdownData("Currency");
    this.fetchDropdownData("COALevel03");
  }

  getAll() {
    this.loading = true;
    this._materialTypeService
      .getAllRecord(this.target, this.filterDto)
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

  delete(id: number) {
    this.confirmationService.confirm({
      message: "Are you sure?",
      header: "Confirmation",
      icon: "pi pi-exclamation-triangle",
      rejectButtonStyleClass: "p-button-text",
      accept: () => {
        this._materialTypeService
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
      this._materialTypeService
        .getDataForEdit(id, this.target)
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
            this.materialType = response;
            this.materialType.stopEntryBefore = new Date(
              response.stopEntryBefore
            );
            this.displayModal = true;
            // this.fetchAccountType();
            // this.fetchLevelOne();
            // this.fetchCurrency();
            // this.fetchLinkWith();
            this.cdr.detectChanges();
          },
        });
    } else {
      this.editMode = false;
      this.displayModal = true;
      this.materialType = new ChartOfAccount();
      // this.fetchAccountType();
      // this.fetchLevelOne();
      // this.fetchCurrency();
      // this.fetchLinkWith();
    }
  }

  save() {
    this.saving = true;
    if (!this.materialType.name) {
      this.messageService.add({
        severity: "error",
        detail: "Name is Required",
        life: 2000,
      });
      this.saving = false;
      return;
    }
    this._materialTypeService
      .create(
        { ...this.materialType, natureOfAccount: this.natureOfAccount },
        this.target
      )
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
          this.getAll();
          this.saving = false;
          this.displayModal = false;
        },
      });
  }

  update() {
    this.saving = true;
    this._materialTypeService
      .update(
        { ...this.materialType, natureOfAccount: this.natureOfAccount },
        this.target
      )
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
          this.getAll();
          this.saving = false;
          this.displayModal = false;
        },
      });
  }
  onPageChange(event: any) {
    this.filterDto.maxCount = event.rows;
    this.currentPage = event.page + 1;
    this.loading = true;
    this.filterDto.skipCount = (this.currentPage - 1) * this.filterDto.maxCount;
    this._materialTypeService
      .getAllRecord(this.target, this.filterDto)
      .subscribe({
        next: (response) => {
          this.tableData = response.items;
          this.count = response.totalCount;
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }
  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }
  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.filterDto.name = inputValue;
    this._materialTypeService
      .getAllRecord(this.target, this.filterDto)
      .subscribe({
        next: (response) => {
          this.tableData = response.items;
          this.count = response.totalCount;

          this.loading = false;
        },
      });
  }
  fetchDropdownData(target) {
    this._materialTypeService
      .getAllSuggestion(target)
      .subscribe((response: any) => {
        const mappedData = response.items.map((item: any) => ({
          id: item?.id,
          name: item?.name,
          additional: item?.additional,
        }));
        switch (target) {
          case "AccountType":
            this.accountType = mappedData;
            break;
          case "COALevel03":
            this.coaLevelThree = mappedData;
            break;
          case "LinkWith":
            this.linkwith = mappedData;
            break;
          case "Currency":
            this.currency = mappedData;
            break;
          default:
            break;
        }
        this.cdr.detectChanges();
      });
  }
  getLvl3SerialNumber(employee: any) {
    if (!employee) return;

    this._materialTypeService
      .getSerialNumberLevel4(employee.id, "COALevel04")
      .pipe(
        finalize(() => {}),
        catchError((error) => {
          this.messageService.add({
            severity: "error",
            summary: "Error",
            detail: error.error.error.message,
            life: 2000,
          });
          return throwError(error.message);
        })
      )
      .subscribe({
        next: (response) => {
          console.log(response);

          const concatenatedValue = `${employee.additional}-${response}`;
          this.materialType.serialNumber = concatenatedValue;
          this.cdr.detectChanges();
        },
      });
  }
  onLevelOneChange(selectedId: string) {
    const selectedEmployee = this.coaLevelThree.find(
      (emp) => emp.id === selectedId
    );
    if (selectedEmployee) {
      this.getLvl3SerialNumber(selectedEmployee);
    }
  }
}
