import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';
import { PosService } from 'pos/core/services/pos.service';
import { PurchaseService } from '@app/main/purchase/shared/services/purchase.service';
import * as moment from 'moment';

interface InvoiceItem {
  id?: number;
  itemId?: number;
  itemName: string;
  itemSKU?: string;
  quantity: number;
  unitPrice: number;
  unitId?: number;
  unitName?: string;
  discount?: number;
  discountPercentage?: number;
  amount: number;
}

@Component({
  selector: 'app-invoice',
  templateUrl: './invoice.component.html',
  styleUrls: ['./invoice.component.css']
})
export class InvoiceComponent implements OnInit {
  @ViewChild('invoicePreview', { read: ElementRef }) invoicePreviewRef?: ElementRef<HTMLElement>;
  invoiceForm: FormGroup;
  customers: { id: any; name: string }[] = [];
  items: any[] = [];
  filteredItems: any[] = [];
  selectedItems: InvoiceItem[] = [];
  showPreview = false;
  invoiceData: any = null;
  searchTerm = '';
  showItemDropdown = false;
  taxRate = 0; // 0% tax as shown in the image
  showDiscountShipping = false;
  entrySelectedItem: any = null;
  entryQuantity = 1;
  entryPrice = 0;

  constructor(
    private fb: FormBuilder,
    private posService: PosService,
    private purchaseService: PurchaseService,
    private msgService: MessageService,
    private cdr: ChangeDetectorRef
  ) {
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Default 7 days from now

    this.invoiceForm = this.fb.group({
      id: [0],
      invoiceNumber: [''],
      purchaseOrderNumber: [''],
      customerCOALevel04Id: [null, Validators.required],
      issueDate: [today, Validators.required],
      dueDate: [dueDate, Validators.required],
      discountAmount: [0],
      shippingAmount: [0],
      invoiceDetails: this.fb.array([])
    });
  }

  get invoiceDetails(): FormArray {
    return this.invoiceForm.get('invoiceDetails') as FormArray;
  }

  ngOnInit() {
    this.loadCustomers();
    this.loadItems();
    this.generateInvoiceNumber();
  }

  loadCustomers() {
    this.purchaseService.getAllSuggestion('Client').subscribe({
      next: (response: any) => {
        this.customers = response.items.map((item: any) => ({
          id: item?.id,
          name: item?.name,
        }));
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading customers:', error);
      }
    });
  }

  loadItems() {
    this.posService.getAll('Item').subscribe({
      next: (response: any) => {
        this.items = response.items || response || [];
        this.filteredItems = [];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading items:', error);
      }
    });
  }

  generateInvoiceNumber() {
    // Generate invoice number like "invoice-{number}"
    const timestamp = Date.now();
    const invoiceNum = `invoice-${timestamp.toString().slice(-6)}`;
    this.invoiceForm.patchValue({ invoiceNumber: invoiceNum });
  }

  onSearchItem(event: any) {
    const query = event.query || this.searchTerm;
    if (!query) {
      this.filteredItems = [];
      this.showItemDropdown = false;
      return;
    }

    const lowerQuery = query.toLowerCase();
    this.filteredItems = this.items.filter((item: any) => {
      const name = (item.name || '').toLowerCase();
      const sku = (item.sku || item.SKU || '').toString().toLowerCase();
      const barcode = (item.barcode || item.Barcode || '').toString().toLowerCase();
      return name.includes(lowerQuery) || sku.includes(lowerQuery) || barcode.includes(lowerQuery);
    }).slice(0, 10); // Limit to 10 results

    this.showItemDropdown = this.filteredItems.length > 0;
    this.cdr.detectChanges();
  }

  onSearchInputChange(value: string) {
    this.searchTerm = value;
    if (value) {
      this.onSearchItem({ query: value });
    } else {
      this.filteredItems = [];
      this.showItemDropdown = false;
      this.entrySelectedItem = null;
      this.entryPrice = 0;
      this.entryQuantity = 1;
    }
  }

  selectItem(item: any) {
    this.entrySelectedItem = item;
    this.entryQuantity = 1;
    this.entryPrice = Number(item.unitPrice || item.price || 0);
    this.searchTerm = item.name || '';
    this.filteredItems = [];
    this.showItemDropdown = false;
    this.cdr.detectChanges();
  }

