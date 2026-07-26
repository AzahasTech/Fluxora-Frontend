/**
 * csvParser.test.ts
 *
 * Unit tests for the pure CSV parsing and row validation logic.
 *
 * Covers:
 *  - validateRow: all field paths including the new deposit_amount upper-bound (#972)
 *  - splitCsvLine / stripBom / normaliseLineEndings helpers
 *  - parseAndValidateCsv: happy path, error paths, column auto-mapping, manual mapping
 *  - markDuplicates
 *  - buildTemplateCsv
 *  - MAX_DEPOSIT_AMOUNT constant value (regression for #972)
 */

import { describe, expect, it } from 'vitest';
import {
  MAX_CSV_ROWS,
  MAX_DEPOSIT_AMOUNT,
  buildTemplateCsv,
  markDuplicates,
  normaliseLineEndings,
  parseAndValidateCsv,
  splitCsvLine,
  stripBom,
  validateRow,
} from '../csvParser';
import type { CsvRow } from '../types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** A checksum-valid Stellar G-address accepted by isValidStellarAddress. */
const VALID_STELLAR =
  'GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN';

const VALID_STELLAR_2 =
  'GBLLBQBIMF5GKBWOPCX5BVZQPQ3BFLHQBUZPXDXDCNFAIOAVZF4JIVQ';

/** Returns a base row that should pass all validations. */
function validRow(overrides: Partial<{
  recipient: string;
  depositAmount: string;
  accrualRatePerDay: string;
  durationDays: string;
}> = {}) {
  return {
    recipient: VALID_STELLAR,
    depositAmount: '1000.00',
    accrualRatePerDay: '38.62',
    durationDays: '30',
    ...overrides,
  };
}

// ─── MAX_DEPOSIT_AMOUNT constant ──────────────────────────────────────────────

describe('MAX_DEPOSIT_AMOUNT constant (#972)', () => {
  it('equals MAX_ACCRUAL_RATE (100,000) × MAX_DURATION_DAYS (3,650)', () => {
    expect(MAX_DEPOSIT_AMOUNT).toBe(365_000_000);
  });

  it('stays within JavaScript safe-integer territory', () => {
    expect(MAX_DEPOSIT_AMOUNT).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });
});

// ─── validateRow — deposit_amount upper bound (#972) ─────────────────────────

describe('validateRow: deposit_amount upper bound (#972)', () => {
  it('accepts a deposit amount exactly at the maximum', () => {
    const { fieldErrors, isValid } = validateRow(
      validRow({ depositAmount: String(MAX_DEPOSIT_AMOUNT) }),
    );
    expect(fieldErrors.deposit_amount).toBeUndefined();
    expect(isValid).toBe(true);
  });

  it('accepts a deposit amount well below the maximum', () => {
    const { fieldErrors, isValid } = validateRow(
      validRow({ depositAmount: '500.5' }),
    );
    expect(fieldErrors.deposit_amount).toBeUndefined();
    expect(isValid).toBe(true);
  });

  it('rejects a deposit amount one unit above the maximum', () => {
    const { fieldErrors, isValid } = validateRow(
      validRow({ depositAmount: String(MAX_DEPOSIT_AMOUNT + 1) }),
    );
    expect(fieldErrors.deposit_amount).toMatch(/365,000,000/);
    expect(isValid).toBe(false);
  });

  it('rejects a wildly over-bound deposit (e.g. an extra digit)', () => {
    const { fieldErrors } = validateRow(
      validRow({ depositAmount: '3650000000' }), // 10× the cap
    );
    expect(fieldErrors.deposit_amount).toMatch(/365,000,000/);
  });

  it('error message mentions the cap value clearly', () => {
    const { fieldErrors } = validateRow(
      validRow({ depositAmount: String(MAX_DEPOSIT_AMOUNT + 0.01) }),
    );
    expect(fieldErrors.deposit_amount).toBe(
      'Deposit may not exceed 365,000,000 USDC',
    );
  });
});

// ─── validateRow — deposit_amount existing validations ───────────────────────

