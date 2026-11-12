const { generateApplicationNumber } = require('../../src/utils/application-id');

describe('Application ID Generator (Unit)', () => {
  it('should generate application number with current year and sequence padding', () => {
    const appNum = generateApplicationNumber(19);
    const currentYear = new Date().getFullYear();
    expect(appNum).toBe(`APP-${currentYear}-00019`);
  });

  it('should generate random string suffix when sequence is omitted', () => {
    const appNum = generateApplicationNumber();
    const currentYear = new Date().getFullYear();
    expect(appNum.startsWith(`APP-${currentYear}-`)).toBe(true);
    expect(appNum.length).toBeGreaterThan(10);
  });
});

