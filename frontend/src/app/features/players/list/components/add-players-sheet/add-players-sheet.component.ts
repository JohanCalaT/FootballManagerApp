import { Component, inject } from '@angular/core';
import { IonIcon, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, createOutline, downloadOutline } from 'ionicons/icons';

/**
 * "Añadir jugadores" bottom sheet — replaces the flat Ionic ActionSheet with a
 * themed, mobile-first sheet (grabber, title, large icon rows, separate
 * Cancel). Presented by PlayersListComponent via ModalController with
 * breakpoints; it only signals the chosen path through the dismiss `role`
 * ('insert' | 'import' | 'cancel') — the container keeps the navigation logic.
 */
@Component({
  selector: 'app-add-players-sheet',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './add-players-sheet.component.html',
  styleUrls: ['./add-players-sheet.component.scss'],
})
export class AddPlayersSheetComponent {
  private readonly modalCtrl = inject(ModalController);

  constructor() {
    addIcons({ createOutline, downloadOutline, chevronForwardOutline });
  }

  protected choose(action: 'insert' | 'import'): void {
    void this.modalCtrl.dismiss(undefined, action);
  }

  protected cancel(): void {
    void this.modalCtrl.dismiss(undefined, 'cancel');
  }
}