describe('validateRow: deposit_amount existing rules', () => {
  it('rejects an empty deposit field', () => {
    const { fieldErrors } = validateRow(validRow({ depositAmount: '' }));
    expect(fieldErrors.deposit_amount).toMatch(/positive number/i);
  });

  it('rejects a whitespace-only deposit field', () => {
    const { fieldErrors } = validateRow(validRow({ depositAmount: '   ' }));
    expect(fieldErrors.deposit_amount).toMatch(/positive number/i);
  });

  it('rejects NaN deposit values', () => {
    const { fieldErrors } = validateRow(validRow({ depositAmount: 'abc' }));
    expect(fieldErrors.deposit_amount).toMatch(/positive number/i);
  });

  it('rejects zero deposit', () => {
    const { fieldErrors } = validateRow(validRow({ depositAmount: '0' }));
    expect(fieldErrors.deposit_amount).toMatch(/positive number/i);
  });

  it('rejects negative deposit', () => {
    const { fieldErrors } = validateRow(validRow({ depositAmount: '-100' }));
    expect(fieldErrors.deposit_amount).toMatch(/positive number/i);
  });

  it('rejects deposits with more than 7 decimal places', () => {
    const { fieldErrors } = validateRow(
      validRow({ depositAmount: '1.12345678' }),
    );
    expect(fieldErrors.deposit_amount).toMatch(/7 decimal places/i);
  });

  it('accepts deposits with exactly 7 decimal places', () => {
    const { fieldErrors } = validateRow(
      validRow({ depositAmount: '1.1234567' }),
    );
    expect(fieldErrors.deposit_amount).toBeUndefined();
  });

  it('accepts a deposit with no decimal part', () => {
    const { fieldErrors } = validateRow(validRow({ depositAmount: '1000' }));
    expect(fieldErrors.deposit_amount).toBeUndefined();
  });
});

// ─── validateRow — recipient ──────────────────────────────────────────────────

describe('validateRow: recipient', () => {
  it('rejects an empty recipient', () => {
    const { fieldErrors } = validateRow(validRow({ recipient: '' }));
    expect(fieldErrors.recipient).toMatch(/required/i);
  });

  it('rejects a whitespace-only recipient', () => {
    const { fieldErrors } = validateRow(validRow({ recipient: '   ' }));
    expect(fieldErrors.recipient).toMatch(/required/i);
  });

  it('rejects an invalid Stellar address', () => {
    const { fieldErrors } = validateRow(validRow({ recipient: 'notanaddress' }));
    expect(fieldErrors.recipient).toMatch(/invalid stellar address/i);
  });

  it('accepts a valid Stellar address', () => {
    const { fieldErrors } = validateRow(validRow());
    expect(fieldErrors.recipient).toBeUndefined();
  });
});

// ─── validateRow — accrual_rate_per_day ──────────────────────────────────────

describe('validateRow: accrual_rate_per_day', () => {
  it('rejects an empty rate', () => {
    const { fieldErrors } = validateRow(validRow({ accrualRatePerDay: '' }));
    expect(fieldErrors.accrual_rate_per_day).toMatch(/positive number/i);
  });

  it('rejects a zero rate', () => {
    const { fieldErrors } = validateRow(validRow({ accrualRatePerDay: '0' }));
    expect(fieldErrors.accrual_rate_per_day).toMatch(/positive number/i);
  });

  it('rejects a negative rate', () => {
    const { fieldErrors } = validateRow(validRow({ accrualRatePerDay: '-1' }));
    expect(fieldErrors.accrual_rate_per_day).toMatch(/positive number/i);
  });

  it('rejects a rate above 100,000', () => {
    const { fieldErrors } = validateRow(
      validRow({ accrualRatePerDay: '100001' }),
    );
    expect(fieldErrors.accrual_rate_per_day).toMatch(/100,000/);
  });

  it('accepts a rate exactly at 100,000', () => {
    const { fieldErrors } = validateRow(
      validRow({ accrualRatePerDay: '100000' }),
    );
    expect(fieldErrors.accrual_rate_per_day).toBeUndefined();
  });
});

// ─── validateRow — duration_days ─────────────────────────────────────────────

