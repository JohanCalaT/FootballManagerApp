import { Component } from '@angular/core';
import { IonItem, IonLabel, IonToggle } from '@ionic/angular/standalone';
import { backendChoice, toggleBackend } from '../../../core/state/backend-choice.signal';

@Component({
  selector: 'app-backend-toggle',
  standalone: true,
  imports: [IonItem, IonLabel, IonToggle],
  template: `
    <ion-item lines="none">
      <ion-label>Backend: {{ backend() }}</ion-label>
      <ion-toggle
        slot="end"
        [checked]="backend() === 'node'"
        (ionChange)="onToggle()" />
    </ion-item>
  `,
})
export class BackendToggleComponent {
  protected readonly backend = backendChoice;

  protected onToggle(): void {
    toggleBackend();
  }
}
