import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';

import { ConfigApi } from '../api/config.api';
import {
  BackendChoice,
  backendChoice,
  setBackend,
} from '../state/backend-choice.signal';

/**
 * Orquesta el cambio de backend activo del Gateway.
 *
 * El estado vive en el servidor (Gateway), así que esta es la fuente de verdad:
 *  - `sync()` lo lee al arrancar y alinea el toggle local con el servidor.
 *  - `toggle()` / `switchTo()` lo cambian vía `/config/backend` y, solo si el
 *    servidor confirma, actualizan el signal local (que dispara el refresco de
 *    datos en la lista) y muestran un toast.
 *
 * Nota: el backend activo del Gateway es GLOBAL (afecta a todos los clientes y
 * se resetea al reiniciar el Gateway). De ahí la sincronización al arrancar.
 */
@Injectable({ providedIn: 'root' })
export class BackendSwitchService {
  private readonly api = inject(ConfigApi);
  private readonly toastCtrl = inject(ToastController);

  private static readonly LABELS: Record<BackendChoice, string> = {
    dotnet: '.NET (PostgreSQL)',
    node: 'Node (MongoDB)',
  };

  /** Alinea el toggle local con el backend activo real del Gateway. */
  async sync(): Promise<void> {
    try {
      const status = await this.api.getActive();
      if (status.active === 'dotnet' || status.active === 'node') {
        setBackend(status.active);
      }
    } catch {
      // Gateway no disponible al arrancar: conservamos el valor local.
    }
  }

  /** Cambia al backend contrario al actual. */
  async toggle(): Promise<void> {
    await this.switchTo(backendChoice() === 'dotnet' ? 'node' : 'dotnet');
  }

  /** Cambia al backend indicado vía Gateway; solo aplica si el server confirma. */
  async switchTo(choice: BackendChoice): Promise<void> {
    if (choice === backendChoice()) return;
    try {
      const status = await this.api.setActive(choice);
      const active: BackendChoice =
        status.active === 'node' ? 'node' : 'dotnet';
      setBackend(active);
      await this.toast(`Backend: ${BackendSwitchService.LABELS[active]}`, 'success');
    } catch {
      await this.toast('No se pudo cambiar de backend.', 'danger');
    }
  }

  private async toast(
    message: string,
    color: 'success' | 'danger',
  ): Promise<void> {
    const t = await this.toastCtrl.create({
      message,
      duration: 2200,
      position: 'top',
      color,
      cssClass: 'fma-toast',
    });
    await t.present();
  }
}
