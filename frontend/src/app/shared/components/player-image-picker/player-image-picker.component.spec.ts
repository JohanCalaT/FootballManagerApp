import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { CameraService } from '../../../core/services/camera.service';
import { PlayerImageFactory } from '../../../core/services/strategies/image/player-image.factory';
import {
  ImageSourceError,
  PlayerImageResult,
} from '../../../core/services/strategies/image/player-image-source';
import { PlayerImagePickerComponent } from './player-image-picker.component';

describe('PlayerImagePickerComponent', () => {
  let fixture: ComponentFixture<PlayerImagePickerComponent>;
  let component: PlayerImagePickerComponent;
  let camera: jasmine.SpyObj<CameraService>;
  let factory: jasmine.SpyObj<PlayerImageFactory>;

  const sample = (overrides: Partial<PlayerImageResult> = {}): PlayerImageResult => ({
    url: 'https://example.com/x.png',
    imageSource: 'url',
    ...overrides,
  });

  beforeEach(async () => {
    camera = jasmine.createSpyObj<CameraService>('CameraService', [
      'pickFromFile',
      'pickFromCamera',
      'pickFromGallery',
    ]);
    factory = jasmine.createSpyObj<PlayerImageFactory>('PlayerImageFactory', [
      'create',
      'provide',
    ]);

    await TestBed.configureTestingModule({
      imports: [PlayerImagePickerComponent],
      providers: [
        { provide: CameraService, useValue: camera },
        { provide: PlayerImageFactory, useValue: factory },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerImagePickerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('ownerUid', 'u1');

    // Stub URL.createObjectURL — JSDOM/Karma sometimes lacks a Blob URL impl
    // and we want a stable value to assert on.
    spyOn(URL, 'createObjectURL').and.returnValue('blob:fake');
    spyOn(URL, 'revokeObjectURL').and.stub();

    fixture.detectChanges();
  });

  it('renders the empty placeholder when no initial and no draft', () => {
    expect(fixture.debugElement.query(By.css('[data-testid="picker-placeholder"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="picker-preview-img"]'))).toBeNull();
  });

  it('renders the initial image with the source badge when in edit mode', () => {
    fixture.componentRef.setInput(
      'initial',
      sample({ imageSource: 'api', url: 'https://media.api-sports.io/p.png' }),
    );
    fixture.detectChanges();

    const img = fixture.debugElement.query(By.css('[data-testid="picker-preview-img"]'));
    const badge = fixture.debugElement.query(By.css('[data-testid="picker-source-badge"]'));
    expect(img.nativeElement.getAttribute('src')).toBe('https://media.api-sports.io/p.png');
    expect(badge.nativeElement.textContent.trim()).toBe('Foto de API-Football');
  });

  it('opens the camera via Capacitor and shows a blob preview', async () => {
    const file = new File(['x'], 'p.png', { type: 'image/png' });
    camera.pickFromCamera.and.resolveTo(file);

    const btn = fixture.debugElement.query(By.css('[data-testid="picker-take-photo"]'));
    btn.triggerEventHandler('click');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(camera.pickFromCamera).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    const img = fixture.debugElement.query(By.css('[data-testid="picker-preview-img"]'));
    expect(img.nativeElement.getAttribute('src')).toBe('blob:fake');
    expect(component.hasChanges()).toBeTrue();
  });

  it('also accepts a photo from the gallery', async () => {
    const file = new File(['x'], 'g.png', { type: 'image/png' });
    camera.pickFromGallery.and.resolveTo(file);

    fixture.debugElement
      .query(By.css('[data-testid="picker-pick-gallery"]'))
      .triggerEventHandler('click');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(camera.pickFromGallery).toHaveBeenCalledTimes(1);
    expect(component.hasChanges()).toBeTrue();
  });

  it('commit() dispatches the firebase strategy with the picked file and ownerUid', async () => {
    const file = new File(['x'], 'p.png', { type: 'image/png' });
    camera.pickFromCamera.and.resolveTo(file);
    factory.provide.and.resolveTo(
      sample({ imageSource: 'firebase', url: 'https://fbs/x.png', storagePath: 'players/u1/1.png' }),
    );

    fixture.debugElement
      .query(By.css('[data-testid="picker-take-photo"]'))
      .triggerEventHandler('click');
    await fixture.whenStable();

    const result = await component.commit();

    expect(factory.provide).toHaveBeenCalledOnceWith({
      kind: 'firebase',
      file,
      ownerUid: 'u1',
    });
    expect(result?.imageSource).toBe('firebase');
    expect(result?.storagePath).toBe('players/u1/1.png');
  });

  it('commit() dispatches the url strategy after the user types a URL', async () => {
    factory.provide.and.resolveTo(sample({ imageSource: 'url', url: 'https://x.com/y.jpg' }));

    component['onModeChange']({ detail: { value: 'url' } } as Parameters<
      typeof component['onModeChange']
    >[0]);
    component['onUrlInput']({ detail: { value: '  https://x.com/y.jpg  ' } } as Parameters<
      typeof component['onUrlInput']
    >[0]);
    fixture.detectChanges();

    const result = await component.commit();

    expect(factory.provide).toHaveBeenCalledOnceWith({
      kind: 'url',
      url: 'https://x.com/y.jpg',
    });
    expect(result?.url).toBe('https://x.com/y.jpg');
  });

  it('commit() returns the initial untouched when nothing was changed', async () => {
    const initial = sample({ imageSource: 'api', url: 'https://media.api-sports.io/p.png' });
    fixture.componentRef.setInput('initial', initial);
    fixture.detectChanges();

    const result = await component.commit();

    expect(result).toBe(initial);
    expect(factory.provide).not.toHaveBeenCalled();
  });

  it('commit() returns null after clear and emits cleared', async () => {
    fixture.componentRef.setInput('initial', sample());
    fixture.detectChanges();

    spyOn(component.cleared, 'emit');
    component['onClear']();
    fixture.detectChanges();

    expect(component.cleared.emit).toHaveBeenCalled();
    expect(component.hasChanges()).toBeTrue();
    const result = await component.commit();
    expect(result).toBeNull();
    expect(factory.provide).not.toHaveBeenCalled();
  });

  it('surfaces ImageSourceError message in the error signal and re-throws', async () => {
    factory.provide.and.rejectWith(new ImageSourceError('url', 'La URL debe usar HTTPS.'));
    component['onModeChange']({ detail: { value: 'url' } } as Parameters<
      typeof component['onModeChange']
    >[0]);
    component['onUrlInput']({ detail: { value: 'http://nope.com/x' } } as Parameters<
      typeof component['onUrlInput']
    >[0]);
    fixture.detectChanges();

    await expectAsync(component.commit()).toBeRejectedWithError(
      ImageSourceError,
      /https/i,
    );
    fixture.detectChanges();

    const err = fixture.debugElement.query(By.css('[data-testid="picker-error"]'));
    expect(err.nativeElement.textContent).toContain('HTTPS');
  });
});
