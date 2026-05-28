import { Injectable, inject } from '@angular/core';
import {
  Storage,
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from '@angular/fire/storage';
import imageCompression from 'browser-image-compression';

export interface UploadOptions {
  /** Max post-compression size, in KB. Defaults to 200KB. */
  readonly maxKB?: number;
  /** Max longest side, in pixels. Defaults to 800px. */
  readonly maxPx?: number;
  /** Skip compression entirely (use only for already-optimized assets). */
  readonly skipCompression?: boolean;
}

export interface UploadResult {
  /** Public downloadURL — what we persist on `player.imageUrl`. */
  readonly url: string;
  /** Storage path used, kept by the caller to delete the blob later. */
  readonly path: string;
}

/**
 * Thin wrapper around `@angular/fire/storage` so the rest of the app never
 * imports the SDK directly. Two responsibilities:
 *
 *   1. Compress images on the client before upload (browser-image-compression)
 *      so we don't burn the Firebase free quota on 4MB phone photos and the
 *      home grid stays fast.
 *   2. Hide the `ref → uploadBytes → getDownloadURL` dance behind a single
 *      promise that returns both the URL (for the backend) and the path
 *      (for later cleanup orchestrated by the form parent).
 *
 * The compression step lives here — not in the Firebase strategy — so any
 * future provider that swaps Firebase out (Cloudinary, S3) keeps the same
 * client-side optimization for free.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseStorageService {
  private readonly storage = inject(Storage);

  async upload(path: string, file: File, opts: UploadOptions = {}): Promise<UploadResult> {
    const payload = opts.skipCompression ? file : await this.compress(file, opts);
    const objectRef = ref(this.storage, path);
    await uploadBytes(objectRef, payload, { contentType: payload.type || file.type });
    const url = await getDownloadURL(objectRef);
    return { url, path };
  }

  async delete(path: string): Promise<void> {
    await deleteObject(ref(this.storage, path));
  }

  private async compress(file: File, opts: UploadOptions): Promise<File> {
    return imageCompression(file, {
      maxSizeMB: (opts.maxKB ?? 200) / 1024,
      maxWidthOrHeight: opts.maxPx ?? 800,
      useWebWorker: true,
      // Preserve PNG transparency etc.; jpeg conversion would hurt logos.
      fileType: file.type || undefined,
    });
  }
}
