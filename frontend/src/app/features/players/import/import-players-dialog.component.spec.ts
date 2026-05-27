import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/standalone';

import { PlayersApi } from '../../../core/api/players.api';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ApiFootballProfile, ImportResult } from '../../../core/models/api-football.model';

import { ImportPlayersDialogComponent } from './import-players-dialog.component';

function profile(id: number, name = `P-${id}`): ApiFootballProfile {
  return {
    apiFootballId: id, name,
    firstName: null, lastName: null, nationality: null,
    birthDate: null, birthPlace: null, birthCountry: null,
    height: null, weight: null, shirtNumber: null,
    position: null, photo: null,
  };
}
function ok<T>(data: T, status = 200, message = 'OK'): ApiResponse<T> {
  return { status, message, data, _links: {} };
}

describe('ImportPlayersDialogComponent', () => {
  let fixture: ComponentFixture<ImportPlayersDialogComponent>;
  let api: jasmine.SpyObj<PlayersApi>;
  let modalCtrl: jasmine.SpyObj<ModalController>;

  beforeEach(() => {
    api = jasmine.createSpyObj<PlayersApi>('PlayersApi', [
      'searchExternalOnce', 'seasonsOfOnce', 'import',
    ]);
    modalCtrl = jasmine.createSpyObj<ModalController>('ModalController', ['dismiss']);
    modalCtrl.dismiss.and.resolveTo(true);

    TestBed.configureTestingModule({
      imports: [ImportPlayersDialogComponent],
      providers: [
        { provide: PlayersApi, useValue: api },
        { provide: ModalController, useValue: modalCtrl },
      ],
    });
    fixture = TestBed.createComponent(ImportPlayersDialogComponent);
  });

  it('shows the plan-free banner and search bar initially', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid=import-plan-free-banner]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid=import-search]')).toBeTruthy();
  });

  it('renders the result summary after a successful submit', async () => {
    api.searchExternalOnce.and.resolveTo(ok([profile(1)]));
    api.seasonsOfOnce.and.resolveTo(ok([2024]));
    const result: ImportResult = { imported: [{ id: 'x', name: 'Messi', team: 'Inter Miami' } as never], failed: [] };
    api.import.and.resolveTo(ok(result, 201));

    fixture.detectChanges();
    await fixture.componentInstance['store'].search('messi');
    await fixture.componentInstance['store'].toggle(1);
    await fixture.componentInstance['store'].submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid=import-result]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid=import-search]')).toBeFalsy();
  });

  it('close dismisses the modal with the imported count', () => {
    fixture.detectChanges();
    fixture.componentInstance['store'].result.set({ imported: [{ id: 'a' } as never, { id: 'b' } as never], failed: [] });
    fixture.componentInstance['close']();
    expect(modalCtrl.dismiss).toHaveBeenCalledOnceWith({ importedCount: 2 }, 'cancel');
  });
});
