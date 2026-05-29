import { TestBed } from '@angular/core/testing';

import { HapticsService } from './haptics.service';

describe('HapticsService', () => {
  let service: HapticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [HapticsService] });
    service = TestBed.inject(HapticsService);
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  // Haptics is fire-and-forget and swallows errors (web fallback / missing
  // plugin), so the contract is simply that callers are never broken by it.
  it('never throws from any feedback method', () => {
    expect(() => {
      service.heavy();
      service.light();
      service.success();
    }).not.toThrow();
  });
});
