import { wrap } from './wrap';

describe('wrap', () => {
  it('returns Ok on success', async () => {
    const r = await wrap(Promise.resolve({ data: { hello: 'world' }, error: null, count: null, status: 200, statusText: 'OK' }));
    expect(r).toEqual({ ok: true, value: { hello: 'world' } });
  });

  it('returns Err with mapped fields on PostgrestError', async () => {
    const r = await wrap(
      Promise.resolve({
        data: null,
        error: { code: 'PGRST116', message: 'no rows', details: null, hint: null, name: 'PostgrestError' },
        count: null,
        status: 406,
        statusText: 'Not Acceptable',
      }),
    );
    expect(r).toEqual({ ok: false, error: { code: 'PGRST116', message: 'no rows', details: null } });
  });

  it('returns Err EMPTY when both data and error are null', async () => {
    const r = await wrap(
      Promise.resolve({ data: null, error: null, count: null, status: 200, statusText: 'OK' }),
    );
    expect(r).toEqual({ ok: false, error: { code: 'EMPTY', message: 'Query returned no data', details: null } });
  });
});
