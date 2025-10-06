import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatePaymentTermsModalComponent } from './create-payment-terms-modal.component';

describe('CreatePaymentTermsModalComponent', () => {
  let component: CreatePaymentTermsModalComponent;
  let fixture: ComponentFixture<CreatePaymentTermsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreatePaymentTermsModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatePaymentTermsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
