import {
  Component,
  Event,
  EventEmitter,
  Host,
  Prop,
  h,
} from '@stencil/core';

/**
 * Player roster tile — used in /players list and search results.
 *
 * Inputs map 1:1 to PlayerListItemDto from the .NET backend (and the
 * mirrored Node response): name, team, league, position, image-url,
 * rating. Anonymous and registered users see the same tile; admin
 * action affordances are exposed through the `actions` slot so this
 * component stays role-agnostic.
 *
 * Clicking the tile emits a `playerSelected` CustomEvent with the
 * normalized payload, so the host can route to the detail page or
 * trigger any other navigation without the tile knowing about it.
 *
 * Layout — square-ish tile (~1 : 1.15 aspect), designed for 2 columns
 * on a 360-420px mobile viewport and 3-5 columns on tablet/desktop via
 * `repeat(auto-fill, minmax(180px, 1fr))` on the host grid.
 *
 * Design language ("Stadium control room HUD", Gridiron Neon palette
 * from DESIGN.md / frontend theme/variables.scss):
 *   - Circular player tokens with multi-layer glowing rings (ring color
 *     signals tier — bronze / silver / gold / icon) sit at the top.
 *   - Rating badge orbits the token at the 4-5 o'clock position.
 *   - Hexagonal grid backdrop + radial tier glow concentrated on the
 *     token area give the surface a premium simulator depth.
 *   - A thin tier accent stripe at the bottom edge reinforces the tier
 *     when the user scrolls a long grid.
 *   - The component reads --app-* CSS custom properties from the host
 *     so the design tokens are inherited automatically through the
 *     shadow boundary; no token duplication.
 *
 * `league` is kept on the prop surface for forward-compat with the DTO
 * but intentionally not rendered in the tile — at 180px wide there is
 * no room for it without truncating something more important. The
 * league is still available on the player detail page.
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

  /** League name. Accepted for DTO parity, not displayed in the tile. */
  @Prop() league?: string;

  /** Position label (Goalkeeper, Defender, Midfielder, Attacker). */
  @Prop() position?: string;

  /** Image URL — Firebase Storage, API-Football, or manual. */
  @Prop() imageUrl?: string;

  /** Overall rating (0–10, decimal). Renders the orbital badge if present. */
  @Prop() rating?: number;

  /** Player identifier — emitted with playerSelected for the host to route. */
  @Prop() playerId?: string;

  /**
   * When true, the whole tile is keyboard-interactive and emits
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
    return this.rating.toFixed(1);
  }

  render() {
    const tier = this.tier;
    return (
      <Host
        class={{
          'card': true,
          'card--interactive': this.interactive,
          'card--tier-none': tier === null,
          [`card--tier-${tier}`]: tier !== null,
        }}
        role={this.interactive ? 'button' : undefined}
        tabindex={this.interactive ? '0' : undefined}
        aria-label={`${this.name}, ${this.position ?? 'jugador'} de ${this.team}`}
        onClick={this.interactive ? this.handleActivate : undefined}
        onKeyDown={this.interactive ? this.handleActivate : undefined}
      >
        {/* Decorative backdrop — hex pattern + radial tier glow concentrated
            on the token area. aria-hidden, no semantic content. */}
        <div class="card__backdrop" aria-hidden="true"></div>

        <div class="card__inner">
          <div class="card__token-wrap">
            <div class="card__token" part="token">
              {this.imageUrl ? (
                <img src={this.imageUrl} alt="" loading="lazy" />
              ) : (
                <span class="card__initials" aria-hidden="true">
                  {this.initials}
                </span>
              )}
            </div>
            {tier !== null ? (
              <div
                class={`card__badge card__badge--${tier}`}
                aria-label={`rating ${this.ratingLabel}`}
              >
                {this.ratingLabel}
              </div>
            ) : null}
          </div>

          <div class="card__body">
            <h3 class="card__name" title={this.name}>{this.name}</h3>
            <p class="card__team" title={this.team}>{this.team}</p>
            {this.position ? (
              <span class="card__position">{this.position}</span>
            ) : null}
          </div>

          {/* Top-right anchored actions slot (admin promote/edit/etc). */}
          <div class="card__actions">
            <slot name="actions" />
          </div>

          {/* Tier accent stripe — bottom-edge bar visible across long scroll. */}
          {tier !== null ? (
            <div class={`card__stripe card__stripe--${tier}`} aria-hidden="true"></div>
          ) : null}
        </div>
      </Host>
    );
  }
}
