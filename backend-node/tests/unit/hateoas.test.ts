import { buildPagedLinks, buildPlayerLinks } from '../../src/utils/hateoas';

describe('buildPlayerLinks', () => {
  it('returns public links only when isAdmin=false', () => {
    const links = buildPlayerLinks('abc123', false);
    expect(Object.keys(links).sort()).toEqual(['collection', 'comments', 'self']);
    expect(links.self).toEqual({
      href: '/api/players/abc123', rel: 'self', method: 'GET',
    });
    expect(links.collection!.href).toBe('/api/players');
    expect(links.comments!.href).toBe('/api/comments/player/abc123');
    expect(links.update).toBeUndefined();
    expect(links.delete).toBeUndefined();
  });

  it('adds update + delete when isAdmin=true', () => {
    const links = buildPlayerLinks('xyz', true);
    expect(links.update).toEqual({ href: '/api/players/xyz', rel: 'update', method: 'PUT' });
    expect(links.delete).toEqual({ href: '/api/players/xyz', rel: 'delete', method: 'DELETE' });
  });
});

describe('buildPagedLinks', () => {
  describe('first page', () => {
    it('has self/first/last/next but no prev', () => {
      const links = buildPagedLinks('/api/players', 1, 10, 23);
      expect(links.self!.href).toBe('/api/players?page=1&limit=10');
      expect(links.first!.href).toBe('/api/players?page=1&limit=10');
      expect(links.next!.href).toBe('/api/players?page=2&limit=10');
      expect(links.last!.href).toBe('/api/players?page=3&limit=10');
      expect(links.prev).toBeUndefined();
    });
  });

  describe('middle page', () => {
    it('has all five links', () => {
      const links = buildPagedLinks('/api/players', 2, 10, 25);
      expect(links.self!.href).toBe('/api/players?page=2&limit=10');
      expect(links.prev!.href).toBe('/api/players?page=1&limit=10');
      expect(links.next!.href).toBe('/api/players?page=3&limit=10');
      expect(links.last!.href).toBe('/api/players?page=3&limit=10');
    });
  });

  describe('last page', () => {
    it('has prev but no next', () => {
      const links = buildPagedLinks('/api/players', 2, 10, 15);
      expect(links.prev!.href).toBe('/api/players?page=1&limit=10');
      expect(links.next).toBeUndefined();
    });
  });

  describe('empty result set', () => {
    it('uses last=1 even when total=0 to avoid /?page=0', () => {
      const links = buildPagedLinks('/api/players', 1, 10, 0);
      expect(links.last!.href).toBe('/api/players?page=1&limit=10');
      expect(links.next).toBeUndefined();
      expect(links.prev).toBeUndefined();
    });
  });

  describe('with filter passthrough', () => {
    it('arrastra extra params en los links de paginación', () => {
      const links = buildPagedLinks('/api/players/search', 1, 5, 20, {
        name: 'Pedri', team: 'FC Barcelona',
      });
      expect(links.next!.href).toContain('name=Pedri');
      expect(links.next!.href).toContain('team=FC%20Barcelona');
      expect(links.next!.href).toContain('page=2');
      expect(links.next!.href).toContain('limit=5');
    });

    it('encodes special chars in filter values', () => {
      const links = buildPagedLinks('/api/players/search', 1, 10, 50, {
        name: 'O&Connor',
      });
      // & debe quedar como %26 para no romper la query string
      expect(links.self!.href).toContain('name=O%26Connor');
    });

    it('omits undefined values from the link query', () => {
      const links = buildPagedLinks('/api/players/search', 1, 10, 10, {
        name: 'Pedri', team: undefined,
      });
      expect(links.self!.href).toContain('name=Pedri');
      expect(links.self!.href).not.toContain('team=');
    });
  });
});
