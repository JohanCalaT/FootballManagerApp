import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';

import { NewsApi } from '../../core/api/news.api';
import { NewsEnvelope, Noticia } from '../../core/models/news.model';
import { CameraService } from '../../core/services/camera.service';
import { FirebaseStorageService } from '../../core/services/firebase-storage.service';
import { PlayerImageFactory } from '../../core/services/strategies/image/player-image.factory';
import { setSession } from '../../core/state/auth.signal';
import { NewsPublishPage } from './news-publish.page';

function envelope(data: Noticia): NewsEnvelope<Noticia> {
  return { status: 'success', message: 'Creado', data };
}

describe('NewsPublishPage', () => {
  let fixture: ComponentFixture<NewsPublishPage>;
  let page: NewsPublishPage;
  let api: jasmine.SpyObj<NewsApi>;
  let router: Router;

  beforeEach(async () => {
    api = jasmine.createSpyObj<NewsApi>('NewsApi', ['publish']);

    const toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.resolveTo({
      present: jasmine.createSpy('present').and.resolveTo(),
    } as unknown as HTMLIonToastElement);

    setSession({ uid: 'u1', email: 'u@x.com', displayName: 'Admin', role: 'admin' }, 'tok');

    await TestBed.configureTestingModule({
      imports: [NewsPublishPage],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: NewsApi, useValue: api },
        { provide: ToastController, useValue: toastCtrl },
        {
          provide: PlayerImageFactory,
          useValue: jasmine.createSpyObj('PlayerImageFactory', ['create', 'provide']),
        },
        {
          provide: CameraService,
          useValue: jasmine.createSpyObj('CameraService', ['pickFromFile', 'pickFromCamera']),
        },
        {
          provide: FirebaseStorageService,
          useValue: jasmine.createSpyObj('FirebaseStorageService', ['upload', 'delete']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsPublishPage);
    page = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges();
  });

  it('prefills the author from the signed-in user', () => {
    expect(page['form'].controls.autor.value).toBe('Admin');
  });

  it('does not publish when the form is invalid', async () => {
    await page.onSubmit();
    expect(api.publish).not.toHaveBeenCalled();
  });

  it('publishes and navigates to /news on success', async () => {
    api.publish.and.resolveTo(
      envelope({
        id: '1',
        titulo: 'Gol 800',
        contenido: 'Texto',
        autor: 'Admin',
        fechaPub: '2026-01-01T00:00:00Z',
      }),
    );

    page['form'].controls.titulo.setValue('Gol 800');
    page['form'].controls.contenido.setValue('Texto');

    await page.onSubmit();

    expect(api.publish).toHaveBeenCalledWith({
      titulo: 'Gol 800',
      contenido: 'Texto',
      autor: 'Admin',
      imagenUrl: undefined,
    });
    expect(router.navigate).toHaveBeenCalledWith(['/news']);
  });
});
