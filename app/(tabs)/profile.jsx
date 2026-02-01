import { useContext, useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, ScrollView, ActivityIndicator, TextInput, FlatList, KeyboardAvoidingView, Platform, Alert, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GlobalStateContext } from '../../context/GlobalState';
import tokenService from '../../services/tokenService';
import Logger from '../../services/logger'; // Import logger service
import { getApiUrl } from '../../config/api';
import LogoutButton from '../../components/LogoutButton';

const Profile = () => {
  const { logout, user } = useContext(GlobalStateContext); // Access logout function
  
  // States for order form
  const [products, setProducts] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Success modal states
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  // Search text states
  const [productSearchText, setProductSearchText] = useState('');
  const [colorSearchText, setColorSearchText] = useState('');
  const [sizeSearchText, setSizeSearchText] = useState('');

  // Dropdown visibility states
  const [productDropdownVisible, setProductDropdownVisible] = useState(false);
  const [colorDropdownVisible, setColorDropdownVisible] = useState(false);
  const [sizeDropdownVisible, setSizeDropdownVisible] = useState(false);

  // Filtered data states
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredColors, setFilteredColors] = useState([]);
  const [filteredSizes, setFilteredSizes] = useState([]);

  // Input focus states
  const [productInputFocused, setProductInputFocused] = useState(false);
  const [colorInputFocused, setColorInputFocused] = useState(false);
  const [sizeInputFocused, setSizeInputFocused] = useState(false);
  const [descriptionInputFocused, setDescriptionInputFocused] = useState(false);
  
  // Validation error states
  const [productValidationError, setProductValidationError] = useState(false);
  const [colorValidationError, setColorValidationError] = useState(false);
  const [sizeValidationError, setSizeValidationError] = useState(false);

  // Description state
  const [description, setDescription] = useState('');

  // Customer data states
  const [customerName, setCustomerName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [citySearchText, setCitySearchText] = useState('');
  const [customerNameFocused, setCustomerNameFocused] = useState(false);
  const [postalCodeFocused, setPostalCodeFocused] = useState(false);
  const [cityInputFocused, setCityInputFocused] = useState(false);
  
  // Street data states
  const [streetSearchText, setStreetSearchText] = useState('');
  const [streetInputFocused, setStreetInputFocused] = useState(false);
  
  // House number state
  const [houseNumber, setHouseNumber] = useState('');
  const [houseNumberFocused, setHouseNumberFocused] = useState(false);

  // Phone number state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneNumberFocused, setPhoneNumberFocused] = useState(false);
  const [phoneNumberError, setPhoneNumberError] = useState('');

  // Email state
  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Delivery option state
  const [deliveryOption, setDeliveryOption] = useState('pickup'); // 'shipping', 'delivery', or 'pickup'

  // Payment states
  const [totalPrice, setTotalPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [depositCurrency, setDepositCurrency] = useState('PLN'); // Waluta zaliczki
  const [totalPriceFocused, setTotalPriceFocused] = useState(false);
  const [depositFocused, setDepositFocused] = useState(false);

  // Invoice/Receipt states
  const [documentType, setDocumentType] = useState('receipt'); // 'receipt' or 'invoice'
  const [nip, setNip] = useState('');
  const [nipFocused, setNipFocused] = useState(false);
  const [nipError, setNipError] = useState('');

  // Date picker states
  const [realizationDate, setRealizationDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle postal code change with validation only (no API)
  const handlePostalCodeChange = (text) => {
    // Auto-format postal code (add dash after 2 digits)
    let formatted = text.replace(/[^0-9]/g, '');
    if (formatted.length > 2) {
      formatted = formatted.substring(0, 2) + '-' + formatted.substring(2, 5);
    }
    
    setPostalCode(formatted);
  };

  // Handle city text change (simple text input, no API)
  const handleCityChange = (text) => {
    setCitySearchText(text);
  };

  // Phone number validation and formatting
  const validatePhoneNumber = (phone) => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Polish phone number patterns
    const patterns = [
      /^48[4-9]\d{8}$/, // +48 format (international)
      /^[4-9]\d{8}$/, // 9 digits starting with 4-9 (national)
    ];
    
    return patterns.some(pattern => pattern.test(cleanPhone));
  };

  const formatPhoneNumber = (phone) => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Format based on length
    if (cleanPhone.length <= 3) {
      return cleanPhone;
    } else if (cleanPhone.length <= 6) {
      return `${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3)}`;
    } else if (cleanPhone.length <= 9) {
      return `${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3, 6)} ${cleanPhone.slice(6)}`;
    } else if (cleanPhone.length <= 11 && cleanPhone.startsWith('48')) {
      // International format
      return `+48 ${cleanPhone.slice(2, 5)} ${cleanPhone.slice(5, 8)} ${cleanPhone.slice(8)}`;
    } else {
      return `${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3, 6)} ${cleanPhone.slice(6, 9)}`;
    }
  };

  const handlePhoneNumberChange = (text) => {
    // Allow only digits, spaces, +, and - characters
    const filteredText = text.replace(/[^\d\s\+\-]/g, '');
    
    // Format the phone number
    const formattedPhone = formatPhoneNumber(filteredText);
    setPhoneNumber(formattedPhone);
    
    // Validate and set error
    if (filteredText.length > 0) {
      const isValid = validatePhoneNumber(filteredText);
      if (!isValid) {
        setPhoneNumberError('Nieprawidłowy numer telefonu');
      } else {
        setPhoneNumberError('');
      }
    } else {
      setPhoneNumberError('');
    }
  };

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (text) => {
    // Trim whitespace and clean email
    const cleanEmail = text.trim().replace(/\s+/g, '');
    setEmail(cleanEmail);
    
    // Validate email if not empty (since it's optional)
    if (cleanEmail.length > 0) {
      const isValid = validateEmail(cleanEmail);
      if (!isValid) {
        setEmailError('Nieprawidłowy format adresu email');
      } else {
        setEmailError('');
      }
    } else {
      setEmailError(''); // Clear error when field is empty (optional field)
    }
  };

  // Payment calculations
  const parsePrice = (priceString) => {
    // Remove all non-digit characters except decimal point
    const cleanPrice = priceString.replace(/[^\d.,]/g, '').replace(',', '.');
    return parseFloat(cleanPrice) || 0;
  };

  const formatPrice = (price) => {
    if (price === 0) return '';
    return price.toFixed(2) + ' zł';
  };

  const calculateCashOnDelivery = () => {
    const total = parsePrice(totalPrice);
    const depositAmount = parsePrice(deposit);
    const remaining = total - depositAmount;
    
    if (remaining <= 0) return 0;
    
    // Add shipping cost only for 'shipping' option, not for 'delivery' or 'pickup'
    const shippingCost = deliveryOption === 'shipping' ? 20 : 0;
    return remaining + shippingCost;
  };

  const handleTotalPriceChange = (text) => {
    // Allow only numbers, dots, commas, and "zł" symbol
    const filteredText = text.replace(/[^0-9.,zł\s]/g, '');
    setTotalPrice(filteredText);
  };

  const handleDepositChange = (text) => {
    // Allow only numbers, dots, commas, and "zł" symbol
    const filteredText = text.replace(/[^0-9.,zł\s]/g, '');
    setDeposit(filteredText);
  };

  // NIP validation
  const validateNIP = (nip) => {
    // Remove all non-digit characters
    const cleanNip = nip.replace(/\D/g, '');
    
    // NIP must have exactly 10 digits
    if (cleanNip.length !== 10) return false;
    
    // NIP validation algorithm
    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanNip[i]) * weights[i];
    }
    
    const checkDigit = sum % 11;
    const lastDigit = parseInt(cleanNip[9]);
    
    return checkDigit === lastDigit || (checkDigit === 10 && lastDigit === 0);
  };

  const handleNipChange = (text) => {
    // Format NIP with dashes (XXX-XXX-XX-XX)
    let cleaned = text.replace(/\D/g, '');
    
    // Limit to 10 digits
    if (cleaned.length > 10) {
      cleaned = cleaned.substring(0, 10);
    }
    
    // Add dashes at proper positions based on clean length
    let formatted = cleaned;
    if (cleaned.length > 8) {
      // XXX-XXX-XX-XX (full format with 9-10 digits)
      formatted = cleaned.substring(0, 3) + '-' + cleaned.substring(3, 6) + '-' + cleaned.substring(6, 8) + '-' + cleaned.substring(8);
    } else if (cleaned.length > 6) {
      // XXX-XXX-XX (7-8 digits)
      formatted = cleaned.substring(0, 3) + '-' + cleaned.substring(3, 6) + '-' + cleaned.substring(6);
    } else if (cleaned.length > 3) {
      // XXX-XXX (4-6 digits)
      formatted = cleaned.substring(0, 3) + '-' + cleaned.substring(3);
    }
    
    setNip(formatted);
    
    // Validate NIP
    if (cleaned.length > 0) {
      const isValid = validateNIP(cleaned);
      if (!isValid && cleaned.length === 10) {
        setNipError('Nieprawidłowy numer NIP');
      } else {
        setNipError('');
      }
    } else {
      setNipError('');
    }
  };

  // Generate order ID
  // Validate form
  const validateForm = () => {
    let hasErrors = false;
    
    // Validate product selection (real-time validation already handles this)
    if (!selectedProduct || productValidationError) {
      if (!productValidationError) setProductValidationError(true);
      Alert.alert('Błąd', 'Proszę wybrać poprawny produkt z listy');
      hasErrors = true;
    }
    
    // Validate color selection (real-time validation already handles this)
    if (!selectedColor || colorValidationError) {
      if (!colorValidationError) setColorValidationError(true);
      Alert.alert('Błąd', 'Proszę wybrać poprawny kolor z listy');
      hasErrors = true;
    }
    
    // Validate size selection (real-time validation already handles this)
    if (!selectedSize || sizeValidationError) {
      if (!sizeValidationError) setSizeValidationError(true);
      Alert.alert('Błąd', 'Proszę wybrać poprawny rozmiar z listy');
      hasErrors = true;
    }
    
    if (hasErrors) return false;
    if (!customerName.trim()) {
      Alert.alert('Błąd', 'Proszę podać imię i nazwisko');
      return false;
    }
    if (!phoneNumber.trim()) {
      Alert.alert('Błąd', 'Proszę podać numer telefonu');
      return false;
    }
    if (phoneNumberError) {
      Alert.alert('Błąd', 'Proszę podać prawidłowy numer telefonu');
      return false;
    }
    
    // Validate address fields based on delivery option
    if (deliveryOption === 'shipping') {
      if (!postalCode.trim()) {
        Alert.alert('Błąd', 'Kod pocztowy jest wymagany dla wysyłki');
        return false;
      }
      if (!citySearchText.trim()) {
        Alert.alert('Błąd', 'Miejscowość jest wymagana dla wysyłki');
        return false;
      }
    }
    
    if (deliveryOption === 'delivery') {
      if (!citySearchText.trim()) {
        Alert.alert('Błąd', 'Miejscowość jest wymagana dla dostawy');
        return false;
      }
      if (!houseNumber.trim()) {
        Alert.alert('Błąd', 'Numer domu jest wymagany dla dostawy');
        return false;
      }
    }
    if (!totalPrice.trim()) {
      Alert.alert('Błąd', 'Proszę podać cenę całkowitą');
      return false;
    }
    if (documentType === 'invoice' && !nip.trim()) {
      Alert.alert('Błąd', 'Dla faktury wymagany jest numer NIP');
      return false;
    }
    if (documentType === 'invoice' && nipError) {
      Alert.alert('Błąd', 'Proszę podać prawidłowy numer NIP');
      return false;
    }
    if (email && emailError) {
      Alert.alert('Błąd', 'Proszę podać prawidłowy adres email');
      return false;
    }
    return true;
  };

  // Submit order
  const handleSubmitOrder = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const orderData = {
        product: {
          name: selectedProduct?.Tow_Opis || selectedProduct?.name,
          color: selectedColor?.Kol_Opis || selectedColor?.name,
          size: selectedSize?.Roz_Opis || selectedSize?.name,
          description
        },
        customer: {
          name: customerName,
          phone: phoneNumber,
          email: email ? email.trim() : null, // Clean email before sending
          deliveryOption,
          address: {
            postalCode: deliveryOption === 'shipping' ? postalCode : null,
            city: deliveryOption !== 'pickup' ? citySearchText : null,
            street: deliveryOption !== 'pickup' ? streetSearchText : null,
            houseNumber: deliveryOption !== 'pickup' ? houseNumber : null
          }
        },
        payment: {
          totalPrice: parsePrice(totalPrice),
          deposit: parsePrice(deposit),
          depositCurrency: depositCurrency, // Waluta zaliczki (PLN, EUR, USD, etc.)
          cashOnDelivery: calculateCashOnDelivery(),
          documentType,
          nip: documentType === 'invoice' ? nip : null
        },
        realizationDate: realizationDate.toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: user?.symbol || user?.email // Symbol punktu sprzedaży dla operacji finansowych
      };

      // Debug: sprawdź co jest w obiekcie user
      Logger.debug('🔍 DEBUG USER OBJECT:', {
        hasUser: !!user,
        symbol: user?.symbol,
        email: user?.email,
        createdBy: orderData.createdBy
      });

      // Save to database
      const response = await tokenService.authenticatedFetch(getApiUrl('/orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        const result = await response.json();
        const backendOrderId = result.orderId; // Use orderId from backend
        
        Logger.debug('✅ Zamówienie zapisane, ID:', backendOrderId);

        // Email is sent automatically by backend in createOrder function
        Logger.debug('📧 Email wysyłany automatycznie przez backend');

        // Set success message and show modal
        setOrderNumber(backendOrderId);
        setSuccessMessage(
          email 
            ? 'Zamówienie zostało złożone!\n\nEmail z potwierdzeniem został wysłany na adres klienta.'
            : 'Zamówienie zostało złożone!\n\nPowiadomienie zostało wysłane do sklepu.'
        );
        setSuccessModalVisible(true);
        
        // Reset form after a short delay
        setTimeout(() => {
          resetForm();
        }, 500);
      } else {
        const errorData = await response.json();
        Logger.error('❌ Backend error:', errorData);
        throw new Error(errorData.message || 'Błąd podczas zapisywania zamówienia');
      }
    } catch (error) {
      Logger.error('❌ Submit error:', error);
      Alert.alert(
        'Błąd', 
        `Nie udało się złożyć zamówienia.\n\nSzczegóły: ${error.message}\n\nSpróbuj ponownie.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedProduct(null);
    setSelectedColor(null);
    setSelectedSize(null);
    setDescription('');
    setProductSearchText('');
    setColorSearchText('');
    setSizeSearchText('');
    setCustomerName('');
    setPhoneNumber('');
    setEmail('');
    setPostalCode('');
    setCitySearchText('');
    setStreetSearchText('');
    setHouseNumber('');
    setTotalPrice('');
    setDeposit('');
    setDepositCurrency('PLN'); // Reset waluty zaliczki do PLN
    setDocumentType('receipt');
    setNip('');
    setRealizationDate(new Date());
  };

  // Fetch data from APIs
  useEffect(() => {
    const fetchOrderData = async () => {
      setLoading(true);
      try {
        // Fetch products (stock)
        const stockResponse = await tokenService.authenticatedFetch(getApiUrl('/excel/stock/get-all-stocks'));
        if (stockResponse.ok) {
          const stockData = await stockResponse.json();
          setProducts(Array.isArray(stockData) ? stockData : stockData.stocks || []);
        }

        // Fetch colors
        const colorsResponse = await tokenService.authenticatedFetch(getApiUrl('/excel/color/get-all-colors'));
        if (colorsResponse.ok) {
          const colorsData = await colorsResponse.json();
          setColors(Array.isArray(colorsData) ? colorsData : colorsData.colors || []);
        }

        // Fetch sizes
        const sizesResponse = await tokenService.authenticatedFetch(getApiUrl('/excel/size/get-all-sizes'));
        if (sizesResponse.ok) {
          const sizesData = await sizesResponse.json();
          setSizes(Array.isArray(sizesData) ? sizesData : sizesData.sizes || []);
        }
      } catch (error) {
        Logger.error('Error fetching order data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, []);

  // Get today's date in Polish format
  const getTodayDate = () => {
    return new Date().toLocaleDateString('pl-PL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Filter products based on search text
  useEffect(() => {
    if (productSearchText.length > 0) {
      const filtered = products.filter(product => {
        const productName = product.Tow_Opis || product.name || '';
        return productName.toLowerCase().includes(productSearchText.toLowerCase());
      }).filter(product => product.Tow_Opis && product.Tow_Opis.trim() !== ''); // Filter out empty names
      setFilteredProducts(filtered.slice(0, 10)); // Limit to 10 results
    } else {
      setFilteredProducts([]);
    }
  }, [productSearchText, products]);

  // Filter colors based on search text
  useEffect(() => {
    if (colorSearchText.length > 0) {
      const filtered = colors.filter(color => {
        const colorName = color.Kol_Opis || color.name || '';
        return colorName.toLowerCase().includes(colorSearchText.toLowerCase());
      }).filter(color => color.Kol_Opis && color.Kol_Opis.trim() !== ''); // Filter out empty names
      setFilteredColors(filtered.slice(0, 10)); // Limit to 10 results
    } else {
      setFilteredColors([]);
    }
  }, [colorSearchText, colors]);

  // Filter sizes based on search text
  useEffect(() => {
    if (sizeSearchText.length > 0) {
      const filtered = sizes.filter(size => {
        const sizeName = size.Roz_Opis || size.name || '';
        const sizeText = sizeName.toLowerCase();
        const searchText = sizeSearchText.toLowerCase().trim();
        // Exact match: size must equal search OR start with search and be followed by space
        return sizeText === searchText || 
               (sizeText.startsWith(searchText) && sizeText[searchText.length] === ' ');
      }).filter(size => size.Roz_Opis && size.Roz_Opis.trim() !== ''); // Filter out empty names
      setFilteredSizes(filtered.slice(0, 10)); // Limit to 10 results
    } else {
      setFilteredSizes([]);
    }
  }, [sizeSearchText, sizes]);

  // Selection handlers
  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setProductSearchText(product.Tow_Opis || product.name || '');
    setProductDropdownVisible(false);
    setProductValidationError(false); // Always reset error when selecting from dropdown
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    setColorSearchText(color.Kol_Opis || color.name || '');
    setColorDropdownVisible(false);
    setColorValidationError(false); // Always reset error when selecting from dropdown
  };

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    setSizeSearchText(size.Roz_Opis || size.name || '');
    setSizeDropdownVisible(false);
    setSizeValidationError(false); // Always reset error when selecting from dropdown
  };

  // Clear form function
  const clearForm = () => {
    setSelectedProduct(null);
    setSelectedColor(null);
    setSelectedSize(null);
    setProductSearchText('');
    setColorSearchText('');
    setSizeSearchText('');
    setProductDropdownVisible(false);
    setColorDropdownVisible(false);
    setSizeDropdownVisible(false);
  };

  return (
    <>
      <SafeAreaView style={{ backgroundColor: "#000", flex: 1 }}>
        <LogoutButton position="top-right" />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={{ marginVertical: 24, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "flex-start", alignItems: "center", marginBottom: 24 }}>
              <View>
                <Text style={{ fontSize: 14, color: "#f3f4f6" }}>
                  Zalogowany jako: <Text style={{ fontWeight: 'bold' }}>{user?.email}</Text>
                </Text>
                <Text style={{ fontSize: 14, color: "#f3f4f6" }}>
                  {new Date().toLocaleDateString('pl-PL', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          </View>
          <ScrollView 
            style={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
            keyboardDismissMode="interactive"
          >
          <View style={styles.container}>
            <Text style={styles.title}>Zamówienia</Text>
            
            {/* Today's Date */}
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>{getTodayDate()}</Text>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#0d6efd" style={styles.loader} />
            ) : (
              <View style={styles.formContainer}>
                {/* Product Section */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Produkt</Text>
                  
                  {/* Product Selection */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Produkt:</Text>
                  <TextInput
                    style={[
                      styles.input, 
                      productInputFocused && styles.inputFocused,
                      productValidationError && styles.errorBorder
                    ]}
                    placeholder="Wyszukaj produkt..."
                    value={productSearchText}
                    onChangeText={(text) => {
                      setProductSearchText(text);
                      setProductDropdownVisible(text.length > 0);
                      
                      // Real-time validation
                      if (text.length > 0) {
                        const matchingProduct = products.find(product => 
                          (product.Tow_Opis || product.name || '').toLowerCase() === text.toLowerCase()
                        );
                        
                        if (matchingProduct) {
                          setSelectedProduct(matchingProduct);
                          setProductValidationError(false);
                        } else {
                          setSelectedProduct(null);
                          setProductValidationError(true);
                        }
                      } else {
                        setSelectedProduct(null);
                        setProductValidationError(false);
                      }
                    }}
                    onFocus={() => {
                      setProductInputFocused(true);
                      if (productSearchText.length > 0) setProductDropdownVisible(true);
                    }}
                    onBlur={() => setProductInputFocused(false)}
                    placeholderTextColor="#666"
                  />
                  {/* Product dropdown */}
                  {productDropdownVisible && (
                    <View style={styles.dropdown}>
                      <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                        {filteredProducts.length === 0 ? (
                          <Text style={styles.noDataText}>Brak produktów pasujących do wyszukiwania</Text>
                        ) : (
                          filteredProducts.map((item) => (
                            <TouchableOpacity
                              key={item._id || item.id}
                              style={styles.dropdownItem}
                              onPress={() => handleProductSelect(item)}
                            >
                              <Text style={styles.dropdownItemText}>{item.Tow_Opis || item.name}</Text>
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                      <TouchableOpacity
                        style={styles.closeDropdownButton}
                        onPress={() => setProductDropdownVisible(false)}
                      >
                        <Text style={styles.closeDropdownText}>Zamknij</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Color Selection */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Kolor:</Text>
                  <TextInput
                    style={[
                      styles.input, 
                      colorInputFocused && styles.inputFocused,
                      colorValidationError && styles.errorBorder
                    ]}
                    placeholder="Wyszukaj kolor..."
                    value={colorSearchText}
                    onChangeText={(text) => {
                      setColorSearchText(text);
                      setColorDropdownVisible(text.length > 0);
                      
                      // Real-time validation
                      if (text.length > 0) {
                        const matchingColor = colors.find(color => 
                          (color.Kol_Opis || color.name || '').toLowerCase() === text.toLowerCase()
                        );
                        
                        if (matchingColor) {
                          setSelectedColor(matchingColor);
                          setColorValidationError(false);
                        } else {
                          setSelectedColor(null);
                          setColorValidationError(true);
                        }
                      } else {
                        setSelectedColor(null);
                        setColorValidationError(false);
                      }
                    }}
                    onFocus={() => {
                      setColorInputFocused(true);
                      if (colorSearchText.length > 0) setColorDropdownVisible(true);
                    }}
                    onBlur={() => setColorInputFocused(false)}
                    placeholderTextColor="#666"
                  />
                  {/* Color dropdown */}
                  {colorDropdownVisible && (
                    <View style={styles.dropdown}>
                      <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                        {filteredColors.length === 0 ? (
                          <Text style={styles.noDataText}>Brak kolorów pasujących do wyszukiwania</Text>
                        ) : (
                          filteredColors.map((item) => (
                            <TouchableOpacity
                              key={item._id || item.id}
                              style={styles.dropdownItem}
                              onPress={() => handleColorSelect(item)}
                            >
                              <Text style={styles.dropdownItemText}>{item.Kol_Opis || item.name}</Text>
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                      <TouchableOpacity
                        style={styles.closeDropdownButton}
                        onPress={() => setColorDropdownVisible(false)}
                      >
                        <Text style={styles.closeDropdownText}>Zamknij</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Size Selection */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Rozmiar:</Text>
                  <TextInput
                    style={[
                      styles.input, 
                      sizeInputFocused && styles.inputFocused,
                      sizeValidationError && styles.errorBorder
                    ]}
                    placeholder="Wyszukaj rozmiar..."
                    value={sizeSearchText}
                    onChangeText={(text) => {
                      setSizeSearchText(text);
                      setSizeDropdownVisible(text.length > 0);
                      
                      // Real-time validation
                      if (text.length > 0) {
                        const matchingSize = sizes.find(size => 
                          (size.Roz_Opis || size.name || '').toLowerCase() === text.toLowerCase()
                        );
                        
                        if (matchingSize) {
                          setSelectedSize(matchingSize);
                          setSizeValidationError(false);
                        } else {
                          setSelectedSize(null);
                          setSizeValidationError(true);
                        }
                      } else {
                        setSelectedSize(null);
                        setSizeValidationError(false);
                      }
                    }}
                    onFocus={() => {
                      setSizeInputFocused(true);
                      if (sizeSearchText.length > 0) setSizeDropdownVisible(true);
                    }}
                    onBlur={() => setSizeInputFocused(false)}
                    placeholderTextColor="#666"
                  />
                  {/* Size dropdown */}
                  {sizeDropdownVisible && (
                    <View style={styles.dropdown}>
                      <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                        {filteredSizes.length === 0 ? (
                          <Text style={styles.noDataText}>Brak rozmiarów pasujących do wyszukiwania</Text>
                        ) : (
                          filteredSizes.map((item) => (
                            <TouchableOpacity
                              key={item._id || item.id}
                              style={styles.dropdownItem}
                              onPress={() => handleSizeSelect(item)}
                            >
                              <Text style={styles.dropdownItemText}>{item.Roz_Opis || item.name}</Text>
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                      <TouchableOpacity
                        style={styles.closeDropdownButton}
                        onPress={() => setSizeDropdownVisible(false)}
                      >
                        <Text style={styles.closeDropdownText}>Zamknij</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Description Field */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Opis (max 400 znaków):</Text>
                  <TextInput
                    style={[styles.textArea, descriptionInputFocused && styles.inputFocused]}
                    placeholder="Dodaj opis zamówienia..."
                    value={description}
                    onChangeText={(text) => {
                      if (text.length <= 400) {
                        setDescription(text);
                      }
                    }}
                    onFocus={() => setDescriptionInputFocused(true)}
                    onBlur={() => setDescriptionInputFocused(false)}
                    placeholderTextColor="#666"
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <Text style={styles.charCounter}>{description.length}/400</Text>
                </View>
                </View>

                {/* Customer Data Section */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Dane klienta</Text>
                  
                  {/* Customer Name Field */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Imię i Nazwisko:</Text>
                    <TextInput
                      style={[styles.input, customerNameFocused && styles.inputFocused]}
                      placeholder="Wprowadź imię i nazwisko"
                      value={customerName}
                      onChangeText={setCustomerName}
                      onFocus={() => setCustomerNameFocused(true)}
                      onBlur={() => setCustomerNameFocused(false)}
                      placeholderTextColor="#666"
                    />
                  </View>

                  {/* Delivery Options */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Sposób dostawy:</Text>
                    
                    <TouchableOpacity
                      style={[
                        styles.deliveryOptionButton,
                        deliveryOption === 'shipping' && styles.deliveryOptionSelected
                      ]}
                      onPress={() => setDeliveryOption('shipping')}
                    >
                      <Text style={[
                        styles.deliveryOptionText,
                        deliveryOption === 'shipping' && styles.deliveryOptionTextSelected
                      ]}>
                        Wysyłka
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.deliveryOptionButton,
                        deliveryOption === 'delivery' && styles.deliveryOptionSelected
                      ]}
                      onPress={() => setDeliveryOption('delivery')}
                    >
                      <Text style={[
                        styles.deliveryOptionText,
                        deliveryOption === 'delivery' && styles.deliveryOptionTextSelected
                      ]}>
                        Dostawa
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.deliveryOptionButton,
                        deliveryOption === 'pickup' && styles.deliveryOptionSelected
                      ]}
                      onPress={() => setDeliveryOption('pickup')}
                    >
                      <Text style={[
                        styles.deliveryOptionText,
                        deliveryOption === 'pickup' && styles.deliveryOptionTextSelected
                      ]}>
                        Odbiór osobisty
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Postal Code Field - only show when shipping is selected */}
                  {deliveryOption === 'shipping' && (
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Kod pocztowy:</Text>
                      <TextInput
                        style={[styles.input, postalCodeFocused && styles.inputFocused]}
                        placeholder="XX-XXX"
                        value={postalCode}
                        onChangeText={handlePostalCodeChange}
                        onFocus={() => setPostalCodeFocused(true)}
                        onBlur={() => setPostalCodeFocused(false)}
                        placeholderTextColor="#666"
                        keyboardType="numeric"
                        maxLength={6}
                      />
                    </View>
                  )}

                  {/* City Field - simple text input */}
                  {deliveryOption === 'shipping' && (
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Miejscowość:</Text>
                      <TextInput
                        style={[styles.input, cityInputFocused && styles.inputFocused]}
                        placeholder="Wpisz miejscowość..."
                        value={citySearchText}
                        onChangeText={handleCityChange}
                        onFocus={() => setCityInputFocused(true)}
                        onBlur={() => setCityInputFocused(false)}
                        placeholderTextColor="#666"
                      />
                    </View>
                  )}

                  {/* Street Field - simple text input */}
                  {deliveryOption === 'shipping' && (
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Ulica (opcjonalnie):</Text>
                      <TextInput
                        style={[styles.input, streetInputFocused && styles.inputFocused]}
                        placeholder="Wpisz ulicę..."
                        value={streetSearchText}
                        onChangeText={setStreetSearchText}
                        onFocus={() => setStreetInputFocused(true)}
                        onBlur={() => setStreetInputFocused(false)}
                        placeholderTextColor="#666"
                      />
                    </View>
                  )}

                  {/* House Number Field */}
                  {deliveryOption === 'shipping' && (
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Numer domu/mieszkania:</Text>
                      <TextInput
                        style={[styles.input, houseNumberFocused && styles.inputFocused]}
                        placeholder="np. 12, 12A, 12/3"
                        value={houseNumber}
                        onChangeText={setHouseNumber}
                        onFocus={() => setHouseNumberFocused(true)}
                        onBlur={() => setHouseNumberFocused(false)}
                        placeholderTextColor="#666"
                        autoCapitalize="characters"
                      />
                    </View>
                  )}

                  {/* Manual Delivery Address Fields - only show when delivery is selected */}
                  {deliveryOption === 'delivery' && (
                    <>
                      <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Miejscowość:</Text>
                        <TextInput
                          style={[styles.input, cityInputFocused && styles.inputFocused]}
                          placeholder="Wprowadź miejscowość"
                          value={citySearchText}
                          onChangeText={setCitySearchText}
                          onFocus={() => setCityInputFocused(true)}
                          onBlur={() => setCityInputFocused(false)}
                          placeholderTextColor="#666"
                        />
                      </View>

                      <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Ulica (opcjonalnie):</Text>
                        <TextInput
                          style={[styles.input, streetInputFocused && styles.inputFocused]}
                          placeholder="Wprowadź nazwę ulicy"
                          value={streetSearchText}
                          onChangeText={setStreetSearchText}
                          onFocus={() => setStreetInputFocused(true)}
                          onBlur={() => setStreetInputFocused(false)}
                          placeholderTextColor="#666"
                        />
                      </View>

                      <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Numer domu/mieszkania:</Text>
                        <TextInput
                          style={[styles.input, houseNumberFocused && styles.inputFocused]}
                          placeholder="np. 12, 12A, 12/3"
                          value={houseNumber}
                          onChangeText={setHouseNumber}
                          onFocus={() => setHouseNumberFocused(true)}
                          onBlur={() => setHouseNumberFocused(false)}
                          placeholderTextColor="#666"
                          autoCapitalize="characters"
                        />
                      </View>
                    </>
                  )}

                  {/* Phone Number Field */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Numer telefonu:</Text>
                    <TextInput
                      style={[
                        styles.input, 
                        phoneNumberFocused && styles.inputFocused,
                        phoneNumberError ? styles.inputError : null
                      ]}
                      placeholder="np. 123 456 789 lub +48 123 456 789"
                      value={phoneNumber}
                      onChangeText={handlePhoneNumberChange}
                      onFocus={() => setPhoneNumberFocused(true)}
                      onBlur={() => setPhoneNumberFocused(false)}
                      placeholderTextColor="#666"
                      keyboardType="phone-pad"
                      autoComplete="tel"
                    />
                    {phoneNumberError ? (
                      <Text style={styles.errorText}>{phoneNumberError}</Text>
                    ) : (
                      <Text style={styles.helperText}>
                        Wprowadź polski numer telefonu (9 cyfr)
                      </Text>
                    )}
                  </View>

                  {/* Email Field (Optional) */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Email (opcjonalnie):</Text>
                    <TextInput
                      style={[
                        styles.input, 
                        emailFocused && styles.inputFocused,
                        emailError ? styles.inputError : null
                      ]}
                      placeholder="np. jan.kowalski@example.com"
                      value={email}
                      onChangeText={handleEmailChange}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      placeholderTextColor="#666"
                      keyboardType="email-address"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {emailError ? (
                      <Text style={styles.errorText}>{emailError}</Text>
                    ) : (
                      <Text style={styles.helperText}>
                        Opcjonalnie - do kontaktu w sprawie zamówienia
                      </Text>
                    )}
                  </View>
                </View>

                {/* Payment Section */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Rozliczenie</Text>
                  
                  {/* Total Price Field */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Cena całkowita:</Text>
                    <TextInput
                      style={[styles.input, totalPriceFocused && styles.inputFocused]}
                      placeholder="np. 800 zł"
                      value={totalPrice}
                      onChangeText={handleTotalPriceChange}
                      onFocus={() => setTotalPriceFocused(true)}
                      onBlur={() => setTotalPriceFocused(false)}
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Deposit Field */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Zaliczka:</Text>
                    <TextInput
                      style={[styles.input, depositFocused && styles.inputFocused]}
                      placeholder="np. 200 zł"
                      value={deposit}
                      onChangeText={handleDepositChange}
                      onFocus={() => setDepositFocused(true)}
                      onBlur={() => setDepositFocused(false)}
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Cash on Delivery (Calculated) */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>
                      Kwota pobrania {deliveryOption === 'shipping' ? '(z przesyłką +20 zł)' : ''}:
                    </Text>
                    <View style={[styles.input, styles.calculatedField]}>
                      <Text style={styles.calculatedFieldText}>
                        {calculateCashOnDelivery() > 0 ? formatPrice(calculateCashOnDelivery()) : '0.00 zł'}
                      </Text>
                    </View>
                    <Text style={styles.helperText}>
                      Obliczane automatycznie: (Cena - Zaliczka) 
                      {deliveryOption === 'shipping' ? ' + 20 zł za przesyłkę' : ''}
                      {deliveryOption === 'delivery' ? ' (bez kosztów przesyłki)' : ''}
                      {deliveryOption === 'pickup' ? ' (odbiór osobisty)' : ''}
                    </Text>
                  </View>

                  {/* Document Type Selection */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Rodzaj dokumentu:</Text>
                    <View style={styles.checkboxContainer}>
                      <TouchableOpacity
                        style={[styles.checkboxItem, documentType === 'receipt' && styles.checkboxSelected]}
                        onPress={() => setDocumentType('receipt')}
                      >
                        <Text style={[styles.checkboxText, documentType === 'receipt' && styles.checkboxTextSelected]}>
                          Paragon
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.checkboxItem, documentType === 'invoice' && styles.checkboxSelected]}
                        onPress={() => setDocumentType('invoice')}
                      >
                        <Text style={[styles.checkboxText, documentType === 'invoice' && styles.checkboxTextSelected]}>
                          Faktura
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* NIP Field (only for invoice) */}
                  {documentType === 'invoice' && (
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>NIP:</Text>
                      <TextInput
                        style={[
                          styles.input,
                          nipFocused && styles.inputFocused,
                          nipError ? styles.inputError : null
                        ]}
                        placeholder="XXX-XXX-XX-XX"
                        value={nip}
                        onChangeText={handleNipChange}
                        onFocus={() => setNipFocused(true)}
                        onBlur={() => setNipFocused(false)}
                        placeholderTextColor="#666"
                        keyboardType="numeric"
                        maxLength={13}
                      />
                      {nipError ? (
                        <Text style={styles.errorText}>{nipError}</Text>
                      ) : (
                        <Text style={styles.helperText}>
                          Wprowadź 10-cyfrowy numer NIP
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Realization Date */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Ustalona data realizacji:</Text>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={styles.datePickerText}>
                        {realizationDate.toLocaleDateString('pl-PL')}
                      </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={realizationDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, selectedDate) => {
                          setShowDatePicker(Platform.OS === 'ios');
                          if (selectedDate) {
                            setRealizationDate(selectedDate);
                          }
                        }}
                        minimumDate={new Date()}
                      />
                    )}
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                  onPress={handleSubmitOrder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Zatwierdź zamówienie</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.successModalTitle}>Sukces!</Text>
            <Text style={styles.successModalSubtitle}>Numer zamówienia:</Text>
            <Text style={styles.orderNumber}>{orderNumber}</Text>
            <Text style={styles.successModalMessage}>
              {successMessage}
            </Text>
            
            <TouchableOpacity
              style={[styles.submitButton, { marginTop: 20, width: '90%' }]}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={styles.submitButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default Profile;

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 100, // Extra padding to ensure content is not hidden behind keyboard
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  dateContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  dateText: {
    color: '#0d6efd',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  loader: {
    marginTop: 50,
  },
  formContainer: {
    gap: 20,
  },
  fieldContainer: {
    marginBottom: 8,
    position: 'relative',
  },
  fieldLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    color: 'white',
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 15,
    height: 50,
  },
  inputFocused: {
    borderColor: '#0d6efd',
    borderWidth: 2,
  },
  textArea: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    color: 'white',
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 15,
    minHeight: 100,
    maxHeight: 150,
  },
  charCounter: {
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 5,
  },
  sectionContainer: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  dropdownItemSubtext: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  inputError: {
    borderColor: '#dc3545',
    borderWidth: 2,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  helperText: {
    color: '#888',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  calculatedField: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    borderColor: '#555',
  },
  calculatedFieldText: {
    color: '#0d6efd',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  checkboxItem: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#0d6efd',
    borderColor: '#0d6efd',
  },
  checkboxText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  checkboxTextSelected: {
    fontWeight: 'bold',
  },
  datePickerButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 15,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  datePickerText: {
    color: 'white',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#0d6efd',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#666',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dropdown: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 200,
    zIndex: 1000,
  },
  dropdownScroll: {
    maxHeight: 150,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  dropdownItemText: {
    color: 'white',
    fontSize: 14,
  },
  noDataText: {
    color: '#666',
    fontSize: 14,
    padding: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  closeDropdownButton: {
    backgroundColor: '#0d6efd',
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  closeDropdownText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deliveryOptionsContainer: {
    marginTop: 8,
  },
  deliveryOptionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  deliveryOptionSelected: {
    backgroundColor: '#0d6efd',
    borderColor: '#0d6efd',
  },
  deliveryOptionText: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  deliveryOptionTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorBorder: {
    borderColor: '#ff4444',
    borderWidth: 2,
  },
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 50,
    color: '#fff',
    fontWeight: 'bold',
  },
  successModalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  successModalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 5,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 15,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  successModalMessage: {
    fontSize: 15,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
  },
});

