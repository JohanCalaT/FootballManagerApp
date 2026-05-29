import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { SplashComponent } from './splash.component';

describe('SplashComponent', () => {
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplashComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  it('redirects to /players after the splash delay', fakeAsync(() => {
    const fixture = TestBed.createComponent(SplashComponent);
    fixture.detectChanges(); // ngOnInit schedules the timeout

    expect(navigate).not.toHaveBeenCalled();
    tick(3000);

    expect(navigate).toHaveBeenCalledWith(['/players'], { replaceUrl: true });
  }));
});
