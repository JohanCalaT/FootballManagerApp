import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../src/middleware/error.middleware';
import {
  PlayerNotFoundError, DuplicatePlayerError, ValidationError,
  ForbiddenError, UnauthorizedError,
} from '../../src/errors/domain.errors';
import {
  ApiFootballRateLimited, ApiFootballTimeout, ApiFootballUpstreamError,
} from '../../src/errors/apiFootball.errors';

const makeRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res as Response;
};

const noop: NextFunction = () => {};

describe('errorHandler middleware', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Silencia el console.error del fallback 500 para no ensuciar el output
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => consoleSpy.mockRestore());

  describe('DomainError', () => {
    it.each([
      [new PlayerNotFoundError('abc'),  404],
      [new DuplicatePlayerError('dup'), 409],
      [new ValidationError('bad'),      400],
      [new UnauthorizedError(),         401],
      [new ForbiddenError(),            403],
    ])('maps %s to %d', (err, expectedStatus) => {
      const res = makeRes();
      errorHandler(err, {} as Request, res, noop);
      expect(res.status).toHaveBeenCalledWith(expectedStatus);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status:  expectedStatus,
        message: err.message,
        data:    null,
        _links:  {},
      }));
    });
  });

  describe('ApiFootballError', () => {
    it.each([
      [new ApiFootballRateLimited(),       503],
      [new ApiFootballTimeout(),           504],
      [new ApiFootballUpstreamError(500),  502],
    ])('maps %s to %d', (err, expectedStatus) => {
      const res = makeRes();
      errorHandler(err, {} as Request, res, noop);
      expect(res.status).toHaveBeenCalledWith(expectedStatus);
    });
  });

  describe('Mongoose errors', () => {
    it('maps Mongoose ValidationError (name === "ValidationError") to 400', () => {
      const err = new Error('Path `name` is required.');
      err.name = 'ValidationError';
      const res = makeRes();

      errorHandler(err, {} as Request, res, noop);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Validación'),
      }));
    });

    it('maps Mongoose CastError to 400 with neutral message', () => {
      const err = new Error('Cast to ObjectId failed');
      err.name = 'CastError';
      const res = makeRes();

      errorHandler(err, {} as Request, res, noop);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Identificador inválido',
      }));
    });

    it('maps Mongo duplicate key (code 11000) to 409', () => {
      const err = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
      const res = makeRes();

      errorHandler(err, {} as Request, res, noop);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('fallback 500', () => {
    it('maps any uncategorized Error to 500 and logs to console', () => {
      const res = makeRes();
      const err = new Error('boom');

      errorHandler(err, {} as Request, res, noop);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 500,
        message: 'Error interno',
      }));
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('handles non-Error throwables (e.g. string)', () => {
      const res = makeRes();
      errorHandler('not even an Error', {} as Request, res, noop);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('never exposes the original message in the 500 response', () => {
      const res = makeRes();
      errorHandler(new Error('SQL injection x; DROP TABLE'), {} as Request, res, noop);
      const payload = (res.json as jest.Mock).mock.calls[0][0];
      expect(payload.message).toBe('Error interno');
      expect(payload.message).not.toMatch(/DROP TABLE/);
    });
  });
});
