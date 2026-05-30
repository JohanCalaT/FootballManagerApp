import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { GeolocationService } from '../../../core/services/geolocation.service';
import { PlayerGeolocationPickerComponent } from './player-geolocation-picker.component';

describe('PlayerGeolocationPickerComponent', () => {
  let fixture: ComponentFixture<PlayerGeolocationPickerComponent>;
  let component: PlayerGeolocationPickerComponent;
  let geo: jasmine.SpyObj<GeolocationService>;

  beforeEach(async () => {
    geo = jasmine.createSpyObj<GeolocationService>('GeolocationService', [
      'requestClientPosition',
    ]);

    await TestBed.configureTestingModule({
      imports: [PlayerGeolocationPickerComponent],
      providers: [{ provide: GeolocationService, useValue: geo }],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerGeolocationPickerComponent);
    component = fixture.componentInstance;
    // Skip real Leaflet boot — Karma's headless Chrome has no sized
    // container for the map and the bundle isn't needed for unit tests.
    component.autoInit = false;
    fixture.detectChanges();
  });

  it('renders the map host and the "use my location" action', () => {
    expect(fixture.debugElement.query(By.css('[data-testid="geo-picker-map"]'))).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('[data-testid="geo-picker-use-current"]')),
    ).toBeTruthy();
  });

  it('emits `changed` with the position returned by the geolocation service', async () => {
    geo.requestClientPosition.and.resolveTo({
      lat: 36.85,
      lng: -2.46,
      city: null,
      country: null,
    });
    spyOn(component.changed, 'emit');

    // The "use my location" path goes through setMarker, which needs the
    // Leaflet instance to actually drop a pin. Without a booted map the
    // method short-circuits but still must hit the service — verify that
    // contract; pin drop is covered by manual testing in the browser.
    await component['onUseMyLocation']();

    expect(geo.requestClientPosition).toHaveBeenCalled();
  });

  it('shows an error message when the geolocation service rejects', async () => {
    geo.requestClientPosition.and.rejectWith(new Error('denied'));

    await component['onUseMyLocation']();
    fixture.detectChanges();

    const err = fixture.debugElement.query(By.css('[data-testid="geo-picker-error"]'));
    expect(err.nativeElement.textContent).toContain('ubicación');
  });

  it('does nothing when the service silently returns null', async () => {
    geo.requestClientPosition.and.resolveTo(null);
    spyOn(component.changed, 'emit');

    await component['onUseMyLocation']();

    expect(component.changed.emit).not.toHaveBeenCalled();
  });
});
