import { DestroyRef, Injectable, inject } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from '@angular/fire/auth';

import { AuthUser } from '../models/user.model';
import { clearSession, setSession } from '../state/auth.signal';

/**
 * Wraps Firebase Auth and keeps the shared `auth.signal` state in sync.
 *
 * Firebase auto-refreshes ID tokens every ~55 minutes; `onIdTokenChanged`
 * fires on initial sign-in, on every refresh, and on sign-out, so the
 * signals always reflect the freshest token without us having to poll.
 *
 * The admin flag comes from the JWT custom claim `admin: true` set by the
 * grant-admin script via the Admin SDK. To pick up a newly assigned claim
 * the client must force a token refresh — call `refreshToken()` after
 * promotion, or have the user sign out and back in.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const unsubscribe = onIdTokenChanged(this.auth, (user) => {
      void this.syncSession(user);
    });
    this.destroyRef.onDestroy(unsubscribe);
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async signUpWithEmail(
    email: string,
    password: string,
    displayName: string,
  ): Promise<void> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    await updateProfile(credential.user, { displayName });
    // Force a refresh so the displayName is reflected in the cached User.
    await credential.user.getIdToken(true);
  }

  async signInWithGoogle(): Promise<void> {
    await signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  /** Force-refresh the ID token. Use after a custom claim change (e.g. admin promotion). */
  async refreshToken(): Promise<void> {
    await this.auth.currentUser?.getIdToken(true);
  }

  private async syncSession(user: User | null): Promise<void> {
    if (!user) {
      clearSession();
      return;
    }
    const result = await user.getIdTokenResult();
    const authUser: AuthUser = {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName,
      role: result.claims['admin'] === true ? 'admin' : 'user',
    };
    setSession(authUser, result.token);
  }
}
