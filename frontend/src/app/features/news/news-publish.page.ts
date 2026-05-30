import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';

import { NewsApi } from '../../core/api/news.api';
import { CreateNoticiaRequest, NEWS_LIMITS } from '../../core/models/news.model';
import { currentUser } from '../../core/state/auth.signal';
import { PlayerImagePickerComponent } from '../../shared/components/player-image-picker/player-image-picker.component';

/**
 * Publicar noticia (acción de administrador).
 *
 * Formulario reactivo con validaciones espejo del adapter (NoticiaDto). La
 * imagen reutiliza el `PlayerImagePickerComponent`: Firebase Storage (cámara o
 * galería) o URL pegada — el flujo de `commit()` es el mismo que el del alta de
 * jugador. El stream SSE de la lista refleja la nueva noticia al volver.
 */
@Component({
  selector: 'app-news-publish',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ion-page' },
  imports: [
    ReactiveFormsModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonInput,
    IonSpinner,
    IonTextarea,
    IonTitle,
    IonToolbar,
    PlayerImagePickerComponent,
  ],
  templateUrl: './news-publish.page.html',
  styleUrls: ['./news-publish.page.scss'],
})
export class NewsPublishPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly api = inject(NewsApi);
  private readonly toastCtrl = inject(ToastController);

  protected readonly limits = NEWS_LIMITS;
  protected readonly user = currentUser;
  protected readonly ownerUid = computed(() => this.user()?.uid ?? '');

  protected readonly picker = viewChild<PlayerImagePickerComponent>(
    PlayerImagePickerComponent,
  );

  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.maxLength(NEWS_LIMITS.titulo)]],
    contenido: [
      '',
      [Validators.required, Validators.maxLength(NEWS_LIMITS.contenido)],
    ],
    autor: ['', [Validators.required, Validators.maxLength(NEWS_LIMITS.autor)]],
  });

  constructor() {
    // Prefill the author with the signed-in admin's name; bounce to login if
    // the session disappears mid-form (the route guard handles the rest).
    effect(() => {
      const u = this.user();
      if (!u) {
        void this.router.navigate(['/auth/login']);
        return;
      }
      if (!this.form.controls.autor.value) {
        this.form.controls.autor.setValue(u.displayName ?? u.email);
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    try {
      const image = this.picker()?.hasChanges()
        ? await this.picker()!.commit()
        : null;

      const raw = this.form.getRawValue();
      const payload: CreateNoticiaRequest = {
        titulo: raw.titulo.trim(),
        contenido: raw.contenido.trim(),
        autor: raw.autor.trim(),
        imagenUrl: image?.url ?? undefined,
      };

      const res = await this.api.publish(payload);
      if (res.status !== 'success') {
        throw new Error(res.message);
      }
      await this.toast('Noticia publicada.', 'success');
      void this.router.navigate(['/news']);
    } catch (err) {
      await this.handleError(err);
    } finally {
      this.isSaving.set(false);
    }
  }

  private async handleError(err: unknown): Promise<void> {
    if (err instanceof HttpErrorResponse && err.status === 400) {
      await this.toast('Revisa los campos del formulario.', 'warning');
      return;
    }
    await this.toast('No se pudo publicar la noticia. Inténtalo de nuevo.', 'danger');
  }

  private async toast(
    message: string,
    color: 'success' | 'warning' | 'danger',
  ): Promise<void> {
    const t = await this.toastCtrl.create({
      message,
      duration: 2800,
      position: 'top',
      color,
      cssClass: 'fma-toast',
    });
    await t.present();
  }
}
