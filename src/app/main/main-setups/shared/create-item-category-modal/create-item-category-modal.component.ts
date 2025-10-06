import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: "app-create-item-category-modal",
  templateUrl: "./create-item-category-modal.component.html",
  styleUrl: "./create-item-category-modal.component.css",
})
export class CreateItemCategoryModalComponent {
  @Input() title: string = "";
  @Input() visible: boolean = false;
  @Input() mode: "create" | "edit" | "view" = "create";
  @Input() data: any = {};
  @Input() editMode: boolean;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<any>();
  @Output() update = new EventEmitter<any>();
  @Output() updateView = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  onSave() {
    this.save.emit(this.data);
    this.visibleChange.emit(false);
  }

  onUpdate() {
    this.update.emit(this.data);
    this.visibleChange.emit(false);
  }

  onCancel() {
    this.cancel.emit();
    this.visibleChange.emit(false);
  }
}
