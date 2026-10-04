import { parseBirthDate, readSignupChoice } from './users.service';

describe('readSignupChoice', () => {
  it('defaults to consumer when nothing was chosen', () => {
    expect(readSignupChoice(undefined).accountType).toBe('consumer');
    expect(readSignupChoice({}).accountType).toBe('consumer');
  });

  it('only treats the exact value "partner" as a partner request', () => {
    expect(readSignupChoice({ accountType: 'partner', nomMarque: 'Azul' })).toMatchObject({
      accountType: 'partner',
      nomMarque: 'Azul',
    });
    // Anything else — including a forged "admin" — falls back to the least-privileged type.
    expect(readSignupChoice({ accountType: 'admin' }).accountType).toBe('consumer');
    expect(readSignupChoice({ accountType: 'PARTNER' }).accountType).toBe('consumer');
  });

  it('trims and bounds the requested brand name', () => {
    expect(readSignupChoice({ accountType: 'partner', nomMarque: '  Dihya  ' }).nomMarque).toBe('Dihya');
    expect(readSignupChoice({ accountType: 'partner', nomMarque: 'x'.repeat(500) }).nomMarque).toHaveLength(120);
    expect(readSignupChoice({ accountType: 'partner', nomMarque: '   ' }).nomMarque).toBe('Non renseigné');
  });
});

describe('readSignupChoice — téléphone', () => {
  it('garde un numéro algérien valide, sous forme nationale', () => {
    expect(readSignupChoice({ telephone: '0550 12 34 56' }).telephone).toBe('0550123456');
    expect(readSignupChoice({ telephone: '+213 7 70 12 34 56' }).telephone).toBe('0770123456');
    expect(readSignupChoice({ telephone: '00213-21-23-45-67' }).telephone).toBe('021234567');
  });

  it('ignore un numéro invalide ou absent (valeur écrite par le navigateur)', () => {
    expect(readSignupChoice({ telephone: '12345' }).telephone).toBeNull();
    expect(readSignupChoice({ telephone: '0850123456' }).telephone).toBeNull();
    expect(readSignupChoice({ telephone: 42 }).telephone).toBeNull();
    expect(readSignupChoice({}).telephone).toBeNull();
  });
});

describe('parseBirthDate', () => {
  const today = new Date(Date.UTC(2026, 9, 3));

  it('garde une date réelle, à minuit UTC', () => {
    expect(parseBirthDate('2003-04-01', today).toISOString()).toBe('2003-04-01T00:00:00.000Z');
  });

  it('refuse une date qui n’existe pas', () => {
    expect(() => parseBirthDate('2003-02-30', today)).toThrow('Date de naissance invalide.');
    expect(() => parseBirthDate('2003-13-01', today)).toThrow('Date de naissance invalide.');
  });

  it('accepte de 13 à 100 ans, anniversaire compris', () => {
    expect(() => parseBirthDate('2013-10-03', today)).not.toThrow();
    expect(() => parseBirthDate('2013-10-04', today)).toThrow();
    expect(() => parseBirthDate('1926-10-04', today)).not.toThrow();
    expect(() => parseBirthDate('1925-10-03', today)).toThrow();
  });
});