describe('validateRow: duration_days', () => {
  it('rejects an empty duration', () => {
    const { fieldErrors } = validateRow(validRow({ durationDays: '' }));
    expect(fieldErrors.duration_days).toMatch(/1.+3.650/i);
  });

  it('rejects a duration of 0', () => {
    const { fieldErrors } = validateRow(validRow({ durationDays: '0' }));
    expect(fieldErrors.duration_days).toMatch(/1.+3.650/i);
  });

  it('rejects a fractional duration', () => {
    const { fieldErrors } = validateRow(validRow({ durationDays: '10.5' }));
    expect(fieldErrors.duration_days).toMatch(/1.+3.650/i);
  });

  it('rejects a duration above 3,650', () => {
    const { fieldErrors } = validateRow(validRow({ durationDays: '3651' }));
    expect(fieldErrors.duration_days).toMatch(/1.+3.650/i);
  });

  it('accepts a duration exactly at 3,650', () => {
    const { fieldErrors } = validateRow(validRow({ durationDays: '3650' }));
    expect(fieldErrors.duration_days).toBeUndefined();
  });

  it('accepts a duration of 1', () => {
    const { fieldErrors } = validateRow(validRow({ durationDays: '1' }));
    expect(fieldErrors.duration_days).toBeUndefined();
  });
});

// ─── validateRow — fully valid row ───────────────────────────────────────────

describe('validateRow: fully valid row', () => {
  it('returns isValid=true and no field errors for a good row', () => {
    const { fieldErrors, isValid } = validateRow(validRow());
    expect(isValid).toBe(true);
    expect(Object.keys(fieldErrors)).toHaveLength(0);
  });
});

// ─── splitCsvLine ─────────────────────────────────────────────────────────────

