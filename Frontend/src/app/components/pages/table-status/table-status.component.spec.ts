import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableStatusComponent } from './table-status.component';

describe('TableStatusComponent', () => {
  let component: TableStatusComponent;
  let fixture: ComponentFixture<TableStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TableStatusComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
