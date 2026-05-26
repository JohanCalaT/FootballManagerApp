import { Injectable } from '@angular/core';
import { ImageSourceStrategy, PLAYER_PLACEHOLDER } from './image-source.strategy';

@Injectable({ providedIn: 'root' })
export class BlobImageStrategy implements ImageSourceStrategy {
  resolve(rawUrl: string | null): string {
    if (!rawUrl) return PLAYER_PLACEHOLDER;
    return rawUrl;
  }
}
