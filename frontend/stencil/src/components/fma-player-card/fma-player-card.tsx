import {
  Component,
  Event,
  EventEmitter,
  Host,
  Prop,
  h,
} from '@stencil/core';

/**
 * Player summary card — used in /players list and search results.
 *
 * Inputs map 1:1 to PlayerListItemDto from the .NET backend (and the
 * mirrored Node response): name, team, league, position, image-url,
 * rating. Anonymous and registered users see the same component; admin
 * action affordances are exposed through the `actions` slot so this
 * component stays role-agnostic.
 *
 * Clicking the card emits a `playerSelected` CustomEvent with the
 * normalized payload, so the host can route to the detail page or
 * trigger any other navigation without the card knowing about it.
 *
 * Design language (Gridiron Neon, see DESIGN.md / frontend
 * theme/variables.scss): glass surface gradient, neon-green primary on
 * focus/hover, rating as a tier-coloured pill (bronze/silver/gold/icon).
 * The component reads --app-* CSS custom properties from the host so the
 * design tokens are inherited automatically; no token duplication.
 */
@Component({
  tag: 'fma-player-card',
  styleUrl: 'fma-player-card.css',
  shadow: true,
})
export class FmaPlayerCard {
  /** Player display name (required). */
  @Prop() name!: string;

  /** Team name (required). */
  @Prop() team!: string;

  /** League name (required). */
  @Prop() league!: string;

  /** Position label (Goalkeeper, Defender, Midfielder, Attacker). */
  @Prop() position?: string;

  /** Image URL — Firebase Storage, API-Football, or manual. */
  @Prop() imageUrl?: string;

  /** Overall rating (0–10, decimal). Renders the tier pill if present. */
  @Prop() rating?: number;

  /** Player identifier — emitted with playerSelected for the host to route. */
  @Prop() playerId?: string;

  /**
   * When true, the whole card is keyboard-interactive and emits
   * playerSelected on click / Enter / Space. Defaults to true; flip to
   * false for purely-display contexts (e.g. inside a pop-up).
   */
  @Prop() interactive: boolean = true;

  @Event({ eventName: 'playerSelected' })
  playerSelected!: EventEmitter<{ playerId?: string; name: string }>;

  private handleActivate = (ev: KeyboardEvent | MouseEvent): void => {
    if (!this.interactive) return;
    if (ev instanceof KeyboardEvent) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
    }
    this.playerSelected.emit({ playerId: this.playerId, name: this.name });
  };

  private get initials(): string {
    if (!this.name) return '?';
    const parts = this.name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  private get tier(): 'bronze' | 'silver' | 'gold' | 'icon' | null {
    if (this.rating === undefined || this.rating === null) return null;
    // PlayerStatisticsDto.Rating is 0–10 (decimal) in this project, not 0–100.
    if (this.rating >= 8.5) return 'icon';
    if (this.rating >= 7.5) return 'gold';
    if (this.rating >= 6.5) return 'silver';
    return 'bronze';
  }

  private get ratingLabel(): string {
    if (this.rating === undefined || this.rating === null) return '';
    // Pretty-print the decimal: 8.10 → "8.1", 7 → "7.0"
    return this.rating.toFixed(1);
  }

  render() {
    const tier = this.tier;
    return (
      <Host
        class={{
          'card': true,
          'card--interactive': this.interactive,
          [`card--tier-${tier}`]: tier !== null,
        }}
        role={this.interactive ? 'button' : undefined}
        tabindex={this.interactive ? '0' : undefined}
        aria-label={`${this.name}, ${this.position ?? 'jugador'} de ${this.team}`}
        onClick={this.interactive ? this.handleActivate : undefined}
        onKeyDown={this.interactive ? this.handleActivate : undefined}
      >
        <div class="card__inner">
          <div class="card__media" part="media">
            {this.imageUrl ? (
              <img src={this.imageUrl} alt="" loading="lazy" />
            ) : (
              <span class="card__initials" aria-hidden="true">
                {this.initials}
              </span>
            )}
          </div>

          <div class="card__body">
            <p class="card__eyebrow">
              {this.position ? <span class="card__position">{this.position}</span> : null}
              {this.position && this.league ? <span class="card__dot">·</span> : null}
              <span class="card__league">{this.league}</span>
            </p>
            <h3 class="card__name">{this.name}</h3>
            <p class="card__team">{this.team}</p>
          </div>

          {tier !== null ? (
            <div class={`card__rating card__rating--${tier}`} aria-label={`rating ${this.ratingLabel}`}>
              <span class="card__rating-value">{this.ratingLabel}</span>
              <span class="card__rating-tier">{tier}</span>
            </div>
          ) : null}

          <div class="card__actions">
            <slot name="actions" />
          </div>
        </div>
      </Host>
    );
  }
}
