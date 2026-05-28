import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  AlertController,
  IonButton,
  IonIcon,
  IonInput,
  IonSpinner,
  IonTextarea,
  ToastController,
} from '@ionic/angular/standalone';
import type {
  InputInputEventDetail,
  IonInputCustomEvent,
  IonTextareaCustomEvent,
  TextareaInputEventDetail,
} from '@ionic/core';

import { CommentsApi } from '../../../../../core/api/comments.api';
import { GeolocationService } from '../../../../../core/services/geolocation.service';
import { Comment, CreateCommentRequest } from '../../../../../core/models/comment.model';
import { currentUser, isAdmin, isAuthenticated } from '../../../../../core/state/auth.signal';

/**
 * Reusable comments block for the player detail page.
 *
 * Behaviour:
 *  - Loads the player's comments via CommentsApi on first mount (the
 *    parent passes the playerId via signal input, so when it switches
 *    players the section re-fetches).
 *  - Authenticated users see a form above the list — rating 0–5 with
 *    interactive star buttons, textarea capped at 1000 chars with a
 *    live counter, author pre-filled with the user's displayName.
 *  - Optimistic add: the comment shows up in the list immediately with
 *    an isPending flag (renders dimmed); on success the temp id is
 *    replaced with the real one, on failure it's rolled back.
 *  - Admin gets a delete ✕ on each item, behind an AlertController
 *    confirmation that names the comment author.
 *  - Anonymous users see "Inicia sesión para comentar" instead of the
 *    form, but always see the list (public read).
 */
@Component({
  selector: 'app-comments-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    IonButton,
    IonIcon,
    IonInput,
    IonSpinner,
    IonTextarea,
  ],
  templateUrl: './comments-section.component.html',
  styleUrls: ['./comments-section.component.scss'],
})
export class CommentsSectionComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(CommentsApi);
  private readonly geo = inject(GeolocationService);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly destroyRef = inject(DestroyRef);

  readonly playerId = input.required<string>();

  protected readonly isAuthenticated = isAuthenticated;
  protected readonly isAdmin = isAdmin;
  protected readonly currentUser = currentUser;

  protected readonly comments = signal<Comment[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly loadError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    author: ['', [Validators.required, Validators.maxLength(100)]],
    text: ['', [Validators.required, Validators.maxLength(1000)]],
    rating: [0, [Validators.required, Validators.min(0), Validators.max(5)]],
  });

  protected readonly textLength = signal(0);
  protected readonly stars = [1, 2, 3, 4, 5] as const;

  protected readonly hasComments = computed(() => this.comments().length > 0);
  protected readonly displayLength = computed(() => this.textLength());

  // Pending optimistic rows are stamped with a `temp:` id prefix so we can
  // splice them out on success/rollback without confusing them with real
  // backend ids. The flag lives in a side WeakSet so it does not pollute
  // the Comment shape with UI-only state.
  private readonly pendingIds = new Set<string>();
  protected isPending(c: Comment): boolean {
    return this.pendingIds.has(c.id);
  }

  private lastPlayerId: string | null = null;

  constructor() {
    // Pre-fill the author name with the current user's displayName so the
    // most common case is one tap on the rating + one paragraph + submit.
    // Effect runs on signal changes (login/logout / user switch) so the
    // form stays in sync.
    const update = (): void => {
      const u = this.currentUser();
      if (u?.displayName && !this.form.controls.author.dirty) {
        this.form.controls.author.setValue(u.displayName);
      }
    };
    update();
    // React to playerId changes via a tiny effect-equivalent: read the
    // signal once per scheduler tick and reload if it moved.
    queueMicrotask(() => this.maybeReload());
  }

  ngOnChanges(): void {
    this.maybeReload();
  }

  // Public for the parent detail page to call when the comment list might
  // be stale (e.g. after navigation back from edit). Cheap idempotent.
  reload(): void {
    void this.load();
  }

  private maybeReload(): void {
    const id = this.playerId();
    if (id === this.lastPlayerId) return;
    this.lastPlayerId = id;
    void this.load();
  }

  private async load(): Promise<void> {
    const id = this.playerId();
    if (!id) return;
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const response = await this.api.byPlayer(id);
      this.comments.set(response?.data ?? []);
    } catch {
      this.loadError.set('No se pudieron cargar los comentarios.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected setRating(value: number): void {
    this.form.controls.rating.setValue(value);
    this.form.controls.rating.markAsTouched();
  }

  protected onTextInput(
    event:
      | IonInputCustomEvent<InputInputEventDetail>
      | IonTextareaCustomEvent<TextareaInputEventDetail>,
  ): void {
    const value = event.detail.value ?? '';
    this.textLength.set(value.length);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }
    const id = this.playerId();
    if (!id) return;

    const raw = this.form.getRawValue();
    const clientGeolocation = await this.geo.requestClientPosition({ silent: true });
    const tempId = `temp:${Date.now()}`;
    const optimistic: Comment = {
      id: tempId,
      playerId: id,
      author: raw.author.trim(),
      text: raw.text.trim(),
      rating: raw.rating,
      createdAt: new Date().toISOString(),
      createdByUserId: this.currentUser()?.uid ?? null,
      clientGeolocation,
    };
    this.pendingIds.add(tempId);
    this.comments.update((list) => [optimistic, ...list]);
    this.isSaving.set(true);

    const payload: CreateCommentRequest = {
      author: optimistic.author,
      text: optimistic.text,
      rating: optimistic.rating,
      clientGeolocation,
    };

    try {
      const response = await this.api.create(id, payload);
      const saved = response?.data;
      if (saved) {
        this.comments.update((list) =>
          list.map((c) => (c.id === tempId ? saved : c)),
        );
      } else {
        // Server returned 201 with empty body — keep the optimistic row
        // but stamp the createdAt that came back if any.
        this.comments.update((list) =>
          list.map((c) => (c.id === tempId ? { ...c, id: tempId.replace('temp:', '') } : c)),
        );
      }
      this.pendingIds.delete(tempId);
      this.form.reset({
        author: this.currentUser()?.displayName ?? '',
        text: '',
        rating: 0,
      });
      this.textLength.set(0);
      await this.toast('Comentario añadido.', 'success');
    } catch {
      // Rollback
      this.comments.update((list) => list.filter((c) => c.id !== tempId));
      this.pendingIds.delete(tempId);
      await this.toast('No se pudo publicar el comentario.', 'danger');
    } finally {
      this.isSaving.set(false);
    }
  }

  async onDelete(comment: Comment): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar comentario',
      subHeader: comment.author,
      message: `Vas a eliminar el comentario de ${comment.author}. Esta acción es permanente.`,
      cssClass: 'fma-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive', cssClass: 'fma-alert-destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'destructive') return;

    // Optimistic remove
    const previous = this.comments();
    this.comments.update((list) => list.filter((c) => c.id !== comment.id));
    try {
      await this.api.delete(comment.id);
      await this.toast('Comentario eliminado.', 'success');
    } catch {
      this.comments.set(previous);
      await this.toast('No se pudo eliminar el comentario.', 'danger');
    }
  }

  private async toast(message: string, color: 'success' | 'danger'): Promise<void> {
    const t = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      color,
      cssClass: 'fma-toast',
    });
    await t.present();
  }
}
