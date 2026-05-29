import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  IonIcon,
  IonLabel,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { footballOutline, sparklesOutline, newspaperOutline } from 'ionicons/icons';

import { isAuthenticated } from '../../core/state/auth.signal';

/**
 * Bottom-tab shell. Jugadores is always available; Equipo ideal and Noticias
 * are registered-user features, so their tabs only render when authenticated
 * (their routes are also guarded). Player create/import live in a FAB on the
 * Jugadores tab, not here — tabs are for navigation, the FAB for actions.
 */
@Component({
  selector: 'app-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="players" data-testid="tab-players">
          <ion-icon name="football-outline" aria-hidden="true"></ion-icon>
          <ion-label>Jugadores</ion-label>
        </ion-tab-button>

        @if (isAuthenticated()) {
          <ion-tab-button tab="ideal-team" data-testid="tab-ideal-team">
            <ion-icon name="sparkles-outline" aria-hidden="true"></ion-icon>
            <ion-label>Equipo ideal</ion-label>
          </ion-tab-button>

          <ion-tab-button tab="news" data-testid="tab-news">
            <ion-icon name="newspaper-outline" aria-hidden="true"></ion-icon>
            <ion-label>Noticias</ion-label>
          </ion-tab-button>
        }
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsComponent {
  protected readonly isAuthenticated = isAuthenticated;

  constructor() {
    addIcons({ footballOutline, sparklesOutline, newspaperOutline });
  }
}
