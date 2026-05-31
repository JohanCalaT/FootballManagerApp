import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

const SPLASH_DURATION_MS = 1500;

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [IonContent],
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss'],
})
export class SplashComponent implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    setTimeout(() => {
      void this.router.navigate(['/players'], { replaceUrl: true });
    }, SPLASH_DURATION_MS);
  }
}
