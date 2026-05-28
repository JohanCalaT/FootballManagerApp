import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Output,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSpinner,
} from '@ionic/angular/standalone';
import type {
  InputInputEventDetail,
  IonInputCustomEvent,
  IonSegmentCustomEvent,
  SegmentChangeEventDetail,
} from '@ionic/core';

import { CameraService } from '../../../core/services/camera.service';
import { PlayerImageFactory } from '../../../core/services/strategies/image/player-image.factory';
import {
  ImageSourceError,
  ImageSourceKind,
  PlayerImageResult,
} from '../../../core/services/strategies/image/player-image-source';

type Mode = 'firebase' | 'url';

/**
 * Local draft the picker holds between user interaction and `commit()`. The
 * draft is NEVER uploaded eagerly — the parent form orchestrates the upload
 * order (upload → POST backend → delete old blob) when its own validation
 * passes (see CLAUDE.md → Imágenes — "Borrar al confirmar guardado").
 */
type Draft =
  | { kind: 'firebase'; file: File; previewUrl: string }
  | { kind: 'url'; url: string };

@Component({
  selector: 'app-player-image-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonButton,
    IonIcon,
    IonInput,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSpinner,
  ],
  templateUrl: './player-image-picker.component.html',
  styleUrls: ['./player-image-picker.component.scss'],
})
export class PlayerImagePickerComponent {
  private readonly camera = inject(CameraService);
  private readonly factory = inject(PlayerImageFactory);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Initial image when editing an existing player. Drives the preview until
   * the user picks a new file / pastes a new URL / presses remove. Signal
   * input so the `previewUrl` computed reacts on parent-driven changes.
   */
  readonly initial = input<PlayerImageResult>();

  /**
   * Firebase Auth uid of the owner. Required for the 'firebase' mode because
   * the storage.rules clause is `request.auth.uid == uid`. The parent form
   * passes `auth.currentUser()!.uid`.
   */
  readonly ownerUid = input.required<string>();

  @Output() readonly cleared = new EventEmitter<void>();

  protected readonly mode = signal<Mode>('firebase');
  protected readonly draft = signal<Draft | null>(null);
  protected readonly isCommitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly wasCleared = signal(false);
  protected readonly urlDraft = signal('');

  protected readonly previewUrl = computed<string | null>(() => {
    if (this.wasCleared()) return null;
    const d = this.draft();
    if (d?.kind === 'firebase') return d.previewUrl;
    if (d?.kind === 'url') return d.url || null;
    return this.initial()?.url ?? null;
  });

  protected readonly initialIsApi = computed(() => this.initial()?.imageSource === 'api');

  private objectUrlToRevoke: string | null = null;

  constructor() {
    // Free object URLs so we do not leak Blob references when the component
    // gets destroyed or the user picks another file mid-session.
    this.destroyRef.onDestroy(() => this.revokeObjectUrl());
  }

  /**
   * True when `commit()` will produce something different from `initial` —
   * either a new draft or an explicit clear. Lets the parent decide whether
   * to delete `initial.storagePath` after a successful save.
   */
  hasChanges(): boolean {
    return this.draft() !== null || this.wasCleared();
  }

  /**
   * Materialize the current draft. Returns:
   *   - the new `PlayerImageResult` if the user picked something,
   *   - `null` if the user cleared the image,
   *   - `initial` (unchanged) if nothing was touched.
   *
   * Throws `ImageSourceError` with a user-friendly message if the strategy
   * rejects (e.g. upload failed). The picker UI also surfaces the message
   * via the `error` signal so the parent does not have to render it.
   */
  async commit(): Promise<PlayerImageResult | null> {
    if (this.wasCleared()) return null;

    const draft = this.draft();
    if (!draft) return this.initial() ?? null;

    this.isCommitting.set(true);
    this.error.set(null);
    try {
      if (draft.kind === 'firebase') {
        return await this.factory.provide({
          kind: 'firebase',
          file: draft.file,
          ownerUid: this.ownerUid(),
        });
      }
      return await this.factory.provide({ kind: 'url', url: draft.url });
    } catch (err) {
      const message = err instanceof ImageSourceError ? err.message : 'Error inesperado.';
      this.error.set(message);
      throw err;
    } finally {
      this.isCommitting.set(false);
    }
  }

  protected onModeChange(event: IonSegmentCustomEvent<SegmentChangeEventDetail>): void {
    const value = event.detail.value;
    if (value === 'firebase' || value === 'url') {
      this.mode.set(value);
      this.error.set(null);
    }
  }

  protected async onPickFile(): Promise<void> {
    const file = await this.camera.pickFromFile({ capture: 'environment' });
    if (!file) return;
    this.applyFileDraft(file);
  }

  protected onUrlInput(event: IonInputCustomEvent<InputInputEventDetail>): void {
    const raw = event.detail.value ?? '';
    const url = raw.trim();
    this.urlDraft.set(url);
    this.wasCleared.set(false);
    this.error.set(null);
    this.draft.set(url ? { kind: 'url', url } : null);
  }

  protected onClear(): void {
    this.revokeObjectUrl();
    this.draft.set(null);
    this.urlDraft.set('');
    this.error.set(null);
    if (this.initial()) {
      this.wasCleared.set(true);
    }
    this.cleared.emit();
  }

  private applyFileDraft(file: File): void {
    this.revokeObjectUrl();
    const previewUrl = URL.createObjectURL(file);
    this.objectUrlToRevoke = previewUrl;
    this.wasCleared.set(false);
    this.error.set(null);
    this.draft.set({ kind: 'firebase', file, previewUrl });
  }

  private revokeObjectUrl(): void {
    if (this.objectUrlToRevoke) {
      URL.revokeObjectURL(this.objectUrlToRevoke);
      this.objectUrlToRevoke = null;
    }
  }

  protected isMode(kind: Mode): boolean {
    return this.mode() === kind;
  }

  protected sourceLabel(kind: ImageSourceKind | undefined): string {
    switch (kind) {
      case 'api':
        return 'Foto de API-Football';
      case 'url':
        return 'URL externa';
      case 'firebase':
        return 'Subida a Firebase';
      default:
        return '';
    }
  }
}
