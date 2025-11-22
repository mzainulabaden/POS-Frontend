import {
  ChangeDetectorRef,
  Component,
  Injector,
  OnInit,
  ViewEncapsulation,
} from "@angular/core";
import { MessageService } from "primeng/api";
import { catchError, finalize, throwError } from "rxjs";
import { MainSetupsService } from "../../shared/services/main-setups.service";
import { debounceTime, distinctUntilChanged, Subject } from "rxjs";
import * as JsBarcode from "jsbarcode";
import { newBaseUrl } from "@shared/AppBaseUrl/appBaseURL";

@Component({
  selector: "app-item-barcode-printing",
  templateUrl: "./item-barcode-printing.component.html",
  styleUrl: "./item-barcode-printing.component.css",
  encapsulation: ViewEncapsulation.None,
})
export class ItemBarcodePrintingComponent implements OnInit {
  target: string = "Item";
  tableData: any[] = [];
  loading: boolean = false;
  filters = {
    skipCount: 0,
    maxCount: 1000,
    name: "",
    VoucherNumber: "",
  };
  searchQuery: string = "";
  suggestions: string[] = [];
  private searchSubject = new Subject<string>();
  baseurl: string = newBaseUrl;
  
  selectedItem: any = null;
  selectedItemDetail: any = null;
  barcodePreviewUrl: string = "";
  expiryDate: Date | null = null;
  manufactureDate: Date | null = null;
  units: { id: any; name: string }[] = [];
  selectedItemId: any = null;

  constructor(
    injector: Injector,
    private _hrmService: MainSetupsService,
    private changeDetector: ChangeDetectorRef,
    private msgService: MessageService
  ) {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((query) => {
        this.fetchSuggestions(query);
      });
  }

  ngOnInit(): void {
    this.fetchDropdownData("Unit");
    this.getAll();
  }

  fetchDropdownData(target: string) {
    this._hrmService.getAllSuggestion(target).subscribe((response: any) => {
      const mappedData = response.items.map((item: any) => ({
        id: item?.id,
        name: item?.name,
      }));
      if (target === "Unit") {
        this.units = mappedData;
      }
      this.changeDetector.detectChanges();
    });
  }

  onSearchChange(query: string) {
    this.searchQuery = query;
    if (query.length >= 2) {
      this.searchSubject.next(query);
    } else {
      this.suggestions = [];
    }
  }

  fetchSuggestions(query: string) {
    this._hrmService.getSuggestions(this.target, query).subscribe({
      next: (response: any) => {
        this.suggestions = response.items || [];
      },
      error: (error) => {
        console.error("Error fetching suggestions:", error);
        this.suggestions = [];
      },
    });
  }

  selectSuggestion(suggestion: string) {
    this.searchQuery = suggestion;
    this.suggestions = [];
    this.filters.name = suggestion;
    this.getAll();
  }

