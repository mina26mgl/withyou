import { ValidationPipe } from '@nestjs/common';
import { UpdateBrandDraftDto } from './update-brand-draft.dto';

// Same options as the global pipe in main.ts: unknown fields are silently stripped.
const pipe = new ValidationPipe({ whitelist: true, transform: true });
const run = (body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: UpdateBrandDraftDto }) as Promise<UpdateBrandDraftDto>;

describe('UpdateBrandDraftDto', () => {
  it('keeps the photo of each brand face (not stripped by the whitelist)', async () => {
    const dto = await run({ founders: [{ name: 'Amina', role: 'Fondatrice', photoUrl: 'http://x/uploads/a.jpg' }] });
    expect(dto.founders?.[0].photoUrl).toBe('http://x/uploads/a.jpg');
  });

  it('keeps the chosen place with its coordinates and the section color', async () => {
    const dto = await run({ city: 'Azazga, Tizi Ouzou', cityLat: 36.74, cityLng: 4.37, cardColor: '#FFFBF8CC' });
    expect(dto).toMatchObject({ city: 'Azazga, Tizi Ouzou', cityLat: 36.74, cityLng: 4.37, cardColor: '#FFFBF8CC' });
  });

  it('rejects coordinates out of range', async () => {
    await expect(run({ cityLat: 120 })).rejects.toBeDefined();
  });
});
