import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertController, ToastController } from '@ionic/angular/standalone';

import { NewsApi } from '../../core/api/news.api';
import { EstadoServicio, NewsEnvelope } from '../../core/models/news.model';
import { NewsAdminPage } from './news-admin.page';

function estado(over: Partial<EstadoServicio> = {}): NewsEnvelope<EstadoServicio> {
  return {
    status: 'success',
    message: 'OK',
    data: {
      totalNoticias: 7,
      limiteMaximo: 50,
      fechaUltimoReset: '2026-01-01T00:00:00Z',
      ...over,
    },
  };
}

describe('NewsAdminPage', () => {
  let fixture: ComponentFixture<NewsAdminPage>;
  let page: NewsAdminPage;
  let api: jasmine.SpyObj<NewsApi>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<NewsApi>('NewsApi', ['status', 'reset', 'setMaxSize']);
    api.status.and.resolveTo(estado());

    const toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.resolveTo({
      present: jasmine.createSpy('present').and.resolveTo(),
    } as unknown as HTMLIonToastElement);

    await TestBed.configureTestingModule({
      imports: [NewsAdminPage],
      providers: [
        { provide: NewsApi, useValue: api },
        { provide: ToastController, useValue: toastCtrl },
        {
          provide: AlertController,
          useValue: jasmine.createSpyObj('AlertController', ['create']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsAdminPage);
    page = fixture.componentInstance;
  });

  it('loads the repository status on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(api.status).toHaveBeenCalled();
    expect(page['estado']()?.totalNoticias).toBe(7);
    expect(page['form'].controls.limite.value).toBe(50);
  });

  it('rejects an out-of-range limit without calling the api', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    page['form'].controls.limite.setValue(0);
    await page['onSaveLimit']();

    expect(api.setMaxSize).not.toHaveBeenCalled();
  });

  it('saves a valid limit and updates the estado', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    api.setMaxSize.and.resolveTo(estado({ limiteMaximo: 100 }));

    page['form'].controls.limite.setValue(100);
    await page['onSaveLimit']();

    expect(api.setMaxSize).toHaveBeenCalledWith(100);
    expect(page['estado']()?.limiteMaximo).toBe(100);
  });
});
