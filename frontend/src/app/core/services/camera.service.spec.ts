import { TestBed } from '@angular/core/testing';

import { CameraService } from './camera.service';

describe('CameraService', () => {
  let service: CameraService;
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [CameraService] });
    service = TestBed.inject(CameraService);
    originalCreateElement = document.createElement.bind(document);
  });

  /** Spy createElement so we control the <input> the service builds. */
  function stubInput(input: Record<string, unknown>): void {
    spyOn(document, 'createElement').and.callFake(((tag: string) => {
      if (tag === 'input') return input as unknown as HTMLElement;
      return originalCreateElement(tag);
    }) as typeof document.createElement);
  }

  it('resolves with the picked file on change', async () => {
    const file = new File(['x'], 'p.png', { type: 'image/png' });
    stubInput({
      type: '',
      accept: '',
      files: [file] as unknown as FileList,
      setAttribute: jasmine.createSpy(),
      addEventListener(event: string, handler: () => void) {
        if (event === 'change') queueMicrotask(handler);
      },
      click: jasmine.createSpy(),
    });

    const result = await service.pickFromFile({ accept: 'image/*' });
    expect(result).toBe(file);
  });

  it('passes the capture hint to the input element', async () => {
    const setAttribute = jasmine.createSpy('setAttribute');
    stubInput({
      type: '',
      accept: '',
      files: { 0: new File([''], 'p.png'), length: 1 } as unknown as FileList,
      setAttribute,
      addEventListener(event: string, handler: () => void) {
        if (event === 'change') queueMicrotask(handler);
      },
      click: jasmine.createSpy(),
    });

    await service.pickFromFile({ capture: 'environment' });
    expect(setAttribute).toHaveBeenCalledWith('capture', 'environment');
  });
});
