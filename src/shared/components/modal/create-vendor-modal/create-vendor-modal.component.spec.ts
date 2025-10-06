import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateVendorModalComponent } from './create-vendor-modal.component';

describe('CreateVendorModalComponent', () => {
  let component: CreateVendorModalComponent;
  let fixture: ComponentFixture<CreateVendorModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateVendorModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateVendorModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
