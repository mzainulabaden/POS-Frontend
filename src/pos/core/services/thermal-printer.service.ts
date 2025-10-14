import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ReceiptData {
  invoiceNumber: string;
  date: string;
  customer: string;
  paymentMode: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  received?: number;
  change?: number;
  warehouse?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class ThermalPrinterService {
  private receiptData = new BehaviorSubject<ReceiptData | null>(null);
  receiptData$ = this.receiptData.asObservable();

  constructor() { }

  /**
   * Print receipt using browser's print API
   * This works with thermal printers that have proper drivers installed
   */
  printReceipt(data: ReceiptData): void {
    this.receiptData.next(data);
    
    // Small delay to ensure the receipt template is rendered
    setTimeout(() => {
      window.print();
    }, 100);
  }

  /**
   * Generate ESC/POS commands for direct thermal printing
   * This can be used with USB/Network thermal printers via a middleware
   */
  generateESCPOSCommands(data: ReceiptData): string {
    const ESC = '\x1B';
    const GS = '\x1D';
    const LF = '\n';
    
    let commands = '';
    
    // Initialize printer
    commands += ESC + '@';
    
    // Set alignment center
    commands += ESC + 'a' + '1';
    
    // Store name (bold, double size)
    commands += ESC + 'E' + '1'; // Bold on
    commands += GS + '!' + '\x11'; // Double height and width
    commands += 'YOUR STORE NAME' + LF;
    commands += GS + '!' + '\x00'; // Normal size
    commands += ESC + 'E' + '0'; // Bold off
    
    // Store info
    commands += 'Address Line 1' + LF;
    commands += 'City, Country' + LF;
    commands += 'Tel: +1234567890' + LF;
    commands += LF;
    
    // Set alignment left
    commands += ESC + 'a' + '0';
    
    // Receipt header
    commands += '================================' + LF;
    commands += `Invoice: ${data.invoiceNumber}` + LF;
    commands += `Date: ${data.date}` + LF;
    commands += `Customer: ${data.customer}` + LF;
    if (data.warehouse) {
      commands += `Warehouse: ${data.warehouse}` + LF;
    }
    commands += `Payment: ${data.paymentMode}` + LF;
    commands += '================================' + LF;
    commands += LF;
    
    // Items header
    commands += 'Item             Qty  Price  Total' + LF;
    commands += '--------------------------------' + LF;
    
    // Items
    data.items.forEach(item => {
      const name = item.name.substring(0, 16).padEnd(16);
      const qty = item.quantity.toFixed(2).padStart(4);
      const price = item.price.toFixed(2).padStart(6);
      const total = item.total.toFixed(2).padStart(7);
      
      commands += `${name} ${qty} ${price} ${total}` + LF;
      
      if (item.discount > 0) {
        commands += `  Discount: -${item.discount.toFixed(2)}` + LF;
      }
    });
    
    commands += '--------------------------------' + LF;
    
    // Totals
    commands += `Subtotal:        ${data.subtotal.toFixed(2).padStart(15)}` + LF;
    
    if (data.discount > 0) {
      commands += `Discount:        ${data.discount.toFixed(2).padStart(15)}` + LF;
    }
    
    if (data.tax > 0) {
      commands += `Tax:             ${data.tax.toFixed(2).padStart(15)}` + LF;
    }
    
    // Total (bold, double size)
    commands += ESC + 'E' + '1'; // Bold on
    commands += GS + '!' + '\x10'; // Double height
    commands += `TOTAL:           ${data.total.toFixed(2).padStart(15)}` + LF;
    commands += GS + '!' + '\x00'; // Normal size
    commands += ESC + 'E' + '0'; // Bold off
    
    if (data.received !== undefined && data.received > 0) {
      commands += `Received:        ${data.received.toFixed(2).padStart(15)}` + LF;
    }
    
    if (data.change !== undefined && data.change > 0) {
      commands += `Change:          ${data.change.toFixed(2).padStart(15)}` + LF;
    }
    
    commands += LF;
    
    // Footer
    commands += ESC + 'a' + '1'; // Center align
    commands += '================================' + LF;
    commands += 'Thank You for Your Business!' + LF;
    commands += 'Please Come Again' + LF;
    commands += LF;
    commands += LF;
    
    // Cut paper (if supported)
    commands += GS + 'V' + '\x00';
    
    return commands;
  }

  /**
   * Send ESC/POS commands to thermal printer via network/USB
   * This requires a middleware service running locally
   */
  async sendToThermalPrinter(data: ReceiptData, printerIP?: string): Promise<void> {
    const commands = this.generateESCPOSCommands(data);
    
    // Option 1: Send to local middleware service
    // You can install a service like "Node Thermal Printer" or similar
    try {
      const response = await fetch('http://localhost:3000/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          printer: printerIP || 'default',
          data: commands
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send to thermal printer');
      }
    } catch (error) {
      console.error('Thermal printer error:', error);
      // Fallback to browser print
      this.printReceipt(data);
    }
  }

  /**
   * Generate receipt HTML for display
   */
  generateReceiptHTML(data: ReceiptData): string {
    return `
      <div style="width: 80mm; font-family: 'Courier New', monospace; font-size: 12px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <div style="font-size: 20px; font-weight: bold;">YOUR STORE NAME</div>
          <div>Address Line 1</div>
          <div>City, Country</div>
          <div>Tel: +1234567890</div>
        </div>
        
        <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; margin: 10px 0;">
          <div>Invoice: ${data.invoiceNumber}</div>
          <div>Date: ${data.date}</div>
          <div>Customer: ${data.customer}</div>
          ${data.warehouse ? `<div>Warehouse: ${data.warehouse}</div>` : ''}
          <div>Payment: ${data.paymentMode}</div>
        </div>
        
        <table style="width: 100%; font-size: 11px;">
          <thead>
            <tr style="border-bottom: 1px dashed #000;">
              <th style="text-align: left;">Item</th>
              <th style="text-align: right;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td style="text-align: right;">${item.quantity.toFixed(2)}</td>
                <td style="text-align: right;">${item.price.toFixed(2)}</td>
                <td style="text-align: right;">${item.total.toFixed(2)}</td>
              </tr>
              ${item.discount > 0 ? `<tr><td colspan="4" style="text-align: right; font-size: 10px;">Discount: -${item.discount.toFixed(2)}</td></tr>` : ''}
            `).join('')}
          </tbody>
        </table>
        
        <div style="border-top: 1px dashed #000; margin-top: 10px; padding-top: 5px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Subtotal:</span>
            <span>${data.subtotal.toFixed(2)}</span>
          </div>
          ${data.discount > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>Discount:</span>
              <span>-${data.discount.toFixed(2)}</span>
            </div>
          ` : ''}
          ${data.tax > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>Tax:</span>
              <span>${data.tax.toFixed(2)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-top: 5px;">
            <span>TOTAL:</span>
            <span>PKR ${data.total.toFixed(2)}</span>
          </div>
          ${data.received !== undefined && data.received > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>Received:</span>
              <span>${data.received.toFixed(2)}</span>
            </div>
          ` : ''}
          ${data.change !== undefined && data.change > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>Change:</span>
              <span>${data.change.toFixed(2)}</span>
            </div>
          ` : ''}
        </div>
        
        <div style="text-align: center; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px;">
          <div>Thank You for Your Business!</div>
          <div>Please Come Again</div>
        </div>
      </div>
    `;
  }

  /**
   * Clear receipt data
   */
  clearReceipt(): void {
    this.receiptData.next(null);
  }
}


