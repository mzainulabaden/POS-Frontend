export interface ItemTrackingReport {
  creationTime: string;
  issueDate: string;
  warehouseId: number;
  warehouseName: string;
  itemId: number;
  itemName: string;
  unitId: number;
  unitName: string;
  voucherNumber: string;
  transactionType: string;
  counterpartyName: string;
  qtyIn: number;
  qtyOut: number;
  rate: number;
  totalAmount: number;
  remarks: string;
  openingBalance: number;
  previousBalance: number;
  closingBalance: number;
}

export interface ItemTrackingParams {
  warehouseId?: number;
  itemId?: number;
  fromDate?: string;
  toDate?: string;
}

export interface ReportItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  apiEndpoint: string;
}

export interface SalesCustomerWiseReport {
  salesDate: string;
  customerName: string;
  invoiceId: number;
  voucherNumber: string;
  paymentModeName: string;
  invoiceAmount: number;
  dailyTotalAmount: number;
  dailyInvoiceCount: number;
}

export interface SalesCustomerWiseParams {
  fromDate?: string;
  toDate?: string;
}

export interface WarehouseStockReport {
  itemName: string;
  warehouseName: string;
  totalCredit: number;
  totalDebit: number;
  balance: number;
}

export interface WarehouseStockParams {
  fromDate?: string;
  toDate?: string;
  warehouseId?: number;
  itemId?: number;
}

export interface DailySalesReport {
  salesDate?: string;
  date?: string;
  totalSales?: number;
  totalAmount?: number;
  invoiceCount?: number;
  totalInvoices?: number;
  cashSales?: number;
  creditSales?: number;
  [key: string]: any; // Allow for additional fields from API
}

export interface DailySalesParams {
  fromDate?: string;
  toDate?: string;
  warehouseId?: number;
}

