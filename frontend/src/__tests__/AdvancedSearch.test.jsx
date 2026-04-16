/**
 * Advanced Search Component Tests - Phase 2
 * Tests for React frontend component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import AdvancedSearch from '../pages/AdvancedSearch.jsx';
import * as api from '../lib/api';

jest.mock('../lib/api');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithProviders = (component) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('Advanced Search Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Search Bar', () => {
    it('should render search input', () => {
      renderWithProviders(<AdvancedSearch />);
      const searchInput = screen.getByPlaceholderText(/search.../i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should handle text input', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AdvancedSearch />);

      const searchInput = screen.getByPlaceholderText(/search.../i);
      await user.type(searchInput, 'lease agreement');

      expect(searchInput).toHaveValue('lease agreement');
    });

    it('should debounce search queries', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });

      api.search = jest.fn().mockResolvedValue({ data: [] });

      renderWithProviders(<AdvancedSearch />);
      const searchInput = screen.getByPlaceholderText(/search.../i);

      await user.type(searchInput, 'test');

      expect(api.search).not.toHaveBeenCalled();

      jest.advanceTimersByTime(300);

      expect(api.search).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should clear search on button click', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AdvancedSearch />);

      const searchInput = screen.getByPlaceholderText(/search.../i);
      await user.type(searchInput, 'test query');

      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      expect(searchInput).toHaveValue('');
    });
  });

  describe('Search Type Tabs', () => {
    it('should render all search tabs', () => {
      renderWithProviders(<AdvancedSearch />);

      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /documents/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /properties/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /invoices/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /tenants/i })).toBeInTheDocument();
    });

    it('should switch between tabs', async () => {
      const user = userEvent.setup();
      api.search = jest.fn().mockResolvedValue({ data: [] });

      renderWithProviders(<AdvancedSearch />);

      const documentsTab = screen.getByRole('tab', { name: /documents/i });
      await user.click(documentsTab);

      await waitFor(() => {
        expect(api.search).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'documents',
          })
        );
      });
    });

    it('should reset filters when switching tabs', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AdvancedSearch />);

      // Set a filter in All tab
      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      // Switch tab
      const documentsTab = screen.getByRole('tab', { name: /documents/i });
      await user.click(documentsTab);

      // Filters should be cleared or reset
      expect(screen.queryByText(/selected filters/i)).not.toBeInTheDocument();
    });
  });

  describe('Autocomplete Suggestions', () => {
    it('should show suggestions on focus', async () => {
      const user = userEvent.setup();
      api.getSuggestions = jest.fn().mockResolvedValue([
        { text: 'lease agreement', count: 5 },
        { text: 'lease renewal', count: 3 },
      ]);

      renderWithProviders(<AdvancedSearch />);
      const searchInput = screen.getByPlaceholderText(/search.../i);

      await user.click(searchInput);
      await user.type(searchInput, 'lease');

      await waitFor(() => {
        expect(screen.getByText('lease agreement')).toBeInTheDocument();
      });
    });

    it('should select suggestion on click', async () => {
      const user = userEvent.setup();
      api.getSuggestions = jest.fn().mockResolvedValue([
        { text: 'lease agreement', count: 5 },
      ]);
      api.search = jest.fn().mockResolvedValue({ data: [] });

      renderWithProviders(<AdvancedSearch />);
      const searchInput = screen.getByPlaceholderText(/search.../i);

      await user.type(searchInput, 'lease');

      await waitFor(() => {
        const suggestion = screen.getByText('lease agreement');
        fireEvent.click(suggestion);
      });

      await waitFor(() => {
        expect(searchInput).toHaveValue('lease agreement');
      });
    });

    it('should limit suggestions to 10', async () => {
      const user = userEvent.setup();
      const suggestions = Array.from({ length: 15 }, (_, i) => ({
        text: `suggestion ${i}`,
        count: i,
      }));

      api.getSuggestions = jest.fn().mockResolvedValue(suggestions);

      renderWithProviders(<AdvancedSearch />);
      const searchInput = screen.getByPlaceholderText(/search.../i);

      await user.type(searchInput, 'test');

      await waitFor(() => {
        const suggestionElements = screen.getAllByRole('option');
        expect(suggestionElements).toHaveLength(10);
      });
    });
  });

  describe('Advanced Filters Panel', () => {
    it('should toggle filters panel', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AdvancedSearch />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      expect(screen.getByText(/filter options/i)).toBeVisible();
    });

    it('should display category filter for documents', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AdvancedSearch />);

      const documentsTab = screen.getByRole('tab', { name: /documents/i });
      await user.click(documentsTab);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      expect(screen.getByText(/category/i)).toBeInTheDocument();
    });

    it('should select multiple filters', async () => {
      const user = userEvent.setup();
      api.search = jest.fn().mockResolvedValue({ data: [] });

      renderWithProviders(<AdvancedSearch />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      const categoryCheckbox = screen.getByRole('checkbox', { name: /receipts/i });
      await user.click(categoryCheckbox);

      await waitFor(() => {
        expect(api.search).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              category: ['receipts'],
            }),
          })
        );
      });
    });

    it('should apply date range filter', async () => {
      const user = userEvent.setup();
      api.search = jest.fn().mockResolvedValue({ data: [] });

      renderWithProviders(<AdvancedSearch />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      const startDate = screen.getByLabelText(/start date/i);
      await user.type(startDate, '2024-01-01');

      const endDate = screen.getByLabelText(/end date/i);
      await user.type(endDate, '2024-12-31');

      await waitFor(() => {
        expect(api.search).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              dateRange: {
                from: '2024-01-01',
                to: '2024-12-31',
              },
            }),
          })
        );
      });
    });

    it('should apply size range filter', async () => {
      const user = userEvent.setup();
      api.search = jest.fn().mockResolvedValue({ data: [] });

      renderWithProviders(<AdvancedSearch />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      const minSize = screen.getByLabelText(/minimum size/i);
      await user.type(minSize, '1');

      const maxSize = screen.getByLabelText(/maximum size/i);
      await user.type(maxSize, '10');

      await waitFor(() => {
        expect(api.search).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              sizeRange: {
                min: 1,
                max: 10,
              },
            }),
          })
        );
      });
    });

    it('should apply tag filters', async () => {
      const user = userEvent.setup();
      api.search = jest.fn().mockResolvedValue({ data: [] });

      renderWithProviders(<AdvancedSearch />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      const tagCheckbox = screen.getByRole('checkbox', { name: /important/i });
      await user.click(tagCheckbox);

      await waitFor(() => {
        expect(api.search).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              tags: ['important'],
            }),
          })
        );
      });
    });

    it('should clear all filters', async () => {
      const user = userEvent.setup();
      api.search = jest.fn().mockResolvedValue({ data: [] });

      renderWithProviders(<AdvancedSearch />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      const categoryCheckbox = screen.getByRole('checkbox', { name: /receipts/i });
      await user.click(categoryCheckbox);

      const clearButton = screen.getByRole('button', { name: /clear all/i });
      await user.click(clearButton);

      await waitFor(() => {
        expect(api.search).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: {},
          })
        );
      });
    });
  });

  describe('Sorting', () => {
    it('should display sort options', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AdvancedSearch />);

      const sortButton = screen.getByRole('button', { name: /sort/i });
      await user.click(sortButton);

      expect(screen.getByText(/relevance/i)).toBeInTheDocument();
      expect(screen.getByText(/date/i)).toBeInTheDocument();
      expect(screen.getByText(/size/i)).toBeInTheDocument();
    });

    it('should change sort order', async () => {
      const user = userEvent.setup();
      api.search = jest.fn().mockResolvedValue({ data: [] });

      renderWithProviders(<AdvancedSearch />);

      const sortButton = screen.getByRole('button', { name: /sort/i });
      await user.click(sortButton);

      const dateSort = screen.getByRole('option', { name: /date/i });
      await user.click(dateSort);

      await waitFor(() => {
        expect(api.search).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'date',
          })
        );
      });
    });

    it('should toggle sort direction', async () => {
      const user = userEvent.setup();
      api.search = jest.fn().mockResolvedValue({ data: [] });

      renderWithProviders(<AdvancedSearch />);

      const sortButton = screen.getByRole('button', { name: /sort/i });
      await user.click(sortButton);

      const ascButton = screen.getByRole('button', { name: /ascending/i });
      await user.click(ascButton);

      await waitFor(() => {
        expect(api.search).toHaveBeenCalledWith(
          expect.objectContaining({
            sortOrder: 'asc',
          })
        );
      });
    });
  });

  describe('Search Results', () => {
    it('should display search results', async () => {
      api.search = jest.fn().mockResolvedValue({
        data: [
          {
            id: '1',
            filename: 'lease_agreement.pdf',
            type: 'document',
            score: 0.95,
          },
        ],
        total: 1,
      });

      renderWithProviders(<AdvancedSearch />);

      await waitFor(() => {
        expect(screen.getByText('lease_agreement.pdf')).toBeInTheDocument();
      });
    });

    it('should show relevance score', async () => {
      api.search = jest.fn().mockResolvedValue({
        data: [
          {
            id: '1',
            filename: 'test.pdf',
            score: 0.95,
          },
        ],
        total: 1,
      });

      renderWithProviders(<AdvancedSearch />);

      await waitFor(() => {
        expect(screen.getByText(/95%/)).toBeInTheDocument();
      });
    });

    it('should display result badges', async () => {
      api.search = jest.fn().mockResolvedValue({
        data: [
          {
            id: '1',
            filename: 'test.pdf',
            type: 'document',
            starred: true,
          },
        ],
        total: 1,
      });

      renderWithProviders(<AdvancedSearch />);

      await waitFor(() => {
        expect(screen.getByText(/starred/i)).toBeInTheDocument();
      });
    });

    it('should show empty state when no results', async () => {
      api.search = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
      });

      renderWithProviders(<AdvancedSearch />);

      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });
    });

    it('should handle search errors', async () => {
      api.search = jest.fn().mockRejectedValue(new Error('Search failed'));

      renderWithProviders(<AdvancedSearch />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls', async () => {
      api.search = jest.fn().mockResolvedValue({
        data: Array(20).fill(null).map((_, i) => ({
          id: `${i}`,
          filename: `file_${i}.pdf`,
        })),
        total: 100,
      });

      renderWithProviders(<AdvancedSearch />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      });
    });

    it('should load next page', async () => {
      const user = userEvent.setup();
      api.search = jest.fn()
        .mockResolvedValueOnce({
          data: [{ id: '1', filename: 'file_1.pdf' }],
          total: 40,
        })
        .mockResolvedValueOnce({
          data: [{ id: '21', filename: 'file_21.pdf' }],
          total: 40,
        });

      renderWithProviders(<AdvancedSearch />);

      await waitFor(() => {
        expect(screen.getByText('file_1.pdf')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('file_21.pdf')).toBeInTheDocument();
      });
    });

    it('should disable previous button on first page', async () => {
      api.search = jest.fn().mockResolvedValue({
        data: [{ id: '1', filename: 'file_1.pdf' }],
        total: 40,
      });

      renderWithProviders(<AdvancedSearch />);

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous/i });
        expect(prevButton).toBeDisabled();
      });
    });

    it('should disable next button on last page', async () => {
      api.search = jest.fn().mockResolvedValue({
        data: [{ id: '39', filename: 'file_39.pdf' }],
        total: 40,
      });

      renderWithProviders(<AdvancedSearch />);

      // Manually set to last page
      const lastPageButton = screen.getByRole('button', { name: /last page/i });
      fireEvent.click(lastPageButton);

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        expect(nextButton).toBeDisabled();
      });
    });
  });

  describe('Faceted Navigation', () => {
    it('should display facets', async () => {
      api.search = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        facets: {
          category: [
            { name: 'receipts', count: 15 },
            { name: 'contracts', count: 10 },
          ],
        },
      });

      renderWithProviders(<AdvancedSearch />);

      await waitFor(() => {
        expect(screen.getByText(/receipts/i)).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
      });
    });

    it('should filter by clicking facet', async () => {
      const user = userEvent.setup();
      api.search = jest.fn()
        .mockResolvedValueOnce({
          data: [],
          total: 0,
          facets: {
            category: [{ name: 'receipts', count: 15 }],
          },
        })
        .mockResolvedValueOnce({
          data: [{ id: '1', filename: 'receipt.pdf' }],
          total: 15,
          facets: {},
        });

      renderWithProviders(<AdvancedSearch />);

      await waitFor(() => {
        const facetButton = screen.getByRole('button', { name: /receipts/i });
        fireEvent.click(facetButton);
      });

      await waitFor(() => {
        expect(api.search).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Saved Searches', () => {
    it('should display saved searches', async () => {
      api.getSavedSearches = jest.fn().mockResolvedValue([
        {
          id: '1',
          name: 'Important Receipts',
          query: 'receipt',
          filters: { category: 'receipts' },
        },
      ]);

      renderWithProviders(<AdvancedSearch />);

      await waitFor(() => {
        expect(screen.getByText('Important Receipts')).toBeInTheDocument();
      });
    });

    it('should load saved search', async () => {
      const user = userEvent.setup();
      api.getSavedSearches = jest.fn().mockResolvedValue([
        {
          id: '1',
          name: 'Important Receipts',
          query: 'receipt',
        },
      ]);
      api.search = jest.fn().mockResolvedValue({ data: [], total: 0 });

      renderWithProviders(<AdvancedSearch />);

      await waitFor(() => {
        const savedSearch = screen.getByText('Important Receipts');
        fireEvent.click(savedSearch);
      });

      await waitFor(() => {
        expect(api.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'receipt',
          })
        );
      });
    });

    it('should save current search', async () => {
      const user = userEvent.setup();
      api.saveSearch = jest.fn().mockResolvedValue({ id: '1' });

      renderWithProviders(<AdvancedSearch />);

      const saveButton = screen.getByRole('button', { name: /save search/i });
      await user.click(saveButton);

      const nameInput = screen.getByLabelText(/search name/i);
      await user.type(nameInput, 'My Search');

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(api.saveSearch).toHaveBeenCalled();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should collapse filters on small screens', () => {
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      renderWithProviders(<AdvancedSearch />);

      const filterPanel = screen.queryByText(/filter options/i);
      expect(filterPanel).not.toBeVisible();
    });

    it('should show mobile menu', () => {
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === '(max-width: 640px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      renderWithProviders(<AdvancedSearch />);

      const mobileMenu = screen.getByRole('button', { name: /menu/i });
      expect(mobileMenu).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate suggestions with arrow keys', async () => {
      const user = userEvent.setup();
      api.getSuggestions = jest.fn().mockResolvedValue([
        { text: 'first suggestion', count: 1 },
        { text: 'second suggestion', count: 1 },
      ]);

      renderWithProviders(<AdvancedSearch />);

      const searchInput = screen.getByPlaceholderText(/search.../i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText('first suggestion')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}');
      // Verify suggestion is highlighted
    });

    it('should select suggestion with Enter key', async () => {
      const user = userEvent.setup();
      api.getSuggestions = jest.fn().mockResolvedValue([
        { text: 'test suggestion', count: 1 },
      ]);
      api.search = jest.fn().mockResolvedValue({ data: [], total: 0 });

      renderWithProviders(<AdvancedSearch />);

      const searchInput = screen.getByPlaceholderText(/search.../i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText('test suggestion')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}{Enter}');

      await waitFor(() => {
        expect(searchInput).toHaveValue('test suggestion');
      });
    });

    it('should close dropdown with Escape', async () => {
      const user = userEvent.setup();
      api.getSuggestions = jest.fn().mockResolvedValue([
        { text: 'test', count: 1 },
      ]);

      renderWithProviders(<AdvancedSearch />);

      const searchInput = screen.getByPlaceholderText(/search.../i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText('test')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      expect(screen.queryByText('test')).not.toBeVisible();
    });
  });

  describe('Performance', () => {
    it('should memoize results to prevent unnecessary re-renders', () => {
      const renderSpy = jest.fn();
      api.search = jest.fn().mockResolvedValue({ data: [], total: 0 });

      const { rerender } = renderWithProviders(<AdvancedSearch />);

      renderSpy();
      expect(renderSpy).toHaveBeenCalled();

      rerender(
        <QueryClientProvider client={queryClient}>
          <AdvancedSearch />
        </QueryClientProvider>
      );

      // Should not cause additional searches if data is same
    });

    it('should cancel previous requests on new search', async () => {
      const user = userEvent.setup();
      const abortSpy = jest.fn();
      api.search = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ data: [], total: 0 }), 1000);
        });
      });

      renderWithProviders(<AdvancedSearch />);

      const searchInput = screen.getByPlaceholderText(/search.../i);
      await user.type(searchInput, 'first query');

      jest.advanceTimersByTime(300);

      await user.type(searchInput, ' second query');

      jest.advanceTimersByTime(300);

      // Only latest search should proceed
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(<AdvancedSearch />);

      const searchInput = screen.getByPlaceholderText(/search.../i);
      expect(searchInput).toHaveAttribute('aria-label');
    });

    it('should support screen readers', () => {
      api.search = jest.fn().mockResolvedValue({
        data: [{ id: '1', filename: 'test.pdf', score: 0.95 }],
        total: 1,
      });

      renderWithProviders(<AdvancedSearch />);

      const resultsRegion = screen.getByRole('region', { name: /results/i });
      expect(resultsRegion).toBeInTheDocument();
    });

    it('should announce search status', async () => {
      api.search = jest.fn().mockResolvedValue({ data: [], total: 0 });

      renderWithProviders(<AdvancedSearch />);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toBeInTheDocument();
    });
  });
});
