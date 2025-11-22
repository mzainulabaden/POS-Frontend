import {
  ChangeDetectorRef,
  Component,
  Injector,
  OnInit,
  ViewEncapsulation,
} from "@angular/core";
import { MessageService, ConfirmationService } from "primeng/api";
import { catchError, finalize, throwError } from "rxjs";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MainSetupsService } from "../../shared/services/main-setups.service";
import { GridApi, GridReadyEvent, ColDef } from "ag-grid-community";
import { Table } from "primeng/table";
import * as moment from "moment";
import { debounceTime, distinctUntilChanged, Subject } from "rxjs";
import * as XLSX from "xlsx";
import { ViewChild, ElementRef } from "@angular/core";
import { saveAs } from "file-saver";
import * as ExcelJS from "exceljs";
import * as JsBarcode from "jsbarcode";

@Component({
  selector: "app-create-item",
  templateUrl: "./create-item.component.html",
  styleUrl: "./create-item.component.css",
  encapsulation: ViewEncapsulation.None,
  providers: [ConfirmationService],
})
export class CreateItemComponent implements OnInit {
  @ViewChild("fileInput") fileInput: ElementRef;
  editMode: boolean;
  displayModal: boolean;
  displayCategoryModal = false;
  target: string = "Item";
  tableData: any;
  designations: any;
  count: number;
  currentPage: number = 1;
  skipCount: number = 0;
  maxCount: number = 10;
  saving: boolean;
  filters = {
    skipCount: this.skipCount,
    maxCount: this.maxCount,
    name: "",
    VoucherNumber: "",
  };
  alreadyExists: boolean | null = null; // Default state
  showSupplierDetails = false;
  protected gridApi: GridApi;
  protected setParms;
  rowSelection: string;
  rowCount: number;
  rowData: any;
  dto = {
    name: "",
  };
  dataForEdit: any;
  employeeErpId: number;
  itemForm: FormGroup;
  loading: boolean;
  searchQuery = "";
  suggestions: string[] = [];
  baseurl: string = "http://192.168.10.11:8000";
  private searchSubject = new Subject<string>(); // RxJS subject for debounce
  constructor(
    injector: Injector,
    private fb: FormBuilder,
    private _hrmService: MainSetupsService,
    private changeDetector: ChangeDetectorRef,
    private msgService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.itemForm = this.fb.group({
      name: ["", [Validators.required]],
      description: [""],
      sku: [""],
      discountAmount: [0],
      discountPercentage: [0],
      itemCategoryId: [""],
      salesCOALevel04Id: [""],
      purchaseCOALevel04Id: [""],
      isDiscountable: [""],
      reOrderQty: [10],
      itemDetails: [[]],
      imageUrl: "",
      barcodeurl: "",
    });
  }
  ngOnInit(): void {
    this.getAll();
    this.fetchDropdownData("Unit");
    this.fetchDropdownData("ItemCategory");
    this.fetchDropdownData("COALevel04");
    this._hrmService.categoryUpdated$.subscribe(() => {
      this.fetchDropdownData("ItemCategory");
    });
    this._hrmService.categoryCreated$.subscribe((newCategory) => {
      this.itemCategory = [...this.itemCategory, newCategory];
      this.itemForm.patchValue({ itemCategoryId: newCategory.result.id });
      this.displayCategoryModal = false;
    });

    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((query) => {
        this.fetchSuggestions(query);
      });
  }
  onSearchChange(query: string) {
    this.searchQuery = query;

    if (query.length >= 2) {
      this.searchSubject.next(query); // Trigger API call with debounce
    } else {
      this.suggestions = []; // Clear suggestions if input is too short
    }
  }

  // API call to fetch suggestions
  fetchSuggestions(query: string) {
    this._hrmService.getSuggestions(this.target, query).subscribe({
      next: (response: any) => {
        this.suggestions = response.items; // Update suggestions list
      },
      error: (error) => {
        console.error("Error fetching suggestions:", error);
        this.suggestions = [];
      },
    });
  }

