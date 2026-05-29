import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';

import { NewsStore } from './news.store';
import { Noticia } from '../../core/models/news.model';
import { isAdmin } from '../../core/state/auth.signal';

/**
 * Página de Noticias en tiempo real (funcionalidad de usuario registrado).
 *
 * Siembra la lista y escucha el stream SSE vía `NewsStore` (provisto a nivel de
 * componente). El admin ve el FAB "Publicar" y un botón borrar por card. El
 * indicador "En vivo" refleja el estado de la conexión SSE.
 */
@Component({
  selector: 'app-news',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ion-page' },
  providers: [NewsStore],
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
  templateUrl: './news.page.html',
  styleUrls: ['./news.page.scss'],
})
export class NewsPage implements OnInit {
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);
  protected readonly store = inject(NewsStore);

  protected readonly isAdmin = isAdmin;

  ngOnInit(): void {
    void this.store.connect();
  }

  protected formatDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleString('es-ES', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
  }

  protected goBack(): void {
    void this.router.navigate(['/players']);
  }

  protected goToPublish(): void {
    void this.router.navigate(['/news/publish']);
  }

  protected async onDelete(noticia: Noticia): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar noticia',
      subHeader: noticia.titulo,
      message: 'Esta acción es permanente y no se puede deshacer.',
      cssClass: 'fma-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          cssClass: 'fma-alert__danger',
          handler: () => {
            void this.confirmDelete(noticia);
          },
        },
      ],
    });
    await alert.present();
  }

  private async confirmDelete(noticia: Noticia): Promise<void> {
    try {
      await this.store.remove(noticia.id);
      await this.toast(`Noticia "${noticia.titulo}" eliminada.`, 'success');
    } catch {
      await this.toast('No se pudo eliminar la noticia.', 'danger');
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
