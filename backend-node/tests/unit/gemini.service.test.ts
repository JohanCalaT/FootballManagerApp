import axios from 'axios';
import { generateIdealTeam } from '../../src/services/gemini.service';
import { GeminiUnavailableError } from '../../src/errors/domain.errors';

jest.mock('axios');
const axiosPost = axios.post as jest.MockedFunction<typeof axios.post>;

describe('gemini.service', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.GEMINI_API_KEY    = 'test-key';
    process.env.GEMINI_MODEL      = 'gemini-2.0-flash';
    process.env.GEMINI_TIMEOUT_MS = '5000';
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns the text from candidates[0].content.parts[0].text', async () => {
    axiosPost.mockResolvedValue({
      data: { candidates: [{ content: { parts: [{ text: '{"formation":"4-3-3"}' }] } }] },
    });

    const text = await generateIdealTeam('p');

    expect(text).toBe('{"formation":"4-3-3"}');
    expect(axiosPost).toHaveBeenCalledTimes(1);
    const [url, body] = axiosPost.mock.calls[0];
    expect(url).toContain('gemini-2.0-flash:generateContent');
    expect(url).toContain('key=test-key');
    expect((body as { generationConfig: { responseMimeType: string } })
      .generationConfig.responseMimeType).toBe('application/json');
  });

  it('throws GeminiUnavailableError when API key is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(generateIdealTeam('p')).rejects.toThrow(GeminiUnavailableError);
    expect(axiosPost).not.toHaveBeenCalled();
  });

  it('throws GeminiUnavailableError on HTTP 500', async () => {
    axiosPost.mockRejectedValue(
      Object.assign(new Error('boom'), { response: { status: 500 } }));
    await expect(generateIdealTeam('p')).rejects.toThrow(GeminiUnavailableError);
  });

  it('throws GeminiUnavailableError on timeout (ECONNABORTED)', async () => {
    axiosPost.mockRejectedValue(
      Object.assign(new Error('timeout'), { code: 'ECONNABORTED' }));
    await expect(generateIdealTeam('p')).rejects.toThrow(/ECONNABORTED/);
  });

  it('throws GeminiUnavailableError on malformed response (no candidates)', async () => {
    axiosPost.mockResolvedValue({ data: { foo: 'bar' } });
    await expect(generateIdealTeam('p')).rejects.toThrow(/malformed/i);
  });

  it('throws GeminiUnavailableError on empty text', async () => {
    axiosPost.mockResolvedValue({
      data: { candidates: [{ content: { parts: [{ text: '' }] } }] },
    });
    await expect(generateIdealTeam('p')).rejects.toThrow(GeminiUnavailableError);
  });

  it('GeminiUnavailableError carries status 503', () => {
    expect(new GeminiUnavailableError().status).toBe(503);
  });
});
