import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CorrectionsList from '../../app/corrections-list';
import { GlobalStateContext } from '../../context/GlobalState';
import tokenService from '../../services/tokenService';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  router: {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  },
}));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  return function IoniconsMock() {
    return React.createElement('Ionicons');
  };
});

const createResponse = (data, ok = true) => Promise.resolve({
  ok,
  status: ok ? 200 : 500,
  json: () => Promise.resolve(data),
});

const renderWithUser = () => render(
  <GlobalStateContext.Provider value={{ user: { email: 'admin@test.com' } }}>
    <CorrectionsList />
  </GlobalStateContext.Provider>
);

describe('CorrectionsList modals', () => {
  beforeEach(() => {
    tokenService.authenticatedFetch.mockReset();
  });

  test('shows warehouse-only rollback summary for MAGAZYN', async () => {
    const correction = {
      _id: 'cor_1',
      status: 'RESOLVED',
      attemptedOperation: 'WRITE_OFF',
      fullName: 'Kurtka zimowa',
      size: 'M',
      sellingPoint: 'MAGAZYN',
      barcode: 'BARCODE_1',
      createdAt: new Date().toISOString(),
      transactionId: 'tx_1',
    };

    tokenService.authenticatedFetch.mockImplementation((url, options = {}) => {
      if (url.includes('/corrections') && !options.method) {
        return createResponse([correction]);
      }
      if (url.includes(`/corrections/${correction._id}`) && options.method === 'PUT') {
        return createResponse({
          rollbackSummary: {
            fromSymbol: 'MAGAZYN',
            sellingPointCountBefore: 0,
            sellingPointCountAfter: 1,
            warehouseCountBefore: 10,
            warehouseCountAfter: 11,
          },
        });
      }
      return createResponse([]);
    });

    const screen = renderWithUser();

    // Czekamy aż korekty się załadują i będą wyświetlone
    await waitFor(() => {
      expect(screen.getByText('Kurtka zimowa')).toBeTruthy();
    }, { timeout: 5000 });

    // Teraz szukamy przycisku "Cofnij rozwiązanie"
    const rollbackButton = await waitFor(() => screen.getByText('Cofnij rozwiązanie'), { timeout: 3000 });
    fireEvent.press(rollbackButton);

    await waitFor(() => screen.getByText('Cofnięcie korekty zakończone pomyślnie'), { timeout: 3000 });

    expect(screen.queryByText('🏪 PUNKT SPRZEDAŻY - MAGAZYN')).toBeNull();
    expect(screen.getByText('📦 MAGAZYN')).toBeTruthy();
  });

  test('shows selling point rollback summary for non-warehouse', async () => {
    const correction = {
      _id: 'cor_2',
      status: 'RESOLVED',
      attemptedOperation: 'WRITE_OFF',
      fullName: 'Plaszcz',
      size: 'L',
      sellingPoint: 'PUNKT_A',
      barcode: 'BARCODE_2',
      createdAt: new Date().toISOString(),
      transactionId: 'tx_2',
    };

    tokenService.authenticatedFetch.mockImplementation((url, options = {}) => {
      if (url.includes('/corrections') && !options.method) {
        return createResponse([correction]);
      }
      if (url.includes(`/corrections/${correction._id}`) && options.method === 'PUT') {
        return createResponse({
          rollbackSummary: {
            fromSymbol: 'PUNKT_A',
            sellingPointCountBefore: 5,
            sellingPointCountAfter: 6,
            warehouseCountBefore: 10,
            warehouseCountAfter: 10,
          },
        });
      }
      return createResponse([]);
    });

    const screen = renderWithUser();

    await waitFor(() => screen.getByText('Cofnij rozwiązanie'));
    fireEvent.press(screen.getByText('Cofnij rozwiązanie'));

    await waitFor(() => screen.getByText('Cofnięcie korekty zakończone pomyślnie'));

    expect(screen.getByText('🏪 PUNKT SPRZEDAŻY - PUNKT_A')).toBeTruthy();
    expect(screen.getByText('Dodano:')).toBeTruthy();
    expect(screen.getByText('Plaszcz L +1')).toBeTruthy();
  });

  test('confirm modal hides selling point stats for MAGAZYN', async () => {
    const correction = {
      _id: 'cor_3',
      status: 'PENDING',
      attemptedOperation: 'SALE',
      fullName: 'Kurtka wiosenna',
      size: 'S',
      sellingPoint: 'PUNKT_B',
      barcode: 'BARCODE_3',
      createdAt: new Date().toISOString(),
      transactionId: 'tx_3',
    };

    const stateData = [
      {
        _id: 'state_1',
        barcode: 'BARCODE_3',
        fullName: 'Kurtka wiosenna',
        size: 'S',
        symbol: 'MAGAZYN',
      },
      {
        _id: 'state_2',
        barcode: 'BARCODE_3',
        fullName: 'Kurtka wiosenna',
        size: 'S',
        symbol: 'MAGAZYN',
      },
    ];

    tokenService.authenticatedFetch.mockImplementation((url, options = {}) => {
      if (url.includes('/corrections') && !options.method) {
        return createResponse([correction]);
      }
      if (url.includes('/state') && !options.method) {
        return createResponse(stateData);
      }
      return createResponse([]);
    });

    const screen = renderWithUser();

    await waitFor(() => screen.getByText('Wskaż'));
    fireEvent.press(screen.getByText('Wskaż'));

    await waitFor(() => screen.getByText('Lokalizacje produktu'));
    fireEvent.press(screen.getAllByText('Odpisz')[0]);

    await waitFor(() => screen.getByText('Potwierdź odpisanie'));

    expect(screen.queryByText(/📊 Stan w punkcie:/)).toBeNull();
    expect(screen.getByText(/📦 Stan w magazynie:/)).toBeTruthy();
  });

  test('shows warehouse-only writeoff summary for MAGAZYN', async () => {
    const correction = {
      _id: 'cor_4',
      status: 'PENDING',
      attemptedOperation: 'SALE',
      fullName: 'Plaszcz',
      size: 'L',
      sellingPoint: 'PUNKT_C',
      barcode: 'BARCODE_4',
      createdAt: new Date().toISOString(),
      transactionId: 'tx_4',
    };

    const stateData = [
      {
        _id: 'state_1',
        barcode: 'BARCODE_4',
        fullName: 'Plaszcz',
        size: 'L',
        symbol: 'MAGAZYN',
      },
      {
        _id: 'state_2',
        barcode: 'BARCODE_4',
        fullName: 'Plaszcz',
        size: 'L',
        symbol: 'MAGAZYN',
      },
    ];

    tokenService.authenticatedFetch.mockImplementation((url, options = {}) => {
      if (url.includes('/corrections') && !options.method) {
        return createResponse([correction]);
      }
      if (url.includes('/state') && !options.method) {
        return createResponse(stateData);
      }
      if (url.includes('/state/barcode/') && options.method === 'DELETE') {
        return createResponse({});
      }
      if (url.includes(`/corrections/${correction._id}`) && options.method === 'PUT') {
        return createResponse({});
      }
      return createResponse([]);
    });

    const screen = renderWithUser();

    await waitFor(() => screen.getByText('Wskaż'));
    fireEvent.press(screen.getByText('Wskaż'));

    await waitFor(() => screen.getByText('Lokalizacje produktu'));
    fireEvent.press(screen.getByText('Odpisz'));

    await waitFor(() => screen.getByText('Potwierdź odpisanie'));
    fireEvent.press(screen.getAllByText('Odpisz').slice(-1)[0]);

    await waitFor(() => screen.getByText('Odpisanie zakończone pomyślnie'));

    expect(screen.queryByText('🏪 PUNKT SPRZEDAŻY - MAGAZYN')).toBeNull();
    expect(screen.getByText('📦 MAGAZYN')).toBeTruthy();
    expect(screen.getByText('Odpisano:')).toBeTruthy();
    expect(screen.getByText('Plaszcz L -1')).toBeTruthy();
  });

  test('shows selling point writeoff summary for non-warehouse', async () => {
    const correction = {
      _id: 'cor_5',
      status: 'PENDING',
      attemptedOperation: 'SALE',
      fullName: 'Kurtka letnia',
      size: 'S',
      sellingPoint: 'PUNKT_A',
      barcode: 'BARCODE_5',
      createdAt: new Date().toISOString(),
      transactionId: 'tx_5',
    };

    const stateData = [
      {
        _id: 'state_1',
        barcode: 'BARCODE_5',
        fullName: 'Kurtka letnia',
        size: 'S',
        symbol: 'PUNKT_A',
      },
      {
        _id: 'state_2',
        barcode: 'BARCODE_5',
        fullName: 'Kurtka letnia',
        size: 'S',
        symbol: 'PUNKT_A',
      },
      {
        _id: 'state_3',
        barcode: 'BARCODE_5',
        fullName: 'Kurtka letnia',
        size: 'S',
        symbol: 'MAGAZYN',
      },
    ];

    tokenService.authenticatedFetch.mockImplementation((url, options = {}) => {
      if (url.includes('/corrections') && !options.method) {
        return createResponse([correction]);
      }
      if (url.includes('/state') && !options.method) {
        return createResponse(stateData);
      }
      if (url.includes('/state/barcode/') && options.method === 'DELETE') {
        return createResponse({});
      }
      if (url.includes(`/corrections/${correction._id}`) && options.method === 'PUT') {
        return createResponse({});
      }
      return createResponse([]);
    });

    const screen = renderWithUser();

    await waitFor(() => screen.getByText('Wskaż'));
    fireEvent.press(screen.getByText('Wskaż'));

    await waitFor(() => screen.getByText('Lokalizacje produktu'));
    fireEvent.press(screen.getAllByText('Odpisz')[0]);

    await waitFor(() => screen.getByText('Potwierdź odpisanie'));
    fireEvent.press(screen.getAllByText('Odpisz').slice(-1)[0]);

    await waitFor(() => screen.getByText('Odpisanie zakończone pomyślnie'));

    expect(screen.getByText('🏪 PUNKT SPRZEDAŻY - PUNKT_A')).toBeTruthy();
    expect(screen.getByText('Odpisano:')).toBeTruthy();
    expect(screen.getByText('Kurtka letnia S -1')).toBeTruthy();
    expect(screen.getByText('📦 MAGAZYN')).toBeTruthy();
  });
});
