import { fireEvent, render } from '@testing-library/react-native';
import FormField from '../../components/FormField';

// Mock icons
jest.mock('../../constants', () => ({
  icons: {
    eye: 'mock-eye-icon',
    eyeHide: 'mock-eye-hide-icon',
  },
}));

describe('FormField', () => {
  const defaultProps = {
    title: 'Test Field',
    value: '',
    handleChangeText: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Password visibility toggle', () => {
    it('should render eye icon when secureTextEntry is true', () => {
      const { getByTestId } = render(
        <FormField 
          {...defaultProps} 
          secureTextEntry={true}
          testID="form-field"
        />
      );

      // Sprawdź czy ikona jest widoczna
      expect(() => getByTestId('password-toggle-button')).not.toThrow();
    });

    it('should not render eye icon when secureTextEntry is false', () => {
      const { queryByTestId } = render(
        <FormField 
          {...defaultProps} 
          secureTextEntry={false}
          testID="form-field"
        />
      );

      // Sprawdź czy ikona nie jest widoczna
      expect(queryByTestId('password-toggle-button')).toBeNull();
    });

    it('should toggle password visibility when eye icon is pressed', () => {
      const { getByTestId } = render(
        <FormField 
          {...defaultProps} 
          value="test123"
          secureTextEntry={true}
          testID="form-field"
        />
      );

      const textInput = getByTestId('text-input');
      const toggleButton = getByTestId('password-toggle-button');

      // Sprawdź początkowy stan - hasło powinno być ukryte
      expect(textInput.props.secureTextEntry).toBe(true);

      // Kliknij ikonę
      fireEvent.press(toggleButton);

      // Sprawdź czy hasło jest teraz widoczne
      expect(textInput.props.secureTextEntry).toBe(false);

      // Kliknij ponownie
      fireEvent.press(toggleButton);

      // Sprawdź czy hasło jest znowu ukryte
      expect(textInput.props.secureTextEntry).toBe(true);
    });

    it('should show correct icon based on password visibility state', () => {
      const { getByTestId } = render(
        <FormField 
          {...defaultProps} 
          secureTextEntry={true}
          testID="form-field"
        />
      );

      const toggleButton = getByTestId('password-toggle-button');
      const eyeIcon = getByTestId('eye-icon');

      // Sprawdź początkową ikonę (eye - pokazuj hasło)
      expect(eyeIcon.props.source).toBe('mock-eye-icon');

      // Kliknij aby pokazać hasło
      fireEvent.press(toggleButton);

      // Sprawdź czy ikona zmieniła się na eyeHide
      expect(eyeIcon.props.source).toBe('mock-eye-hide-icon');
    });

    it('should handle text input correctly', () => {
      const mockHandleChangeText = jest.fn();
      const { getByTestId } = render(
        <FormField 
          {...defaultProps} 
          handleChangeText={mockHandleChangeText}
          testID="form-field"
        />
      );

      const textInput = getByTestId('text-input');

      fireEvent.changeText(textInput, 'test input');

      expect(mockHandleChangeText).toHaveBeenCalledWith('test input');
    });

    it('should apply correct styles and props', () => {
      const { getByTestId } = render(
        <FormField 
          {...defaultProps} 
          placeholder="Enter password"
          secureTextEntry={true}
          testID="form-field"
        />
      );

      const textInput = getByTestId('text-input');

      expect(textInput.props.placeholder).toBe('Enter password');
      expect(textInput.props.placeholderTextColor).toBe('#0d6efd');
    });
  });
});
