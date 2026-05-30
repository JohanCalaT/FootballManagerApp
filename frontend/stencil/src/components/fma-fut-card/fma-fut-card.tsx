import {
  Component,
  Event,
  EventEmitter,
  Host,
  Prop,
  h,
} from '@stencil/core';

/**
 * FUT-style flippable player card — built for the "Equipo Ideal" feature.
 *
 * One tap flips the card in place on its vertical axis (no intermediate
 * enlarged view):
 *   - Front: circular portrait with a small overall badge pinned to its
 *     top-left corner, a position chip below, and the full player name at the
 *     bottom (never truncated).
 *   - Back:  the six attributes as a clean 2-column value grid.
 *
 * A persistent ⓘ button (top-right, above both faces) opens the *deep* detail
 * — animated bars + the AI's justification — which lives in the host's sheet,
 * not on the card. Tapping ⓘ emits `infoClick` and never flips the card.
 *
 * Data-source agnostic by design: every value arrives through props, so the
 * host can feed mock fixtures, an ideal-team response, or a per-player fetch.
 *
 * Attributes are 0–99 (FUT scale). Tier (bronze / silver / gold / icon) is
 * derived from `overall` and drives the frame colour. Goalkeepers swap the
 * outfield labels (PAC/SHO/PAS/DRI/DEF/PHY) for the GK set
 * (DIV/HAN/KIC/REF/SPD/POS) over the same six numeric slots.
 *
 * Inherits --app-* design tokens through the shadow boundary with local
 * fallbacks, so it adopts the host's palette (the Equipo Ideal screen feeds it
 * the prototype's neon-on-deep-green tokens).
 */
@Component({
  tag: 'fma-fut-card',
  styleUrl: 'fma-fut-card.css',
  shadow: true,
})
export class FmaFutCard {
  /** Player display name (required). */
  @Prop() name!: string;

  /** Club / team name (kept for API parity; not shown on the card face). */
  @Prop() team?: string;

  /**
   * Fine-grained position from the ideal-team response (GK, CB, ST, CAM…).
   * Shown verbatim on the front chip. A leading "GK" switches the back labels
   * to the goalkeeper set.
   */
  @Prop() position?: string;

  /** Player photo URL. Falls back to initials token when absent. */
  @Prop() imageUrl?: string;

  /** Nationality label (kept for API parity; not shown on the card face). */
  @Prop() nationality?: string;

  /** Overall rating on the FUT 0–99 scale. Drives the tier / frame colour. */
  @Prop() overall?: number;

  /** Pace (outfield) / Diving (GK). 0–99. */
  @Prop() pac?: number;
  /** Shooting (outfield) / Handling (GK). 0–99. */
  @Prop() sho?: number;
  /** Passing (outfield) / Kicking (GK). 0–99. */
  @Prop() pas?: number;
  /** Dribbling (outfield) / Reflexes (GK). 0–99. */
  @Prop() dri?: number;
  /** Defending (outfield) / Speed (GK). 0–99. */
  @Prop() def?: number;
  /** Physical (outfield) / Positioning (GK). 0–99. */
  @Prop() phy?: number;

  /**
   * AI justification — kept for API parity. The deep detail (bars + reason) is
   * rendered by the host's ⓘ sheet, not by the card itself.
   */
  @Prop() reason?: string;

  /**
   * Flip state. Mutable so the host can drive it while taps still toggle it
   * locally. Reflected to an attribute so the host can hook CSS (e.g. raise the
   * z-index of a flipped pitch card).
   */
  @Prop({ mutable: true, reflect: true }) flipped: boolean = false;

  /**
   * When true the card is keyboard-interactive and flips on activation. Set
   * false for purely-decorative / externally-driven contexts.
   */
  @Prop() interactive: boolean = true;

  /** Whether to render the ⓘ deep-detail trigger. */
  @Prop() showInfo: boolean = true;

  /**
   * Compact variant for the ideal-team pitch, where all 11 must fit on a phone.
   * Sizes its internals in `cqw` so it scales cleanly from ~68px upward.
   */
  @Prop() compact: boolean = false;

  /** Emits the new flip state whenever the card turns. */
  @Event({ eventName: 'flipChange' })
  flipChange!: EventEmitter<{ name: string; flipped: boolean }>;

  /** Emits when the ⓘ deep-detail trigger is activated. */
  @Event({ eventName: 'infoClick' })
  infoClick!: EventEmitter<{ name: string }>;

