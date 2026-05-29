import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular/standalone';

import { Noticia } from '../../core/models/news.model';
import { clearSession, setSession } from '../../core/state/auth.signal';
import { NewsPage } from './news.page';
import { NewsStore } from './news.store';

function noticia(id: string): Noticia {
  return {
    id,
    titulo: `T-${id}`,
    contenido: 'c',
    autor: 'admin',
    fechaPub: '2026-01-01T00:00:00Z',
  };
}

describe('NewsPage', () => {
  let fixture: ComponentFixture<NewsPage>;
  let store: {
    news: ReturnType<typeof signal<Noticia[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<string | null>>;
    live: ReturnType<typeof signal<boolean>>;
    isInitialLoad: ReturnType<typeof signal<boolean>>;
    isEmpty: ReturnType<typeof signal<boolean>>;
    connect: jasmine.Spy;
    disconnect: jasmine.Spy;
    remove: jasmine.Spy;
  };

  beforeEach(async () => {
    clearSession();
    store = {
      news: signal<Noticia[]>([]),
      loading: signal(false),
      error: signal<string | null>(null),
      live: signal(false),
      isInitialLoad: signal(false),
      isEmpty: signal(false),
      connect: jasmine.createSpy('connect').and.resolveTo(),
      disconnect: jasmine.createSpy('disconnect'),
      remove: jasmine.createSpy('remove').and.resolveTo(),
    };

    await TestBed.configureTestingModule({
      imports: [NewsPage],
      providers: [
        provideRouter([]),
        {
          provide: ToastController,
          useValue: jasmine.createSpyObj('ToastController', ['create']),
        },
        {
          provide: AlertController,
          useValue: jasmine.createSpyObj('AlertController', ['create']),
        },
      ],
    })
      .overrideComponent(NewsPage, {
        set: { providers: [{ provide: NewsStore, useValue: store }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(NewsPage);
  });

  afterEach(() => clearSession());

  it('connects to the store on init', () => {
    fixture.detectChanges();
    expect(store.connect).toHaveBeenCalled();
  });

  it('shows the empty state when there are no noticias', () => {
    store.isEmpty.set(true);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid=news-empty]'),
    ).toBeTruthy();
  });

  it('renders one card per noticia', () => {
    store.news.set([noticia('1'), noticia('2')]);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('[data-testid=news-card]');
    expect(cards.length).toBe(2);
  });

  it('hides the publish FAB for non-admins and shows it for admins', () => {
    store.news.set([noticia('1')]);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid=news-publish-fab]'),
    ).toBeFalsy();

    setSession({ uid: 'a', email: 'a@b.com', displayName: 'A', role: 'admin' }, 'tok');
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid=news-publish-fab]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid=news-delete-button]'),
    ).toBeTruthy();
  });
});
