export interface ImageSourceStrategy {
  resolve(rawUrl: string | null): string;
}

export const PLAYER_PLACEHOLDER = 'assets/img/player-placeholder.svg';
