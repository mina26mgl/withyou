import { ValidationPipe } from '@nestjs/common';
import { CarrierDto } from './admin.dto';

const pipe = new ValidationPipe({ whitelist: true, transform: true });
const run = (body: unknown) => pipe.transform(body, { type: 'body', metatype: CarrierDto }) as Promise<CarrierDto>;
const valid = { nom: 'Yalidine', wilayas: [], coutColis: 650, delaiJours: 2.5, telephone: '023 00 00 00', email: 'pro@yalidine.dz' };

describe('CarrierDto', () => {
  it('accepts a complete carrier covering every wilaya', async () => {
    await expect(run(valid)).resolves.toMatchObject({ nom: 'Yalidine', coutColis: 650 });
  });
  it('accepts a carrier limited to some wilayas', async () => {
    await expect(run({ ...valid, nom: 'Coursiers Alger', wilayas: ['Alger', 'Blida'] })).resolves.toBeDefined();
  });
  it('rejects an unknown wilaya, a missing name, a negative price and a bad e-mail', async () => {
    await expect(run({ ...valid, wilayas: ['Paris'] })).rejects.toBeDefined();
    await expect(run({ ...valid, nom: ' ' })).rejects.toBeDefined();
    await expect(run({ ...valid, coutColis: -1 })).rejects.toBeDefined();
    await expect(run({ ...valid, email: 'pas-un-mail' })).rejects.toBeDefined();
  });
});

import { BrandLegalDto } from './admin.dto';
const runLegal = (body: unknown) => pipe.transform(body, { type: 'body', metatype: BrandLegalDto });

describe('BrandLegalDto', () => {
  const ok = { nif: '000216012345678', nis: '000216012345678', rc: '16/00-1234567 B 20', articleImposition: '16011234567', rib: '00100123012345678901', banque: 'BNA – Banque Nationale d’Algérie' };
  it('accepts well-formed Algerian identifiers', async () => {
    await expect(runLegal(ok)).resolves.toBeDefined();
  });
  it('accepts empty fields (not provided yet)', async () => {
    await expect(runLegal({ nif: null, nis: null, rc: null, articleImposition: null, rib: null, banque: null })).resolves.toBeDefined();
  });
  it('rejects a RIB or NIS with the wrong number of digits, and letters in the NIF', async () => {
    await expect(runLegal({ ...ok, rib: '0010012301234567890' })).rejects.toBeDefined();
    await expect(runLegal({ ...ok, nis: '12345' })).rejects.toBeDefined();
    await expect(runLegal({ ...ok, nif: '00021601234567A' })).rejects.toBeDefined();
  });
});

describe('BrandLegalDto – RC tel qu’écrit sur l’extrait', () => {
  it('accepts « N° », points and accents', async () => {
    for (const rc of ['N° 16/00-1234567 B 20', '16.00.1234567B20', 'Carte artisan 15/0123']) {
      await expect(runLegal({ rc })).resolves.toBeDefined();
    }
  });
});
