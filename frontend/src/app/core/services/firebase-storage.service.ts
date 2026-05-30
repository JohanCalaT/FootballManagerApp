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
  /**
   * Center-crop the image to a square before compression. Defaults to true
   * for player photos so every blob in Storage has the same aspect ratio —
   * the home grid's circular tokens render identically regardless of what
   * the user picked from the camera roll.
   */
  readonly square?: boolean;
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
    let payload = file;
    // Square-crop FIRST so the compression library sees a 1:1 image and the
    // `maxWidthOrHeight` cap applies to a side that is meaningful.
    if (opts.square !== false) {
      payload = await this.cropToSquare(payload);
    }
    if (!opts.skipCompression) {
      payload = await this.compress(payload, opts);
    }
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

  /**
   * Center-crop the image to a square via an offscreen canvas. We pick the
   * shorter side as the square's side and copy a centred slice — so a
   * portrait selfie keeps the face, a landscape pitch shot keeps the centre
   * of the action.
   *
   * Returns a fresh File (same name + MIME). Falls back to the original
   * file on any decoding error so an obscure format never blocks an upload.
   */
  private async cropToSquare(file: File): Promise<File> {
    try {
      const bitmap = await createImageBitmap(file);
      const side = Math.min(bitmap.width, bitmap.height);
      if (bitmap.width === bitmap.height) {
        bitmap.close();
        return file;
      }
      const offsetX = Math.floor((bitmap.width - side) / 2);
      const offsetY = Math.floor((bitmap.height - side) / 2);

      const canvas = document.createElement('canvas');
      canvas.width = side;
      canvas.height = side;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        bitmap.close();
        return file;
      }
      ctx.drawImage(bitmap, offsetX, offsetY, side, side, 0, 0, side, side);
      bitmap.close();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, file.type || 'image/jpeg', 0.92),
      );
      if (!blob) return file;
      return new File([blob], file.name, { type: blob.type, lastModified: file.lastModified });
    } catch {
      return file;
    }
  }
}
