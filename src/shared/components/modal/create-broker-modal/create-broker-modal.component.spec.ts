import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateBrokerModalComponent } from './create-broker-modal.component';

describe('CreateBrokerModalComponent', () => {
  let component: CreateBrokerModalComponent;
  let fixture: ComponentFixture<CreateBrokerModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateBrokerModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateBrokerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
