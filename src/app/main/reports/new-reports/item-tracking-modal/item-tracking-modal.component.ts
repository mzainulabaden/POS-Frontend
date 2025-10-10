import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MessageService } from "primeng/api";
import { NewReportsService } from "../../services/new-reports.service";
import { SalesService } from "../../../sales/shared/services/sales.service";
import { ItemTrackingReport, ItemTrackingParams } from "../../models/item-tracking.model";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

@Component({
  selector: "app-item-tracking-modal",
  templateUrl: "./item-tracking-modal.component.html",
  styleUrls: ["./item-tracking-modal.component.css"],
})
export class ItemTrackingModalComponent implements OnInit {
  @Input() visible: boolean = false;
  @Input() reportName: string = "";
  @Output() onClose = new EventEmitter<void>();

  form: FormGroup;
  reportData: ItemTrackingReport[] = [];
  loading: boolean = false;
  reportGenerated: boolean = false;
  companyProfile: any = null;

  warehouses: { id: any; name: string }[] = [];
  items: { id: any; name: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private reportsService: NewReportsService,
    private salesService: SalesService,
    private msgService: MessageService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      fromDate: [new Date(), Validators.required],
      toDate: [new Date(), Validators.required],
      warehouseId: [null],
      itemId: [null],
    });
  }

  ngOnInit(): void {
    this.loadDropdownData();
    this.loadCompanyProfile();
  }

  loadDropdownData() {
    this.salesService.getAllSuggestion("Warehouse").subscribe((response: any) => {
      this.warehouses = (response.items || []).map((x: any) => ({
        id: x?.id,
        name: x?.name,
      }));
      this.cdr.detectChanges();
    });

    this.salesService.getAllSuggestion("Item").subscribe((response: any) => {
      this.items = (response.items || []).map((x: any) => ({
        id: x?.id,
        name: x?.name,
      }));
      this.cdr.detectChanges();
    });
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
          companyName: 'Company Name',
          address: 'Address',
          phone1: '',
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
    const params: ItemTrackingParams = {
      fromDate: formValue.fromDate ? new Date(formValue.fromDate).toISOString() : undefined,
      toDate: formValue.toDate ? new Date(formValue.toDate).toISOString() : undefined,
      warehouseId: formValue.warehouseId || undefined,
      itemId: formValue.itemId || undefined,
    };

    console.log('🔍 Generating report with params:', params);

    this.loading = true;
    this.reportsService.getItemTracking(params).subscribe({
      next: (data) => {
        console.log('✅ Report data received:', data);
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
        console.error('❌ Error generating report:', error);
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

    const worksheet = XLSX.utils.json_to_sheet(
      this.reportData.map((item) => ({
        "Issue Date": new Date(item.issueDate).toLocaleDateString(),
        Warehouse: item.warehouseName,
        Item: item.itemName,
        Unit: item.unitName,
        "Voucher Number": item.voucherNumber,
        "Transaction Type": item.transactionType,
        Counterparty: item.counterpartyName,
        "Qty In": item.qtyIn,
        "Qty Out": item.qtyOut,
        Rate: item.rate,
        "Total Amount": item.totalAmount,
        "Opening Balance": item.openingBalance,
        "Closing Balance": item.closingBalance,
        Remarks: item.remarks,
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Ledger");

    const fileName = `Stock_Ledger_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
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
    doc.text("Stock Ledger Report", pageWidth / 2, 42, { align: "center" });

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

    if (formValue.warehouseId) {
      const warehouse = this.warehouses.find((w) => w.id === formValue.warehouseId);
      if (warehouse) {
        doc.text(`Warehouse: ${warehouse.name}`, 14, yPos);
        yPos += 5;
      }
    }

    if (formValue.itemId) {
      const item = this.items.find((i) => i.id === formValue.itemId);
      if (item) {
        doc.text(`Item: ${item.name}`, 14, yPos);
        yPos += 5;
      }
    }

    // Table
    const tableData = this.reportData.map((item) => [
      new Date(item.issueDate).toLocaleDateString(),
      item.voucherNumber,
      item.transactionType,
      item.itemName,
      item.counterpartyName,
      item.qtyIn.toFixed(2),
      item.qtyOut.toFixed(2),
      item.rate.toFixed(2),
      item.totalAmount.toFixed(2),
      item.closingBalance.toFixed(2),
    ]);

    autoTable(doc, {
      startY: yPos + 5,
      head: [
        [
          "Date",
          "Voucher",
          "Type",
          "Item",
          "Counterparty",
          "Qty In",
          "Qty Out",
          "Rate",
          "Amount",
          "Balance",
        ],
      ],
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

    const fileName = `Stock_Ledger_Report_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);

    this.msgService.add({
      severity: "success",
      summary: "Success",
      detail: "PDF exported successfully",
      life: 2000,
    });
  }

  getWarehouseName(): string {
    const warehouseId = this.form.value.warehouseId;
    if (!warehouseId) return '';
    const warehouse = this.warehouses.find(w => w.id === warehouseId);
    return warehouse?.name || '';
  }

  getItemName(): string {
    const itemId = this.form.value.itemId;
    if (!itemId) return '';
    const item = this.items.find(i => i.id === itemId);
    return item?.name || '';
  }

  closeModal() {
    this.visible = false;
    this.reportGenerated = false;
    this.reportData = [];
    this.form.reset({
      fromDate: new Date(),
      toDate: new Date(),
      warehouseId: null,
      itemId: null,
    });
    this.onClose.emit();
  }
}

