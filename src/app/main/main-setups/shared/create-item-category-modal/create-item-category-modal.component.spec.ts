import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateItemCategoryModalComponent } from './create-item-category-modal.component';

describe('CreateItemCategoryModalComponent', () => {
  let component: CreateItemCategoryModalComponent;
  let fixture: ComponentFixture<CreateItemCategoryModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateItemCategoryModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateItemCategoryModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
