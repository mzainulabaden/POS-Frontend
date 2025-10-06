import { Component, Injector, OnInit } from "@angular/core";
import { LevelOne } from "../../shared/dtos/level-one";
import { ChartOfAccountService } from "../../shared/services/chart-of-account.service";
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
  selector: "app-coa-level1",
  templateUrl: "./coa-level1.component.html",
})
export class CoaLevel1Component implements OnInit {
  @ViewChild("fileInput") fileInput: ElementRef;
  materialType: LevelOne = new LevelOne();
  accountType: { id: number; name: string }[] = [];
  urlHelper = UrlHelper;
  tableData: any;
  count: number;
  displayModal: boolean;
  editMode: boolean;
  saving: boolean;
  loading: boolean;
  target = "COALevel01";
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
    this._materialTypeService.categoryUpdated$.subscribe(() => {
      this.fetchDropdownData("AccountType");
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
            this.displayModal = true;
            this.cdr.detectChanges();
          },
        });
    } else {
      this.editMode = false;
      this.displayModal = true;
      this.materialType = new LevelOne();
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
    // this.filterDto.skipCount = event.page + 1;
    this.currentPage = event.page + 1;

    this.filterDto.skipCount = (this.currentPage - 1) * this.filterDto.maxCount;

    this.getAll();
  }
  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }
  fetchDropdownData(target) {
    this._materialTypeService
      .getAllSuggestion(target)
      .subscribe((response: any) => {
        const mappedData = response.items.map((item: any) => ({
          id: item?.id,
          name: item?.name,
        }));
        switch (target) {
          case "AccountType":
            this.accountType = mappedData;
            break;
          default:
            break;
        }
        this.cdr.detectChanges();
      });
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

  //Bulk Upload
  bulkUploadModal = false;
  bulkUploadData: any[] = [];
  uploading = false;
  headerMap: { [key: string]: string } = {
    Name: "name",
    "Serial Number": "serialNumber",
    "Account Type Name": "accountTypeName",
  };
  previewModalVisible = false;

  openPreview() {
    this.previewModalVisible = true;
  }

  downloadTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template");

    // Header row values
    const headers = ["Name", "Serial Number", "Account Type Name"];
    const row = worksheet.addRow(headers);

    // Style the header row
    row.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "C6EFCE" }, // light green
      };
      cell.font = {
        color: { argb: "000000" }, // black
        bold: true,
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    });

    // Optional: Set column width
    worksheet.columns = headers.map(() => ({ width: 25 }));

    // Export to file
    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "COA_Level1_Upload_Template.xlsx");
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
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const uploadedHeaders = Object.keys(jsonData[0] || {});
        const expectedHeaders = Object.keys(this.headerMap);
        const missing = expectedHeaders.filter(
          (h) => !uploadedHeaders.includes(h)
        );

        if (missing.length) {
          this.messageService.add({
            severity: "error",
            detail: `Missing columns: ${missing.join(", ")}`,
            life: 3000,
          });
          return;
        }

        this.handleParsedData(jsonData);
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
    const mapped = data.map((row: any) => {
      const mappedRow: any = {};
      for (const [header, key] of Object.entries(this.headerMap)) {
        mappedRow[key] = row[header];
      }
      return mappedRow;
    });

    const validItems = mapped.filter(
      (item) => item.name && item.serialNumber && item.accountTypeName
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
