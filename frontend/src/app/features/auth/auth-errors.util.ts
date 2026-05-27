/**
 * Classify a Firebase Auth error into field-level + form-level messages so
 * the UI can place each error next to the offending input instead of dumping
 * everything into a single red box.
 *
 * Anything unrecognized lands in `formError` so the user never sees raw
 * `auth/...` codes.
 */
export interface AuthErrorBreakdown {
  emailError: string | null;
  passwordError: string | null;
  /** Anything that does not belong to a single field — network, popup, generic. */
  formError: string | null;
}

const EMPTY: AuthErrorBreakdown = {
  emailError: null,
  passwordError: null,
  formError: null,
};

export function emptyAuthErrors(): AuthErrorBreakdown {
  return { ...EMPTY };
}

export function classifyAuthError(err: unknown): AuthErrorBreakdown {
  const out = emptyAuthErrors();
  if (typeof err !== 'object' || err === null || !('code' in err)) {
    out.formError = 'Error desconocido. Inténtalo de nuevo.';
    return out;
  }
  const code = String((err as { code: unknown }).code);
  switch (code) {
    case 'auth/invalid-email':
      // Format error — safe to flag at the email field (not a credential leak).
      out.emailError = 'El correo no es válido.';
      return out;
    case 'auth/email-already-in-use':
      // Existence-on-signup is intentionally exposed by Firebase, so it's
      // safe to show under the email field at register time.
      out.emailError = 'Este correo ya está registrado.';
      return out;
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      // Privacy: modern Firebase collapses these into auth/invalid-credential
      // so the response never leaks whether the account exists or whether the
      // password is the wrong half. We mirror that — single form-level error
      // for any "credentials don't match" case, regardless of which legacy
      // code the SDK or emulator surfaces.
      out.formError = 'Credenciales inválidas. Revisa correo y contraseña.';
      return out;
    case 'auth/weak-password':
      out.passwordError = 'Mínimo 6 caracteres.';
      return out;
    case 'auth/missing-password':
      out.passwordError = 'Introduce tu contraseña.';
      return out;
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      out.formError = 'Has cerrado la ventana antes de completar el acceso.';
      return out;
    case 'auth/popup-blocked':
      out.formError = 'El navegador ha bloqueado la ventana emergente.';
      return out;
    case 'auth/network-request-failed':
      out.formError = 'Sin conexión. Comprueba tu red e inténtalo de nuevo.';
      return out;
    case 'auth/too-many-requests':
      out.formError = 'Demasiados intentos. Espera unos minutos.';
      return out;
    default:
      out.formError = 'No se pudo completar la operación. Inténtalo más tarde.';
      return out;
  }
}
