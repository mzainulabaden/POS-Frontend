import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosItemsComponent } from './pos-items.component';

describe('PosItemsComponent', () => {
  let component: PosItemsComponent;
  let fixture: ComponentFixture<PosItemsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PosItemsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
