import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from "@angular/core";
import { MessageService } from "primeng/api";
import * as XLSX from "xlsx";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { MainSetupsService } from "@app/main/main-setups/shared/services/main-setups.service";

@Component({
  selector: "app-bulk-uploader",
  templateUrl: "./bulk-uploader.component.html",
})
export class BulkUploaderComponent {
  @Input() headerMap: { [key: string]: string } = {};
  @Input() target = "";
  @Input() visible = false;
  @Input() fileName = "";

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() uploadFinished = new EventEmitter<any[]>();
  @Output() previewData = new EventEmitter<any[]>();

  @ViewChild("fileInput") fileInput: ElementRef;

  bulkUploadData: any[] = [];
  previewModalVisible = false;
  uploading = false;

  constructor(
    private messageService: MessageService,
    private mainSetupsService: MainSetupsService
  ) {}

  openPreview() {
    this.previewModalVisible = true;
    this.previewData.emit(this.bulkUploadData);
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
      cell.font = { color: { argb: "000000" }, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    worksheet.columns = headers.map(() => ({
      width: 25,
      style: { numFmt: "@" },
    }));

    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, `${this.fileName}_Template.xlsx`);
    });
  }

  onFileSelect(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      this.messageService.add({
        severity: "error",
        detail: "Only .xlsx files are allowed",
        life: 2000,
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const parsed = XLSX.utils.sheet_to_json(sheet);
        this.handleParsedData(parsed);
      } catch {
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

    const mapped = data.map((row: any) => {
      const mappedRow: any = {};
      for (const [header, field] of Object.entries(this.headerMap)) {
        mappedRow[field] = row[header];
        let value = row[header];
        // Convert credit/debit to numbers
        if (["credit", "debit"].includes(field)) {
          value =
            value !== undefined && value !== null && value !== ""
              ? parseFloat(value)
              : 0;
        }

        mappedRow[field] = value;
      }
      return mappedRow;
    });

    const requiredField = Object.values(this.headerMap)[0];
    this.bulkUploadData = mapped.filter((item) => item[requiredField]); // adjust validation
    if (!this.bulkUploadData.length) {
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

    this.uploading = true;

    const payload = { items: this.bulkUploadData };
    this.mainSetupsService.bulkUpload(this.target, payload).subscribe({
      next: (res) => {
        const result = res;
        if (result) {
          this.messageService.add({
            severity: result.failureCount > 0 ? "error" : "success",
            summary: "Error",
            detail: `Uploaded: ${result.successCount}, Failed: ${result.failureCount}`,
            life: 3000,
          });

          const BASE_URL = "http://173.249.23.108:6063";
          if (result.errorFilePath) {
            const fullPath = result.errorFilePath.startsWith("http")
              ? result.errorFilePath
              : `${BASE_URL}${result.errorFilePath}`;
            window.open(fullPath, "_blank");
          }
        }
        this.resetBulkUploadDialog();
      },
    });
  }

  resetBulkUploadDialog() {
    this.visible = false;
    this.visibleChange.emit(this.visible);
    this.bulkUploadData = [];
    if (this.fileInput) this.fileInput.nativeElement.value = "";
  }
}
