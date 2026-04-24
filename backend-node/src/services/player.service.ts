import { PlayerRepository } from '../repositories/player.repository';

export class PlayerService {
  constructor(private readonly playerRepo: PlayerRepository) {}

  async getAllPlayers() {
    return this.playerRepo.getAll();
  }
}
