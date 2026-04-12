import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomePage } from '/src/react/pages/HomePage.jsx';

vi.mock('/src/react/services/publicApi.js', () => ({
  fetchPublicSettings: vi.fn(async () => ({ brandName: 'La Fileto', heroTitle: 'Hero title' })),
  fetchBusinessStatus: vi.fn(async () => ({ isOpen: true, message: 'Open now' })),
  fetchCommercialConfig: vi.fn(async () => ({ whatsapp: { number: '+5411' } })),
  fetchPublicOffers: vi.fn(async () => []),
  fetchPublicCategories: vi.fn(async () => []),
}));

describe('HomePage integration baseline', () => {
  it('renders fallback states without breaking when public lists are empty', async () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: /business status/i })).toBeTruthy();
    expect(await screen.findByText('There are no active offers right now.')).toBeTruthy();
    expect(await screen.findByText('No categories available yet.')).toBeTruthy();
  });

  it('renders controlled error copy when one public source fails', async () => {
    const { fetchPublicOffers } = await import('/src/react/services/publicApi.js');
    fetchPublicOffers.mockRejectedValueOnce(new Error('Temporary outage'));

    render(<HomePage />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('We could not load offers. Temporary outage');
  });
});
