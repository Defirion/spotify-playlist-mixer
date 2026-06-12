import React from 'react';
import { render, screen } from '@testing-library/react';
import PrivacyPolicy from '../PrivacyPolicy';

describe('PrivacyPolicy', () => {
  it('renders title and last updated date', () => {
    render(<PrivacyPolicy />);
    expect(
      screen.getByRole('heading', { name: /privacy policy/i })
    ).toBeInTheDocument();

    // The policy shows a fixed "Last updated" date (not the current date —
    // that would falsely claim the policy changes every day).
    const labelNode = screen.getByText(/last updated:/i);
    expect(labelNode).toBeInTheDocument();
    expect(screen.getByText(/August 22, 2025/)).toBeInTheDocument();
  });
});
