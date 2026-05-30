import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/standalone';

import { HomeFiltersComponent } from './home-filters.component';

describe('HomeFiltersComponent', () => {
  let comp: HomeFiltersComponent;
  let modalCtrl: jasmine.SpyObj<ModalController>;

  beforeEach(() => {
    modalCtrl = jasmine.createSpyObj<ModalController>('ModalController', ['dismiss']);
    TestBed.configureTestingModule({
      imports: [HomeFiltersComponent],
      providers: [{ provide: ModalController, useValue: modalCtrl }],
    });
    comp = TestBed.createComponent(HomeFiltersComponent).componentInstance;
  });

  it('dismisses with the trimmed filters on apply (empty → undefined)', () => {
    comp.team = '  FC Barcelona  ';
    comp.league = '';
    comp.from = '2024-01-01';
    comp.to = '';

    comp['apply']();

    expect(modalCtrl.dismiss).toHaveBeenCalledWith(
      { team: 'FC Barcelona', league: undefined, from: '2024-01-01', to: undefined },
      'apply',
    );
  });

  it('clears the fields and applies an empty set', () => {
    comp.team = 'X';
    comp.from = '2024-01-01';

    comp['clear']();

    expect(comp.team).toBe('');
    expect(comp.from).toBe('');
    expect(modalCtrl.dismiss).toHaveBeenCalledWith({}, 'apply');
  });

  it('cancels without applying', () => {
    comp['cancel']();
    expect(modalCtrl.dismiss).toHaveBeenCalledWith(undefined, 'cancel');
  });
});
