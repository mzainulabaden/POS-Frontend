import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DemandBookComponent } from './demand-book.component';

describe('DemandBookComponent', () => {
  let component: DemandBookComponent;
  let fixture: ComponentFixture<DemandBookComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DemandBookComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DemandBookComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