  getAll() {
    this.loading = true;
    this._hrmService
      .getAll1(this.target, this.filters)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        catchError((error) => {
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: error.error?.error?.message || "Failed to load items",
            life: 2000,
          });
          return throwError(error.error.error.message);
        })
      )
      .subscribe({
        next: (response) => {
          this.tableData = response.items || [];
          this.changeDetector.detectChanges();
        },
      });
  }

  onGlobalFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.filters.name = value;
    this.getAll();
  }

  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.filters.name = inputValue;
    this.getAll();
  }

  selectItem(item: any) {
    // Map unitId to unitName for each item detail
    if (item.itemDetails && item.itemDetails.length > 0) {
      item.itemDetails = item.itemDetails.map((detail: any) => ({
        ...detail,
        unitName: this.units.find((unit) => unit.id === detail.unitId)?.name || "",
      }));
    }
    
    this.selectedItem = item;
    this.selectedItemDetail = null;
    this.barcodePreviewUrl = "";
    this.expiryDate = null;
    this.manufactureDate = null;
    
    // Generate barcode image for the first item detail if available
    if (item.itemDetails && item.itemDetails.length > 0) {
      const firstDetail = item.itemDetails[0];
      if (firstDetail.barcode) {
        this.selectItemDetail(firstDetail);
      }
    }
  }

  onItemDropdownChange(itemId: any) {
    if (!itemId) {
      this.clearSelection();
      return;
    }
    this._hrmService.getDataForEdit(itemId, this.target).subscribe({
      next: (item: any) => {
        // Map unitId to unitName for each item detail
        if (item?.itemDetails?.length) {
          item.itemDetails = item.itemDetails.map((detail: any) => ({
            ...detail,
            unitName:
              this.units.find((unit) => unit.id === detail.unitId)?.name || "",
          }));
        }
        this.selectItem(item);

        // Immediately fetch barcode image URL by itemId (prefer server)
        const firstDetail = item?.itemDetails?.[0];
        const unitId = firstDetail?.unitId;
        this._hrmService.getBarCodeUrlByItem(item.id, unitId).subscribe({
          next: (url: string) => {
            if (url) {
              this.barcodePreviewUrl = url.startsWith("http") ? url : `${this.baseurl}${url}`;
              // keep a visible barcode number if available
              if (firstDetail?.barcode) {
                this.selectedItemDetail = firstDetail;
              }
              this.changeDetector.detectChanges();
            } else {
              this.barcodePreviewUrl = "";
              console.warn("GetBarCodeUrl returned empty URL for itemId", item.id, "unitId", unitId);
              this.msgService.add({
                severity: "warn",
                summary: "Warning",
                detail: "No barcode image returned by server",
                life: 2000,
              });
            }
          },
          error: (err) => {
            this.barcodePreviewUrl = "";
            console.error("Failed to fetch barcode URL:", err);
            this.msgService.add({
              severity: "error",
              summary: "Error",
              detail: err?.error?.error?.message || "Failed to fetch barcode from server",
              life: 2500,
            });
          },
        });
      },
    });
  }

  selectItemDetail(itemDetail: any) {
    this.selectedItemDetail = itemDetail;
    if (itemDetail.barcode) {
      // Prefer server-provided barcode image URL if available
      this._hrmService.getBarCodeUrl(itemDetail.id).subscribe({
        next: (url: string) => {
          if (url) {
            // Normalize absolute vs relative URL
            this.barcodePreviewUrl = url.startsWith("http")
              ? url
              : `${this.baseurl}${url}`;
            this.changeDetector.detectChanges();
          } else {
            this.barcodePreviewUrl = "";
            this.msgService.add({
              severity: "warn",
              summary: "Warning",
              detail: "No barcode image returned by server",
              life: 2000,
            });
          }
        },
        error: () => {
          this.barcodePreviewUrl = "";
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: "Failed to fetch barcode image from server",
            life: 2000,
          });
        },
      });
    } else {
      this.barcodePreviewUrl = "";
      this.msgService.add({
        severity: "warn",
        summary: "Warning",
        detail: "No barcode found for this item detail",
        life: 2000,
      });
    }
  }

  generateBarcodeImage(barcodeValue: string) {
    setTimeout(() => {
      // Create a temporary canvas to generate the barcode
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 40;
      
      try {
        JsBarcode(canvas, barcodeValue, {
          format: "CODE128",
          width: 0.8,
          height: 30,
          displayValue: true,
          fontSize: 6,
          margin: 1,
          textAlign: "center",
          textPosition: "bottom",
        });
        this.barcodePreviewUrl = canvas.toDataURL("image/png");
        this.changeDetector.detectChanges();
      } catch (error) {
        console.error("Barcode generation error:", error);
        this.msgService.add({
          severity: "error",
          summary: "Error",
          detail: "Failed to generate barcode image",
          life: 2000,
        });
      }
    }, 100);
  }

  printBarcode(itemDetail?: any) {
    const detail = itemDetail || this.selectedItemDetail;
    if (!detail || !detail.barcode) {
      this.msgService.add({
        severity: "warn",
        summary: "Warning",
        detail: "No barcode found to print",
        life: 2000,
      });
      return;
    }
    if (!this.barcodePreviewUrl) {
      this.msgService.add({
        severity: "warn",
        summary: "Warning",
        detail: "No barcode image available to print",
        life: 2000,
      });
      return;
    }
    this.performPrint(detail);
  }

  // private performPrint(itemDetail: any) {
  //   const itemName = this.selectedItem?.name || "N/A";
  //   const barcodeValue = itemDetail.barcode;
    
  //   // Use server image only (no local generation)
  //   const barcodeImageUrl = this.barcodePreviewUrl;
  //   if (!barcodeImageUrl) {
  //     this.msgService.add({
  //       severity: "warn",
  //       summary: "Warning",
  //       detail: "No barcode image available to print",
  //       life: 2000,
  //     });
  //     return;
  //   }
  //     const expiryDateStr = this.expiryDate 
  //       ? new Date(this.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  //       : "";
  //     const manufactureDateStr = this.manufactureDate 
  //       ? new Date(this.manufactureDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  //       : "";

  //   try {
  //     const printWindow = window.open("", "_blank");
  //     if (printWindow) {
  //       printWindow.document.write(`
  //         <html>
  //           <head>
  //             <title>Print Barcode Label</title>
  //             <style>
  //               @page {
  //                 size: 25mm 25mm;
  //                 margin: 0;
  //               }
  //               body { 
  //                 width: 25mm;
  //                 height: 25mm;
  //                 margin: 0;
  //                 padding: 2mm 1.5mm;
  //                 font-family: Arial, sans-serif;
  //                 display: flex;
  //                 flex-direction: column;
  //                 justify-content: flex-start;
  //                 box-sizing: border-box;
  //               }
  //               .company-name {
  //                 font-size: 5px;
  //                 font-weight: bold;
  //                 text-align: center;
  //                 line-height: 1.2;
  //                 margin-bottom: 1.5mm;
  //                 text-transform: uppercase;
  //               }
  //               .item-name {
  //                 font-size: 6px;
  //                 text-align: center;
  //                 line-height: 1.2;
  //                 margin-bottom: 2mm;
  //                 word-wrap: break-word;
  //               }
  //               .barcode-container {
  //                 display: flex;
  //                 justify-content: center;
  //                 align-items: center;
  //                 margin: 1mm 0;
  //                 flex: 1;
  //               }
  //               .barcode-container img {
  //                 max-width: 100%;
  //                 max-height: 12mm;
  //                 width: auto;
  //                 height: auto;
  //               }
  //               .barcode-number {
  //                 font-size: 7px;
  //                 text-align: center;
  //                 margin-top: 1mm;
  //                 font-weight: normal;
  //               }
  //               .dates {
  //                 font-size: 4px;
  //                 text-align: center;
  //                 line-height: 1.1;
  //                 margin-top: 0.5mm;
  //               }
  //               .date-row {
  //                 margin: 0.2mm 0;
  //               }
  //             </style>
  //           </head>
  //           <body>
  //             <div class="company-name">USAMA SWEETS & BAKERS</div>
  //             <div class="item-name">${itemName}</div>
  //             <div class="barcode-container">
  //               <img src="${barcodeImageUrl}" alt="Barcode" />
  //             </div>
  //             <div class="barcode-number">${barcodeValue}</div>
  //             ${(expiryDateStr || manufactureDateStr) ? `
  //             <div class="dates">
  //               ${manufactureDateStr ? `<div class="date-row">Mfg: ${manufactureDateStr}</div>` : ''}
  //               ${expiryDateStr ? `<div class="date-row">Exp: ${expiryDateStr}</div>` : ''}
  //             </div>
  //             ` : ''}
  //           </body>
  //         </html>
  //       `);
  //       printWindow.document.close();
  //       printWindow.print();
  //     }
  //   } catch (error) {
  //     console.error("Print error:", error);
  //     this.msgService.add({
  //       severity: "error",
  //       summary: "Error",
  //       detail: "Failed to print barcode",
  //       life: 2000,
  //     });
  //   }
  // }
