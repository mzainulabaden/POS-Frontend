import { CommonModule } from "@angular/common";
import { NgModule, ModuleWithProviders } from "@angular/core";
import { RouterModule } from "@angular/router";
import { NgxPaginationModule } from "ngx-pagination";
import { AppSessionService } from "./session/app-session.service";
import { AppUrlService } from "./nav/app-url.service";
import { AppAuthService } from "./auth/app-auth.service";
import { AppRouteGuard } from "./auth/auth-route-guard";
import { LocalizePipe } from "@shared/pipes/localize.pipe";
import { FileUploadModule } from "primeng/fileupload";
import { MessageService } from "primeng/api";
import { ConfirmationService } from "primeng/api";
import { BadgeModule } from "primeng/badge";
import { AbpPaginationControlsComponent } from "./components/pagination/abp-pagination-controls.component";
import { AbpValidationSummaryComponent } from "./components/validation/abp-validation.summary.component";
import { AbpModalHeaderComponent } from "./components/modal/abp-modal-header.component";
import { AbpModalFooterComponent } from "./components/modal/abp-modal-footer.component";
import { LayoutStoreService } from "./layout/layout-store.service";
import { BusyDirective } from "./directives/busy.directive";
import { EqualValidator } from "./directives/equal-validator.directive";
import { ModalModule } from "ngx-bootstrap/modal";
import { BsDropdownModule } from "ngx-bootstrap/dropdown";
import { CollapseModule } from "ngx-bootstrap/collapse";
import { TabsModule } from "ngx-bootstrap/tabs";
import { TableModule } from "primeng/table";
import { AutoCompleteModule } from "primeng/autocomplete";
import { InputMaskModule } from "primeng/inputmask";
import { ProgressBarModule } from "primeng/progressbar";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { PaginatorModule } from "primeng/paginator";
import { DropdownModule } from "primeng/dropdown";
import { ToolbarModule } from "primeng/toolbar";
import { InputTextModule } from "primeng/inputtext";
import { CalendarModule } from "primeng/calendar";
import { CheckboxModule } from "primeng/checkbox";
import { InputNumberModule } from "primeng/inputnumber";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { ToastModule } from "primeng/toast";
import { TabViewModule } from "primeng/tabview";
import { MenuModule } from "primeng/menu";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MultiSelectModule } from "primeng/multiselect";
import { AgGridModule } from "ag-grid-angular";
import { CreateBrokerModalComponent } from "./components/modal/create-broker-modal/create-broker-modal.component";
import { CreateVendorModalComponent } from "@shared/components/modal/create-vendor-modal/create-vendor-modal.component";
import { AccordionModule } from "primeng/accordion";
@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    AgGridModule,
    NgxPaginationModule,
    FormsModule,
    InputNumberModule,
    ModalModule,
    InputMaskModule,
    BsDropdownModule,
    MultiSelectModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    ToolbarModule,
    InputTextModule,
    CalendarModule,
    FileUploadModule,
    CheckboxModule,
    ConfirmDialogModule,
    ToastModule,
    ReactiveFormsModule,
    TabViewModule,
    CollapseModule,
    TabsModule,
    TableModule,
    MenuModule,
    PaginatorModule,
    ProgressBarModule,
    AutoCompleteModule,
    BadgeModule,
    AccordionModule,
  ],
  declarations: [
    AbpPaginationControlsComponent,
    AbpValidationSummaryComponent,
    AbpModalHeaderComponent,
    AbpModalFooterComponent,
    LocalizePipe,
    BusyDirective,
    EqualValidator,
    CreateBrokerModalComponent,
    CreateVendorModalComponent,
  ],
  exports: [
    AbpPaginationControlsComponent,
    AbpValidationSummaryComponent,
    AbpModalHeaderComponent,
    AbpModalFooterComponent,
    LocalizePipe,
    BusyDirective,
    EqualValidator,
    InputNumberModule,
    FormsModule,
    AgGridModule,
    BadgeModule,
    NgxPaginationModule,
    ModalModule,
    BsDropdownModule,
    CollapseModule,
    TabsModule,
    TableModule,
    ReactiveFormsModule,
    InputMaskModule,
    PaginatorModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    ToolbarModule,
    MultiSelectModule,
    InputTextModule,
    CalendarModule,
    CheckboxModule,
    ConfirmDialogModule,
    ToastModule,
    TabViewModule,
    MenuModule,
    FileUploadModule,
    PaginatorModule,
    ProgressBarModule,
    AutoCompleteModule,
    CreateBrokerModalComponent,
    CreateVendorModalComponent,
    AccordionModule,
  ],
  providers: [MessageService, ConfirmationService],
})
export class SharedModule {
  static forRoot(): ModuleWithProviders<SharedModule> {
    return {
      ngModule: SharedModule,
      providers: [
        AppSessionService,
        AppUrlService,
        AppAuthService,
        AppRouteGuard,
        LayoutStoreService,
      ],
    };
  }
}