  // When user clicks a suggestion
  selectSuggestion(suggestion: string) {
    this.searchQuery = suggestion; // Fill input with selected suggestion
    this.suggestions = []; // Hide suggestions
  }

  onCellValueChanged(params) {
    const data = params.data;
    data.unitPrice = Number(data.unitPrice) || 0;
    data.maxSalePrice = Number(data.maxSalePrice) || 0;
    data.minSalePrice = Number(data.minSalePrice) || 0;
    data.quantity = Number(data.quantity) || 0;
    const selectedUnit = this.units.find((unit) => unit.id === data.unitId);
    const unitMultiplier = selectedUnit
      ? Number(selectedUnit.additional) || 0
      : 0;

    if (
      params.column.getId() === "maxSalePrice" ||
      params.column.getId() === "minSalePrice"
    ) {
      if (
        data.maxSalePrice &&
        data.minSalePrice &&
        data.maxSalePrice <= data.minSalePrice
      ) {
        this.msgService.add({
          severity: "warn",
          summary: "Validation",
          detail: "Max Price must be greater than Min Price",
          life: 2000,
        });
      }
    }
    if (params.column.getId() === "unitPrice") {
      data.minSalePrice = data.unitPrice + 5;
      data.maxSalePrice = data.unitPrice + 10;
      data.perBagPrice = unitMultiplier * data.unitPrice;
    }
    this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
    console.log(this.rowData);
  }
  units: { id: any; name: string; additional: string }[] = [];
  itemCategory: { id: any; name: string }[] = [];
  salesCategory: { id: any; name: string }[] = [];
  purchaseCategory: { id: any; name: string }[] = [];

