import { Injectable } from '@angular/core';
import {
  Haptics,
  ImpactStyle,
  NotificationType,
} from '@capacitor/haptics';

/**
 * Thin wrapper around `@capacitor/haptics` for tactile feedback.
 *
 * Every call is fire-and-forget and swallows errors: on the web the plugin
 * falls back to the Vibration API (a no-op on most desktops) and may reject
 * when no implementation is available. Callers never await this — a missing
 * buzz must never break a UI flow — so the methods return void.
 *
 * Used by the "Equipo Ideal" reveal to add FUT-pack "juice": a heavy thud when
 * the pack bursts, a light tick as each card snaps onto the pitch, and a
 * success buzz when the eleven is complete.
 */
@Injectable({ providedIn: 'root' })
export class HapticsService {
  /** Sharp thud — the pack bursting open. */
  heavy(): void {
    this.run(() => Haptics.impact({ style: ImpactStyle.Heavy }));
  }

  /** Soft tick — a card landing, a selection. */
  light(): void {
    this.run(() => Haptics.impact({ style: ImpactStyle.Light }));
  }

  /** Celebration buzz — the eleven is complete. */
  success(): void {
    this.run(() => Haptics.notification({ type: NotificationType.Success }));
  }

  private run(action: () => Promise<unknown>): void {
    try {
      void action().catch(() => undefined);
    } catch {
      // Plugin missing / unsupported platform — feedback is optional.
    }
  }
}
