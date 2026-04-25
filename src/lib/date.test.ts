import { ageFromBirthdate, formatChatTimestamp, isAdult } from './date';

describe('ageFromBirthdate', () => {
  it('computes whole-year age', () => {
    expect(ageFromBirthdate('2000-01-01', new Date('2026-04-25T00:00:00Z'))).toBe(26);
  });
  it('rounds down before birthday', () => {
    expect(ageFromBirthdate('2000-12-01', new Date('2026-04-25T00:00:00Z'))).toBe(25);
  });
  it('throws on invalid input', () => {
    expect(() => ageFromBirthdate('not-a-date')).toThrow('Invalid birthdate');
  });
});

describe('isAdult', () => {
  it('true at 18+', () => {
    expect(isAdult('2008-01-01', new Date('2026-04-25T00:00:00Z'))).toBe(true);
  });
  it('false under 18', () => {
    expect(isAdult('2010-04-25', new Date('2026-04-25T00:00:00Z'))).toBe(false);
  });
});

describe('formatChatTimestamp', () => {
  it('formats time when same day', () => {
    expect(
      formatChatTimestamp('2026-04-25T14:30:00', new Date('2026-04-25T15:00:00')),
    ).toMatch(/\d{1,2}:30/);
  });
  it('formats date when not same day', () => {
    expect(
      formatChatTimestamp('2026-04-20T14:30:00', new Date('2026-04-25T15:00:00')),
    ).toMatch(/Apr/);
  });
  it('throws on invalid input', () => {
    expect(() => formatChatTimestamp('garbage')).toThrow('Invalid ISO');
  });
});
