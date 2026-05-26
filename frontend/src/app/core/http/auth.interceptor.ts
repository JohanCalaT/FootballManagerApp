import { HttpInterceptorFn } from '@angular/common/http';
import { authToken } from '../state/auth.signal';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = authToken();
  if (!token) {
    return next(req);
  }
  const cloned = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return next(cloned);
};
