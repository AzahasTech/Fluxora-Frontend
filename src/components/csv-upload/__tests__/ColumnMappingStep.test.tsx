import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ColumnMappingStep from '../ColumnMappingStep';
import { vi } from 'vitest';

describe('ColumnMappingStep Accessibility', () => {
  it('renders a group with an accessible name matching the heading text', () => {
    const mockOnMappingConfirmed = vi.fn();
    render(
      <ColumnMappingStep
        detectedHeaders={['address', 'amount', 'rate', 'duration']}
        initialMapping={{}}
        onMappingConfirmed={mockOnMappingConfirmed}
      />
    );

    const group = screen.getByRole('group', { name: 'Map your CSV columns' });
    expect(group).toBeInTheDocument();
  });
});
