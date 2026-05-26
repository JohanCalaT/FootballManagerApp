import { Injectable } from '@angular/core';
import { ImageSourceStrategy, PLAYER_PLACEHOLDER } from './image-source.strategy';

@Injectable({ providedIn: 'root' })
export class UrlImageStrategy implements ImageSourceStrategy {
  private readonly safe = /^https?:\/\//i;

  resolve(rawUrl: string | null): string {
    if (!rawUrl || !this.safe.test(rawUrl)) return PLAYER_PLACEHOLDER;
    return rawUrl;
  }
}
