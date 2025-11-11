import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-invoice-preview',
  templateUrl: './invoice-preview.component.html',
  styleUrls: ['./invoice-preview.component.css']
})
export class InvoicePreviewComponent {
  @Input() invoiceData: any;

  get companyInfo() {
    return {
      name: 'PhoneMart.pk',
      address: '123 Business Street',
      city: 'City, lahore 12345',
      phone: '(123) 456-7890',
      email: 'info@phonemart.com'
    };
  }
}

