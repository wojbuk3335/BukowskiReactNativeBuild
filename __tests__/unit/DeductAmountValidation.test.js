/**
 * Dedykowane testy UI i walidacji dla funkcji "Odpisz kwotę"
 * Testuje interakcje użytkownika, walidację formularza i integrację z komponentami
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { View, Text, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock context danych dla testów
const mockContextData = {
  totals: {
    PLN: 1000.00,
    EUR: 250.50,
    USD: 300.75
  },
  deductionsData: [
    { id: 1, amount: 100, currency: 'PLN', reason: 'Test deduction 1' },
    { id: 2, amount: 50, currency: 'EUR', reason: 'Test deduction 2' }
  ],
  employees: [
    { _id: 'emp1', firstName: 'Jan', lastName: 'Kowalski', employeeId: 'EMP001' },
    { _id: 'emp2', firstName: 'Anna', lastName: 'Nowak', employeeId: 'EMP002' }
  ]
};

// Mock komponent do testowania funkcjonalności odpisywania
const DeductAmountTestComponent = ({ 
  onDeductAmount = jest.fn(),
  availableFunds = mockContextData.totals,
  employees = mockContextData.employees,
  selectedEmployee = null,
  onEmployeeSelect = jest.fn()
}) => {
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [deductAmount, setDeductAmount] = React.useState('');
  const [deductCurrency, setDeductCurrency] = React.useState('PLN');
  const [deductReason, setDeductReason] = React.useState('');
  const [validationErrors, setValidationErrors] = React.useState({});

  const validateDeductForm = () => {
    const errors = {};
    
    // Walidacja kwoty
    const amount = parseFloat(deductAmount);
    if (!deductAmount || isNaN(amount) || amount <= 0) {
      errors.amount = 'Kwota musi być większa od 0';
    } else if (amount > availableFunds[deductCurrency]) {
      errors.amount = `Niewystarczające środki. Dostępne: ${availableFunds[deductCurrency]} ${deductCurrency}`;
    }

    // Walidacja powodu
    if (!deductReason.trim()) {
      errors.reason = 'Proszę podać powód odpisania';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitDeduction = () => {
    const isValid = validateDeductForm();
    
    if (!isValid) {
      return;
    }

    const deductionData = {
      amount: parseFloat(deductAmount),
      currency: deductCurrency,
      reason: deductReason.trim(),
      employee: selectedEmployee,
      timestamp: new Date().toISOString()
    };

    onDeductAmount(deductionData);
    
    // Reset form
    setDeductAmount('');
    setDeductReason('');
    setValidationErrors({});
    setIsModalVisible(false);
    
    Alert.alert('Sukces', 'Kwota została odpisana pomyślnie');
  };

  return (
    <View>
      <TouchableOpacity 
        testID="open-deduct-modal"
        onPress={() => setIsModalVisible(true)}
      >
        <Text>Odpisz kwotę</Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        testID="deduct-amount-modal"
        animationType="slide"
      >
        <View testID="modal-content">
          <Text>Odpisz kwotę</Text>
          
          {/* Kwota */}
          <View>
            <Text>Kwota do odpisania:</Text>
            <TextInput
              testID="deduct-amount-input"
              value={deductAmount}
              onChangeText={setDeductAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
            {validationErrors.amount && (
              <Text testID="amount-error" style={{color: 'red'}}>
                {validationErrors.amount}
              </Text>
            )}
          </View>

          {/* Waluta - Mock Picker */}
          <View>
            <Text>Waluta:</Text>
            <TouchableOpacity
              testID="deduct-currency-select"
              onPress={() => {
                // Symulacja wyboru waluty - dla testów
                const currencies = ['PLN', 'EUR', 'USD'];
                const currentIndex = currencies.indexOf(deductCurrency);
                const nextIndex = (currentIndex + 1) % currencies.length;
                setDeductCurrency(currencies[nextIndex]);
              }}
            >
              <Text>{deductCurrency}</Text>
            </TouchableOpacity>
            <Text testID="available-funds">
              Dostępne: {availableFunds[deductCurrency]} {deductCurrency}
            </Text>
          </View>

          {/* Powód */}
          <View>
            <Text>Powód odpisania:</Text>
            <TextInput
              testID="deduct-reason-input"
              value={deductReason}
              onChangeText={setDeductReason}
              placeholder="np. Wypłata pracownika"
            />
            {validationErrors.reason && (
              <Text testID="reason-error" style={{color: 'red'}}>
                {validationErrors.reason}
              </Text>
            )}
          </View>

          {/* Wybór pracownika */}
          <View>
            <Text>Pracownik (opcjonalnie):</Text>
            {selectedEmployee ? (
              <View testID="selected-employee">
                <Text>{selectedEmployee.firstName} {selectedEmployee.lastName}</Text>
                <TouchableOpacity onPress={() => onEmployeeSelect(null)}>
                  <Text>Usuń wybór</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TouchableOpacity testID="select-employee-btn" onPress={() => onEmployeeSelect(employees[0])}>
                  <Text>Wybierz pracownika</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Przyciski */}
          <View>
            <TouchableOpacity
              testID="submit-deduction"
              onPress={handleSubmitDeduction}
            >
              <Text>Potwierdź odpisanie</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="cancel-deduction"
              onPress={() => {
                setIsModalVisible(false);
                setDeductAmount('');
                setDeductReason('');
                setValidationErrors({});
              }}
            >
              <Text>Anuluj</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

describe('Deduct Amount UI and Validation Tests', () => {

  describe('Podstawowe renderowanie komponentu', () => {
    
    test('powinien renderować przycisk "Odpisz kwotę"', () => {
      const { getByTestId } = render(<DeductAmountTestComponent />);
      expect(getByTestId('open-deduct-modal')).toBeTruthy();
    });

    test('powinien otworzyć modal po kliknięciu przycisku', async () => {
      const { getByTestId } = render(<DeductAmountTestComponent />);
      
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      await waitFor(() => {
        expect(getByTestId('deduct-amount-modal')).toBeTruthy();
      });
    });

    test('powinien wyświetlić wszystkie pola formularza w modalu', async () => {
      const { getByTestId } = render(<DeductAmountTestComponent />);
      
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      await waitFor(() => {
        expect(getByTestId('deduct-amount-input')).toBeTruthy();
        expect(getByTestId('deduct-currency-select')).toBeTruthy();
        expect(getByTestId('deduct-reason-input')).toBeTruthy();
        expect(getByTestId('submit-deduction')).toBeTruthy();
        expect(getByTestId('cancel-deduction')).toBeTruthy();
      });
    });
  });

  describe('Walidacja kwoty', () => {
    
    test('powinien wyświetlić błąd dla pustej kwoty', async () => {
      const { getByTestId } = render(<DeductAmountTestComponent />);
      
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      await waitFor(() => {
        fireEvent.press(getByTestId('submit-deduction'));
      });

      await waitFor(() => {
        expect(getByTestId('amount-error')).toBeTruthy();
      });
    });

    test('powinien wyświetlić błąd dla zerowej kwoty', async () => {
      const { getByTestId } = render(<DeductAmountTestComponent />);
      
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      await waitFor(() => {
        fireEvent.changeText(getByTestId('deduct-amount-input'), '0');
        fireEvent.press(getByTestId('submit-deduction'));
      });

      await waitFor(() => {
        expect(getByTestId('amount-error')).toBeTruthy();
      });
    });

    test('powinien wyświetlić błąd dla ujemnej kwoty', async () => {
      const { getByTestId } = render(<DeductAmountTestComponent />);
      
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      await waitFor(() => {
        fireEvent.changeText(getByTestId('deduct-amount-input'), '-100');
        fireEvent.press(getByTestId('submit-deduction'));
      });

      await waitFor(() => {
        expect(getByTestId('amount-error')).toBeTruthy();
      });
    });

    test('powinien wyświetlić błąd dla kwoty większej niż dostępne środki', async () => {
      const { getByTestId } = render(
        <DeductAmountTestComponent 
          availableFunds={{ PLN: 500, EUR: 100, USD: 200 }}
        />
      );
      
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      await waitFor(() => {
        fireEvent.changeText(getByTestId('deduct-amount-input'), '600');
        fireEvent.changeText(getByTestId('deduct-reason-input'), 'Test reason');
        fireEvent.press(getByTestId('submit-deduction'));
      });

      await waitFor(() => {
        const errorElement = getByTestId('amount-error');
        expect(errorElement).toBeTruthy();
        expect(errorElement.props.children).toContain('Niewystarczające środki');
      });
    });

    test('powinien akceptować prawidłową kwotę', async () => {
      const mockDeductAmount = jest.fn();
      const { getByTestId } = render(
        <DeductAmountTestComponent 
          onDeductAmount={mockDeductAmount}
          availableFunds={{ PLN: 1000, EUR: 250, USD: 300 }}
        />
      );
      
      // Otwórz modal
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      // Wypełnij formularz
      await act(async () => {
        fireEvent.changeText(getByTestId('deduct-amount-input'), '250');
        fireEvent.changeText(getByTestId('deduct-reason-input'), 'Valid deduction');
      });

      // Poczekaj na walidację i wyślij
      await act(async () => {
        fireEvent.press(getByTestId('submit-deduction'));
      });

      // Sprawdź czy funkcja została wywołana z właściwymi danymi
      await waitFor(() => {
        expect(mockDeductAmount).toHaveBeenCalledWith({
          amount: 250,
          currency: 'PLN',
          reason: 'Valid deduction',
          employee: null,
          timestamp: expect.any(String)
        });
      });
    });
  });

  describe('Walidacja powodu', () => {
    
    test('powinien wyświetlić błąd dla pustego powodu', async () => {
      const { getByTestId } = render(<DeductAmountTestComponent />);
      
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      await waitFor(() => {
        fireEvent.changeText(getByTestId('deduct-amount-input'), '100');
        fireEvent.press(getByTestId('submit-deduction'));
      });

      await waitFor(() => {
        expect(getByTestId('reason-error')).toBeTruthy();
      });
    });

    test('powinien wyświetlić błąd dla powodu składającego się tylko z białych znaków', async () => {
      const { getByTestId } = render(<DeductAmountTestComponent />);
      
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      await waitFor(() => {
        fireEvent.changeText(getByTestId('deduct-amount-input'), '100');
        fireEvent.changeText(getByTestId('deduct-reason-input'), '   ');
        fireEvent.press(getByTestId('submit-deduction'));
      });

      await waitFor(() => {
        expect(getByTestId('reason-error')).toBeTruthy();
      });
    });

    test('powinien akceptować prawidłowy powód', async () => {
      const mockDeductAmount = jest.fn();
      const { getByTestId } = render(<DeductAmountTestComponent onDeductAmount={mockDeductAmount} />);
      
      // Otwórz modal
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      // Wypełnij formularz
      await act(async () => {
        fireEvent.changeText(getByTestId('deduct-amount-input'), '100');
        fireEvent.changeText(getByTestId('deduct-reason-input'), 'Wypłata pracownika');
      });

      // Wyślij formularz
      await act(async () => {
        fireEvent.press(getByTestId('submit-deduction'));
      });

      // Sprawdź wywołanie funkcji
      await waitFor(() => {
        expect(mockDeductAmount).toHaveBeenCalledWith(expect.objectContaining({
          reason: 'Wypłata pracownika'
        }));
      });
    });
  });

  describe('Wybór waluty', () => {
    
    test('powinien wyświetlić dostępne środki dla wybranej waluty', async () => {
      const { getByTestId } = render(
        <DeductAmountTestComponent 
          availableFunds={{ PLN: 1000, EUR: 250, USD: 300 }}
        />
      );
      
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      await waitFor(() => {
        const availableFunds = getByTestId('available-funds');
        const text = Array.isArray(availableFunds.props.children) 
          ? availableFunds.props.children.join('')
          : availableFunds.props.children;
        expect(text).toContain('1000 PLN');
      });
    });

    test('powinien zaktualizować dostępne środki po zmianie waluty', async () => {
      const { getByTestId } = render(
        <DeductAmountTestComponent 
          availableFunds={{ PLN: 1000, EUR: 250, USD: 300 }}
        />
      );
      
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      await waitFor(() => {
        fireEvent.press(getByTestId('deduct-currency-select'));
      });

      await waitFor(() => {
        const availableFunds = getByTestId('available-funds');
        const text = Array.isArray(availableFunds.props.children) 
          ? availableFunds.props.children.join('')
          : availableFunds.props.children;
        expect(text).toContain('250 EUR');
      });
    });

    test('powinien walidować kwotę względem nowo wybranej waluty', async () => {
      const { getByTestId } = render(
        <DeductAmountTestComponent 
          availableFunds={{ PLN: 1000, EUR: 100, USD: 200 }}
        />
      );
      
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      await waitFor(() => {
        fireEvent.changeText(getByTestId('deduct-amount-input'), '150');
        fireEvent.press(getByTestId('deduct-currency-select')); 
        fireEvent.changeText(getByTestId('deduct-reason-input'), 'Test');
        fireEvent.press(getByTestId('submit-deduction'));
      });

      await waitFor(() => {
        expect(getByTestId('amount-error')).toBeTruthy();
      });
    });
  });

  describe('Wybór pracownika', () => {
    
    test('powinien pozwolić na wybór pracownika', async () => {
      const mockEmployeeSelect = jest.fn();
      const employees = [
        { _id: 'emp1', firstName: 'Jan', lastName: 'Kowalski', employeeId: 'EMP001' }
      ];
      
      const { getByTestId } = render(
        <DeductAmountTestComponent 
          employees={employees}
          onEmployeeSelect={mockEmployeeSelect}
        />
      );
      
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      await waitFor(() => {
        fireEvent.press(getByTestId('select-employee-btn'));
      });

      expect(mockEmployeeSelect).toHaveBeenCalledWith(employees[0]);
    });

    test('powinien wyświetlić wybranego pracownika', async () => {
      const selectedEmployee = { 
        _id: 'emp1', 
        firstName: 'Jan', 
        lastName: 'Kowalski', 
        employeeId: 'EMP001' 
      };
      
      const { getByTestId } = render(
        <DeductAmountTestComponent selectedEmployee={selectedEmployee} />
      );
      
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      await waitFor(() => {
        const employeeElement = getByTestId('selected-employee');
        expect(employeeElement).toBeTruthy();
      });
    });

    test('powinien dołączyć informacje o pracowniku do odpisania', async () => {
      const mockDeductAmount = jest.fn();
      const selectedEmployee = { 
        _id: 'emp1', 
        firstName: 'Anna', 
        lastName: 'Nowak', 
        employeeId: 'EMP002' 
      };
      
      const { getByTestId } = render(
        <DeductAmountTestComponent 
          onDeductAmount={mockDeductAmount}
          selectedEmployee={selectedEmployee}
        />
      );
      
      // Otwórz modal
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      // Wypełnij formularz
      await act(async () => {
        fireEvent.changeText(getByTestId('deduct-amount-input'), '500');
        fireEvent.changeText(getByTestId('deduct-reason-input'), 'Zaliczka pracownika');
      });

      // Wyślij formularz  
      await act(async () => {
        fireEvent.press(getByTestId('submit-deduction'));
      });

      // Sprawdź wywołanie
      await waitFor(() => {
        expect(mockDeductAmount).toHaveBeenCalledWith(expect.objectContaining({
          employee: selectedEmployee
        }));
      });
    });
  });

  describe('Obsługa anulowania', () => {
    
    test('powinien zamknąć modal przy anulowaniu', async () => {
      const { getByTestId, queryByTestId } = render(<DeductAmountTestComponent />);
      
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      await waitFor(() => {
        expect(getByTestId('deduct-amount-modal')).toBeTruthy();
      });

      fireEvent.press(getByTestId('cancel-deduction'));
      
      await waitFor(() => {
        const modal = queryByTestId('deduct-amount-modal');
        expect(modal?.props?.visible).toBeFalsy();
      });
    });

    test('powinien wyczyścić formularz przy anulowaniu', async () => {
      const { getByTestId } = render(<DeductAmountTestComponent />);
      
      // Otwórz modal i wypełnij formularz
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      await waitFor(() => {
        fireEvent.changeText(getByTestId('deduct-amount-input'), '123');
        fireEvent.changeText(getByTestId('deduct-reason-input'), 'Test reason');
      });

      // Anuluj
      fireEvent.press(getByTestId('cancel-deduction'));
      
      // Otwórz ponownie
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      await waitFor(() => {
        expect(getByTestId('deduct-amount-input').props.value).toBe('');
        expect(getByTestId('deduct-reason-input').props.value).toBe('');
      });
    });
  });

  describe('Obsługa sukcesu', () => {
    
    test('powinien wyświetlić alert po udanym odpisaniu', async () => {
      const { getByTestId } = render(<DeductAmountTestComponent />);
      
      // Otwórz modal
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      // Wypełnij formularz
      await act(async () => {
        fireEvent.changeText(getByTestId('deduct-amount-input'), '100');
        fireEvent.changeText(getByTestId('deduct-reason-input'), 'Successful deduction');
      });

      // Wyślij formularz
      await act(async () => {
        fireEvent.press(getByTestId('submit-deduction'));
      });

      // Sprawdź alert
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Sukces', 'Kwota została odpisana pomyślnie');
      });
    });

    test('powinien wyczyścić formularz po udanym odpisaniu', async () => {
      const { getByTestId, queryByTestId } = render(<DeductAmountTestComponent />);
      
      // Otwórz modal
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      // Wypełnij formularz
      await act(async () => {
        fireEvent.changeText(getByTestId('deduct-amount-input'), '100');
        fireEvent.changeText(getByTestId('deduct-reason-input'), 'Successful deduction');
      });

      // Wyślij formularz
      await act(async () => {
        fireEvent.press(getByTestId('submit-deduction'));
      });

      // Sprawdź zamknięcie modala z dłuższym timeout
      await waitFor(() => {
        const modal = queryByTestId('deduct-amount-modal');
        expect(modal?.props?.visible).toBeFalsy();
      }, { timeout: 2000 });
    });
  });

  describe('Przypadki brzegowe', () => {
    
    test('powinien obsłużyć brak dostępnych środków', async () => {
      const { getByTestId } = render(
        <DeductAmountTestComponent 
          availableFunds={{ PLN: 0, EUR: 0, USD: 0 }}
        />
      );
      
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      await waitFor(() => {
        fireEvent.changeText(getByTestId('deduct-amount-input'), '1');
        fireEvent.changeText(getByTestId('deduct-reason-input'), 'Test');
        fireEvent.press(getByTestId('submit-deduction'));
      });

      await waitFor(() => {
        expect(getByTestId('amount-error')).toBeTruthy();
      });
    });

    test('powinien obsłużyć bardzo małe kwoty', async () => {
      const mockDeductAmount = jest.fn();
      const { getByTestId } = render(
        <DeductAmountTestComponent 
          onDeductAmount={mockDeductAmount}
          availableFunds={{ PLN: 1, EUR: 1, USD: 1 }}
        />
      );
      
      // Otwórz modal
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      // Wypełnij formularz
      await act(async () => {
        fireEvent.changeText(getByTestId('deduct-amount-input'), '0.01');
        fireEvent.changeText(getByTestId('deduct-reason-input'), 'Minimal deduction');
      });

      // Wyślij formularz
      await act(async () => {
        fireEvent.press(getByTestId('submit-deduction'));
      });

      // Sprawdź wywołanie
      await waitFor(() => {
        expect(mockDeductAmount).toHaveBeenCalledWith(expect.objectContaining({
          amount: 0.01
        }));
      });
    });

    test('powinien obsłużyć bardzo duże kwoty', async () => {
      const mockDeductAmount = jest.fn();
      const { getByTestId } = render(
        <DeductAmountTestComponent 
          onDeductAmount={mockDeductAmount}
          availableFunds={{ PLN: 999999.99, EUR: 999999.99, USD: 999999.99 }}
        />
      );
      
      // Otwórz modal
      fireEvent.press(getByTestId('open-deduct-modal'));
      
      // Wypełnij formularz
      await act(async () => {
        fireEvent.changeText(getByTestId('deduct-amount-input'), '999999.99');
        fireEvent.changeText(getByTestId('deduct-reason-input'), 'Maximum deduction');
      });

      // Wyślij formularz
      await act(async () => {
        fireEvent.press(getByTestId('submit-deduction'));
      });

      // Sprawdź wywołanie
      await waitFor(() => {
        expect(mockDeductAmount).toHaveBeenCalledWith(expect.objectContaining({
          amount: 999999.99
        }));
      });
    });
  });
});