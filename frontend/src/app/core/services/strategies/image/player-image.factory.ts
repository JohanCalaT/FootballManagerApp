import { Injectable, inject } from '@angular/core';

import { ApiFootballImageSource } from './api-football-image.source';
import { ExternalUrlImageSource } from './external-url-image.source';
import { FirebaseStorageImageSource } from './firebase-storage-image.source';
import {
  IPlayerImageSource,
  ImageInputFor,
  ImageSourceKind,
  PlayerImageInput,
  PlayerImageResult,
} from './player-image-source';

/**
 * Single dispatch point that turns an `ImageSourceKind` into its concrete
 * strategy. Components depend ONLY on this factory and the contract — they
 * never import `FirebaseStorageImageSource` etc. directly. That is the
 * "componentes solo conocen la interfaz" clause that justifies the DAH
 * matrícula (see CLAUDE.md → DAH → matrícula).
 *
 * Both shapes are exposed deliberately:
 *
 *   - `create(kind)` returns the strongly-typed strategy when the caller
 *     already knows which input shape it has.
 *   - `provide(input)` is a one-call convenience for the common case where
 *     the caller built a discriminated `PlayerImageInput` and just wants
 *     the resulting `{ url, imageSource, storagePath? }`.
 */
@Injectable({ providedIn: 'root' })
export class PlayerImageFactory {
  private readonly api = inject(ApiFootballImageSource);
  private readonly url = inject(ExternalUrlImageSource);
  private readonly firebase = inject(FirebaseStorageImageSource);

  create<K extends ImageSourceKind>(kind: K): IPlayerImageSource<K> {
    switch (kind) {
      case 'api':
        return this.api as unknown as IPlayerImageSource<K>;
      case 'url':
        return this.url as unknown as IPlayerImageSource<K>;
      case 'firebase':
        return this.firebase as unknown as IPlayerImageSource<K>;
    }
    // Exhaustive switch — TS will flag if a new kind is added without a branch.
    throw new Error(`Unsupported image source kind: ${kind satisfies never}`);
  }

  provide(input: PlayerImageInput): Promise<PlayerImageResult> {
    const strategy = this.create(input.kind);
    return strategy.provide(input as ImageInputFor<typeof input.kind>);
  }
}
