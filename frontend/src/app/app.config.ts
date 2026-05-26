import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import {
  PreloadAllModules,
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
} from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app.routes';
import { authInterceptor } from './core/http/auth.interceptor';
import { backendTargetInterceptor } from './core/http/backend-target.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { GATEWAY_URL } from './core/tokens/gateway-url.token';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({ mode: 'md' }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, backendTargetInterceptor, errorInterceptor]),
    ),
    { provide: GATEWAY_URL, useValue: environment.gatewayUrl },
  ],
};
