import { HttpInterceptorFn } from '@angular/common/http';
import { backendChoice } from '../state/backend-choice.signal';

export const backendTargetInterceptor: HttpInterceptorFn = (req, next) => {
  const cloned = req.clone({
    setHeaders: { 'X-Backend-Target': backendChoice() },
  });
  return next(cloned);
};
