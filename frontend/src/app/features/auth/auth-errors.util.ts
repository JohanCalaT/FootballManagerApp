/**
 * Map Firebase Auth error codes to user-facing Spanish messages. Anything
 * unrecognized falls through to a generic message so the UI never leaks raw
 * `auth/...` codes to the user.
 */
export function describeAuthError(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = String((err as { code: unknown }).code);
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Correo o contraseña incorrectos.';
      case 'auth/email-already-in-use':
        return 'Este correo ya está registrado.';
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres.';
      case 'auth/invalid-email':
        return 'El correo no es válido.';
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'Has cerrado la ventana antes de completar el acceso.';
      case 'auth/network-request-failed':
        return 'Sin conexión. Comprueba tu red e inténtalo de nuevo.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
      default:
        return 'No se pudo completar la operación. Inténtalo más tarde.';
    }
  }
  return 'Error desconocido.';
}
