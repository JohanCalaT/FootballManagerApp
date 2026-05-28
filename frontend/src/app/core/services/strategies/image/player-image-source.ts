/**
 * Image-source Strategy contract for the player image picker (DAH matrícula).
 *
 * The picker UI knows ONLY this interface and the `PlayerImageFactory`. Each
 * concrete strategy encapsulates "how do I turn this user intent into a
 * `{ url, imageSource }` pair the backend can persist":
 *
 *   - 'api'      → API-Football already gave us a remote URL, passthrough.
 *   - 'url'      → the user pasted a public image URL, just validate.
 *   - 'firebase' → the user picked a local file, compress + upload to
 *                  Firebase Storage and surface the downloadURL.
 *
 * Adding a new provider tomorrow (Cloudinary, S3, …) means a new strategy
 * + factory branch. No UI churn, no `if (kind === …)` in components.
 */

export type ImageSourceKind = 'firebase' | 'api' | 'url';

export interface PlayerImageResult {
  /** Public URL the backend persists in `player.imageUrl`. */
  readonly url: string;
  readonly imageSource: ImageSourceKind;
  /**
   * Storage path inside the bucket, only set for 'firebase' uploads. The
   * caller keeps it to delete the previous blob after a successful update —
   * see CLAUDE.md → Imágenes (cleanup orquestado por el form padre).
   */
  readonly storagePath?: string;
}

export interface ApiImageInput {
  readonly kind: 'api';
  readonly apiUrl: string;
}

export interface UrlImageInput {
  readonly kind: 'url';
  readonly url: string;
}

export interface FirebaseImageInput {
  readonly kind: 'firebase';
  readonly file: File;
  /** Firebase Auth uid — must match `request.auth.uid` in storage.rules. */
  readonly ownerUid: string;
}

export type PlayerImageInput = ApiImageInput | UrlImageInput | FirebaseImageInput;

/**
 * Map an `ImageSourceKind` to its concrete input shape. Lets the factory and
 * strategies stay type-safe without manual casts at call sites.
 */
export type ImageInputFor<K extends ImageSourceKind> = Extract<PlayerImageInput, { kind: K }>;

export interface IPlayerImageSource<K extends ImageSourceKind = ImageSourceKind> {
  readonly kind: K;
  provide(input: ImageInputFor<K>): Promise<PlayerImageResult>;
}

/**
 * Thrown by any strategy when its input is invalid or the underlying provider
 * fails. The picker maps this to a user-facing toast and resets its state.
 */
export class ImageSourceError extends Error {
  constructor(
    public readonly kind: ImageSourceKind,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ImageSourceError';
  }
}
