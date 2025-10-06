import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateWarehouseModalComponent } from './create-warehouse-modal.component';

describe('CreateWarehouseModalComponent', () => {
  let component: CreateWarehouseModalComponent;
  let fixture: ComponentFixture<CreateWarehouseModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateWarehouseModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateWarehouseModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
