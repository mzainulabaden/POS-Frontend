import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosCartSidebarComponent } from './pos-cart-sidebar.component';

describe('PosCartSidebarComponent', () => {
  let component: PosCartSidebarComponent;
  let fixture: ComponentFixture<PosCartSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PosCartSidebarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosCartSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
