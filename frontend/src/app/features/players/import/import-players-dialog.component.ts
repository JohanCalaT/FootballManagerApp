import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IonContent, ModalController } from '@ionic/angular/standalone';

import { ApiFootballProfile } from '../../../core/models/api-football.model';

import { ImportFlowStore } from './import-flow.store';
import { ImportPlayerCardComponent } from './components/import-player-card/import-player-card.component';
import { ImportResultSummaryComponent } from './components/import-result-summary/import-result-summary.component';
import { ImportSearchBarComponent } from './components/import-search-bar/import-search-bar.component';
import { ImportSummaryFooterComponent } from './components/import-summary-footer/import-summary-footer.component';

@Component({
  selector: 'app-import-players-dialog',
  standalone: true,
  imports: [
    IonContent,
    ImportSearchBarComponent,
    ImportPlayerCardComponent,
    ImportSummaryFooterComponent,
    ImportResultSummaryComponent,
  ],
  providers: [ImportFlowStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './import-players-dialog.component.html',
  styleUrls: ['./import-players-dialog.component.scss'],
})
export class ImportPlayersDialogComponent {
  private readonly modalCtrl = inject(ModalController);
  protected readonly store = inject(ImportFlowStore);

  protected readonly skeletonSlots = Array.from({ length: 4 });

  protected readonly emptyKind = computed<'idle' | 'no-results' | 'error' | null>(() => {
    if (this.store.searchError()) return 'error';
    if (this.store.searchLoading()) return null;
    if (this.store.searchResults().length > 0) return null;
    return this.store.query() ? 'no-results' : 'idle';
  });

  protected readonly trackByApiId = (_i: number, p: ApiFootballProfile): number => p.apiFootballId;

  protected onSearchQuery(query: string): void {
    void this.store.search(query);
  }

  protected onCardToggled(apiFootballId: number): void {
    void this.store.toggle(apiFootballId);
  }

  protected onSubmit(): void {
    void this.store.submit();
  }

  protected onClear(): void {
    this.store.clearAll();
  }

  protected close(): void {
    const importedCount = this.store.result()?.imported.length ?? 0;
    void this.modalCtrl.dismiss({ importedCount }, 'cancel');
  }
}
