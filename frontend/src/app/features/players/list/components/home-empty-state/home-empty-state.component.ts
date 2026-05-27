import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type HomeEmptyKind = 'no-data' | 'no-results' | 'error';

@Component({
  selector: 'app-home-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-empty-state.component.html',
  styleUrls: ['./home-empty-state.component.scss'],
})
export class HomeEmptyStateComponent {
  readonly kind = input.required<HomeEmptyKind>();
  readonly query = input<string>('');
  readonly canRegister = input(false);

  readonly registerRequested = output<void>();
  readonly retryRequested = output<void>();

  protected readonly icon = computed(() =>
    this.kind() === 'error' ? '!' : this.kind() === 'no-results' ? '?' : '◇',
  );

  protected readonly title = computed(() => {
    switch (this.kind()) {
      case 'error':
        return 'No se pudo cargar';
      case 'no-results':
        return `Sin resultados para «${this.query()}»`;
      case 'no-data':
      default:
        return 'Aún no hay jugadores';
    }
  });

  protected readonly subtitle = computed(() => {
    switch (this.kind()) {
      case 'error':
        return 'Revisa tu conexión y vuelve a intentarlo.';
      case 'no-results':
        return 'Prueba otra ortografía o limpia el filtro.';
      case 'no-data':
      default:
        return this.canRegister()
          ? 'Crea una cuenta para importar tu primer jugador.'
          : 'El catálogo aún está vacío.';
    }
  });
}
