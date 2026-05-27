import { TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular/standalone';

import { ComingSoonService } from './coming-soon.service';

describe('ComingSoonService', () => {
  let service: ComingSoonService;
  let toastCtrl: jasmine.SpyObj<ToastController>;
  let toast: { present: jasmine.Spy };

  beforeEach(() => {
    toast = { present: jasmine.createSpy('present').and.resolveTo() };
    toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.resolveTo(toast as unknown as HTMLIonToastElement);

    TestBed.configureTestingModule({
      providers: [
        ComingSoonService,
        { provide: ToastController, useValue: toastCtrl },
      ],
    });

    service = TestBed.inject(ComingSoonService);
  });

  it('creates a toast with the feature name and design-system class', async () => {
    await service.notify('Detalle de jugador');

    expect(toastCtrl.create).toHaveBeenCalledTimes(1);
    const options = toastCtrl.create.calls.mostRecent().args[0];
    expect(options?.message).toBe('Detalle de jugador — en desarrollo');
    expect(options?.cssClass).toBe('fma-toast');
    expect(options?.position).toBe('bottom');
  });

  it('presents the toast it created', async () => {
    await service.notify('X');
    expect(toast.present).toHaveBeenCalled();
  });
});
