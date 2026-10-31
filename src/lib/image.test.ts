import { fitWithin, ImageError, JPEG_QUALITY, MAX_PHOTOS, MAX_SIDE, shrinkImage, type ImageDeps } from './image';

describe('constants', () => {
  it('match the spec', () => {
    expect([MAX_PHOTOS, MAX_SIDE, JPEG_QUALITY]).toEqual([6, 1280, 0.8]);
  });
});

describe('fitWithin', () => {
  it('keeps small images as they are', () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1280, 1280, 1280)).toEqual({ width: 1280, height: 1280 });
  });

  it('scales the longer side to the cap and keeps the ratio', () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 });
  });

  it('never returns a zero side and always returns whole numbers', () => {
    expect(fitWithin(10000, 1, 1280)).toEqual({ width: 1280, height: 1 });
    const { width, height } = fitWithin(3333, 2222, 1280);
    expect(Number.isInteger(width) && Number.isInteger(height)).toBe(true);
  });
});

function deps(over: Partial<{ width: number; height: number; fail: boolean }> = {}) {
  const draw = vi.fn(async (_w: number, _h: number) => 'data:image/jpeg;base64,ENCODED');
  const d: ImageDeps = {
    decode: vi.fn(async () => {
      if (over.fail) throw new Error('bad pixels');
      return { width: over.width ?? 4000, height: over.height ?? 3000, draw };
    }),
  };
  return { d, draw };
}

const file = (type: string) => new Blob(['x'], { type });

describe('shrinkImage', () => {
  it('asks the decoder to draw at the capped size', async () => {
    const { d, draw } = deps({ width: 4000, height: 3000 });
    await shrinkImage(file('image/jpeg'), d);
    expect(draw).toHaveBeenCalledWith(1280, 960);
  });

  it('returns the encoder data URL', async () => {
    const { d } = deps();
    await expect(shrinkImage(file('image/png'), d)).resolves.toBe('data:image/jpeg;base64,ENCODED');
  });

  it('rejects a file that is not an image, before decoding', async () => {
    const { d } = deps();
    await expect(shrinkImage(file('text/plain'), d)).rejects.toMatchObject({ code: 'not-image' });
    expect(d.decode).not.toHaveBeenCalled();
  });

  it('rejects with code unreadable when decoding fails', async () => {
    const { d } = deps({ fail: true });
    const error = await shrinkImage(file('image/jpeg'), d).catch((e) => e);
    expect(error).toBeInstanceOf(ImageError);
    expect(error.code).toBe('unreadable');
  });
});
