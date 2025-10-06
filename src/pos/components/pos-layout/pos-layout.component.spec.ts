import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosLayoutComponent } from './pos-layout.component';

describe('PosLayoutComponent', () => {
  let component: PosLayoutComponent;
  let fixture: ComponentFixture<PosLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PosLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