private performPrint(itemDetail: any) {
  const itemName = this.selectedItem?.name || "N/A";
  const barcodeValue = itemDetail.barcode;

  const barcodeImageUrl = this.barcodePreviewUrl;
  if (!barcodeImageUrl) {
    this.msgService.add({
      severity: "warn",
      summary: "Warning",
      detail: "No barcode image available to print",
      life: 2000,
    });
    return;
  }

  const expiryDateStr = this.expiryDate
    ? new Date(this.expiryDate).toLocaleDateString("en-GB")
    : "";
  const manufactureDateStr = this.manufactureDate
    ? new Date(this.manufactureDate).toLocaleDateString("en-GB")
    : "";

  try {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode Label</title>
          <style>
            @page { size: 38mm 25mm; margin: 0; }

            html, body {
              width: 38mm;
              height: 25mm;
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              box-sizing: border-box;
            }

            .label-container {
              width: 100%;
              height: 100%;
              padding: 1mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
            }

            .company-name {
              font-size: 8px;
              font-weight: bold;
              text-align: center;
              text-transform: uppercase;
              line-height: 1;
            }

            .item-name {
              font-size: 8px;
              font-weight: bold;
              text-align: center;
              line-height: 1.1;
              margin: 0.5mm 0;
              word-wrap: break-word;
            }

            .barcode-container {
              width: 100%;
              flex: 1;
              display: flex;
              justify-content: center;
              align-items: center;
            }

            .barcode-container img {
              width: 90%;
              height: auto;
              max-height: 30px;
            }

            .barcode-number {
              font-size: 8px;
              text-align: center;
              line-height: 1;
            }

            .dates {
              font-size: 8px;
              font-weight: bold;
              text-align: center;
              line-height: 1;
            }

            .date-row { margin: 0.2mm 0; }
          </style>
        </head>

        <body>
          <div class="label-container">
            <div class="company-name">USAMA SWEETS & BAKERS</div>
            <div class="item-name">${itemName}</div>

            <div class="barcode-container">
              <img id="barcode-img" src="${barcodeImageUrl}" alt="Barcode" />
            </div>

            ${expiryDateStr || manufactureDateStr ? `
              <div class="dates">
                ${manufactureDateStr ? `<div class="date-row">Mfg: ${manufactureDateStr}</div>` : ''}
                ${expiryDateStr ? `<div class="date-row">Exp: ${expiryDateStr}</div>` : ''}
              </div>
            ` : ""}
          </div>

          <script>
            const img = document.getElementById("barcode-img");
            img.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  } catch (error) {
    console.error("Print error:", error);
    this.msgService.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to print barcode",
      life: 2000,
    });
  }
}

  printAllBarcodes() {
    if (!this.selectedItem || !this.selectedItem.itemDetails) {
      this.msgService.add({
        severity: "warn",
        summary: "Warning",
        detail: "Please select an item first",
        life: 2000,
      });
      return;
    }

    const itemDetailsWithBarcode = this.selectedItem.itemDetails.filter(
      (detail: any) => detail.barcode
    );

    if (itemDetailsWithBarcode.length === 0) {
      this.msgService.add({
        severity: "warn",
        summary: "Warning",
        detail: "No barcodes found for this item",
        life: 2000,
      });
      return;
    }

    // Print each barcode with a delay between prints
    itemDetailsWithBarcode.forEach((detail: any, index: number) => {
      setTimeout(() => {
        this.printBarcode(detail);
      }, index * 1000); // 1 second delay between each print
    });
  }

  clearSelection() {
    this.selectedItem = null;
    this.selectedItemDetail = null;
    this.barcodePreviewUrl = "";
    this.expiryDate = null;
    this.manufactureDate = null;
  }
}

