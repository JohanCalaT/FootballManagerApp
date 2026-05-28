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
 * Tap / click (or Enter / Space) flips the card on its vertical axis:
 *   - Front: tier-framed portrait, big overall, position, name, club and a
 *     compact 6-attribute strip — the classic Ultimate Team face.
 *   - Back:  the six attributes laid out as labelled gauges plus the AI's
 *     justification (`reason`) for picking this player.
 *
 * Data-source agnostic by design: every value arrives through props, so the
 * host can feed it mock fixtures (this preview), a future stats-bearing
 * ideal-team response, or a per-player fetch — the component does not care.
 *
 * Attributes are 0–99 (FUT scale), not the app's 0–10 statistic rating; the
 * AI is expected to emit them on the FUT scale. Tier (bronze / silver / gold
 * / icon) is derived from `overall` using FUT thresholds and drives the frame
 * colour, mirroring the ring tiers of <fma-player-card>.
 *
 * Goalkeepers swap the outfield labels (PAC/SHO/PAS/DRI/DEF/PHY) for the GK
 * set (DIV/HAN/KIC/REF/SPD/POS) over the same six numeric slots.
 *
 * Inherits --app-* design tokens through the shadow boundary with local
 * fallbacks, so it renders sensibly in a token-less host.
 */
@Component({
  tag: 'fma-fut-card',
  styleUrl: 'fma-fut-card.css',
  shadow: true,
})
export class FmaFutCard {
  /** Player display name (required). */
  @Prop() name!: string;

  /** Club / team name. */
  @Prop() team?: string;

  /**
   * Fine-grained position from the ideal-team response (GK, CB, ST, CAM…).
   * Shown verbatim on the front. A leading "GK" switches the back labels to
   * the goalkeeper set.
   */
  @Prop() position?: string;

  /** Player photo URL. Falls back to initials token when absent. */
  @Prop() imageUrl?: string;

  /** Nationality label, shown small under the overall on the front. */
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

  /** Gemini's justification for picking this player — shown on the back. */
  @Prop() reason?: string;

  /**
   * Flip state. Mutable so the host can drive it (e.g. flip the whole team
   * at once) while taps still toggle it locally. Reflected to an attribute
   * for easy CSS hooks from the host.
   */
  @Prop({ mutable: true, reflect: true }) flipped: boolean = false;

  /**
   * When true the card is keyboard-interactive and flips on activation.
   * Set false for purely-decorative / externally-driven contexts.
   */
  @Prop() interactive: boolean = true;

  /**
   * Compact variant for the ideal-team pitch, where all 11 must fit on a
   * phone. Drops the club, nationality and hint and shrinks the token so the
   * front shows just overall + position + portrait + name; the back keeps the
   * gauges (no justification). Tap still flips to reveal stats.
   */
  @Prop() compact: boolean = false;

  /** Emits the new flip state whenever the card turns. */
  @Event({ eventName: 'flipChange' })
  flipChange!: EventEmitter<{ name: string; flipped: boolean }>;

  private handleActivate = (ev: KeyboardEvent | MouseEvent): void => {
    if (!this.interactive) return;
    if (ev instanceof KeyboardEvent) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
    }
    this.flipped = !this.flipped;
    this.flipChange.emit({ name: this.name, flipped: this.flipped });
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
        aria-label={`${this.name}, ${this.position ?? 'jugador'}${
          this.team ? ` de ${this.team}` : ''
        }. ${this.flipped ? 'Mostrando estadísticas' : 'Toca para ver estadísticas'}`}
        onClick={this.interactive ? this.handleActivate : undefined}
        onKeyDown={this.interactive ? this.handleActivate : undefined}
      >
        <div class="fut__scene">
          <div class="fut__card">
            {/* ---------- FRONT ---------- */}
            <div class="fut__face fut__face--front" part="front">
              <div class="fut__backdrop" aria-hidden="true"></div>

              <div class="fut__top">
                <div class="fut__rating">
                  <span class="fut__overall">{this.overallLabel}</span>
                  <span class="fut__pos">{this.position ?? '--'}</span>
                  {this.nationality ? (
                    <span class="fut__nat" title={this.nationality}>
                      {this.nationality}
                    </span>
                  ) : null}
                </div>
              </div>

              <div class="fut__token" part="token">
                {this.imageUrl ? (
                  <img src={this.imageUrl} alt="" loading="lazy" />
                ) : (
                  <span class="fut__initials" aria-hidden="true">
                    {this.initials}
                  </span>
                )}
              </div>

              <div class="fut__body">
                <h3 class="fut__name" title={this.name}>{this.name}</h3>
                {this.team ? (
                  <p class="fut__team" title={this.team}>{this.team}</p>
                ) : null}
              </div>

              {this.interactive ? (
                <span class="fut__hint" aria-hidden="true">↻ estadísticas</span>
              ) : null}
            </div>

            {/* ---------- BACK — stats only, no identity repeated ---------- */}
            <div class="fut__face fut__face--back" part="back">
              <div class="fut__backdrop" aria-hidden="true"></div>

              <div class="fut__grid">
                {attrs.map(a => {
                  const pct = a.value === undefined || a.value === null
                    ? 0
                    : Math.max(0, Math.min(100, a.value));
                  return (
                    <div class="fut__stat">
                      <div class="fut__stat-row">
                        <span class="fut__stat-label">{a.label}</span>
                        <span class="fut__stat-val">{FmaFutCard.attrValue(a.value)}</span>
                      </div>
                      <div class="fut__stat-track">
                        <div class="fut__stat-fill" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {this.reason ? (
                <div class="fut__reason">
                  <span class="fut__reason-label">Por qué juega</span>
                  <p class="fut__reason-text">{this.reason}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Host>
    );
  }
}
