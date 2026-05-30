import { TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular/standalone';

import { ConfigApi } from '../api/config.api';
import { backendChoice, setBackend } from '../state/backend-choice.signal';
import { BackendSwitchService } from './backend-switch.service';

describe('BackendSwitchService', () => {
  let service: BackendSwitchService;
  let api: jasmine.SpyObj<ConfigApi>;
  let present: jasmine.Spy;

  beforeEach(() => {
    setBackend('dotnet');
    api = jasmine.createSpyObj<ConfigApi>('ConfigApi', ['getActive', 'setActive']);
    present = jasmine.createSpy('present').and.resolveTo();
    const toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.resolveTo({ present } as unknown as HTMLIonToastElement);

    TestBed.configureTestingModule({
      providers: [
        BackendSwitchService,
        { provide: ConfigApi, useValue: api },
        { provide: ToastController, useValue: toastCtrl },
      ],
    });
    service = TestBed.inject(BackendSwitchService);
  });

  afterEach(() => setBackend('dotnet'));

  it('sync() aligns the local signal with the gateway active backend', async () => {
    api.getActive.and.resolveTo({ active: 'node', available: ['dotnet', 'node'] });

    await service.sync();

    expect(backendChoice()).toBe('node');
  });

  it('sync() keeps the local value if the gateway is unreachable', async () => {
    api.getActive.and.rejectWith(new Error('down'));

    await service.sync();

    expect(backendChoice()).toBe('dotnet');
  });

  it('toggle() POSTs the opposite backend, updates the signal and toasts', async () => {
    api.setActive.and.resolveTo({ active: 'node', available: ['dotnet', 'node'] });

    await service.toggle();

    expect(api.setActive).toHaveBeenCalledWith('node');
    expect(backendChoice()).toBe('node');
    expect(present).toHaveBeenCalled();
  });

  it('switchTo() leaves the signal unchanged and warns on error', async () => {
    api.setActive.and.rejectWith(new Error('boom'));

    await service.switchTo('node');

    expect(backendChoice()).toBe('dotnet');
    expect(present).toHaveBeenCalled();
  });

  it('switchTo() no-ops when already on the requested backend', async () => {
    await service.switchTo('dotnet');

    expect(api.setActive).not.toHaveBeenCalled();
  });
});
