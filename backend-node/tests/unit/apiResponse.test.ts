import {
  ok, created, noContent, multiStatus, badRequest, unauthorized,
  forbidden, notFound, conflict, unprocessable, serverError, badGateway,
  serviceUnavailable, gatewayTimeout, paged,
} from '../../src/utils/apiResponse';

describe('apiResponse factories', () => {
  describe('2xx', () => {
    it('ok wraps data with status 200 + "OK"', () => {
      expect(ok({ x: 1 })).toEqual({
        status: 200, message: 'OK', data: { x: 1 }, _links: {},
      });
    });
    it('ok accepts custom message and links', () => {
      expect(ok([], 'Vacio', { self: { href: '/x', rel: 'self', method: 'GET' } }))
        .toMatchObject({ status: 200, message: 'Vacio' });
    });
    it('created uses 201 and defaults message', () => {
      expect(created({ id: 1 })).toEqual({
        status: 201, message: 'Creado correctamente', data: { id: 1 }, _links: {},
      });
    });
    it('noContent uses 204 with null data', () => {
      expect(noContent()).toEqual({
        status: 204, message: 'Sin contenido', data: null, _links: {},
      });
    });
    it('multiStatus uses 207', () => {
      expect(multiStatus({ imported: [], failed: [] }, '0/0'))
        .toMatchObject({ status: 207, message: '0/0' });
    });
  });

  describe('4xx', () => {
    it.each([
      [badRequest,    400, 'Solicitud inválida'],
      [unauthorized,  401, 'No autorizado'],
      [forbidden,     403, 'Sin permisos'],
      [notFound,      404, 'No encontrado'],
      [conflict,      409, 'Conflicto'],
      [unprocessable, 422, 'Entidad no procesable'],
    ])('%p defaults to status %d / message %p', (factory, status, msg) => {
      expect((factory as () => unknown)()).toEqual({
        status, message: msg, data: null, _links: {},
      });
    });
    it('factories accept custom message', () => {
      expect(notFound('Player abc no existe')).toMatchObject({
        status: 404, message: 'Player abc no existe',
      });
    });
  });

  describe('5xx', () => {
    it.each([
      [serverError,        500],
      [badGateway,         502],
      [serviceUnavailable, 503],
      [gatewayTimeout,     504],
    ])('%p has correct status %d', (factory, status) => {
      expect((factory as () => { status: number })().status).toBe(status);
    });
  });

  describe('paged', () => {
    it('computes pages = ceil(total / limit)', () => {
      const p = paged([1, 2, 3], 1, 10, 23);
      expect(p.pages).toBe(3);
      expect(p.status).toBe(200);
      expect(p.message).toBe('OK');
    });
    it('returns pages=0 when limit <= 0 (safety net)', () => {
      expect(paged([], 1, 0, 0).pages).toBe(0);
      expect(paged([], 1, -5, 100).pages).toBe(0);
    });
    it('preserves provided message and links', () => {
      const links = { self: { href: '/x', rel: 'self', method: 'GET' } };
      const p = paged([], 1, 10, 0, 'Sin resultados', links);
      expect(p.message).toBe('Sin resultados');
      expect(p._links).toBe(links);
    });
  });
});
