import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { ConfigApi } from './config.api';
import { GATEWAY_URL } from '../tokens/gateway-url.token';

describe('ConfigApi', () => {
  let api: ConfigApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ConfigApi,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GATEWAY_URL, useValue: '' },
      ],
    });
    api = TestBed.inject(ConfigApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /config/backend returns the active status', async () => {
    const promise = api.getActive();

    const req = http.expectOne('/config/backend');
    expect(req.request.method).toBe('GET');
    req.flush({ active: 'node', available: ['dotnet', 'node'] });

    await expectAsync(promise).toBeResolvedTo({
      active: 'node',
      available: ['dotnet', 'node'],
    });
  });

  it('POST /config/backend sends the chosen backend', async () => {
    const promise = api.setActive('node');

    const req = http.expectOne('/config/backend');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ backend: 'node' });
    req.flush({ active: 'node', available: ['dotnet', 'node'] });

    const status = await promise;
    expect(status.active).toBe('node');
  });
});
