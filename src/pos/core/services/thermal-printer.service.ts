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
    console.log('Printing receipt with data:', data);
    this.receiptData.next(data);
    try {
      const freeze = (window as any).FreezeUI;
      if (typeof freeze === 'function') {
        freeze({ text: 'Printing...' });
      }
    } catch (_) {}
    
    // Render next frame to ensure template update, then print ASAP
    const unfreezeIfAny = () => {
      try {
        const unfreeze = (window as any).UnFreezeUI;
        if (typeof unfreeze === 'function') {
          unfreeze({});
        }
      } catch (_) {}
    };

    const doPrint = () => {
      console.log('Opening print dialog...');
      unfreezeIfAny();
      window.print();
    };

    try {
      // Double rAF ensures DOM paint before print
      requestAnimationFrame(() => requestAnimationFrame(doPrint));
      // Safety fallback after ~120ms in case rAF is throttled
      setTimeout(doPrint, 120);
    } catch (_) {
      // Fallback minimal delay
      setTimeout(doPrint, 120);
    }
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
    
    // Store name (bold)
    commands += ESC + 'E' + '1'; // Bold on
    commands += 'SANTA PVT LTD' + LF;
    commands += ESC + 'E' + '0'; // Bold off
    
    // Store info
    commands += '143 SOUTH CAR STREET,' + LF;
    commands += 'MADURAI, TAMIL NADU.' + LF;
    commands += 'PHONE : 04522585258' + LF;
    commands += 'GSTIN : 33AACPD8885F1ZH' + LF;
    commands += LF;
    
    // Set alignment left
    commands += ESC + 'a' + '0';
    
    // Bill info
    commands += `Bill No : ${data.invoiceNumber.padEnd(10)} Date : ${data.date}` + LF;
    if (data.customer) {
      commands += `Customer : ${data.customer}` + LF;
    }
    if (data.paymentMode) {
      commands += `Payment : ${data.paymentMode}` + LF;
    }
    commands += '--------------------------------' + LF;
    
    // Items header
    commands += 'Item      Qty Price Disc  Amt' + LF;
    
    // Items
    data.items.forEach(item => {
      const name = item.name.substring(0, 10).padEnd(10);
      const qty = item.quantity.toString().padStart(3);
      const price = item.price.toFixed(2).padStart(5);
      const discount = item.discount.toFixed(2).padStart(4);
      const total = item.total.toFixed(2).padStart(6);
      
      commands += `${name}${qty} ${price} ${discount} ${total}` + LF;
    });
    
    commands += '--------------------------------' + LF;
    
    // Subtotal
    commands += `SubTotal                ${data.subtotal.toFixed(2).padStart(10)}` + LF;
    
    // Item Discounts
    const totalItemDiscounts = data.items.reduce((acc, item) => acc + (item.discount || 0), 0);
    if (totalItemDiscounts > 0) {
      commands += `Item Discounts          -${totalItemDiscounts.toFixed(2).padStart(8)}` + LF;
    }
    
    commands += '--------------------------------' + LF;
    
    // Total (bold)
    commands += ESC + 'E' + '1'; // Bold on
    commands += `TOTAL            Rs. ${data.total.toFixed(2).padStart(10)}` + LF;
    commands += ESC + 'E' + '0'; // Bold off
    
    commands += '--------------------------------' + LF;
    
    // E & O E
    commands += ESC + 'a' + '2'; // Right align
    commands += 'E & O E' + LF;
    
    commands += LF;
    
    // Footer
    commands += ESC + 'a' + '1'; // Center align
    commands += 'Thank You' + LF;
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
    // Ensure any bound templates receive the latest receipt data
    // so the app doesn't appear blank while printing silently.
    try {
      this.receiptData.next(data);
    } catch (_) {}

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
      // Silently fail if printer is not connected - do not open browser print dialog
    }
  }

  /**
   * Generate receipt HTML for display
   */
  generateReceiptHTML(data: ReceiptData): string {
    return `
      <div style="width: 80mm; font-family: 'Courier New', monospace; font-size: 10px; padding: 5mm;">
        <div style="text-align: center; margin-bottom: 12px;">
          <div style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">SANTA PVT LTD</div>
          <div style="font-size: 9px; line-height: 1.4; margin: 2px 0;">143 SOUTH CAR STREET,</div>
          <div style="font-size: 9px; line-height: 1.4; margin: 2px 0;">MADURAI, TAMIL NADU.</div>
          <div style="font-size: 9px; line-height: 1.4; margin: 2px 0;">PHONE : 04522585258</div>
          <div style="font-size: 9px; line-height: 1.4; margin: 2px 0;">GSTIN : 33AACPD8885F1ZH</div>
        </div>
        
        <div style="margin: 10px 0;">
          <table style="width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 8px;">
            <tr>
              <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 40%; font-size: px; font-weight: bold;">Bill No : ${data.invoiceNumber}</td>
              <td style="text-align: right; white-space: nowrap; overflow: hidden; text-overflow: clip; width: 40%;">Date : ${data.date}</td>
            </tr>
          </table>
          ${data.customer ? `<div style="font-size: 7px; margin: 4px 0;">Customer : ${data.customer}</div>` : ''}
          ${data.paymentMode ? `<div style="font-size: 9px; margin: 4px 0;">Payment : ${data.paymentMode}</div>` : ''}
        </div>
        
        <div style="border-bottom: 1px dashed #000; margin: 5px 0;"></div>
        
        <table style="width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 8px;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 3px 1px; font-weight: normal; font-size: 8px;">Item</th>
              <th style="text-align: center; padding: 3px 1px; font-weight: normal; font-size: 8px;">Qty</th>
              <th style="text-align: right; padding: 3px 1px; font-weight: normal; font-size: 8px;">Price</th>
              <th style="text-align: right; padding: 3px 1px; font-weight: normal; font-size: 8px;">Disc</th>
              <th style="text-align: right; padding: 3px 1px; font-weight: normal; font-size: 8px;">Amt</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td style="padding: 4px 1px; vertical-align: top; font-size: 8px;">${item.name}</td>
                <td style="text-align: center; padding: 4px 1px; vertical-align: top; font-size: 8px;">${item.quantity}</td>
                <td style="text-align: right; padding: 4px 1px; vertical-align: top; font-size: 8px;">${item.price.toFixed(2)}</td>
                <td style="text-align: right; padding: 4px 1px; vertical-align: top; color: #d32f2f; font-size: 8px;">${item.discount.toFixed(2)}</td>
                <td style="text-align: right; padding: 4px 1px; vertical-align: top; font-size: 8px;">${item.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="border-bottom: 1px dashed #000; margin: 5px 0;"></div>
        
        <div style="margin: 8px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 9px; margin: 4px 0;">
            <span>SubTotal</span>
            <span>${data.subtotal.toFixed(2)}</span>
          </div>
          ${(() => {
            const totalItemDiscounts = data.items.reduce((acc, item) => acc + (item.discount || 0), 0);
            return totalItemDiscounts > 0 ? `
              <div style="display: flex; justify-content: space-between; font-size: 9px; margin: 4px 0; color: #d32f2f;">
                <span>Item Discounts</span>
                <span>-${totalItemDiscounts.toFixed(2)}</span>
              </div>
            ` : '';
          })()}
        </div>
        
        <div style="border-bottom: 1px dashed #000; margin: 5px 0;"></div>
        
        <div style="margin: 8px 0;">
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 10px;">
            <span>TOTAL</span>
            <span>Rs. ${data.total.toFixed(2)}</span>
          </div>
        </div>
        
        <div style="border-bottom: 1px dashed #000; margin: 5px 0;"></div>
        
        <div style="text-align: right; font-size: 8px; margin: 8px 0;">E & O E</div>
        
        <div style="text-align: center; margin-top: 15px; font-size: 10px;">
          <div>Thank You</div>
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


