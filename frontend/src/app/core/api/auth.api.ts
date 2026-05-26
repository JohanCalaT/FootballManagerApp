import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GATEWAY_URL } from '../tokens/gateway-url.token';
import { ApiResponse } from '../models/api-response.model';
import { AuthUser, LoginRequest, RegisterRequest } from '../models/user.model';

interface AuthPayload {
  user: AuthUser;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(GATEWAY_URL);

  async login(payload: LoginRequest): Promise<ApiResponse<AuthPayload>> {
    return firstValueFrom(
      this.http.post<ApiResponse<AuthPayload>>(`${this.base}/api/auth/login`, payload),
    );
  }

  async register(payload: RegisterRequest): Promise<ApiResponse<AuthPayload>> {
    return firstValueFrom(
      this.http.post<ApiResponse<AuthPayload>>(`${this.base}/api/auth/register`, payload),
    );
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.base}/api/auth/logout`, {}));
  }
}
