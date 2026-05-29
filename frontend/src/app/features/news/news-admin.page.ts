import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';

import { NewsApi } from '../../core/api/news.api';
import { EstadoServicio, NEWS_LIMITS } from '../../core/models/news.model';

/**
 * Panel operacional del repositorio de noticias (admin).
 *
 * Consume `/api/news-admin/*`: estado (total / límite FIFO / último reset),
 * vaciado completo y cambio del límite máximo. Demuestra los endpoints
 * operacionales del servicio CORBA además del CRUD de noticias.
 */
@Component({
  selector: 'app-news-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ion-page' },
  imports: [
    ReactiveFormsModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
  templateUrl: './news-admin.page.html',
  styleUrls: ['./news-admin.page.scss'],
})
export class NewsAdminPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(NewsApi);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);

  protected readonly limits = NEWS_LIMITS;
  protected readonly estado = signal<EstadoServicio | null>(null);
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    limite: [
      50,
      [
        Validators.required,
        Validators.min(NEWS_LIMITS.maxSizeMin),
        Validators.max(NEWS_LIMITS.maxSizeMax),
      ],
    ],
  });

  ngOnInit(): void {
    void this.loadStatus();
  }

  private async loadStatus(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.api.status();
      if (res.data) {
        this.estado.set(res.data);
        this.form.controls.limite.setValue(res.data.limiteMaximo);
      }
    } catch {
      await this.toast('No se pudo cargar el estado.', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  protected async onReset(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Vaciar noticias',
      message: 'Se eliminarán TODAS las noticias. Esta acción no se puede deshacer.',
      cssClass: 'fma-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Vaciar',
          role: 'destructive',
          cssClass: 'fma-alert__danger',
          handler: () => {
            void this.confirmReset();
          },
        },
      ],
    });
    await alert.present();
  }

  private async confirmReset(): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.reset();
      await this.loadStatus();
      await this.toast('Repositorio vaciado.', 'success');
    } catch {
      await this.toast('No se pudo vaciar el repositorio.', 'danger');
    } finally {
      this.busy.set(false);
    }
  }

  protected async onSaveLimit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    try {
      const res = await this.api.setMaxSize(this.form.getRawValue().limite);
      if (res.data) this.estado.set(res.data);
      await this.toast('Límite actualizado.', 'success');
    } catch {
      await this.toast('No se pudo actualizar el límite.', 'danger');
    } finally {
      this.busy.set(false);
    }
  }

  private async toast(
    message: string,
    color: 'success' | 'danger',
  ): Promise<void> {
    const t = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'top',
      color,
      cssClass: 'fma-toast',
    });
    await t.present();
  }
}
