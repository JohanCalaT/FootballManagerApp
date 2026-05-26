import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { isAuthenticated } from '../state/auth.signal';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/auth/login']);
};
