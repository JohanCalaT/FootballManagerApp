import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

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
  }
}
