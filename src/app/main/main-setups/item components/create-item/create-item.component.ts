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
  baseurl: string = "http://173.249.23.108:6063";
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
      discountAmount: [0],
      discountPercentage: [0],
      itemCategoryId: [""],
      salesCOALevel04Id: [""],
      purchaseCOALevel04Id: [""],
      isDiscountable: [""],
      reOrderQty: [0],
      itemDetails: [[]],
      imageUrl: "",
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
      headerName: "Unit Price Per KG",
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
    {
      headerName: "Min Price (KG)",
      field: "minSalePrice",
      editable: true,
      resizable: true,
      width: 210,
      cellClass: "ag-styling-cell",
      headerClass: "ag-header-name",
    },
    {
      headerName: "Max Price (KG)",
      field: "maxSalePrice",
      editable: true,
      resizable: true,
      width: 210,
      cellClass: "ag-styling-cell",
      headerClass: "ag-header-name",
    },
    {
      headerName: "Stock level",
      field: "minStockLevel",
      editable: true,
      resizable: true,
      width: 210,
      cellClass: "ag-styling-cell",
      headerClass: "ag-header-name",
    },
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
              itemCategoryId: this.dataForEdit.itemCategoryId,
              salesCOALevel04Id: this.dataForEdit.salesCOALevel04Id,
              purchaseCOALevel04Id: this.dataForEdit.purchaseCOALevel04Id,
              discountAmount: this.dataForEdit.discountAmount,
              discountPercentage: this.dataForEdit.discountPercentage,
              isDiscountable: this.dataForEdit.isDiscountable,
              reOrderQty: this.dataForEdit.reOrderQty,
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
    Description: "description",
    "Item Category Name": "itemCategoryName",
    "Is Discountable": "isDiscountable",
    "Discount Amount": "discountAmount",
    "Discount Percentage": "discountPercentage",
    "Sales COA Level 4 Name": "salesCOALevel04Name",
    "Purchase COA Level 4 Name": "purchaseCOALevel04Name",
    "Unit Name": "unitName",
    "Unit Price": "unitPrice",
    "Min Sale Price": "minSalePrice",
    "Max Sale Price": "maxSalePrice",
    "Min Stock Level": "minStockLevel",
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
        description: (mapped.description || "").trim(),
        itemCategoryName: (mapped.itemCategoryName || "").trim(),
        isDiscountable:
          mapped.isDiscountable === true || mapped.isDiscountable === "TRUE",
        discountAmount: Number(mapped.discountAmount || 0),
        discountPercentage: Number(mapped.discountPercentage || 0),
        salesCOALevel04Name: (mapped.salesCOALevel04Name || "").trim(),
        purchaseCOALevel04Name: (mapped.purchaseCOALevel04Name || "").trim(),
        itemDetails: [
          {
            unitName: (mapped.unitName || "").trim(),
            unitPrice: Number(mapped.unitPrice || 0),
            minSalePrice: Number(mapped.minSalePrice || 0),
            maxSalePrice: Number(mapped.maxSalePrice || 0),
            minStockLevel: Number(mapped.minStockLevel || 0),
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

          const BASE_URL = "http://173.249.23.108:6063";
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
}
