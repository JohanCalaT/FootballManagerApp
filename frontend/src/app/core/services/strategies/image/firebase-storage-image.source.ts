import { Injectable, inject } from '@angular/core';

import { FirebaseStorageService } from '../../firebase-storage.service';
import {
  FirebaseImageInput,
  IPlayerImageSource,
  ImageSourceError,
  PlayerImageResult,
} from './player-image-source';

/**
 * Uploads a local `File` (camera capture or file picker) to Firebase Storage
 * under `players/{ownerUid}/{timestamp}-{rand}.{ext}` and returns the
 * `downloadURL` plus the storage path.
 *
 * The path prefix `players/{ownerUid}` MUST match the storage.rules clause
 * `match /players/{uid}/...` for `request.auth.uid == uid` to allow the
 * write. Changing the prefix here without updating the rules makes every
 * upload fail with 403 — keep them in sync.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseStorageImageSource implements IPlayerImageSource<'firebase'> {
  readonly kind = 'firebase' as const;
  private readonly storage = inject(FirebaseStorageService);

  async provide(input: FirebaseImageInput): Promise<PlayerImageResult> {
    if (!input.ownerUid) {
      throw new ImageSourceError(
        'firebase',
        'Falta el uid del usuario para subir la imagen.',
      );
    }
    if (!input.file || input.file.size === 0) {
      throw new ImageSourceError('firebase', 'No se seleccionó ningún archivo.');
    }
    if (!input.file.type.startsWith('image/')) {
      throw new ImageSourceError(
        'firebase',
        `Solo se permiten imágenes (recibido: ${input.file.type || 'desconocido'}).`,
      );
    }

    const path = this.buildPath(input.ownerUid, input.file);
    try {
      const { url } = await this.storage.upload(path, input.file);
      return { url, imageSource: 'firebase', storagePath: path };
    } catch (err) {
      throw new ImageSourceError('firebase', 'No se pudo subir la imagen.', err);
    }
  }

  private buildPath(ownerUid: string, file: File): string {
    const ext = this.extensionFor(file);
    const rand = Math.random().toString(36).slice(2, 10);
    return `players/${ownerUid}/${Date.now()}-${rand}${ext}`;
  }

  private extensionFor(file: File): string {
    const fromName = file.name.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase();
    if (fromName) return fromName;
    const fromMime = file.type.split('/')[1];
    return fromMime ? `.${fromMime}` : '';
  }
}
