import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

import { BackendSwitchService } from './core/services/backend-switch.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    // Align the backend toggle with the Gateway's actual active backend on
    // startup (the Gateway holds it as global server state). Fire-and-forget:
    // never blocks bootstrap, falls back to the local value if it fails.
    void inject(BackendSwitchService).sync();
    this.initStatusBar();
  }

  /**
   * Let the WebView draw edge-to-edge behind the status bar (the glass header
   * fills that zone via safe-area padding) and force light icons for the dark
   * brand background. Native-only: on web the plugin is a no-op shim.
   */
  private initStatusBar(): void {
    if (!Capacitor.isNativePlatform()) return;
    void StatusBar.setOverlaysWebView({ overlay: true });
    void StatusBar.setStyle({ style: Style.Dark });
  }
}
