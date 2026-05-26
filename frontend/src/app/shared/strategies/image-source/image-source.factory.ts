import { Injectable, inject } from '@angular/core';
import { ImageSource } from '../../../core/models/player.model';
import { ApiImageStrategy } from './api-image.strategy';
import { BlobImageStrategy } from './blob-image.strategy';
import { ImageSourceStrategy } from './image-source.strategy';
import { UrlImageStrategy } from './url-image.strategy';

@Injectable({ providedIn: 'root' })
export class ImageSourceFactory {
  private readonly blob = inject(BlobImageStrategy);
  private readonly api = inject(ApiImageStrategy);
  private readonly url = inject(UrlImageStrategy);

  for(source: ImageSource | null | undefined): ImageSourceStrategy {
    switch (source) {
      case 'blob':
        return this.blob;
      case 'api':
        return this.api;
      case 'url':
        return this.url;
      default:
        return this.url;
    }
  }
}
