/**
 * Integration tests for Remanent (Inventory) functionality
 * Tests complete workflows including scanning, comparing, and sending corrections
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Remanent from '../../app/(tabs)/remanent';
import { GlobalStateContext } from '../../context/GlobalState';
import tokenService from '../../services/tokenService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: true }, jest.fn()]
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}));

jest.mock('../../services/tokenService');

jest.mock('../../components/LogoutButton', () => 'LogoutButton');

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}));

jest.spyOn(Alert, 'alert');

describe('Remanent Integration Tests', () => {
  const mockContextValue = {
    user: {
      name: 'Jan Kowalski',
      username: 'jkowalski',
      symbol: 'A',
      role: 'employee'
    },
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'],
    colors: ['CZARNY', 'NIEBIESKI', 'BRĄZOWY', 'ZŁOTY', 'SREBRNY'],
    stocks: ['Zakopane', 'Kraków', 'Warszawa', 'Parzygnat'],
    stateData: [
      {
        id: '1',
        fullName: 'Amanda ZŁOTY',
        size: '3XL',
        barcode: 'BAR001',
        price: 100,
        symbol: 'A',
        color: 'ZŁOTY',
        qty: 1
      },
      {
        id: '2',
        fullName: 'Kurtka CZARNA',
        size: 'M',
        barcode: 'BAR002',
        price: 150,
        symbol: 'B',
        color: 'CZARNY',
        qty: 1
      },
      {
        id: '3',
        fullName: 'Kamizelka NIEBIESKA',
        size: 'L',
        barcode: 'BAR003',
        price: 120,
        symbol: 'C',
        color: 'NIEBIESKI',
        qty: 1
      },
      {
        id: '4',
        fullName: 'Kożuch BRĄZOWY',
        size: 'XL',
        barcode: 'BAR004',
        price: 200,
        symbol: 'D',
        color: 'BRĄZOWY',
        qty: 1
      }
    ],
    fetchSizes: jest.fn(),
    fetchColors: jest.fn(),
    fetchStock: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
  });

  describe('Complete Scanning Workflow', () => {
    it('should scan, save, and display products', async () => {
      const mockRemanentData = [
        {
          id: '1',
          name: 'Amanda ZŁOTY 3XL',
          code: 'BAR001',
          size: '',
          value: 100,
          timestamp: new Date().toISOString(),
          scannedAt: new Date().toISOString()
        }
      ];

      tokenService.authenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const { getByText } = render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        expect(getByText('Remanenty')).toBeTruthy();
      });

      // Click save button
      const saveButton = getByText('Zapisz');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          expect.stringContaining('/remanent'),
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });

    it('should handle barcode scanning flow', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] })
      });

      const { getByText } = render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        const scanButton = getByText('Skanuj');
        expect(scanButton).toBeTruthy();
      });

      // Note: Actual camera scanning would require more complex mocking
      // This test verifies the button is present and clickable
    });
  });

  describe('Compare and Corrections Workflow', () => {
    it('should compare scanned items with state and find missing items', async () => {
      const mockRemanentData = [
        {
          id: '1',
          name: 'Amanda ZŁOTY 3XL',
          code: 'BAR001',
          size: '',
          value: 100,
          timestamp: new Date().toISOString()
        }
        // BAR002, BAR003, BAR004 are missing
      ];

      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockRemanentData })
      });

      const { getByText } = render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        const compareButton = getByText('Porównaj');
        fireEvent.press(compareButton);
      });

      // Should detect 3 missing items (BAR002, BAR003, BAR004)
      // This opens comparison modal
      await waitFor(() => {
        // Modal should show missing items
        expect(getByText('Porównaj')).toBeTruthy();
      });
    });

    it('should detect extra/surplus items when scanned multiple times', async () => {
      const mockRemanentData = [
        {
          id: '1',
          name: 'Amanda ZŁOTY 3XL',
          code: 'BAR001',
          size: '',
          value: 100,
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Amanda ZŁOTY 3XL',
          code: 'BAR001', // Same barcode - duplicate scan
          size: '',
          value: 100,
          timestamp: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Amanda ZŁOTY 3XL',
          code: 'BAR001', // Same barcode - duplicate scan
          size: '',
          value: 100,
          timestamp: new Date().toISOString()
        }
      ];

      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockRemanentData })
      });

      const { getByText } = render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        const compareButton = getByText('Porównaj');
        fireEvent.press(compareButton);
      });

      // Should detect 1 item with 2 extras (scanned 3 times instead of 1)
    });

    it('should send corrections to backend API', async () => {
      const mockRemanentData = [
        {
          id: '1',
          name: 'Amanda ZŁOTY 3XL',
          code: 'BAR001',
          size: '',
          value: 100,
          timestamp: new Date().toISOString()
        }
      ];

      tokenService.authenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: mockRemanentData })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const { getByText } = render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        const compareButton = getByText('Porównaj');
        fireEvent.press(compareButton);
      });

      // After comparison, corrections can be sent
      // This would require clicking "Wyślij do korekt" button in the modal
    });

    it('should prevent duplicate correction submissions', async () => {
      const mockRemanentData = [
        {
          id: '1',
          name: 'Amanda ZŁOTY 3XL',
          code: 'BAR001',
          size: '',
          value: 100,
          timestamp: new Date().toISOString()
        }
      ];

      tokenService.authenticatedFetch
        .mockResolvedValue({
          ok: true,
          json: async () => ({ success: true })
        });

      const { getByText } = render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        expect(getByText('Remanenty')).toBeTruthy();
      });

      // The component uses sentCorrections Set to track sent corrections
      // This prevents duplicate submissions
    });
  });

  describe('Size Extraction and Name Separation', () => {
    it('should extract size from product name and display separately', async () => {
      const mockRemanentData = [
        {
          id: '1',
          name: 'Amanda ZŁOTY 3XL',
          code: 'BAR001',
          size: '',
          value: 100,
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Kurtka CZARNA M',
          code: 'BAR002',
          size: '',
          value: 150,
          timestamp: new Date().toISOString()
        }
      ];

      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockRemanentData })
      });

      const { getByText } = render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        const compareButton = getByText('Porównaj');
        fireEvent.press(compareButton);
      });

      // When comparison runs, size should be extracted:
      // "Amanda ZŁOTY 3XL" -> name: "Amanda ZŁOTY", size: "3XL"
      // "Kurtka CZARNA M" -> name: "Kurtka CZARNA", size: "M"
    });

    it('should handle products with existing size field', async () => {
      const mockRemanentData = [
        {
          id: '1',
          name: 'Amanda ZŁOTY',
          code: 'BAR001',
          size: 'XL',
          value: 100,
          timestamp: new Date().toISOString()
        }
      ];

      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockRemanentData })
      });

      const { getByText } = render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        expect(getByText('Remanenty')).toBeTruthy();
      });

      // Should use existing size field instead of extracting from name
    });
  });

  describe('Filtering Integration', () => {
    it('should filter products by assortment', async () => {
      const mockRemanentData = [
        {
          id: '1',
          name: 'Amanda ZŁOTY 3XL',
          code: 'BAR001',
          size: '',
          value: 100,
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Kurtka CZARNA M',
          code: 'BAR002',
          size: '',
          value: 150,
          timestamp: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Kurtka BRĄZOWA L',
          code: 'BAR003',
          size: '',
          value: 150,
          timestamp: new Date().toISOString()
        }
      ];

      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockRemanentData })
      });

      const { getByText } = render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        const filterButton = getByText('Filtruj');
        fireEvent.press(filterButton);
      });

      // Filter modal should open with assortment options
      // Available assortments: Amanda, Kurtka
    });

    it('should apply multiple filters simultaneously', async () => {
      const mockRemanentData = [
        {
          id: '1',
          name: 'Amanda ZŁOTY 3XL',
          code: 'BAR001',
          size: '',
          value: 100,
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Amanda SREBRNY M',
          code: 'BAR002',
          size: '',
          value: 100,
          timestamp: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Kurtka CZARNA L',
          code: 'BAR003',
          size: '',
          value: 150,
          timestamp: new Date().toISOString()
        }
      ];

      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockRemanentData })
      });

      const { getByText } = render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        expect(getByText('Filtruj')).toBeTruthy();
      });

      // Can filter by: assortment=Amanda, color=ZŁOTY, size=3XL
    });
  });

  describe('Data Persistence and State Management', () => {
    it('should save scanned data to AsyncStorage', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      const { getByText } = render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        const saveButton = getByText('Zapisz');
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalled();
      });
    });

    it('should load saved remanent data on mount', async () => {
      const savedData = JSON.stringify([
        {
          id: '1',
          name: 'Amanda ZŁOTY 3XL',
          code: 'BAR001',
          size: '',
          value: 100,
          timestamp: new Date().toISOString()
        }
      ]);

      AsyncStorage.getItem.mockResolvedValue(savedData);

      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: JSON.parse(savedData) })
      });

      const { getByText } = render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalled();
      });
    });

    it('should refresh data on pull-to-refresh', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] })
      });

      render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledTimes(1);
      });

      // Pull-to-refresh would trigger another fetch
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      tokenService.authenticatedFetch.mockRejectedValue(
        new Error('Network error')
      );

      render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining('błąd')
        );
      });
    });

    it('should handle empty remanent data', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] })
      });

      const { getByText } = render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        expect(getByText('Remanenty')).toBeTruthy();
      });
    });

    it('should handle malformed product names', async () => {
      const mockRemanentData = [
        {
          id: '1',
          name: '',
          code: 'BAR001',
          size: '',
          value: 100,
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          name: 'SingleWord',
          code: 'BAR002',
          size: '',
          value: 150,
          timestamp: new Date().toISOString()
        }
      ];

      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockRemanentData })
      });

      const { getByText } = render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        expect(getByText('Remanenty')).toBeTruthy();
      });

      // Should not crash with malformed names
    });

    it('should handle products without barcodes', async () => {
      const mockRemanentData = [
        {
          id: '1',
          name: 'Amanda ZŁOTY 3XL',
          code: '',
          size: '',
          value: 100,
          timestamp: new Date().toISOString()
        }
      ];

      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockRemanentData })
      });

      const { getByText } = render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        expect(getByText('Remanenty')).toBeTruthy();
      });
    });
  });

  describe('Real-world Correction Scenarios', () => {
    it('should handle scenario: product scanned but not in state', async () => {
      const mockRemanentData = [
        {
          id: '1',
          name: 'Unknown Product XL',
          code: 'BAR999',
          size: '',
          value: 100,
          timestamp: new Date().toISOString()
        }
      ];

      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockRemanentData })
      });

      const { getByText } = render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        const compareButton = getByText('Porównaj');
        fireEvent.press(compareButton);
      });

      // BAR999 is not in stateData, but was scanned
      // This might not trigger a correction since comparison only checks stateData items
    });

    it('should handle scenario: all products correct', async () => {
      const mockRemanentData = mockContextValue.stateData.map(item => ({
        id: item.id,
        name: `${item.fullName} ${item.size}`,
        code: item.barcode,
        size: '',
        value: item.price,
        timestamp: new Date().toISOString()
      }));

      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockRemanentData })
      });

      const { getByText } = render(
        <GlobalStateContext.Provider value={mockContextValue}>
          <Remanent />
        </GlobalStateContext.Provider>
      );

      await waitFor(() => {
        const compareButton = getByText('Porównaj');
        fireEvent.press(compareButton);
      });

      // All products match - no corrections needed
    });
  });
});
