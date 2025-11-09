import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MessageService } from "primeng/api";
import { NewReportsService } from "../../services/new-reports.service";
import { DailySalesReport, DailySalesParams } from "../../models/item-tracking.model";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

@Component({
  selector: "app-daily-sales-modal",
  templateUrl: "./daily-sales-modal.component.html",
  styleUrls: ["./daily-sales-modal.component.css"],
})
export class DailySalesModalComponent implements OnInit {
  @Input() visible: boolean = false;
  @Input() reportName: string = "";
  @Output() onClose = new EventEmitter<void>();

  form: FormGroup;
  reportData: DailySalesReport[] = [];
  loading: boolean = false;
  reportGenerated: boolean = false;
  companyProfile: any = null;

  constructor(
    private fb: FormBuilder,
    private reportsService: NewReportsService,
    private msgService: MessageService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      fromDate: [new Date(), Validators.required],
      toDate: [new Date(), Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadCompanyProfile();
  }

  loadCompanyProfile() {
    this.reportsService.getCompanyProfile().subscribe({
      next: (profile) => {
        console.log('🏢 Company Profile loaded:', profile);
        this.companyProfile = profile;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("❌ Error loading company profile:", err);
        // Use default values if profile fails to load
        this.companyProfile = {
          companyName: 'Usama Sweets & Bakers',
          address: 'AL-HAMD milk center, Noor colony, Wandala',
          phone1: '0300 2042172',
          phone2: '',
          email: ''
        };
      },
    });
  }

  generateReport() {
    if (!this.form.valid) {
      this.msgService.add({
        severity: "error",
        summary: "Validation Error",
        detail: "Please fill all required fields",
        life: 3000,
      });
      return;
    }

    const formValue = this.form.value;
    const params: DailySalesParams = {
      fromDate: formValue.fromDate ? new Date(formValue.fromDate).toISOString() : undefined,
      toDate: formValue.toDate ? new Date(formValue.toDate).toISOString() : undefined,
    };

    console.log('🔍 Generating Daily Sales report with params:', params);

    this.loading = true;
    this.reportsService.getDailySales(params).subscribe({
      next: (data) => {
        console.log('✅ Daily Sales report data received:', data);
        console.log('📊 Number of records:', data?.length || 0);
        
        this.reportData = data || [];
        this.reportGenerated = true;
        this.loading = false;
        
        if (this.reportData.length === 0) {
          this.msgService.add({
            severity: "info",
            summary: "No Data",
            detail: "No records found for the selected parameters",
            life: 3000,
          });
        } else {
          this.msgService.add({
            severity: "success",
            summary: "Success",
            detail: `Report generated successfully with ${this.reportData.length} records`,
            life: 2000,
          });
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error generating Daily Sales report:', error);
        this.loading = false;
        const errorMessage =
          error?.error?.error?.message ||
          error?.error?.message ||
          error?.message ||
          "Failed to generate report";
        this.msgService.add({
          severity: "error",
          summary: "Error",
          detail: errorMessage,
          life: 3000,
        });
        this.cdr.detectChanges();
      },
    });
  }

  downloadExcel() {
    if (!this.reportData || this.reportData.length === 0) {
      this.msgService.add({
        severity: "warn",
        summary: "No Data",
        detail: "No data available to export",
        life: 2000,
      });
      return;
    }

    // Get all unique keys from the data to create dynamic columns
    const allKeys = new Set<string>();
    this.reportData.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });

    const worksheet = XLSX.utils.json_to_sheet(
      this.reportData.map((item) => {
        const row: any = {};
        allKeys.forEach(key => {
          const value = item[key];
          if (value instanceof Date) {
            row[key] = value.toLocaleDateString();
          } else if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
            row[key] = new Date(value).toLocaleDateString();
          } else {
            row[key] = value;
          }
        });
        return row;
      })
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Sales");

    const fileName = `Daily_Sales_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    this.msgService.add({
      severity: "success",
      summary: "Success",
      detail: "Report exported successfully",
      life: 2000,
    });
  }

  downloadPDF() {
    if (!this.reportData || this.reportData.length === 0) {
      this.msgService.add({
        severity: "warn",
        summary: "No Data",
        detail: "No data available to export",
        life: 2000,
      });
      return;
    }

    const doc = new jsPDF("l", "mm", "a4");
    
    // Company Header
    const pageWidth = doc.internal.pageSize.getWidth();
    
    if (this.companyProfile) {
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(this.companyProfile.companyName || "Company Name", pageWidth / 2, 15, {
        align: "center",
      });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const address = this.companyProfile.address || "Address";
      doc.text(address, pageWidth / 2, 22, { align: "center" });

      if (this.companyProfile.phone1 || this.companyProfile.phone2) {
        const phones = [this.companyProfile.phone1, this.companyProfile.phone2]
          .filter(Boolean)
          .join(", ");
        doc.text(phones, pageWidth / 2, 27, { align: "center" });
      }

      if (this.companyProfile.email) {
        doc.text(`For Accounts inquiry, contact ${this.companyProfile.email}`, pageWidth / 2, 32, {
          align: "center",
        });
      }
    }

    // Report Title
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Daily Sales Report", pageWidth / 2, 42, { align: "center" });

    // Report Parameters
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const formValue = this.form.value;
    let yPos = 50;
    
    if (formValue.fromDate && formValue.toDate) {
      const dateRange = `Period: ${new Date(formValue.fromDate).toLocaleDateString()} - ${new Date(
        formValue.toDate
      ).toLocaleDateString()}`;
      doc.text(dateRange, 14, yPos);
      yPos += 5;
    }

    // Get all unique keys from the data
    const allKeys = Array.from(new Set<string>());
    this.reportData.forEach(item => {
      Object.keys(item).forEach(key => {
        if (!allKeys.includes(key)) {
          allKeys.push(key);
        }
      });
    });

    // Table
    const tableData = this.reportData.map((item) => {
      return allKeys.map(key => {
        const value = item[key];
        if (value instanceof Date) {
          return value.toLocaleDateString();
        } else if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
          return new Date(value).toLocaleDateString();
        } else if (typeof value === 'number') {
          return value.toFixed(2);
        }
        return value?.toString() || '';
      });
    });

    const headers = allKeys.map(key => {
      // Format header names (capitalize first letter, add spaces)
      return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
    });

    autoTable(doc, {
      startY: yPos + 5,
      head: [headers],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [0, 123, 255],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 10, left: 14, right: 14 },
    });

    const fileName = `Daily_Sales_Report_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);

    this.msgService.add({
      severity: "success",
      summary: "Success",
      detail: "PDF exported successfully",
      life: 2000,
    });
  }

  closeModal() {
    this.visible = false;
    this.reportGenerated = false;
    this.reportData = [];
    this.form.reset({
      fromDate: new Date(),
      toDate: new Date(),
    });
    this.onClose.emit();
  }

  // Helper method to get column keys from data
  getColumnKeys(): string[] {
    if (!this.reportData || this.reportData.length === 0) return [];
    const keys = new Set<string>();
    this.reportData.forEach(item => {
      Object.keys(item).forEach(key => keys.add(key));
    });
    return Array.from(keys);
  }

  // Helper method to format column header
  formatHeader(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
  }

  // Helper method to format cell value
  formatCellValue(value: any, key: string): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
      return new Date(value).toLocaleDateString();
    }
    if (typeof value === 'number') {
      // Check if it's a currency/amount field
      if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('sales') || key.toLowerCase().includes('total')) {
        return value.toFixed(2);
      }
      return value.toString();
    }
    return value.toString();
  }

  // Helper method to check if a value is a number
  isNumber(value: any): boolean {
    return typeof value === 'number';
  }
}

