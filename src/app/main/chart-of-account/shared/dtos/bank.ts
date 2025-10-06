export class Bank{
  id: number;
  isActive: true;
  serialNumber: string;
  name: string;
  coaLevel03Id: string;
  accountTypeId: number;
  accountTypeName: string;
  currencyId: number;
  currencyName: string;
  stopEntryBefore: Date | string;
  linkWithId: number;
  linkWithName: string;
  natureOfAccount: number = 0;
}