  colDefs: ColDef[] = [
    {
      headerName: "SrNo",
      field: "srNo",
      valueGetter: (params) => {
        return params.node ? params.node.rowIndex + 1 : "";
      },
      editable: false,
      sortable: false,
      width: 90,
      suppressSizeToFit: true,
      cellClass: "ag-styling-cell",
      headerClass: "ag-header-name",
    },

    {
      headerName: "Unit Id",
      field: "unitId",
      cellEditor: "agSelectCellEditor",
      cellEditorParams: (params) => {
        return {
          values: this.units.map((unit) => unit.name),
          cellEditorPopup: true,
          filter: true,
          searchDebounceDelay: 200,
        };
      },
      valueGetter: (params) => {
        const unit = this.units.find((unit) => unit.id === params.data.unitId);
        return unit ? unit.name : "";
      },
      valueSetter: (params) => {
        const selectedUnit = this.units.find(
          (unit) => unit.name === params.newValue
        );
        if (selectedUnit) {
          params.data.unitId = selectedUnit.id;
          return true;
        }
        return false;
      },
      editable: true,
      resizable: true,
      width: 270,
      cellClass: "ag-styling-cell",
      headerClass: "ag-header-name",
    },
    {
      headerName: "Unit Price ",
      field: "unitPrice",
      editable: true,
      resizable: true,

      width: 210,
      cellClass: "ag-styling-cell",
      headerClass: "ag-header-name",
    },
    {
      headerName: "Price Per Bag",
      field: "perBagPrice",
      editable: false,
      resizable: true,

      width: 120,
      cellClass: "ag-styling-cell",
      headerClass: "ag-header-name",
    },
    // Hidden columns - min price, max price, and stock level
    // {
    //   headerName: "Min Price (KG)",
    //   field: "minSalePrice",
    //   editable: true,
    //   resizable: true,
    //   width: 210,
    //   cellClass: "ag-styling-cell",
    //   headerClass: "ag-header-name",
    // },
    // {
    //   headerName: "Max Price (KG)",
    //   field: "maxSalePrice",
    //   editable: true,
    //   resizable: true,
    //   width: 210,
    //   cellClass: "ag-styling-cell",
    //   headerClass: "ag-header-name",
    // },
    // {
    //   headerName: "Stock level",
    //   field: "minStockLevel",
    //   editable: true,
    //   resizable: true,
    //   width: 210,
    //   cellClass: "ag-styling-cell",
    //   headerClass: "ag-header-name",
    // },
    {
      headerName: "Barcode",
      field: "barcode",
      editable: true,
      resizable: true,
      width: 275,
      cellClass: "ag-styling-cell",
      headerClass: "ag-header-name",
    },
  ];

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.rowSelection = "multiple";
    this.rowData = [];
  }
  onAddRow() {
    const newItem: Record<string, any> = {};
    this.colDefs.forEach((colDef) => {
      if (colDef.field) {
        newItem[colDef.field] = null;
      }
    });
    this.gridApi.applyTransaction({ add: [newItem], addIndex: 0 });
    this.gridApi.refreshCells({ force: true });
  }
  onRemoveSelected() {
    const selectedNodes = this.gridApi.getSelectedNodes();
    if (selectedNodes.length > 0) {
      const dataToRemove = selectedNodes.map((node) => node.data);
      this.gridApi.applyTransaction({ remove: dataToRemove });
      this.rowData = [];
      this.gridApi.forEachNode((node) => this.rowData.push(node.data));
    }
  }

  validatePrices(): boolean {
    if (!this.rowData || this.rowData.length === 0) return true;

    for (const item of this.rowData) {
      if (
        item.maxSalePrice &&
        item.minSalePrice &&
        Number(item.maxSalePrice) <= Number(item.minSalePrice)
      ) {
        this.msgService.add({
          severity: "error",
          summary: "Validation Error",
          detail: "Max Price must be greater than Min Price",
          life: 3000,
        });
        return false;
      }
    }
    return true;
  }

  fetchDropdownData(target) {
    this._hrmService.getAllSuggestion(target).subscribe((response: any) => {
      const mappedData = response.items.map((item: any) => ({
        id: item?.id,
        name: item?.name,
        additional: item?.additional,
      }));
      switch (target) {
        case "Unit":
          this.units = mappedData;
          break;
        case "ItemCategory":
          this.itemCategory = mappedData;
          break;
        case "COALevel04":
          this.salesCategory = mappedData;
          this.purchaseCategory = mappedData;
          break;
        default:
          break;
      }
      this.changeDetector.detectChanges();
    });
  }
  getAll() {
    this.loading = true;
    this._hrmService
      .getAll1(this.target, this.filters)
      .pipe(
        finalize(() => {}),
        catchError((error) => {
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: error.error.error.message,
            life: 2000,
          });
          return throwError(error.error.error.message);
        })
      )
      .subscribe({
        next: (response) => {
          console.log(response);
          this.tableData = response.items;
          this.count = response.totalCount;
          this.loading = false;
          this.changeDetector.detectChanges();
        },
      });
  }
  show(id?: number) {
    if (id) {
      // Edit Mode
      this.editMode = true;
      this._hrmService
        .getDataForEdit(id, this.target)
        .pipe(
          finalize(() => {}),
          catchError((error) => {
            this.msgService.add({
              severity: "error",
              summary: "Error",
              detail: error.error.error.message,
              life: 2000,
            });
            return throwError(error.error.error.message);
          })
        )
        .subscribe({
          next: (response) => {
            this.dataForEdit = response;
            this.itemForm.patchValue({
              name: this.dataForEdit.name,
              description: this.dataForEdit.description,
              sku: this.dataForEdit.sku,
              itemCategoryId: this.dataForEdit.itemCategoryId,
              salesCOALevel04Id: this.dataForEdit.salesCOALevel04Id,
              purchaseCOALevel04Id: this.dataForEdit.purchaseCOALevel04Id,
              discountAmount: this.dataForEdit.discountAmount,
              discountPercentage: this.dataForEdit.discountPercentage,
              isDiscountable: this.dataForEdit.isDiscountable,
              reOrderQty: this.dataForEdit.reOrderQty,
              barcodeurl: this.dataForEdit.barcodeurl || "",
            });
            // Load raw document paths
            this.rawAttachedDocument = response.imageUrl || "";

            // Convert paths to preview-friendly objects
            this.uploadedImage = this.rawAttachedDocument
              ? {
                  name: "Document 1",
                  url: this.baseurl + this.rawAttachedDocument,
                }
              : null;

            this.rowData = this.dataForEdit.itemDetails
              .slice() // make a copy
              .reverse() // reverse the order to put latest on top
              .map((item) => ({
                ...item,
                unitName:
                  this.units.find((unit) => unit.id === item.unitId)?.name ||
                  "",
              }));
            console.log(this.itemForm.value);
            this.displayModal = true;
            this.changeDetector.detectChanges();
          },
        });
    } else {
      // Create Mode
      this.editMode = false;
      this.uploadedImage = null;
      this.rawAttachedDocument = "";
      this.itemForm.reset();
      this.rowData = [];
      this.itemForm.patchValue({
        isDiscountable: false,
        barcodeurl: "",
      });
      this.displayModal = true;
    }
  }

  save() {
    this.saving = true;

    if (!this.validatePrices()) {
      this.saving = false;
      return;
    }

    if (!this.itemForm.valid) {
      this.msgService.add({
        severity: "error",
        detail: "Please fill all Required fields",
        life: 2000,
      });
      this.saving = false;
      return;
    }
    this.rowData = [];
    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      this.rowData.unshift(node.data); // insert at beginning for reverse order
    });
    this.itemForm.patchValue({
      itemDetails: this.rowData,
    });
    if (!this.itemForm.value.discountAmount) {
      this.itemForm.patchValue({ discountAmount: 0 });
    }
    if (!this.itemForm.value.discountPercentage) {
      this.itemForm.patchValue({ discountPercentage: 0 });
    }
    if (this.itemForm.value.reOrderQty) {
      this.itemForm.patchValue({
        reOrderQty: parseFloat(this.itemForm.value.reOrderQty),
      });
    }
    this._hrmService
      .create(this.itemForm.value, this.target)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        catchError((error) => {
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: error.error?.error?.message,
            life: 2000,
          });
          return throwError(error.error.error.message);
        })
      )
      .subscribe({
        next: (response) => {
          this.msgService.add({
            severity: "success",
            summary: "Confirmed",
            detail: "SavedSuccessfully",
            life: 2000,
          });
          this.getAll();
          this.saving = false;
          this.displayModal = false;
        },
      });
  }

  update() {
    this.saving = true;

    if (!this.validatePrices()) {
      this.saving = false;
      return;
    }

    this.rowData = [];
    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      this.rowData.unshift(node.data); // insert at beginning for reverse order
    });
    this.itemForm.patchValue({
      itemDetails: this.rowData,
    });
    if (!this.itemForm.value.discountAmount) {
      this.itemForm.patchValue({ discountAmount: 0 });
    }
    if (!this.itemForm.value.discountPercentage) {
      this.itemForm.patchValue({ discountPercentage: 0 });
    }
    const updateData = {
      ...this.itemForm.value,
      id: this.dataForEdit.id,
    };
    this._hrmService
      .update(updateData, this.target)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        catchError((error) => {
          this.msgService.add({
            severity: "error",
            summary: "Error",
            detail: error.error.error.message,
            life: 2000,
          });
          return throwError(error.error.error.message);
        })
      )
      .subscribe({
        next: (response) => {
          this.msgService.add({
            severity: "success",
            summary: "Confirmed",
            detail: "UpdatedSuccessfully",
            life: 2000,
          });
          this.gridApi.refreshCells({ force: true });
          this.getAll();
          this.saving = false;
          this.displayModal = false;
        },
      });
  }

  delete(id: number) {
    this.confirmationService.confirm({
      message: "Are you sure?",
      header: "Confirmation",
      icon: "pi pi-exclamation-triangle",
      rejectButtonStyleClass: "p-button-text",
      accept: () => {
        this._hrmService
          .delete(id, this.target)
          .pipe(
            finalize(() => {}),
            catchError((error) => {
              this.msgService.add({
                severity: "error",
                summary: "Error",
                detail: error.error.error.message,
                life: 2000,
              });
              return throwError(error.error.error.message);
            })
          )
          .subscribe({
            next: (response) => {
              if (response) {
                this.msgService.add({
                  severity: "info",
                  summary: "Confirmed",
                  detail: "Deleted Successfully",
                  life: 2000,
                });
                this.getAll();
              }
            },
          });
      },
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.itemForm.get(field);
    return control ? control.invalid && control.touched : false;
  }
  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }
  onEnter(event: any) {
    const inputValue = (event.target as HTMLInputElement).value;
    this.filters.name = inputValue;
    this.getAll();
  }
  onPageChange(event: any) {
    this.filters.maxCount = event.rows;
    this.currentPage = event.page + 1;
    this.filters.skipCount = (this.currentPage - 1) * 10;
    this.getAll();
  }

  //Bulk Upload
  bulkUploadModal = false;
  bulkUploadData: any[] = [];
  uploading = false;
  previewModalVisible = false;

  openPreview() {
    this.previewModalVisible = true;
  }

  headerMap: { [key: string]: string } = {
    Name: "name",
    SKU: "sku",
    Description: "description",
    "Item Category Name": "itemCategoryName",
    "Is Discountable": "isDiscountable",
    "Discount Amount": "discountAmount",
    "Discount Percentage": "discountPercentage",
    "Unit Name": "unitName",
    "Unit Price": "unitPrice",
    Barcode: "barcode",
  };

  downloadTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template");

    const headers = Object.keys(this.headerMap);
    const row = worksheet.addRow(headers);

    row.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "C6EFCE" },
      };
      cell.font = {
        color: { argb: "000000" },
        bold: true,
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    });

    worksheet.columns = headers.map(() => ({
      width: 25,
      style: { numFmt: "@" },
    }));

    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "Items_BulkUpload_Template.xlsx");
    });
  }

  openBulkUpload() {
    this.bulkUploadModal = true;
    this.bulkUploadData = [];
  }

  onFileSelect(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop().toLowerCase();
    if (fileExtension !== "xlsx") {
      this.msgService.add({
        severity: "error",
        detail: "Only .xlsx files are allowed",
        life: 2000,
      });
      this.bulkUploadData = [];
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = e.target.result;
      try {
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsed = XLSX.utils.sheet_to_json(sheet);
        this.handleParsedData(parsed);
      } catch (err) {
        this.msgService.add({
          severity: "error",
          detail: "Error parsing file",
          life: 2000,
        });
      }
    };

    reader.readAsBinaryString(file);
  }

  handleParsedData(data: any[]) {
    if (!Array.isArray(data)) {
      this.msgService.add({
        severity: "error",
        detail: "Invalid file structure",
        life: 2000,
      });
      return;
    }

    const mappedItems = data.map((row) => {
      const mapped: any = {};
      for (const [header, key] of Object.entries(this.headerMap)) {
        mapped[key] = row[header];
      }

      return {
        name: (mapped.name || "").trim(),
        sku: (mapped.sku || "").trim(),
        description: (mapped.description || "").trim(),
        itemCategoryName: (mapped.itemCategoryName || "").trim(),
        isDiscountable:
          mapped.isDiscountable === true || mapped.isDiscountable === "TRUE",
        discountAmount: Number(mapped.discountAmount || 0),
        discountPercentage: Number(mapped.discountPercentage || 0),
        itemDetails: [
          {
            unitName: (mapped.unitName || "").trim(),
            unitPrice: Number(mapped.unitPrice || 0),
            barcode: (mapped.barcode || "").trim(),
          },
        ],
      };
    });

    const validItems = mappedItems.filter(
      (item) =>
        item.name && item.itemCategoryName && item.itemDetails[0].unitName
    );

    this.bulkUploadData = validItems;

    if (!validItems.length) {
      this.msgService.add({
        severity: "warn",
        detail: "No valid records found.",
        life: 2000,
      });
    }
  }

  submitBulkUpload() {
    if (!this.bulkUploadData.length) {
      this.msgService.add({
        severity: "warn",
        detail: "No data to upload",
        life: 2000,
      });
      return;
    }

    this.uploading = true;

    const payload = { items: this.bulkUploadData };

    this._hrmService.bulkUpload(this.target, payload).subscribe({
      next: (res) => {
        const result = res;
        if (result) {
          this.msgService.add({
            severity: result.failureCount > 0 ? "error" : "success",
            summary: "Error",
            detail: `Uploaded: ${result.successCount}, Failed: ${result.failureCount}`,
            life: 3000,
          });

          const BASE_URL = "http://192.168.10.11:8000";
          if (result.errorFilePath) {
            const fullPath = result.errorFilePath.startsWith("http")
              ? result.errorFilePath
              : `${BASE_URL}${result.errorFilePath}`;
            window.open(fullPath, "_blank");
          }
        }
        this.resetBulkUploadDialog();
      },
    });
    // .pipe(
    //   finalize(() => (this.uploading = false)),
    //   catchError((error) => {
    //     this.msgService.add({
    //       severity: "error",
    //       detail: error?.error?.message || "Upload failed",
    //       life: 2000,
    //     });
    //     return throwError(error);
    //   })
    // )
    // .subscribe({
    //   next: () => {
    //     this.msgService.add({
    //       severity: "success",
    //       detail: "Bulk Upload Successful",
    //       life: 2000,
    //     });
    //     this.resetBulkUploadDialog();
    //     this.getAll();
    //     this._hrmService.notifyCategoryUpdate();
    //   },
    // });
  }

  resetBulkUploadDialog() {
    this.bulkUploadModal = false;
    this.bulkUploadData = [];
    if (this.fileInput) {
      this.fileInput.nativeElement.value = "";
    }
  }

  //Image Upload
  previewUrl: string | null = null;
  rawAttachedDocument: string | null = null; // image paths
  uploadedImage: { name: string; url: string } | null = null; // For preview
  previewImageModal = false;
  previewImageHeader = "Preview Images";
  fileName: string = "";
  isUploadingImages: boolean = false;
  isSuccessUpload: boolean = false;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0]; // only single file
    if (!file) return;

    this.isUploadingImages = true;
    this.isSuccessUpload = false;

    this.readFileAsBase64(file)
      .then((base64String) => {
        return this._hrmService
          .uploadDocuments("Item", [base64String])
          .toPromise();
      })
      .then((res: any) => {
        debugger;
        const newPath = res?.imagePaths?.[0] || null;
        if (newPath) {
          this.rawAttachedDocument = newPath;
          this.uploadedImage = {
            name: file.name,
            url: this.baseurl + newPath,
          };
        }

        this.itemForm.patchValue({
          imageUrl: this.rawAttachedDocument,
        });

        (event.target as HTMLInputElement).value = "";
        this.changeDetector.detectChanges();
      })
      .catch(() => {
        this.msgService.add({
          severity: "error",
          summary: "Upload Failed",
          detail: "Image failed to upload.",
        });
      })
      .finally(() => {
        this.isUploadingImages = false;
        if (!this.isUploadingImages) {
          this.isSuccessUpload = true;
        }
        this.changeDetector.detectChanges();
      });
  }

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  imagePreviewModal(): void {
    if (!this.rawAttachedDocument) {
      this.msgService.add({
        severity: "warn",
        summary: "No Image",
        detail: "No image uploaded.",
      });
      return;
    }

    this.uploadedImage = {
      name: "Image 1",
      url: this.baseurl + this.rawAttachedDocument,
    };

    window.open(this.uploadedImage.url, "_blank");
  }

  resetForm() {
    this.previewImageModal = false;
    this.isSuccessUpload = false;
  }

  // Create Category Dynamic
  categoryModalVisible = false;
  newCategory: any = { name: "" };

  // Barcode Generation
  barcodeModalVisible = false;
  generatedBarcode: string = "";
  barcodePreviewUrl: string = "";
  expiryDate: Date | null = null;
  manufactureDate: Date | null = null;

  openCategoryModal() {
    this.newCategory = { name: "" }; // reset form data
    this.categoryModalVisible = true;
  }

  getItemCategories() {
    this._hrmService.getAll1("ItemCategory", this.filters).subscribe((res) => {
      console.log("+++++++++++++++++++ item categories from items", res);
      this.itemCategory = res;
    });
  }

  onCategoryCancel() {
    this.categoryModalVisible = false;
  }

  onSaveCategory(data: any) {
    this._hrmService.triggerSave(data);
    this.displayCategoryModal = false;
  }

  // // Barcode Generation Functions
  // generateBarcode() {
  //   // Generate 6-digit barcode
  //   const randomNum = Math.floor(Math.random() * 900000) + 100000; // Ensure 6 digits (100000-999999)
  //   this.generatedBarcode = randomNum.toString();
    
  //   // Generate barcode image
  //   this.generateBarcodeImage(this.generatedBarcode);
    
  //   this.msgService.add({
  //     severity: "success",
  //     summary: "Success",
  //     detail: "Barcode generated successfully!",
  //     life: 2000,
  //   });
  // }

  // generateBarcodeImage(barcodeValue: string) {
  //   setTimeout(() => {
  //     const canvas = document.getElementById("barcodeCanvas") as HTMLCanvasElement;
  //     if (canvas) {
  //       try {
  //         // Reduced size for 1" × 1" (25mm × 25mm) label
  //         // Canvas size adjusted for label dimensions
  //         canvas.width = 200;
  //         canvas.height = 40;
          
  //         JsBarcode(canvas, barcodeValue, {
  //           format: "CODE128",
  //           width: 0.8,
  //           height: 30,
  //           displayValue: true,
  //           fontSize: 6,
  //           margin: 1,
  //           textAlign: "center",
  //           textPosition: "bottom",
  //         });
  //         this.barcodePreviewUrl = canvas.toDataURL("image/png");
          
  //         // Upload the barcode image and save to barcodeurl
  //         this.uploadBarcodeImage(this.barcodePreviewUrl);
  //       } catch (error) {
  //         console.error("Barcode generation error:", error);
  //         this.msgService.add({
  //           severity: "error",
  //           summary: "Error",
  //           detail: "Failed to generate barcode image",
  //           life: 2000,
  //         });
  //       }
  //     }
  //   }, 100);
  // }

  // uploadBarcodeImage(dataUrl: string) {
  //   // Convert data URL to base64
  //   const base64String = dataUrl.split(",")[1];
    
  //   if (!base64String) {
  //     console.error("Failed to extract base64 from data URL");
  //     return;
  //   }

  //   this._hrmService
  //     .uploadDocuments("Item", [base64String])
  //     .subscribe({
  //       next: (res: any) => {
  //         const newPath = res?.imagePaths?.[0] || null;
  //         if (newPath) {
  //           // Save the uploaded barcode image path to barcodeurl field
  //           this.itemForm.patchValue({
  //             barcodeurl: newPath,
  //           });
  //           this.changeDetector.detectChanges();
  //         }
  //       },
  //       error: (error) => {
  //         console.error("Error uploading barcode image:", error);
  //         this.msgService.add({
  //           severity: "error",
  //           summary: "Upload Failed",
  //           detail: "Barcode image failed to upload.",
  //         });
  //       },
  //     });
  // }

  openBarcodeModal() {
    this.barcodeModalVisible = true;
    this.generatedBarcode = "";
    this.barcodePreviewUrl = "";
    this.expiryDate = null;
    this.manufactureDate = null;
  }