  private handleActivate = (ev: KeyboardEvent | MouseEvent): void => {
    if (!this.interactive) return;
    if (ev instanceof KeyboardEvent) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
    }
    this.flipped = !this.flipped;
    this.flipChange.emit({ name: this.name, flipped: this.flipped });
  };

  private handleInfo = (ev: KeyboardEvent | MouseEvent): void => {
    if (ev instanceof KeyboardEvent) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
    }
    // Never let the ⓘ tap bubble up and flip the card.
    ev.stopPropagation();
    this.infoClick.emit({ name: this.name });
  };

  private get initials(): string {
    if (!this.name) return '?';
    const parts = this.name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  private get isGoalkeeper(): boolean {
    return (this.position ?? '').trim().toUpperCase().startsWith('GK');
  }

  private get tier(): 'bronze' | 'silver' | 'gold' | 'icon' | null {
    if (this.overall === undefined || this.overall === null) return null;
    // FUT 0–99 thresholds (distinct from the app's 0–10 statistic rating).
    if (this.overall >= 85) return 'icon';
    if (this.overall >= 75) return 'gold';
    if (this.overall >= 65) return 'silver';
    return 'bronze';
  }

  private get overallLabel(): string {
    if (this.overall === undefined || this.overall === null) return '--';
    return Math.round(this.overall).toString();
  }

  /** Six attribute slots paired with the label set for the player's role. */
  private get attributes(): { label: string; value?: number }[] {
    const labels = this.isGoalkeeper
      ? ['DIV', 'HAN', 'KIC', 'REF', 'SPD', 'POS']
      : ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'];
    const values = [this.pac, this.sho, this.pas, this.dri, this.def, this.phy];
    return labels.map((label, i) => ({ label, value: values[i] }));
  }

  private static attrValue(value?: number): string {
    return value === undefined || value === null ? '--' : Math.round(value).toString();
  }

  render() {
    const tier = this.tier;
    const attrs = this.attributes;

    return (
      <Host
        class={{
          'fut': true,
          'fut--interactive': this.interactive,
          'fut--flipped': this.flipped,
          'fut--compact': this.compact,
          'fut--tier-none': tier === null,
          [`fut--tier-${tier}`]: tier !== null,
        }}
        role={this.interactive ? 'button' : undefined}
        tabindex={this.interactive ? '0' : undefined}
        aria-pressed={this.interactive ? String(this.flipped) : undefined}
        aria-label={`${this.name}, ${this.position ?? 'jugador'}. ${
          this.flipped ? 'Mostrando estadísticas' : 'Toca para girar la carta'
        }`}
        onClick={this.interactive ? this.handleActivate : undefined}
        onKeyDown={this.interactive ? this.handleActivate : undefined}
      >
        {this.showInfo ? (
          <button
            type="button"
            class="fut__info"
            aria-label="Ver detalle del jugador"
            onClick={this.handleInfo}
            onKeyDown={this.handleInfo}
          >
            <span aria-hidden="true">i</span>
          </button>
        ) : null}

        <div class="fut__scene">
          <div class="fut__card">
            {/* ---------- FRONT ---------- */}
            <div class="fut__face fut__face--front" part="front">
              <div class="fut__backdrop" aria-hidden="true"></div>

              <div class="fut__token" part="token">
                {tier !== null ? (
                  <span class="fut__badge">{this.overallLabel}</span>
                ) : null}
                {this.imageUrl ? (
                  <img src={this.imageUrl} alt="" loading="lazy" />
                ) : (
                  <span class="fut__initials" aria-hidden="true">
                    {this.initials}
                  </span>
                )}
              </div>

              <span class="fut__pos">{this.position ?? '--'}</span>

              <h3 class="fut__name" title={this.name}>{this.name}</h3>
            </div>

            {/* ---------- BACK — mini header + six attributes (2-col grid) ---------- */}
            <div class="fut__face fut__face--back" part="back">
              <div class="fut__backdrop" aria-hidden="true"></div>

              <div class="fut__back-head">
                <span class="fut__back-ovr">{this.overallLabel}</span>
                <span class="fut__back-dot" aria-hidden="true">·</span>
                <span class="fut__back-pos">{this.position ?? '--'}</span>
              </div>

              <div class="fut__grid">
                {attrs.map(a => (
                  <div class="fut__stat">
                    <span class="fut__stat-label">{a.label}</span>
                    <span class="fut__stat-val">{FmaFutCard.attrValue(a.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Host>
    );
  }
}
