import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';

@Injectable({ providedIn: 'root' })
export class ComingSoonService {
  private readonly toastCtrl = inject(ToastController);

  async notify(featureName: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: `${featureName} — en desarrollo`,
      duration: 2500,
      position: 'bottom',
      cssClass: 'fma-toast',
      icon: 'construct-outline',
    });
    await toast.present();
  }
}