uploadBarcodeImage(dataUrl: string) {
  const base64String = dataUrl.split(",")[1];

  if (!base64String) {
    console.error("Failed to extract base64 from data URL");
    return;
  }

  this._hrmService.uploadDocuments("Item", [base64String]).subscribe({
    next: (res: any) => {
      const newPath = res?.imagePaths?.[0] || null;

      if (newPath) {
        this.itemForm.patchValue({ barcodeurl: newPath });
      }
    },
    error: (error) => {
      console.error("Error uploading barcode image:", error);
      this.msgService.add({
        severity: "error",
        summary: "Upload Failed",
        detail: "Barcode image failed to upload.",
      });
    },
  });
}



  applyBarcodeToGrid() {
    if (!this.generatedBarcode) {
      this.msgService.add({
        severity: "warn",
        summary: "Warning",
        detail: "Please generate a barcode first",
        life: 2000,
      });
      return;
    }

    const selectedNodes = this.gridApi.getSelectedNodes();
    
    if (selectedNodes.length === 0) {
      this.msgService.add({
        severity: "warn",
        summary: "Warning",
        detail: "Please select at least one row to apply the barcode",
        life: 2000,
      });
      return;
    }

    selectedNodes.forEach((node) => {
      node.data.barcode = this.generatedBarcode;
    });

    this.gridApi.refreshCells({ force: true });
    this.barcodeModalVisible = false;
    
    this.msgService.add({
      severity: "success",
      summary: "Success",
      detail: "Barcode applied to selected rows",
      life: 2000,
    });
  }

  downloadBarcodeImage() {
    if (!this.barcodePreviewUrl) {
      this.msgService.add({
        severity: "warn",
        summary: "Warning",
        detail: "Please generate a barcode first",
        life: 2000,
      });
      return;
    }

    const link = document.createElement("a");
    link.href = this.barcodePreviewUrl;
    link.download = `barcode_${this.generatedBarcode}.png`;
    link.click();
  }

