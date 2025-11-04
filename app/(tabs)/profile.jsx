import { useContext, useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, ScrollView, ActivityIndicator, TextInput, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GlobalStateContext } from '../../context/GlobalState';
import tokenService from '../../services/tokenService';
import { getApiUrl } from '../../config/api';

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

  // Description state
  const [description, setDescription] = useState('');

  // Customer data states
  const [customerName, setCustomerName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [filteredCities, setFilteredCities] = useState([]);
  const [citySearchText, setCitySearchText] = useState('');
  const [cityDropdownVisible, setCityDropdownVisible] = useState(false);
  const [customerNameFocused, setCustomerNameFocused] = useState(false);
  const [postalCodeFocused, setPostalCodeFocused] = useState(false);
  const [cityInputFocused, setCityInputFocused] = useState(false);
  
  // Street data states
  const [streets, setStreets] = useState([]);
  const [selectedStreet, setSelectedStreet] = useState(null);
  const [filteredStreets, setFilteredStreets] = useState([]);
  const [streetSearchText, setStreetSearchText] = useState('');
  const [streetDropdownVisible, setStreetDropdownVisible] = useState(false);
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

  const handleLogout = async () => {
    await logout(); // Call the logout function
  };

  // Function to fetch cities by postal code
  const fetchCitiesByPostalCode = async (zipCode) => {
    if (!zipCode || zipCode.length !== 6) return; // Format: xx-xxx
    
    try {
      console.log('Fetching cities for postal code:', zipCode);
      const response = await fetch(`https://kodpocztowy.intami.pl/api/${zipCode}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API Response data:', data);
        
        // API returns array of objects with miejscowosc field (lowercase)
        if (Array.isArray(data) && data.length > 0) {
          // Filter out entries without miejscowosc and get unique cities
          const validEntries = data.filter(item => item.miejscowosc && item.miejscowosc.trim() !== '');
          const uniqueCities = [...new Set(validEntries.map(item => item.miejscowosc))];
          
          console.log('Unique cities found:', uniqueCities);
          
          const cityObjects = uniqueCities.map((city, index) => ({
            id: index,
            name: city,
            fullData: validEntries.find(item => item.miejscowosc === city)
          }));
          
          setCities(cityObjects);
          setFilteredCities(cityObjects);
          
          // Automatically show dropdown if cities are found
          if (cityObjects.length > 0) {
            setCityDropdownVisible(true);
          }
        } else {
          console.log('No valid cities found in response');
          setCities([]);
          setFilteredCities([]);
        }
      } else {
        console.error('API Error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  // Handle postal code change
  const handlePostalCodeChange = (text) => {
    // Auto-format postal code (add dash after 2 digits)
    let formatted = text.replace(/[^0-9]/g, '');
    if (formatted.length > 2) {
      formatted = formatted.substring(0, 2) + '-' + formatted.substring(2, 5);
    }
    
    setPostalCode(formatted);
    
    // Clear cities and selected city when postal code changes
    setCities([]);
    setSelectedCity(null);
    setCitySearchText('');
    
    // Fetch cities when postal code is complete
    if (formatted.length === 6) {
      fetchCitiesByPostalCode(formatted);
    }
  };

  // Handle city selection
  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setCitySearchText(city.name);
    setCityDropdownVisible(false);
    
    // Clear streets when city changes
    setStreets([]);
    setSelectedStreet(null);
    setStreetSearchText('');
    
    // Extract streets for selected city
    extractStreetsFromPostalData(city.name);
  };

  // Function to extract streets from already fetched postal code data
  const extractStreetsFromPostalData = (cityName) => {
    console.log('Extracting streets for city:', cityName);
    
    // Find the selected city data from the postal code API response
    const selectedCityData = cities.find(city => city.name === cityName);
    if (!selectedCityData || !selectedCityData.fullData) {
      console.log('No city data found');
      setStreets([]);
      setFilteredStreets([]);
      return;
    }

    // Fetch the original postal code data again to get all entries for this city
    if (postalCode && postalCode.length === 6) {
      fetchStreetsFromPostalCode(postalCode, cityName);
    }
  };

  // Function to fetch streets from postal code data for specific city
  const fetchStreetsFromPostalCode = async (zipCode, cityName) => {
    try {
      console.log('Fetching postal data to extract streets for:', cityName);
      const response = await fetch(`https://kodpocztowy.intami.pl/api/${zipCode}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Postal API Response for streets:', data);
        
        if (Array.isArray(data) && data.length > 0) {
          // Filter entries for the selected city that have streets
          const cityEntries = data.filter(item => 
            item.miejscowosc === cityName && 
            item.ulica && 
            item.ulica.trim() !== ''
          );
          
          console.log('City entries with streets:', cityEntries);
          
          if (cityEntries.length > 0) {
            // Extract unique streets
            const uniqueStreets = [...new Set(cityEntries.map(item => item.ulica))];
            console.log('Unique streets found:', uniqueStreets);
            
            const streetObjects = uniqueStreets.map((street, index) => ({
              id: index,
              name: street,
              fullData: cityEntries.find(item => item.ulica === street)
            }));
            
            setStreets(streetObjects);
            setFilteredStreets(streetObjects);
          } else {
            console.log('No streets found for this city in postal data');
            setStreets([]);
            setFilteredStreets([]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching streets from postal data:', error);
    }
  };

  // Handle street selection
  const handleStreetSelect = (street) => {
    setSelectedStreet(street);
    setStreetSearchText(street.name);
    setStreetDropdownVisible(false);
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
    setEmail(text);
    
    // Validate email if not empty (since it's optional)
    if (text.length > 0) {
      const isValid = validateEmail(text);
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
    // Format NIP with dashes
    let formatted = text.replace(/\D/g, '');
    if (formatted.length > 3) {
      formatted = formatted.substring(0, 3) + '-' + formatted.substring(3);
    }
    if (formatted.length > 7) {
      formatted = formatted.substring(0, 7) + '-' + formatted.substring(7, 9);
    }
    if (formatted.length > 10) {
      formatted = formatted.substring(0, 10) + '-' + formatted.substring(10, 12);
    }
    
    setNip(formatted);
    
    // Validate NIP
    if (formatted.length > 0) {
      const isValid = validateNIP(formatted);
      if (!isValid && formatted.replace(/\D/g, '').length === 10) {
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
    if (!selectedProduct) {
      Alert.alert('Błąd', 'Proszę wybrać produkt');
      return false;
    }
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
      if (!selectedCity) {
        Alert.alert('Błąd', 'Proszę wybrać miejscowość dla wysyłki');
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
          email: email || null,
          deliveryOption,
          address: {
            postalCode: deliveryOption === 'shipping' ? postalCode : null,
            city: deliveryOption !== 'pickup' ? (selectedCity?.name || citySearchText) : null,
            street: deliveryOption !== 'pickup' ? streetSearchText : null,
            houseNumber: deliveryOption !== 'pickup' ? houseNumber : null
          }
        },
        payment: {
          totalPrice: parsePrice(totalPrice),
          deposit: parsePrice(deposit),
          cashOnDelivery: calculateCashOnDelivery(),
          documentType,
          nip: documentType === 'invoice' ? nip : null
        },
        realizationDate: realizationDate.toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: user?.email
      };

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
        
        console.log('✅ Zamówienie zapisane, ID:', backendOrderId);

        // Send email notifications (always send to owner, optionally to customer)
        console.log('📧 Wysyłanie powiadomień email...');
        
        const emailResponse = await tokenService.authenticatedFetch(getApiUrl('/orders/send-email'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            orderId: backendOrderId, 
            email: email || null, // Can be null if customer didn't provide email
            orderData: result.data // Use full order data from backend
          })
        });
        
        if (emailResponse.ok) {
          const emailResult = await emailResponse.json();
          console.log('✅ Emaile wysłane pomyślnie:', emailResult);
        } else {
          const emailError = await emailResponse.json();
          console.error('❌ Błąd wysyłania emaili:', emailError);
        }

        Alert.alert(
          'Sukces', 
          `Zamówienie zostało złożone!\nNumer zamówienia: ${backendOrderId}\n\n${email ? 'Email z potwierdzeniem został wysłany na Twój adres.' : 'Powiadomienie o zamówieniu zostało wysłane do sklepu.'}\n\nSkontaktujemy się z Tobą w sprawie realizacji.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                resetForm();
              }
            }
          ]
        );
      } else {
        const errorData = await response.json();
        console.error('❌ Backend error:', errorData);
        throw new Error(errorData.message || 'Błąd podczas zapisywania zamówienia');
      }
    } catch (error) {
      console.error('❌ Submit error:', error);
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
    setSelectedCity(null);
    setCitySearchText('');
    setStreetSearchText('');
    setHouseNumber('');
    setTotalPrice('');
    setDeposit('');
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
        console.error('Error fetching order data:', error);
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
        return sizeName.toLowerCase().includes(sizeSearchText.toLowerCase());
      }).filter(size => size.Roz_Opis && size.Roz_Opis.trim() !== ''); // Filter out empty names
      setFilteredSizes(filtered.slice(0, 10)); // Limit to 10 results
    } else {
      setFilteredSizes([]);
    }
  }, [sizeSearchText, sizes]);

  // Filter cities based on search text
  useEffect(() => {
    if (citySearchText.length > 0 && cities.length > 0) {
      const filtered = cities.filter(city => {
        const cityName = city.name || '';
        return cityName.toLowerCase().includes(citySearchText.toLowerCase());
      }).filter(city => city.name && city.name.trim() !== ''); // Filter out empty names
      setFilteredCities(filtered.slice(0, 10)); // Limit to 10 results
      console.log('Filtered cities:', filtered);
    } else {
      setFilteredCities(cities); // Show all cities when no search text
    }
  }, [citySearchText, cities]);

  // Filter streets based on search text
  useEffect(() => {
    if (streetSearchText.length > 0 && streets.length > 0) {
      const filtered = streets.filter(street => {
        const streetName = street.name || '';
        return streetName.toLowerCase().includes(streetSearchText.toLowerCase());
      }).filter(street => street.name && street.name.trim() !== ''); // Filter out empty names
      setFilteredStreets(filtered.slice(0, 10)); // Limit to 10 results
      console.log('Filtered streets:', filtered);
    } else {
      setFilteredStreets(streets); // Show all streets when no search text
    }
  }, [streetSearchText, streets]);

  // Selection handlers
  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setProductSearchText(product.Tow_Opis || product.name || '');
    setProductDropdownVisible(false);
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    setColorSearchText(color.Kol_Opis || color.name || '');
    setColorDropdownVisible(false);
  };

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    setSizeSearchText(size.Roz_Opis || size.name || '');
    setSizeDropdownVisible(false);
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
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={{ marginVertical: 24, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
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
              <TouchableOpacity
                onPress={handleLogout}
                style={{ backgroundColor: "#0d6efd", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
              >
                <Text style={{ fontSize: 14, color: "#fff", fontWeight: "bold" }}>Wyloguj</Text>
              </TouchableOpacity>
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
                    style={[styles.input, productInputFocused && styles.inputFocused]}
                    placeholder="Wyszukaj produkt..."
                    value={productSearchText}
                    onChangeText={(text) => {
                      setProductSearchText(text);
                      setProductDropdownVisible(text.length > 0);
                      // Clear selected product if text doesn't match
                      if (selectedProduct && !(selectedProduct.Tow_Opis || selectedProduct.name || '').toLowerCase().includes(text.toLowerCase())) {
                        setSelectedProduct(null);
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
                    style={[styles.input, colorInputFocused && styles.inputFocused]}
                    placeholder="Wyszukaj kolor..."
                    value={colorSearchText}
                    onChangeText={(text) => {
                      setColorSearchText(text);
                      setColorDropdownVisible(text.length > 0);
                      // Clear selected color if text doesn't match
                      if (selectedColor && !(selectedColor.Kol_Opis || selectedColor.name || '').toLowerCase().includes(text.toLowerCase())) {
                        setSelectedColor(null);
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
                    style={[styles.input, sizeInputFocused && styles.inputFocused]}
                    placeholder="Wyszukaj rozmiar..."
                    value={sizeSearchText}
                    onChangeText={(text) => {
                      setSizeSearchText(text);
                      setSizeDropdownVisible(text.length > 0);
                      // Clear selected size if text doesn't match
                      if (selectedSize && !(selectedSize.Roz_Opis || selectedSize.name || '').toLowerCase().includes(text.toLowerCase())) {
                        setSelectedSize(null);
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

                  {/* City Selection Field */}
                  {deliveryOption === 'shipping' && cities.length > 0 && (
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Miejscowość:</Text>
                      <TextInput
                        style={[styles.input, cityInputFocused && styles.inputFocused]}
                        placeholder="Wybierz miejscowość..."
                        value={citySearchText}
                        onChangeText={(text) => {
                          setCitySearchText(text);
                          setCityDropdownVisible(text.length > 0);
                          // Clear selected city if text doesn't match
                          if (selectedCity && !selectedCity.name.toLowerCase().includes(text.toLowerCase())) {
                            setSelectedCity(null);
                          }
                        }}
                        onFocus={() => {
                          setCityInputFocused(true);
                          if (citySearchText.length > 0) setCityDropdownVisible(true);
                        }}
                        onBlur={() => setCityInputFocused(false)}
                        placeholderTextColor="#666"
                      />
                      {/* City dropdown */}
                      {(cityDropdownVisible || (cities.length > 0 && citySearchText.length === 0)) && (
                        <View style={styles.dropdown}>
                          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                            {cities.length === 0 ? (
                              <Text style={styles.noDataText}>Wpisz kod pocztowy aby wyświetlić miejscowości</Text>
                            ) : filteredCities.length === 0 && citySearchText.length > 0 ? (
                              <Text style={styles.noDataText}>Brak miejscowości pasujących do wyszukiwania</Text>
                            ) : (
                              (filteredCities.length > 0 ? filteredCities : cities).map((city) => (
                                <TouchableOpacity
                                  key={city.id}
                                  style={styles.dropdownItem}
                                  onPress={() => handleCitySelect(city)}
                                >
                                  <Text style={styles.dropdownItemText}>{city.name}</Text>
                                  {city.fullData && (
                                    <Text style={styles.dropdownItemSubtext}>
                                      {city.fullData.gmina}, {city.fullData.powiat}
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              ))
                            )}
                          </ScrollView>
                          <TouchableOpacity
                            style={styles.closeDropdownButton}
                            onPress={() => setCityDropdownVisible(false)}
                          >
                            <Text style={styles.closeDropdownText}>Zamknij</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Street Selection Field */}
                  {deliveryOption === 'shipping' && selectedCity && (
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Ulica (opcjonalnie):</Text>
                      <TextInput
                        style={[styles.input, streetInputFocused && styles.inputFocused]}
                        placeholder="Wybierz ulicę..."
                        value={streetSearchText}
                        onChangeText={(text) => {
                          setStreetSearchText(text);
                          setStreetDropdownVisible(text.length > 0);
                          // Clear selected street if text doesn't match
                          if (selectedStreet && !selectedStreet.name.toLowerCase().includes(text.toLowerCase())) {
                            setSelectedStreet(null);
                          }
                        }}
                        onFocus={() => {
                          setStreetInputFocused(true);
                          setStreetDropdownVisible(true);
                        }}
                        onBlur={() => setStreetInputFocused(false)}
                        placeholderTextColor="#666"
                      />
                      {/* Street dropdown */}
                      {streetDropdownVisible && (
                        <View style={styles.dropdown}>
                          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                            {streets.length === 0 ? (
                              <Text style={styles.noDataText}>
                                {selectedCity ? 'Brak ulic w bazie dla tej miejscowości lub możesz wpisać ulicę ręcznie' : 'Wybierz najpierw miejscowość'}
                              </Text>
                            ) : filteredStreets.length === 0 && streetSearchText.length > 0 ? (
                              <Text style={styles.noDataText}>Brak ulic pasujących do wyszukiwania</Text>
                            ) : (
                              (filteredStreets.length > 0 ? filteredStreets : streets).map((street) => (
                                <TouchableOpacity
                                  key={street.id}
                                  style={styles.dropdownItem}
                                  onPress={() => handleStreetSelect(street)}
                                >
                                  <Text style={styles.dropdownItemText}>{street.name}</Text>
                                  {street.fullData && street.fullData.kod && (
                                    <Text style={styles.dropdownItemSubtext}>
                                      Kod: {street.fullData.kod}
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              ))
                            )}
                          </ScrollView>
                          <TouchableOpacity
                            style={styles.closeDropdownButton}
                            onPress={() => setStreetDropdownVisible(false)}
                          >
                            <Text style={styles.closeDropdownText}>Zamknij</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}

                  {/* House Number Field */}
                  {deliveryOption === 'shipping' && selectedCity && (
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
});
