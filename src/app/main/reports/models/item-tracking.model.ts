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

