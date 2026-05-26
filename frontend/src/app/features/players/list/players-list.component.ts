import { Component } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { BackendToggleComponent } from '../../../shared/components/backend-toggle/backend-toggle.component';

@Component({
  selector: 'app-players-list',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, BackendToggleComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>FootballManager</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <app-backend-toggle />
      <h2>En construcción</h2>
      <p>El listado de jugadores se conectará al gateway en la próxima iteración.</p>
    </ion-content>
  `,
})
export class PlayersListComponent {}
