import React from 'react';
import { render, screen } from '@testing-library/react';
import TermsOfService from '../TermsOfService';

describe('TermsOfService', () => {
  const renderComponent = () => render(<TermsOfService />);

  it('renders the main title', () => {
    renderComponent();
    expect(
      screen.getByRole('heading', { name: /terms of service/i, level: 1 })
    ).toBeInTheDocument();
  });

  it('displays the last updated date', () => {
    renderComponent();
    const today = new Date().toLocaleDateString();
    expect(screen.getByText(/last updated:/i)).toBeInTheDocument();
    expect(screen.getByText(today)).toBeInTheDocument();
  });

  it('renders all required sections', () => {
    renderComponent();
    const expectedSections = [
      'Acceptance of Terms',
      'Description of Service',
      'User Responsibilities',
      'Limitations',
      'Disclaimer',
      'Modifications',
      'Termination',
    ];

    expectedSections.forEach(sectionTitle => {
      expect(
        screen.getByRole('heading', { name: sectionTitle, level: 2 })
      ).toBeInTheDocument();
    });
  });

  it('renders service description list items', () => {
    renderComponent();
    expect(
      screen.getByText(/accesses your spotify playlists with your permission/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /creates custom mixed playlists based on your preferences/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /operates entirely in your browser using spotify's official api/i
      )
    ).toBeInTheDocument();
  });

  it('renders user responsibilities list items', () => {
    renderComponent();
    expect(
      screen.getByText(/you must have a valid spotify account/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/you are responsible for your spotify account security/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/you control what playlists are accessed and created/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /you can revoke app access anytime in your spotify settings/i
      )
    ).toBeInTheDocument();
  });

  it('renders limitations list items', () => {
    renderComponent();
    expect(
      screen.getByText(/this app requires an active internet connection/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/functionality depends on spotify's api availability/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /some playlists may not be accessible due to privacy settings/i
      )
    ).toBeInTheDocument();
  });

  it('renders disclaimer list items', () => {
    renderComponent();
    expect(
      screen.getByText(/this service is provided "as-is" without warranties/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /we are not liable for any issues with your spotify account/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /the app is a third-party tool, not affiliated with spotify/i
      )
    ).toBeInTheDocument();
  });

  it('renders modifications section content', () => {
    renderComponent();
    expect(screen.getByText(/we may update these terms/i)).toBeInTheDocument();
  });

  it('renders termination section content', () => {
    renderComponent();
    expect(
      screen.getByText(/you may stop using the service anytime/i)
    ).toBeInTheDocument();
  });

  it('has proper semantic structure with sections', () => {
    renderComponent();
    // Check that all section headings are present (7 main sections)
    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings).toHaveLength(7);
  });

  it('applies CSS module classes correctly', () => {
    renderComponent();
    const title = screen.getByRole('heading', { name: /terms of service/i });

    // Check that the component renders with proper structure
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('title');
  });
});
