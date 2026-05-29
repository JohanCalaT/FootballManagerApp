import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';

import { IdealTeamPage } from './ideal-team.page';
import { IdealTeamApi } from '../../core/api/ideal-team.api';
import { HapticsService } from '../../core/services/haptics.service';
import {
  IdealTeamPlayer,
  IdealTeamResponse,
} from '../../core/models/ideal-team.model';
import { ApiResponse } from '../../core/models/api-response.model';

function player(id: string, position = 'ST'): IdealTeamPlayer {
  return {
    id,
    name: id,
    team: 'T',
    position,
    x: 0.5,
    y: 0.5,
    reason: 'r',
    overall: 85,
    pac: 80,
    sho: 81,
    pas: 82,
    dri: 83,
    def: 70,
    phy: 75,
  };
}

function team(): IdealTeamResponse {
  return {
    formation: '4-3-3',
    goalkeeper: player('gk', 'GK'),
    defenders: [],
    midfielders: [],
    attackers: [],
    generalJustification: 'porque sí',
  };
}

function ok(data: IdealTeamResponse): ApiResponse<IdealTeamResponse> {
  return { status: 200, message: 'OK', data, _links: {} };
}

describe('IdealTeamPage', () => {
  let comp: IdealTeamPage;
  let api: jasmine.SpyObj<IdealTeamApi>;
  let location: jasmine.SpyObj<Location>;

  beforeEach(() => {
    api = jasmine.createSpyObj<IdealTeamApi>('IdealTeamApi', ['generate']);
    location = jasmine.createSpyObj<Location>('Location', ['back']);
    TestBed.configureTestingModule({
      providers: [
        IdealTeamPage,
        { provide: IdealTeamApi, useValue: api },
        { provide: Location, useValue: location },
        {
          provide: HapticsService,
          useValue: jasmine.createSpyObj('HapticsService', ['heavy', 'light', 'success']),
        },
      ],
    });
    comp = TestBed.inject(IdealTeamPage);
  });

  it('starts on the form phase with the 4-3-3 formation', () => {
    expect(comp['phase']()).toBe('form');
    expect(comp['formation']()).toBe('4-3-3');
  });

  it('changes the formation from the segment', () => {
    comp['onFormationChange']({ detail: { value: '4-4-2' } } as CustomEvent);
    expect(comp['formation']()).toBe('4-4-2');
  });

  it('goBack delegates to Location.back', () => {
    comp['goBack']();
    expect(location.back).toHaveBeenCalled();
  });

  it('maps outfield vs goalkeeper attribute labels', () => {
    expect(comp['attributesFor'](player('p', 'ST')).map((a) => a.label)).toEqual([
      'PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY',
    ]);
    expect(comp['attributesFor'](player('g', 'GK')).map((a) => a.label)).toEqual([
      'DIV', 'HAN', 'KIC', 'REF', 'SPD', 'POS',
    ]);
  });

  it('reaches the pack phase with the eleven on success', fakeAsync(() => {
    const t = team();
    api.generate.and.resolveTo(ok(t));

    void comp['onGenerate']();
    tick(1600); // flush the min-loading hold + microtasks

    expect(api.generate).toHaveBeenCalledWith({ formation: '4-3-3' });
    expect(comp['phase']()).toBe('pack');
    expect(comp['team']()).toEqual(t);
  }));

  it('goes to the error phase with the API message on failure', fakeAsync(() => {
    api.generate.and.rejectWith(
      new HttpErrorResponse({ status: 503, error: { message: 'IA caída' } }),
    );

    void comp['onGenerate']();
    tick(1600);

    expect(comp['phase']()).toBe('error');
    expect(comp['errorMessage']()).toBe('IA caída');
  }));
});