describe('splitCsvLine', () => {
  it('splits a simple comma-delimited line', () => {
    expect(splitCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('trims whitespace from each cell', () => {
    expect(splitCsvLine(' a , b , c ')).toEqual(['a', 'b', 'c']);
  });

  it('handles quoted fields with embedded commas', () => {
    expect(splitCsvLine('"hello, world",foo')).toEqual(['hello, world', 'foo']);
  });

  it('handles escaped quotes inside quoted fields', () => {
    expect(splitCsvLine('"say ""hi""",bar')).toEqual(['say "hi"', 'bar']);
  });

  it('returns a single-element array for a line without commas', () => {
    expect(splitCsvLine('only')).toEqual(['only']);
  });

  it('handles an empty string', () => {
    expect(splitCsvLine('')).toEqual(['']);
  });
});

// ─── stripBom ─────────────────────────────────────────────────────────────────

describe('stripBom', () => {
  it('removes a leading UTF-8 BOM character', () => {
    expect(stripBom('\uFEFFhello')).toBe('hello');
  });

  it('leaves strings without a BOM unchanged', () => {
    expect(stripBom('hello')).toBe('hello');
  });

  it('handles an empty string', () => {
    expect(stripBom('')).toBe('');
  });
});

// ─── normaliseLineEndings ─────────────────────────────────────────────────────

describe('normaliseLineEndings', () => {
  it('converts CRLF to LF', () => {
    expect(normaliseLineEndings('a\r\nb')).toBe('a\nb');
  });

  it('converts bare CR to LF', () => {
    expect(normaliseLineEndings('a\rb')).toBe('a\nb');
  });

  it('leaves strings with only LF unchanged', () => {
    expect(normaliseLineEndings('a\nb')).toBe('a\nb');
  });
});

// ─── markDuplicates ───────────────────────────────────────────────────────────

describe('markDuplicates', () => {
  function makeRow(
    rowNumber: number,
    recipient: string,
    status: CsvRow['status'] = 'valid',
  ): CsvRow {
    return {
      id: `row-${rowNumber}`,
      rowNumber,
      recipient,
      depositAmount: '100',
      accrualRatePerDay: '10',
      durationDays: '10',
      status,
      fieldErrors: {},
    };
  }

  it('marks rows with duplicate recipients as duplicate-recipient', () => {
    const rows = [
      makeRow(1, VALID_STELLAR),
      makeRow(2, VALID_STELLAR),
    ];
    markDuplicates(rows);
    expect(rows[0].status).toBe('duplicate-recipient');
    expect(rows[1].status).toBe('duplicate-recipient');
  });

  it('sets duplicateRows to the sibling row numbers', () => {
    const rows = [
      makeRow(1, VALID_STELLAR),
      makeRow(2, VALID_STELLAR),
    ];
    markDuplicates(rows);
    expect(rows[0].duplicateRows).toEqual([2]);
    expect(rows[1].duplicateRows).toEqual([1]);
  });

  it('does not mark rows that have no duplicate recipient', () => {
    const rows = [
      makeRow(1, VALID_STELLAR),
      makeRow(2, VALID_STELLAR_2),
    ];
    markDuplicates(rows);
    expect(rows[0].status).toBe('valid');
    expect(rows[1].status).toBe('valid');
  });

  it('is case-insensitive for address comparison', () => {
    const rows = [
      makeRow(1, VALID_STELLAR.toLowerCase()),
      makeRow(2, VALID_STELLAR.toUpperCase()),
    ];
    markDuplicates(rows);
    expect(rows[0].status).toBe('duplicate-recipient');
  });

  it('does not change the status of already-invalid rows', () => {
    const rows = [
      makeRow(1, VALID_STELLAR, 'needs-fix'),
      makeRow(2, VALID_STELLAR, 'valid'),
    ];
    markDuplicates(rows);
    // Only the valid row should get flagged; the needs-fix row keeps its status
    expect(rows[0].status).toBe('needs-fix');
    expect(rows[1].status).toBe('duplicate-recipient');
  });

  it('skips rows with an empty recipient', () => {
    const rows = [makeRow(1, ''), makeRow(2, '')];
    markDuplicates(rows);
    expect(rows[0].status).toBe('valid');
    expect(rows[1].status).toBe('valid');
  });
});

// ─── parseAndValidateCsv ──────────────────────────────────────────────────────

describe('parseAndValidateCsv', () => {
  const TEMPLATE_CSV = buildTemplateCsv();

  it('parses the template CSV and returns one data row', () => {
    const result = parseAndValidateCsv(TEMPLATE_CSV);
    expect(result.parseError).toBeUndefined();
    expect(result.rows).toHaveLength(1);
    // The template uses a placeholder address so recipient validation fails,
    // but all numeric fields (deposit, rate, duration) should be error-free.
    expect(result.rows[0].fieldErrors.deposit_amount).toBeUndefined();
    expect(result.rows[0].fieldErrors.accrual_rate_per_day).toBeUndefined();
    expect(result.rows[0].fieldErrors.duration_days).toBeUndefined();
  });

  it('returns a parse error for completely empty input', () => {
    const result = parseAndValidateCsv('');
    expect(result.parseError).toMatch(/no data rows/i);
    expect(result.rows).toHaveLength(0);
  });

  it('returns a parse error for a header-only CSV', () => {
    const result = parseAndValidateCsv(
      'recipient,deposit_amount,accrual_rate_per_day,duration_days\n',
    );
    expect(result.parseError).toMatch(/no data rows/i);
  });

  it(`returns a parse error when the CSV exceeds ${MAX_CSV_ROWS} rows`, () => {
    const header = 'recipient,deposit_amount,accrual_rate_per_day,duration_days\n';
    const row = `${VALID_STELLAR},100,10,10\n`;
    const csv = header + row.repeat(MAX_CSV_ROWS + 1);
    const result = parseAndValidateCsv(csv);
    expect(result.parseError).toMatch(new RegExp(String(MAX_CSV_ROWS)));
  });

  it('auto-detects canonical headers and sets headersMatch=true', () => {
    const result = parseAndValidateCsv(TEMPLATE_CSV);
    expect(result.headersMatch).toBe(true);
  });

  it('returns headersMatch=false and no rows when headers cannot be mapped', () => {
    const csv = 'foo,bar,baz,qux\n1,2,3,4\n';
    const result = parseAndValidateCsv(csv);
    expect(result.headersMatch).toBe(false);
    expect(result.rows).toHaveLength(0);
  });

  it('uses a manual column mapping when provided', () => {
    const csv =
      'address,usdc,rate,days\n' +
      `${VALID_STELLAR},500,20,60\n`;
    const result = parseAndValidateCsv(csv, {
      recipient: 'address',
      deposit_amount: 'usdc',
      accrual_rate_per_day: 'rate',
      duration_days: 'days',
    });
    expect(result.headersMatch).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].depositAmount).toBe('500');
    expect(result.rows[0].status).toBe('valid');
  });

  it('marks a row as needs-fix when deposit_amount exceeds the cap', () => {
    const over = String(MAX_DEPOSIT_AMOUNT + 1);
    const csv =
      'recipient,deposit_amount,accrual_rate_per_day,duration_days\n' +
      `${VALID_STELLAR},${over},38.62,30\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.rows[0].status).toBe('needs-fix');
    expect(result.rows[0].fieldErrors.deposit_amount).toMatch(/365,000,000/);
  });

  it('marks a row as valid when deposit_amount is exactly at the cap', () => {
    const csv =
      'recipient,deposit_amount,accrual_rate_per_day,duration_days\n' +
      `${VALID_STELLAR},${MAX_DEPOSIT_AMOUNT},38.62,30\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.rows[0].status).toBe('valid');
    expect(result.rows[0].fieldErrors.deposit_amount).toBeUndefined();
  });

  it('strips a UTF-8 BOM from the start of the input', () => {
    const csv = '\uFEFF' + TEMPLATE_CSV;
    const result = parseAndValidateCsv(csv);
    expect(result.parseError).toBeUndefined();
    expect(result.rows).toHaveLength(1);
  });

  it('handles CRLF line endings', () => {
    const csv = TEMPLATE_CSV.replace(/\n/g, '\r\n');
    const result = parseAndValidateCsv(csv);
    expect(result.rows).toHaveLength(1);
    // Numeric fields must parse correctly regardless of line endings.
    expect(result.rows[0].fieldErrors.deposit_amount).toBeUndefined();
    expect(result.rows[0].fieldErrors.accrual_rate_per_day).toBeUndefined();
    expect(result.rows[0].fieldErrors.duration_days).toBeUndefined();
  });

  it('exposes autoMapping in the result', () => {
    const result = parseAndValidateCsv(TEMPLATE_CSV);
    expect(result.autoMapping.recipient).toBeDefined();
    expect(result.autoMapping.deposit_amount).toBeDefined();
  });

  it('marks duplicate recipients across rows', () => {
    const csv =
      'recipient,deposit_amount,accrual_rate_per_day,duration_days\n' +
      `${VALID_STELLAR},100,10,10\n` +
      `${VALID_STELLAR},200,20,20\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.rows[0].status).toBe('duplicate-recipient');
    expect(result.rows[1].status).toBe('duplicate-recipient');
  });

  it('handles a short data row that has fewer cells than the header', () => {
    // Only recipient + deposit — accrual_rate_per_day and duration_days are missing cells.
    const csv =
      'recipient,deposit_amount,accrual_rate_per_day,duration_days\n' +
      `${VALID_STELLAR},500\n`;
    const result = parseAndValidateCsv(csv);
    expect(result.rows).toHaveLength(1);
    // Missing numeric fields should produce field errors (treated as empty strings).
    expect(result.rows[0].fieldErrors.accrual_rate_per_day).toBeDefined();
    expect(result.rows[0].fieldErrors.duration_days).toBeDefined();
  });
});

// ─── buildTemplateCsv ─────────────────────────────────────────────────────────

describe('buildTemplateCsv', () => {
  it('returns a non-empty string', () => {
    expect(buildTemplateCsv().length).toBeGreaterThan(0);
  });

  it('contains all four canonical column headers', () => {
    const csv = buildTemplateCsv();
    expect(csv).toContain('recipient');
    expect(csv).toContain('deposit_amount');
    expect(csv).toContain('accrual_rate_per_day');
    expect(csv).toContain('duration_days');
  });

  it('produces numeric field values within valid bounds', () => {
    const result = parseAndValidateCsv(buildTemplateCsv());
    expect(result.parseError).toBeUndefined();
    // Deposit, rate, and duration in the template are all within their bounds.
    expect(result.rows[0].fieldErrors.deposit_amount).toBeUndefined();
    expect(result.rows[0].fieldErrors.accrual_rate_per_day).toBeUndefined();
    expect(result.rows[0].fieldErrors.duration_days).toBeUndefined();
  });
});
