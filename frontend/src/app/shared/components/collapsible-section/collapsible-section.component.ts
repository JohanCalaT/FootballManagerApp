import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';

/**
 * Reusable accordion section that matches the Gridiron Neon look (dark
 * surface card with Bebas Neue uppercase header, chevron toggle, neon focus
 * ring). Lives in shared/ so both the manual create form and the edit page
 * consume the same primitive — keeping the "Más datos" / "Marcar en mapa"
 * sections visually consistent across both flows.
 *
 * Open state is exposed as a `model()` so callers can either two-way bind
 * with `[(open)]` or just pass `[defaultOpen]="true"` for fire-and-forget
 * usage.
 */
@Component({
  selector: 'app-collapsible-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon],
  template: `
    <section
      class="collapsible"
      [class.collapsible--open]="open()"
      data-testid="collapsible-section">
      <button
        type="button"
        class="collapsible__header"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="contentId()"
        (click)="toggle()"
        data-testid="collapsible-toggle">
        @if (icon(); as iconName) {
          <ion-icon [name]="iconName" aria-hidden="true" class="collapsible__icon"></ion-icon>
        }
        <span class="collapsible__title">{{ title() }}</span>
        @if (badge(); as badgeText) {
          <span class="collapsible__badge" data-testid="collapsible-badge">{{ badgeText }}</span>
        }
        <ion-icon
          name="chevron-down-outline"
          aria-hidden="true"
          class="collapsible__chevron"
          [class.collapsible__chevron--up]="open()"></ion-icon>
      </button>
      <div
        [id]="contentId()"
        class="collapsible__content"
        [hidden]="!open()"
        data-testid="collapsible-content">
        <ng-content></ng-content>
      </div>
    </section>
  `,
  styleUrls: ['./collapsible-section.component.scss'],
})
export class CollapsibleSectionComponent {
  readonly title = input.required<string>();
  readonly icon = input<string>();
  readonly badge = input<string>();
  /** Two-way bindable open state. */
  readonly open = model<boolean>(false);
  /** Emits the new state every time the header is toggled. */
  readonly toggled = output<boolean>();

  private static seq = 0;
  private readonly id = ++CollapsibleSectionComponent.seq;
  protected readonly contentId = computed(() => `collapsible-content-${this.id}`);

  protected toggle(): void {
    const next = !this.open();
    this.open.set(next);
    this.toggled.emit(next);
  }
}
