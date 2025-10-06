import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductSearchEditorComponent } from './product-search-editor.component';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';

@NgModule({
  declarations: [
    ProductSearchEditorComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule     // 👈 required for <p-dropdown>
  ],
  exports: [
    ProductSearchEditorComponent
  ]
})
export class SearchComponentModule {} // or the actual module name