@ViewChild('barcodeCanvas', { static: false }) barcodeCanvas!: ElementRef<HTMLCanvasElement>;

// Generate barcode
generateBarcode() {
  const randomNum = Math.floor(Math.random() * 900000) + 100000;

  // Wait for Angular to render canvas
  setTimeout(() => {
    this.generateBarcodeImage(randomNum.toString());
  }, 0);

  this.msgService.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Barcode generated successfully!',
    life: 2000,
  });
}

// Draw barcode and prepare preview
generateBarcodeImage(barcodeValue: string) {
  this.generatedBarcode = barcodeValue;

  if (!this.barcodeCanvas) return;

  const canvas = this.barcodeCanvas.nativeElement;

  // High-res canvas for clear printing
  canvas.width = 600;
  canvas.height = 150;

  try {
    JsBarcode(canvas, barcodeValue, {
      format: 'CODE128',
      width: 2,
      height: 80,
      displayValue: false,
      margin: 0,
    });

    // Convert to image for preview and upload
    this.barcodePreviewUrl = canvas.toDataURL('image/png');
    this.uploadBarcodeImage(this.barcodePreviewUrl);

  } catch (error) {
    console.error('Barcode generation error:', error);
    this.msgService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to generate barcode image',
      life: 2000,
    });
  }
}