  updateItemAmount(index: number) {
    const item = this.selectedItems[index];
    const gross = item.quantity * item.unitPrice;
    const discountAmount = item.discount || 0;
    item.amount = gross - discountAmount;
  }

  removeItem(index: number) {
    this.selectedItems.splice(index, 1);
    this.cdr.detectChanges();
  }

  onQuantityChange(index: number, value: number) {
    this.selectedItems[index].quantity = value || 1;
    this.updateItemAmount(index);
    this.cdr.detectChanges();
  }

  onPriceChange(index: number, value: number) {
    this.selectedItems[index].unitPrice = value || 0;
    this.updateItemAmount(index);
    this.cdr.detectChanges();
  }

  onDiscountChange(index: number, value: number) {
    this.selectedItems[index].discount = value || 0;
    this.updateItemAmount(index);
    this.cdr.detectChanges();
  }

  get subtotal(): number {
    const base = this.selectedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const pending = this.hasPendingEntry() ? this.entryAmount : 0;
    return base + pending;
  }

  get itemDiscountTotal(): number {
    return this.selectedItems.reduce((sum, item) => sum + (item.discount || 0), 0);
  }

  get billDiscountAmount(): number {
    const amount = Number(this.invoiceForm.get('discountAmount')?.value || 0);
    const percent = Number(this.invoiceForm.get('discountPercentage')?.value || 0);
    const percentValue = +(this.subtotal * (percent / 100)).toFixed(2);
    return +(amount + percentValue).toFixed(2);
  }

  get totalDiscount(): number {
    return +(this.itemDiscountTotal + this.billDiscountAmount).toFixed(2);
  }

  get shippingAmount(): number {
    return Number(this.invoiceForm.get('shippingAmount')?.value || 0);
  }

  get subtotalAfterDiscount(): number {
    const afterDiscount = this.subtotal - this.totalDiscount;
    return afterDiscount < 0 ? 0 : afterDiscount;
  }

  get taxAmount(): number {
    return +(this.subtotalAfterDiscount * (this.taxRate / 100)).toFixed(2);
  }

  get total(): number {
    const total = this.subtotalAfterDiscount + this.taxAmount + this.shippingAmount;
    return total < 0 ? 0 : +total.toFixed(2);
  }

  get amountDue(): number {
    return this.total;
  }

  get entryAmount(): number {
    const amount = (Number(this.entryQuantity) || 0) * (Number(this.entryPrice) || 0);
    return +(+amount).toFixed(2);
  }

