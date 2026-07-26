import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PreviewValidateStep from '../PreviewValidateStep';
import type { CsvRow } from '../types';

const mockRows: CsvRow[] = [
  {
    id: 'row-1',
    rowNumber: 1,
    recipient: '0x1234567890123456789012345678901234567890',
    depositAmount: '10',
    accrualRatePerDay: '1',
    durationDays: '30',
    status: 'valid',
    fieldErrors: {},
  },
];

describe('PreviewValidateStep', () => {
  it('opens confirm modal on Replace CSV click and handles cancel', () => {
    const onReplaceFile = vi.fn();
    render(
      <PreviewValidateStep
        rows={mockRows}
        onRowsChange={vi.fn()}
        onSubmit={vi.fn()}
        onReplaceFile={onReplaceFile}
      />
    );

    // Initial state: modal should not be open
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Click Replace CSV
    const replaceBtn = screen.getByRole('button', { name: 'Replace CSV file' });
    fireEvent.click(replaceBtn);

    // Modal should be open
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Replace CSV File?')).toBeInTheDocument();

    // Click Cancel
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    // Modal should be closed and onReplaceFile should not be called
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onReplaceFile).not.toHaveBeenCalled();
  });

  it('opens confirm modal and calls onReplaceFile when confirmed', () => {
    const onReplaceFile = vi.fn();
    render(
      <PreviewValidateStep
        rows={mockRows}
        onRowsChange={vi.fn()}
        onSubmit={vi.fn()}
        onReplaceFile={onReplaceFile}
      />
    );

    // Click Replace CSV
    const replaceBtn = screen.getByRole('button', { name: 'Replace CSV file' });
    fireEvent.click(replaceBtn);

    // Modal should be open
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click Confirm (Replace)
    const confirmBtn = screen.getByRole('button', { name: 'Replace' });
    fireEvent.click(confirmBtn);

    // Modal should be closed and onReplaceFile should be called
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onReplaceFile).toHaveBeenCalledOnce();
  });
});
