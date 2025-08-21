import React from 'react';
import { render, screen } from '@testing-library/react';
import PrivacyPolicy from '../PrivacyPolicy';

describe('PrivacyPolicy', () => {
  it('renders title and last updated date', () => {
    render(<PrivacyPolicy />);
    expect(
      screen.getByRole('heading', { name: /privacy policy/i })
    ).toBeInTheDocument();

    // The component renders a label "Last updated:" followed by the
    // locale-formatted date. Instead of relying on a mocked locale output,
    // assert that the paragraph contains the label and a non-empty value
    // after it to keep the test deterministic across environments.
    const labelNode = screen.getByText(/last updated:/i);
    expect(labelNode).toBeInTheDocument();

    // The label is wrapped in a <strong> inside a <p>. Assert that the
    // paragraph containing the label has additional non-empty text after it.
    // Use a text query that matches the label plus some following text to avoid
    // performing direct DOM traversal.
    const paragraph = screen.getByText(/last updated:\s*\S+/i);
    expect(paragraph).toBeInTheDocument();
    const fullText = (paragraph.textContent || '').replace(/\s+/g, ' ').trim();
    // Should contain the label and additional non-empty text after it.
    expect(fullText.toLowerCase()).toMatch(/last updated:/i);
    expect(fullText).not.toMatch(/^last updated:\s*$/i);
  });
});
