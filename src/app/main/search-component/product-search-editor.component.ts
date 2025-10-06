import { Component, ViewChild, AfterViewInit } from "@angular/core";
import { ICellEditorAngularComp } from "ag-grid-angular";
import { Dropdown } from "primeng/dropdown";

@Component({
  selector: "app-product-search-editor",
  templateUrl: "./product-search-editor.component.html",
  styles: [":host { display:block; width:100%; }"],
})
export class ProductSearchEditorComponent
  implements ICellEditorAngularComp, AfterViewInit
{
  /** PrimeNG dropdown instance */
  @ViewChild("dropdownRef", { static: true }) dropdown!: Dropdown;

  /** Required by AG Grid */
  value: any;
  params: any;
  options: Array<{ id: number; name: string }> = [];

  // ────────────────────────────────────────────────────────────────────────────────
  // AG Grid lifecycle
  // ────────────────────────────────────────────────────────────────────────────────
  agInit(params: any): void {
    this.params = params;
    this.options = params.valuesRaw || []; // full product list [{id,name}]
    this.value = params.value; // current productId
  }

  /** Tell AG Grid what value to put in the cell */
  getValue(): any {
    return this.value;
  }

  /** Auto-open dropdown after the GUI is attached */
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.dropdown.show(); // open panel

      const input = this.dropdown?.el?.nativeElement?.querySelector("input");
      if (input) {
        input.focus();
      }
    });
  }

  /** On every change, commit immediately and close editor */
  onChange(): void {
    this.params.api.stopEditing(); // closes the editor + commits value
  }

  /** Treat as popup so dropdown can overflow the cell */
  isPopup(): boolean {
    return true;
  }
}
