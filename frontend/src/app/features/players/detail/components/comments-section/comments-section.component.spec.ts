import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertController, ToastController } from '@ionic/angular/standalone';

import { CommentsApi } from '../../../../../core/api/comments.api';
import { GeolocationService } from '../../../../../core/services/geolocation.service';
import { ApiResponse } from '../../../../../core/models/api-response.model';
import { Comment } from '../../../../../core/models/comment.model';
import { clearSession, setSession } from '../../../../../core/state/auth.signal';

import { CommentsSectionComponent } from './comments-section.component';

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'c1',
    playerId: 'p1',
    author: 'Alice',
    text: 'Buen partido!',
    rating: 4,
    createdAt: '2026-05-01T10:00:00Z',
    createdByUserId: 'u1',
    clientGeolocation: null,
    ...overrides,
  };
}

describe('CommentsSectionComponent', () => {
  let fixture: ComponentFixture<CommentsSectionComponent>;
  let component: CommentsSectionComponent;
  let api: jasmine.SpyObj<CommentsApi>;
  let toastCtrl: jasmine.SpyObj<ToastController>;
  let alertCtrl: jasmine.SpyObj<AlertController>;

  async function build(seed: Comment[]): Promise<void> {
    api = jasmine.createSpyObj<CommentsApi>('CommentsApi', ['byPlayer', 'create', 'delete']);
    api.byPlayer.and.resolveTo({ status: 200, message: 'OK', data: seed, _links: {} } as ApiResponse<Comment[]>);

    toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.resolveTo({
      present: jasmine.createSpy('present').and.resolveTo(),
    } as unknown as HTMLIonToastElement);

    alertCtrl = jasmine.createSpyObj<AlertController>('AlertController', ['create']);

    await TestBed.configureTestingModule({
      imports: [CommentsSectionComponent],
      providers: [
        provideHttpClient(),
        { provide: CommentsApi, useValue: api },
        { provide: ToastController, useValue: toastCtrl },
        { provide: AlertController, useValue: alertCtrl },
        {
          provide: GeolocationService,
          useValue: { requestClientPosition: () => Promise.resolve(null) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommentsSectionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('playerId', 'p1');
    fixture.detectChanges();
    // Yield twice — first to start the microtask, second after the
    // promise resolves to settle the signal updates.
    await Promise.resolve();
    await Promise.resolve();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => clearSession());
  afterEach(() => clearSession());

  it('loads the comments from the API on mount', async () => {
    await build([makeComment()]);
    expect(api.byPlayer).toHaveBeenCalledOnceWith('p1');
    expect(component['comments']().length).toBe(1);
  });

  it('shows the signin prompt for anonymous users (no form)', async () => {
    await build([]);
    const prompt = fixture.nativeElement.querySelector('[data-testid="comments-signin-prompt"]');
    const form = fixture.nativeElement.querySelector('[data-testid="comments-form"]');
    expect(prompt).toBeTruthy();
    expect(form).toBeFalsy();
  });

  it('shows the form for authenticated users', async () => {
    setSession({ uid: 'u1', email: 'u@x.com', displayName: 'Alice', role: 'user' }, 'tok');
    await build([]);
    const form = fixture.nativeElement.querySelector('[data-testid="comments-form"]');
    expect(form).toBeTruthy();
  });

  it('does not submit when the form is invalid', async () => {
    setSession({ uid: 'u1', email: 'u@x.com', displayName: 'Alice', role: 'user' }, 'tok');
    await build([]);

    await component.onSubmit(); // rating=0 with no text → invalid

    expect(api.create).not.toHaveBeenCalled();
  });

  it('optimistically adds a comment and replaces it with the saved one on success', async () => {
    setSession({ uid: 'u1', email: 'u@x.com', displayName: 'Alice', role: 'user' }, 'tok');
    await build([]);

    component['setRating'](5);
    component['form'].patchValue({ author: 'Alice', text: 'Excelente partido' });
    const saved = makeComment({ id: 'real-id', text: 'Excelente partido', rating: 5 });
    api.create.and.resolveTo({ status: 201, message: 'created', data: saved, _links: {} } as ApiResponse<Comment>);

    await component.onSubmit();

    expect(api.create).toHaveBeenCalledTimes(1);
    expect(component['comments']().length).toBe(1);
    expect(component['comments']()[0].id).toBe('real-id');
  });

  it('rolls back the optimistic add when the backend rejects', async () => {
    setSession({ uid: 'u1', email: 'u@x.com', displayName: 'Alice', role: 'user' }, 'tok');
    await build([]);

    component['setRating'](4);
    component['form'].patchValue({ author: 'Alice', text: 'Nope' });
    api.create.and.rejectWith(new Error('boom'));

    await component.onSubmit();

    expect(component['comments']().length).toBe(0);
  });

  it('admin delete asks for confirmation and removes the comment locally on confirm', async () => {
    setSession({ uid: 'admin', email: 'a@x.com', displayName: 'Admin', role: 'admin' }, 'tok');
    await build([makeComment()]);

    const present = jasmine.createSpy('present').and.resolveTo();
    const onDidDismiss = jasmine.createSpy('onDidDismiss').and.resolveTo({ role: 'destructive' });
    alertCtrl.create.and.resolveTo({ present, onDidDismiss } as unknown as HTMLIonAlertElement);
    api.delete.and.resolveTo();

    await component.onDelete(makeComment());

    expect(api.delete).toHaveBeenCalledOnceWith('c1');
    expect(component['comments']().length).toBe(0);
  });

  it('admin delete does nothing when cancelled', async () => {
    setSession({ uid: 'admin', email: 'a@x.com', displayName: 'Admin', role: 'admin' }, 'tok');
    await build([makeComment()]);

    const present = jasmine.createSpy('present').and.resolveTo();
    const onDidDismiss = jasmine.createSpy('onDidDismiss').and.resolveTo({ role: 'cancel' });
    alertCtrl.create.and.resolveTo({ present, onDidDismiss } as unknown as HTMLIonAlertElement);

    await component.onDelete(makeComment());

    expect(api.delete).not.toHaveBeenCalled();
  });
});
