import { Component, OnInit } from '@angular/core';
import { ThermalPrinterService, ReceiptData } from '../../core/services/thermal-printer.service';

@Component({
  selector: 'app-receipt-template',
  templateUrl: './receipt-template.component.html',
  styleUrls: ['./receipt-template.component.css']
})
export class ReceiptTemplateComponent implements OnInit {
  receiptData: ReceiptData | null = null;

  constructor(private printerService: ThermalPrinterService) {}

  ngOnInit(): void {
    this.printerService.receiptData$.subscribe(data => {
      console.log('Receipt template received data:', data);
      this.receiptData = data;
    });
  }

  getTotalItemDiscounts(): number {
    if (!this.receiptData || !this.receiptData.items) {
      return 0;
    }
    return this.receiptData.items.reduce((acc, item) => {
      return acc + (item.discount || 0);
    }, 0);
  }
}


