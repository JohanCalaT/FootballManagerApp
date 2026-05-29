import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonItem,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';

import { PlayerSearchFilters } from '../../../../../core/models/player.model';

/**
 * Bottom-sheet with the non-name search filters required by the rubric:
 * equipo, liga and the alta (registration) date range. The name term lives in
 * the always-visible search bar; this sheet covers the rest. Seeded from the
 * current filters via `componentProps`; dismisses with the chosen filters
 * (role 'apply') so the container can merge them with the name and reload.
 */
@Component({
  selector: 'app-home-filters',
  standalone: true,
  imports: [
    FormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonInput,
    IonItem,
    IonTitle,
    IonToolbar,
  ],
  templateUrl: './home-filters.component.html',
  styleUrls: ['./home-filters.component.scss'],
})
export class HomeFiltersComponent {
  private readonly modalCtrl = inject(ModalController);

  // Seeded from componentProps when the sheet opens.
  team = '';
  league = '';
  from = '';
  to = '';

  protected apply(): void {
    const filters: PlayerSearchFilters = {
      team: this.team.trim() || undefined,
      league: this.league.trim() || undefined,
      from: this.from || undefined,
      to: this.to || undefined,
    };
    void this.modalCtrl.dismiss(filters, 'apply');
  }

  /** Reset the sheet fields and apply an empty set (clears these filters). */
  protected clear(): void {
    this.team = '';
    this.league = '';
    this.from = '';
    this.to = '';
    void this.modalCtrl.dismiss({}, 'apply');
  }

  protected cancel(): void {
    void this.modalCtrl.dismiss(undefined, 'cancel');
  }
}
