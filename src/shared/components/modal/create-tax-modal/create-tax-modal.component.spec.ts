import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateTaxModalComponent } from './create-tax-modal.component';

describe('CreateTaxModalComponent', () => {
  let component: CreateTaxModalComponent;
  let fixture: ComponentFixture<CreateTaxModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateTaxModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateTaxModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
