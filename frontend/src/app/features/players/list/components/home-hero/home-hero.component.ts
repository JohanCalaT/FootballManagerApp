import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-home-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-hero.component.html',
  styleUrls: ['./home-hero.component.scss'],
})
export class HomeHeroComponent {
  readonly count = input<number | null>(null);

  protected readonly subtitle = computed(() => {
    const c = this.count();
    if (c === null) return 'Descubre, comenta y arma tu plantilla.';
    if (c === 0) return 'Aún no hay jugadores · sé el primero en importar.';
    return `${c.toLocaleString('es-ES')} jugador${c === 1 ? '' : 'es'} · descubre y comenta.`;
  });
}
