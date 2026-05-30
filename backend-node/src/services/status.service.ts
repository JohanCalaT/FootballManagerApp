import mongoose from 'mongoose';
import { PlayerModel } from '../models/player.model';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require('../../package.json') as { version: string };

// ─────────────── Counter de peticiones (en memoria) ───────────────

const startTime = Date.now();
let requestsToday = 0;

export const incrementRequestCounter = (): void => { requestsToday += 1; };
export const resetRequestCounter     = (): void => { requestsToday = 0; }; // tests

// ─────────────── Métricas ───────────────

export interface RecentPlayer {
  name:         string;
  team:         string;
  league:       string;
  registeredAt: Date;
}

export interface StatusMetrics {
  service:       string;
  version:       string;
  uptime:        string;
  dbConnected:   boolean;
  dbHost:        string;
  totalPlayers:  number;
  totalComments: number;
  requestsToday: number;
  recentPlayers: RecentPlayer[];
}

const uptimeSec  = (): number => Math.floor((Date.now() - startTime) / 1000);

const formatUptime = (totalSec: number): string => {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${m}m ${s}s`;
};

/**
 * Reúne las métricas para el panel `/status`. Defensa contra BD caída:
 * si mongoose no está conectado devolvemos un objeto seguro en lugar de
 * dejar caer la ruta — para que el panel siga siendo útil aunque el
 * cluster esté inaccesible.
 */
export const getStatusMetrics = async (): Promise<StatusMetrics> => {
  const dbConnected = mongoose.connection.readyState === 1;
  if (!dbConnected) {
    return {
      service:       'node-backend',
      version:       pkg.version,
      uptime:        formatUptime(uptimeSec()),
      dbConnected:   false,
      dbHost:        'n/a',
      totalPlayers:  0,
      totalComments: 0,
      requestsToday,
      recentPlayers: [],
    };
  }

  const [totalPlayers, commentAggregate, recentPlayers] = await Promise.all([
    PlayerModel.countDocuments().exec(),
    PlayerModel.aggregate<{ total: number }>([
      // $ifNull blinda contra documentos legacy sin el campo comments
      { $project: { count: { $size: { $ifNull: ['$comments', []] } } } },
      { $group:   { _id: null, total: { $sum: '$count' } } },
    ]).exec(),
    PlayerModel.find()
      .sort({ registeredAt: -1 })
      .limit(5)
      .select('name team league registeredAt')
      .lean<RecentPlayer[]>()
      .exec(),
  ]);

  return {
    service:       'node-backend',
    version:       pkg.version,
    uptime:        formatUptime(uptimeSec()),
    dbConnected:   true,
    dbHost:        mongoose.connection.host ?? 'n/a',
    totalPlayers,
    totalComments: commentAggregate[0]?.total ?? 0,
    requestsToday,
    recentPlayers,
  };
};