// Print barcode
printBarcode() {
  if (!this.barcodePreviewUrl) {
    this.msgService.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Please generate a barcode first',
      life: 2000,
    });
    return;
  }

  const itemName = this.itemForm.value.name || 'N/A';
  const expiryDateStr = this.expiryDate ? new Date(this.expiryDate).toLocaleDateString('en-GB') : '';
  const manufactureDateStr = this.manufactureDate ? new Date(this.manufactureDate).toLocaleDateString('en-GB') : '';

  const printWindow = window.open('', '_blank');
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
            line-height: 1;
            text-transform: uppercase;
          }
          .item-name {
            font-size: 8px;
            font-weight: bold;
            text-align: center;
            line-height: 1.1;
            word-wrap: break-word;
            margin: 0.5mm 0;
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
            max-height:30px;
          }
          .barcode-number {
            font-size: 8px;
            text-align: center;
            margin-top: 0.5mm;
            line-height: 1;
          }
          .dates {
            font-size: 8px;
            font-weight: bold;
            text-align: center;
            line-height: 1;
            margin-top: 0.5mm;
          }
          .date-row {
            margin: 0.2mm 0;
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="company-name">USAMA SWEETS & BAKERS</div>
          <div class="item-name">${itemName}</div>
          <div class="barcode-container">
            <img id="barcode-img" src="${this.barcodePreviewUrl}" alt="Barcode" />
          </div>
          ${(expiryDateStr || manufactureDateStr) ? `
          <div class="dates">
            ${manufactureDateStr ? `<div class="date-row">Mfg: ${manufactureDateStr}</div>` : ''}
            ${expiryDateStr ? `<div class="date-row">Exp: ${expiryDateStr}</div>` : ''}
          </div>` : ''}
        </div>

        <script>
          const img = document.getElementById('barcode-img');
          img.onload = function() {
            window.focus();
            window.print();
          }
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}



}
