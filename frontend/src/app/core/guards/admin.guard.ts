import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { isAdmin, isAuthenticated } from '../state/auth.signal';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (!isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }
  if (!isAdmin()) {
    return router.createUrlTree(['/players']);
  }
  return true;
};