  createInvoice() {
    if (this.hasPendingEntry()) {
      this.addEntryItem();
    }

    if (!this.invoiceForm.valid) {
      this.msgService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please select a customer',
        life: 2000,
      });
      return;
    }

    if (this.selectedItems.length === 0) {
      this.msgService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please add at least one item',
        life: 2000,
      });
      return;
    }

    const formValue = this.invoiceForm.value;
    const customer = this.customers.find(c => c.id === formValue.customerCOALevel04Id);

    this.invoiceData = {
      invoiceNumber: formValue.invoiceNumber,
      purchaseOrderNumber: formValue.purchaseOrderNumber || '',
      issueDate: moment(formValue.issueDate).format('DD MMM YYYY'),
      dueDate: moment(formValue.dueDate).format('DD MMM YYYY'),
      customerName: customer?.name || 'N/A',
      subtotal: this.subtotal,
      itemDiscountTotal: this.itemDiscountTotal,
      invoiceDiscountAmount: this.billDiscountAmount,
      shippingAmount: this.shippingAmount,
      taxAmount: this.taxAmount,
      taxRate: this.taxRate,
      subtotalAfterDiscount: this.subtotalAfterDiscount,
      grandTotal: this.total,
      invoiceDetails: this.selectedItems.map(item => ({
        itemName: item.itemName,
        itemSKU: item.itemSKU,
        quantity: item.quantity,
        rate: item.unitPrice,
        discount: item.discount || 0,
        amount: item.amount
      }))
    };

    this.showPreview = true;
    this.cdr.detectChanges();
  }

  closePreview() {
    this.showPreview = false;
    // Reset form
    this.resetForm();
  }

  printInvoice() {
    window.print();
  }

  async downloadInvoice() {
    if (!this.invoiceData) {
      return;
    }

    const host = this.invoicePreviewRef?.nativeElement;
    if (!host) {
      this.msgService.add({
        severity: 'error',
        summary: 'Download failed',
        detail: 'Preview is not available to capture.',
        life: 2000,
      });
      return;
    }

    const canvas = await html2canvas(host, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    const ratio = Math.min((pageWidth - margin * 2) / imgWidth, (pageHeight - margin * 2) / imgHeight);
    const renderWidth = imgWidth * ratio;
    const renderHeight = imgHeight * ratio;
    const offsetX = (pageWidth - renderWidth) / 2;
    const offsetY = margin;

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', offsetX, offsetY, renderWidth, renderHeight, undefined, 'FAST');
    pdf.save(`invoice-${this.invoiceData.invoiceNumber || 'preview'}.pdf`);
  }

  resetForm() {
    this.selectedItems = [];
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    this.invoiceForm.reset({
      id: 0,
      invoiceNumber: '',
      purchaseOrderNumber: '',
      customerCOALevel04Id: null,
      issueDate: today,
      dueDate: dueDate,
      discountAmount: 0,
      shippingAmount: 0
    });

    this.generateInvoiceNumber();
    this.searchTerm = '';
    this.filteredItems = [];
    this.showItemDropdown = false;
    this.clearEntryFields();
    this.cdr.detectChanges();
  }

  onSearchBlur() {
    // Delay to allow click on dropdown item
    setTimeout(() => {
      this.showItemDropdown = false;
    }, 200);
  }

  onSearchFocus() {
    if (this.searchTerm && this.filteredItems.length > 0) {
      this.showItemDropdown = true;
    }
  }

  toggleDiscountShipping() {
    this.showDiscountShipping = !this.showDiscountShipping;
  }

  onEntryQuantityChange(value: any) {
    let qty = Number(value);
    if (!isFinite(qty) || qty <= 0) {
      qty = 1;
    }
    this.entryQuantity = qty;
  }

  onEntryPriceChange(value: any) {
    let price = Number(value);
    if (!isFinite(price) || price < 0) {
      price = 0;
    }
    this.entryPrice = +price.toFixed(2);
  }

  addEntryItem() {
    const name = (this.entrySelectedItem?.name || this.searchTerm || '').trim();
    if (!name) {
      this.msgService.add({
        severity: 'warn',
        summary: 'Missing item',
        detail: 'Please type an item name before adding.',
        life: 2000,
      });
      return;
    }

    const qty = Number(this.entryQuantity) || 1;
    const price = Number(this.entryPrice) || 0;
    const baseItem = this.entrySelectedItem || {};
    const customId = baseItem.id ?? `custom-${Date.now()}`;

    const existingIndex = this.selectedItems.findIndex(
      (si) => si.itemId === customId || si.itemName.toLowerCase() === name.toLowerCase()
    );

    if (existingIndex >= 0) {
      const target = this.selectedItems[existingIndex];
      target.quantity += qty;
      target.unitPrice = price;
      this.updateItemAmount(existingIndex);
    } else {
      const newItem: InvoiceItem = {
        itemId: customId,
        itemName: name,
        itemSKU: baseItem.sku || baseItem.SKU || baseItem.barcode || baseItem.Barcode || '',
        quantity: qty,
        unitPrice: price,
        unitId: baseItem.unitId || 0,
        unitName: baseItem.unitName || baseItem.unit || '',
        discount: 0,
        discountPercentage: 0,
        amount: qty * price
      };
      this.selectedItems.push(newItem);
      this.updateItemAmount(this.selectedItems.length - 1);
    }

    this.clearEntryFields();
    this.cdr.detectChanges();
  }

  clearEntryFields() {
    this.entrySelectedItem = null;
    this.entryQuantity = 1;
    this.entryPrice = 0;
    this.searchTerm = '';
    this.filteredItems = [];
    this.showItemDropdown = false;
  }

  private hasPendingEntry(): boolean {
    const name = (this.entrySelectedItem?.name || this.searchTerm || '').trim();
    const qty = Number(this.entryQuantity);
    const price = Number(this.entryPrice);
    return !!name && qty > 0 && price >= 0;
  }
}

