import { Component, Injector, OnInit } from "@angular/core";
import { ChartOfAccountService } from "../../shared/services/chart-of-account.service";
import { ChartOfAccount } from "../../shared/dtos/chart-of-account";
import { ConfirmationService, MessageService } from "primeng/api";
import { catchError, finalize, throwError } from "rxjs";
import { UrlHelper } from "@shared/helpers/UrlHelper";
import { Table } from "@node_modules/primeng/table";
import { ChangeDetectorRef } from "@angular/core";
import * as XLSX from "xlsx";
import { ViewChild, ElementRef } from "@angular/core";
import { saveAs } from "file-saver";
import * as ExcelJS from "exceljs";

@Component({
  selector: "app-coa-level4",
  templateUrl: "./coa-level4.component.html",
})
export class CoaLevel4Component implements OnInit {
  @ViewChild("fileInput") fileInput: ElementRef;
  materialType: ChartOfAccount = new ChartOfAccount();
  accountType: { id: number; name: string }[] = [];
  coaLevelThree: { id: any; name: string }[] = [];
  currency: { id: any; name: string }[] = [];
  linkwith: { id: any; name: string }[] = [];
  natureOfAccount = [
    { id: 0, name: "Bank" },
    { id: 1, name: "Broker" },
    { id: 2, name: "Client" },
    { id: 3, name: "Supplier" },
    { id: 4, name: "Tax" },
    { id: 5, name: "Other" },
    { id: 6, name: "Staff" },
    { id: 7, name: "Fixed_Assets_Ac" },
    { id: 8, name: "Cash_In_Hand_Ac" },
    { id: 9, name: "Income" },
    { id: 10, name: "Capital" },
    { id: 11, name: "Stock_AC" },
    { id: 12, name: "Expense" },
  ];
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
    this._materialTypeService.categoryUpdated$.subscribe(() => {
      this.fetchDropdownData("AccountType");
      this.fetchDropdownData("COALevel03");
      this.fetchDropdownData("LinkWith");
      this.fetchDropdownData("Currency");
    });
  }

  getAll() {
    this.loading = true;
    this._materialTypeService
      .getAll(this.target, this.filterDto.skipCount, this.filterDto.maxCount)
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
                this._materialTypeService.notifyUpdate();
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
      .create(this.materialType, this.target)
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
          this._materialTypeService.notifyUpdate();
          this.saving = false;
          this.displayModal = false;
        },
      });
  }

  update() {
    this.saving = true;
    this._materialTypeService
      .update(this.materialType, this.target)
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
          this._materialTypeService.notifyUpdate();
          this.saving = false;
          this.displayModal = false;
        },
      });
  }
  async onPageChange(event: any) {
    this.loading = true;
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
  // fetchAccountType() {
  //
  //   this._materialTypeService.getAllSuggestion("AccountType").subscribe(
  //     (response: any) => {
  //       this.accountType = response.items.map((employee: any) => ({
  //         id: employee?.id,
  //         name: employee?.name,
  //       }));
  //       this.cdr.detectChanges();
  //     },
  //     (error) => {
  //       this.messageService.add({
  //         severity: "error",
  //         summary: "Error",
  //         detail: error.error.error.message,
  //         life: 2000,
  //       });
  //       return throwError(error.error.error.message);
  //     }
  //   );
  // }
  // fetchCurrency() {
  //
  //   this._materialTypeService.getAllSuggestion("Currency").subscribe(
  //     (response: any) => {
  //       this.currency = response.items.map((employee: any) => ({
  //         id: employee?.id,
  //         name: employee?.name,
  //       }));
  //       this.cdr.detectChanges();
  //     },
  //     (error) => {
  //       this.messageService.add({
  //         severity: "error",
  //         summary: "Error",
  //         detail: error.error.error.message,
  //         life: 2000,
  //       });
  //       return throwError(error.error.error.message);
  //     }
  //   );
  // }
  // fetchLinkWith() {
  //
  //   this._materialTypeService.getAllSuggestion("LinkWith").subscribe(
  //     (response: any) => {
  //       this.linkwith = response.items.map((employee: any) => ({
  //         id: employee?.id,
  //         name: employee?.name,
  //       }));
  //       this.cdr.detectChanges();
  //     },
  //     (error) => {
  //       this.messageService.add({
  //         severity: "error",
  //         summary: "Error",
  //         detail: error.error.error.message,
  //         life: 2000,
  //       });
  //       return throwError(error.error.error.message);
  //     }
  //   );
  // }
  // fetchLevelOne() {
  //
  //   this._materialTypeService.getAllSuggestion("COALevel03").subscribe(
  //     (response: any) => {
  //       this.coaLevelThree = response.items.map((employee: any) => ({
  //         id: employee?.id,
  //         name: employee?.name,
  //         additional: employee?.additional,
  //       }));
  //       this.cdr.detectChanges();
  //     },
  //     (error) => {
  //       this.messageService.add({
  //         severity: "error",
  //         summary: "Error",
  //         detail: error.error.error.message,
  //         life: 2000,
  //       });
  //       return throwError(error.error.error.message);
  //     }
  //   );
  // }
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

  // Bulk Upload
  bulkUploadModal = false;
  bulkUploadData: any[] = [];
  uploading = false;
  headerMap: { [key: string]: string } = {
    Name: "name",
    "Serial Number": "serialNumber",
    "COA Level 3 Name": "coaLevel03Name",
    "Account Type Name": "accountTypeName",
    "Currency Name": "currencyName",
    "Link With Name": "linkWithName",
    "Nature of Account": "natureOfAccount",
    CNIC: "cnic",
    "Email Address": "emailAddress",
    "Contact Number": "contactNumber",
    "Physical Address": "physicalAddress",
    "Sales Tax Number": "salesTaxNumber",
    "National Tax Number": "nationalTaxNumber",
  };
  previewModalVisible = false;

  openPreview() {
    this.previewModalVisible = true;
  }

  downloadTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template");

    const headers = Object.keys(this.headerMap);
    const row = worksheet.addRow(headers);

    row.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "C6EFCE" },
      };
      cell.font = {
        color: { argb: "000000" },
        bold: true,
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    });

    worksheet.columns = headers.map(() => ({ width: 25 }));

    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "COA_Level4_Upload_Template.xlsx");
    });
  }

  openBulkUpload() {
    this.bulkUploadModal = true;
    this.bulkUploadData = [];
  }

  onFileSelect(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop().toLowerCase();

    if (fileExtension !== "xlsx") {
      this.messageService.add({
        severity: "error",
        detail: "Only .xlsx files are allowed",
        life: 2000,
      });
      this.bulkUploadData = [];
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = e.target.result;
      try {
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsed = XLSX.utils.sheet_to_json(sheet);
        this.handleParsedData(parsed);
      } catch (err) {
        this.messageService.add({
          severity: "error",
          detail: "Error parsing file",
          life: 2000,
        });
      }
    };

    reader.readAsBinaryString(file);
  }

  handleParsedData(data: any[]) {
    if (!Array.isArray(data)) {
      this.messageService.add({
        severity: "error",
        detail: "Invalid file structure",
        life: 2000,
      });
      return;
    }

    // Map headers to parameter keys
    const mapped = data.map((row: any) => {
      const mappedRow: any = {};
      for (const [header, param] of Object.entries(this.headerMap)) {
        mappedRow[param] = row[header];
      }
      return mappedRow;
    });

    // Validate required fields
    const validItems = mapped.filter(
      (item) =>
        item.name &&
        item.serialNumber &&
        item.coaLevel03Name &&
        item.accountTypeName &&
        item.currencyName &&
        item.linkWithName &&
        item.natureOfAccount !== undefined &&
        item.cnic &&
        item.emailAddress &&
        item.contactNumber &&
        item.physicalAddress &&
        item.salesTaxNumber &&
        item.nationalTaxNumber
    );

    this.bulkUploadData = validItems;

    if (!validItems.length) {
      this.messageService.add({
        severity: "warn",
        detail: "No valid records found.",
        life: 2000,
      });
    }
  }

  submitBulkUpload() {
    if (!this.bulkUploadData.length) {
      this.messageService.add({
        severity: "warn",
        detail: "No data to upload",
        life: 2000,
      });
      return;
    }

    const payload = { items: this.bulkUploadData };
    this.uploading = true;

    this._materialTypeService
      .bulkUpload(this.target, payload)
      .pipe(
        finalize(() => (this.uploading = false)),
        catchError((error) => {
          this.messageService.add({
            severity: "error",
            detail: error?.error?.message || "Upload failed",
            life: 2000,
          });
          return throwError(error);
        })
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: "success",
            detail: "Bulk Upload Successful",
            life: 2000,
          });
          this.resetBulkUploadDialog();
          this.getAll();
          this._materialTypeService.notifyUpdate();
        },
      });
  }

  resetBulkUploadDialog() {
    this.bulkUploadModal = false;
    this.bulkUploadData = [];
    if (this.fileInput) {
      this.fileInput.nativeElement.value = "";
    }
  }
}
