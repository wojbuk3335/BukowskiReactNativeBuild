import axios from "axios"; // Import axios for HTTP requests
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useState } from "react";
import { Alert, FlatList, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiUrl, API_CONFIG } from "../config/api";
import tokenService from "../services/tokenService"; // Import tokenService
import Logger from "../services/logger"; // Import logger service

const QRScanner = ({ stateData, user, sizes, colors, goods, stocks, users, bags, wallets, getFilteredSellingPoints, isActive }) => {
  const insets = useSafeAreaInsets(); // Get safe area insets
  const [facing, setFacing] = useState("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [selectedOption, setSelectedOption] = useState(""); // State for Picker selection
  const [barcode, setBarcode] = useState(""); // State for barcode input
  const [cashPriceCurrencyPairs, setCashPriceCurrencyPairs] = useState([{ price: "", currency: "PLN" }]); // State for cash payment
  const [cardPriceCurrencyPairs, setCardPriceCurrencyPairs] = useState([{ price: "", currency: "PLN" }]); // State for carrd payment
  const [currencyMenuVisible, setCurrencyMenuVisible] = useState(false);
  const [currentCurrencyIndex, setCurrentCurrencyIndex] = useState(null);
  const [currentCurrencyType, setCurrentCurrencyType] = useState(""); // "cash" or "card"
  
  // State dla funkcjonalności odbioru
  const [isPickup, setIsPickup] = useState(false); // Checkbox "Odbiór"
  const [advanceAmount, setAdvanceAmount] = useState(""); // Kwota zaliczki
  const [selectedAdvance, setSelectedAdvance] = useState(null); // Wybrana zaliczka
  const [availableAdvances, setAvailableAdvances] = useState([]); // Lista dostępnych zaliczek
  const [currentProductName, setCurrentProductName] = useState(""); // Nazwa aktualnego produktu
  const [currentProductSize, setCurrentProductSize] = useState(""); // Rozmiar aktualnego produktu
  
  const [sellingPointMenuVisible, setSellingPointMenuVisible] = useState(false); // State for "Sprzedano od" popup
  const availableCurrencies = ["PLN", "HUF", "GBP", "ILS", "USD", "EUR", "CAN"];
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false); // State for currency modal
  const [currentCurrencyPairIndex, setCurrentCurrencyPairIndex] = useState(null); // Track the index of the pair being edited
  const [cameraActive, setCameraActive] = useState(true); // Zarządzanie aktywnością kamery - rozpoczynamy z aktywną kamerą
  const [cameraVisible, setCameraVisible] = useState(true); // Widoczność kamery
  const [successModalVisible, setSuccessModalVisible] = useState(false); // State for success modal
  const [successMessage, setSuccessMessage] = useState(""); // Message for success modal
  const [errorModalVisible, setErrorModalVisible] = useState(false); // State for error modal
  const [errorMessage, setErrorMessage] = useState(""); // Message for error modal

  const openSellingPointMenu = () => {
    setSellingPointMenuVisible(true);
  };

  const selectSellingPoint = (point) => {
    setSelectedOption(point);
    setSellingPointMenuVisible(false);
  };

  const openSellingPointModal = () => {
    setSellingPointMenuVisible(true);
  };

  const selectSellingPointFromModal = (symbol) => {
    setSelectedOption(symbol);
    setSellingPointMenuVisible(false);
  };

  const getMatchingSymbols = (currentBarcode = barcode) => {
    if (!users || !user) {
      return [];
    }

    // Filtruj użytkowników z tej samej lokalizacji co zalogowany użytkownik
    // Pokaż WSZYSTKICH użytkowników z tej samej lokalizacji (niezależnie od stanu magazynowego)
    const sameLocationUsers = users.filter(u => 
      u.location && user.location && 
      u.location.trim() === user.location.trim() && // Porównanie lokalizacji z trim()
      u.role !== 'admin' && 
      u.role !== 'magazyn' &&
      u.sellingPoint && 
      u.sellingPoint.trim() !== ''
    );
    
    // Zwróć wszystkich użytkowników z tej samej lokalizacji
    return sameLocationUsers;
  };

  // Helper function to build jacket name from barcode segments
  const buildJacketNameFromBarcode = (barcodeData) => {
    try {
      // Check if barcode has four zeros before the last digit (e.g., 0020600100009)
      // But exclude bag patterns (starting with 000)
      const regex = /^(\d{3})(\d{2})(\d{3})0000(\d)$/;
      const match = barcodeData.match(regex);
      
      if (!match) {
        return null; // Not the expected pattern
      }

      const [, stockCode, colorCode, sizeCode] = match;
      
      // Exclude bag patterns (stockCode starting with 000)
      if (stockCode === "000") {
        return null; // This is a bag, not a jacket
      }
      
      // Try to extract arrays from the objects
      const stocksArray = Array.isArray(stocks) ? stocks : (stocks?.data || stocks?.stocks || []);
      const colorsArray = Array.isArray(colors) ? colors : (colors?.data || colors?.colors || []);
      const sizesArray = Array.isArray(sizes) ? sizes : (sizes?.data || sizes?.sizes || []);
      
      // Ensure we have arrays before proceeding
      if (!Array.isArray(stocksArray) || !Array.isArray(colorsArray) || !Array.isArray(sizesArray)) {
        return null;
      }
      
      // Look up stock (Tow_Opis) from first 3 digits
      const stockItem = stocksArray.find(stock => stock.Tow_Kod === stockCode);
      const stockName = stockItem?.Tow_Opis || `Kod_${stockCode}`;
      
      // Look up color (Kol_Opis) from next 2 digits  
      const colorItem = colorsArray.find(color => color.Kol_Kod === colorCode);
      const colorName = colorItem?.Kol_Opis || `Kolor_${colorCode}`;
      
      // Look up size name from next 3 digits
      const sizeItem = sizesArray.find(size => size.Roz_Kod === sizeCode);
      const sizeName = sizeItem?.Roz_Opis || `Rozmiar_${sizeCode}`;
      
      // Build the jacket name with proper fallbacks
      const jacketName = `${stockName || 'Nieznany'} ${colorName || 'Nieznany'} ${sizeName || 'Nieznany'}`;
      
      return jacketName;
    } catch (error) {
      Logger.error("Error building jacket name from barcode:", error);
      return null;
    }
  };

  // Helper function to build bag name from barcode segments
  const buildBagNameFromBarcode = (barcodeData) => {
    try {
      // New format for bags: 000 + kolor + wiersz + wartość_po_kropce + suma kontrolna
      // Pozycje 1-3: 000 (stałe)
      // Pozycje 4-5: Kod koloru  
      // Pozycje 6-9: Numer wiersza (Torebki_Nr)
      // Pozycje 10-12: Wartość po kropce z Torebki_Kod
      // Pozycja 13: Suma kontrolna
      if (barcodeData.length < 13) {
        return null; // Not long enough
      }

      const first3 = barcodeData.substring(0, 3);
      const colorCode = barcodeData.substring(3, 5);
      const rowNumber = barcodeData.substring(5, 9); // Positions 6-9 (4 digits)
      const position6 = barcodeData.substring(5, 6); // Position 6 only
      
      // Check if it starts with 000 and position 6 is not zero
      if (first3 !== "000" || position6 === "0") {
        return null; // Not a bag pattern
      }

      // Convert row number to integer for search
      const rowNumberInt = parseInt(rowNumber, 10);
      
      // Check if row number is valid (greater than 0)
      if (rowNumberInt === 0 || isNaN(rowNumberInt)) {
        return null; // Invalid row number
      }

      // Try to extract arrays from the objects
      const colorsArray = Array.isArray(colors) ? colors : (colors?.data || colors?.colors || []);
      const bagsArray = Array.isArray(bags) ? bags : (bags?.data || bags?.bags || []);
      
      // Ensure we have arrays before proceeding
      if (!Array.isArray(colorsArray) || !Array.isArray(bagsArray)) {
        return null;
      }
      
      // Look up color (Kol_Opis) from positions 4-5
      const colorItem = colorsArray.find(color => color.Kol_Kod === colorCode);
      const colorName = colorItem?.Kol_Opis || `Kolor_${colorCode}`;
      
      // Look up bag name from row number (compare with Torebki_Nr)
      const bagItem = bagsArray.find(bag => parseInt(bag.Torebki_Nr, 10) === rowNumberInt);
      const bagName = bagItem?.Torebki_Kod || `Torebka_${rowNumberInt}`;
      
      // Build the bag name with color
      const fullBagName = `${bagName} ${colorName}`;
      
      return fullBagName;
    } catch (error) {
      Logger.error("Error building bag name from barcode:", error);
      return null;
    }
  };

  // Helper function to build wallet name from barcode segments
  const buildWalletNameFromBarcode = (barcodeData) => {
    try {
      // Wallet format: 13-digit barcode
      // Pozycje 1-3: 000 (stałe)
      // Pozycja 6: 0 (stała)
      // Pozycja 7: ≠0 (nie zero)
      // Pozycje 4-5: Kod koloru
      // Pozycje 7-9: Numer portfela (Portfele_Nr)
      if (barcodeData.length !== 13) {
        return null; // Must be exactly 13 digits
      }

      const first3 = barcodeData.substring(0, 3);
      const colorCode = barcodeData.substring(3, 5);
      const position6 = barcodeData.substring(5, 6); // Position 6
      const position7 = barcodeData.substring(6, 7); // Position 7
      const walletNumber = barcodeData.substring(6, 9); // Positions 7-9 (3 digits)
      
      // Check wallet pattern: 000 + color + 0 + non-zero
      if (first3 !== "000" || position6 !== "0" || position7 === "0") {
        return null; // Not a wallet pattern
      }

      // Convert wallet number to integer for search
      const walletNumberInt = parseInt(walletNumber, 10);
      
      // Check if wallet number is valid (greater than 0)
      if (walletNumberInt === 0 || isNaN(walletNumberInt)) {
        return null; // Invalid wallet number
      }

      // Try to extract arrays from the objects
      const colorsArray = Array.isArray(colors) ? colors : (colors?.data || colors?.colors || []);
      const walletsArray = Array.isArray(wallets) ? wallets : (wallets?.data || wallets?.wallets || []);
      
      // Ensure we have arrays before proceeding
      if (!Array.isArray(colorsArray) || !Array.isArray(walletsArray)) {
        return null;
      }
      
      // Look up color (Kol_Opis) from positions 4-5
      const colorItem = colorsArray.find(color => color.Kol_Kod === colorCode);
      const colorName = colorItem?.Kol_Opis || `Kolor_${colorCode}`;
      
      // Look up wallet name from wallet number (compare with Portfele_Nr)
      const walletItem = walletsArray.find(wallet => parseInt(wallet.Portfele_Nr, 10) === walletNumberInt);
      const walletName = walletItem?.Portfele_Kod || `Portfel_${walletNumberInt}`;
      
      // Build the wallet name with color
      const fullWalletName = `${walletName} ${colorName}`;
      
      return fullWalletName;
    } catch (error) {
      Logger.error("Error building wallet name from barcode:", error);
      return null;
    }
  };

  // Helper function to build remaining products name from barcode segments
  const buildRemainingProductNameFromBarcode = async (barcodeData) => {
    try {
      // Remaining products format: kod ma na pierwszych 3 miejscach zera 000 
      // potem na 6 i 7 dwa zera 00 to znaczy się że jest to kod towaru dla pozostałego asortymentu
      // kolor jest na miejscu 4 i 5, nazwa jest na miejscu 8 i 9
      if (barcodeData.length < 9) {
        return null; // Not long enough
      }

      const first3 = barcodeData.substring(0, 3); // Positions 1-3
      const colorCode = barcodeData.substring(3, 5); // Positions 4-5
      const positions6and7 = barcodeData.substring(5, 7); // Positions 6-7
      const productCode = barcodeData.substring(7, 9); // Positions 8-9
      
      // Check remaining products pattern: 000 + color + 00 + product
      if (first3 !== "000" || positions6and7 !== "00") {
        return null; // Not a remaining products pattern
      }

      // Try to extract arrays from the objects
      const colorsArray = Array.isArray(colors) ? colors : (colors?.data || colors?.colors || []);
      
      // Ensure we have colors array before proceeding
      if (!Array.isArray(colorsArray)) {
        return null;
      }
      
      // Look up color (Kol_Opis) from positions 4-5
      const colorItem = colorsArray.find(color => color.Kol_Kod === colorCode);
      const colorName = colorItem?.Kol_Opis || `Kolor_${colorCode}`;
      
      // Fetch product name from remaining products API using productCode
      try {
        const fullUrl = getApiUrl("/excel/remaining-products/get-all-remaining-products");
        const response = await tokenService.authenticatedFetch(fullUrl);
        const responseData = await response.json();
        
        const remainingProducts = responseData.remainingProducts; // Access the remainingProducts array
        
        // Find product by Poz_Nr matching the productCode (positions 8-9)
        // Convert productCode to number for comparison
        const productCodeNumber = parseInt(productCode, 10);
        
        const productItem = remainingProducts.find(product => 
          product.Poz_Nr && parseInt(product.Poz_Nr, 10) === productCodeNumber
        );
        
        const productName = productItem?.Poz_Kod || `Produkt_${productCode}`;
        
        // Build the remaining product name: Poz_Kod + color
        const fullRemainingProductName = `${productName} ${colorName}`;
        
        return fullRemainingProductName;
      } catch (error) {
        Logger.error("Error fetching remaining products:", error);
        // Fallback if API call fails
        return `Produkt_${productCode} ${colorName}`;
      }
    } catch (error) {
      Logger.error("Error building remaining product name from barcode:", error);
      return null;
    }
  };

  const openCurrencyModal = (index) => {
    setCurrentCurrencyPairIndex(index);
    setCurrencyModalVisible(true);
  };

  const selectCurrencyFromModal = (currency) => {
    handleCashPairChange(currentCurrencyPairIndex, "currency", currency);
    setCurrencyModalVisible(false);
  };

  useEffect(() => {
    if (isActive) {
      setCameraActive(true); // Aktywuj kamerę, gdy zakładka jest aktywna
      setCameraVisible(true); // Pokaż kamerę
    } else {
      setCameraActive(false); // Dezaktywuj kamerę, gdy zakładka jest nieaktywna
      setCameraVisible(false); // Ukryj kamerę
    }
  }, [isActive]);

  const handleUnmountCamera = () => {
    setCameraVisible(false); // Ukryj kamerę
    setCameraActive(false); // Dezaktywuj kamerę
  };

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={[styles.message, { marginBottom: 20 }]}>Potrzebujemy Twojej zgody na dostęp do kamery</Text>
        <TouchableOpacity
          style={{
            backgroundColor: "#0d6efd",
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8,
          }}
          onPress={requestPermission}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Włącz skanner kodów kreskowych</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!cameraActive || !cameraVisible) {
    // Renderuj widok zastępczy, gdy kamera jest odłączona
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={styles.message}></Text>
        <TouchableOpacity
          style={{
            backgroundColor: "#0d6efd",
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8,
          }}
          onPress={() => {
            setCameraVisible(true);
            setCameraActive(true);
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Włącz czytnik kodów kreskowych</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Dynamicznie aktualizuj pole "Sprzedano produkt" podczas wpisywania kodu kreskowego
  const handleBarcodeChange = async (newBarcode) => {
    setBarcode(newBarcode);
    
    // Jeśli pole puste - pokaż pusty produkt
    if (!newBarcode || newBarcode.trim() === "") {
      setModalMessage("");
      return;
    }

    // Sprawdź czy kod istnieje w stateData
    const matchedItems = stateData?.filter(item => item.barcode === newBarcode);
    
    if (matchedItems && matchedItems.length > 0) {
      // Znaleziono w stateData
      setModalMessage(matchedItems[0].fullName);
      return;
    }

    // Spróbuj zbudować nazwę z barcode'a (kurtki, torby, portfele, produkty pozostałe)
    const builtJacketName = buildJacketNameFromBarcode(newBarcode);
    if (builtJacketName) {
      setModalMessage(builtJacketName);
      return;
    }

    const builtBagName = buildBagNameFromBarcode(newBarcode);
    if (builtBagName) {
      setModalMessage(builtBagName);
      return;
    }

    const builtWalletName = buildWalletNameFromBarcode(newBarcode);
    if (builtWalletName) {
      setModalMessage(builtWalletName);
      return;
    }

    const builtRemainingProductName = await buildRemainingProductNameFromBarcode(newBarcode);
    if (builtRemainingProductName) {
      setModalMessage(builtRemainingProductName);
      return;
    }

    // Nie znaleziono produktu
    setModalMessage("❌ Nie znaleziono produktu");
  };

  const handleScan = async ({ data, type }) => {
    if (!scanned) {
      setScanned(true);
      
      // Użyj handleBarcodeChange aby dynamicznie aktualizć produkt
      await handleBarcodeChange(data);

      // Ustaw domyślny punkt sprzedaży na zalogowanego użytkownika
      const availableOptions = getMatchingSymbols(data);
      if (availableOptions.length > 0) {
        // Sprawdź czy zalogowany użytkownik jest w tej lokalizacji
        const currentUserInLocation = availableOptions.find(option => option.symbol === user?.symbol);
        if (currentUserInLocation) {
          setSelectedOption(user.symbol); // Zalogowany użytkownik jest w lokalizacji - ustaw jako domyślny
        } else {
          setSelectedOption(availableOptions[0].symbol); // Fallback - pierwszy z listy
        }
      } else {
        setSelectedOption(""); // Brak dostępnych opcji
      }
      
      // Otwórz modal z formularzem
      setModalVisible(true);
    }
  };

  const toggleCameraFacing = () => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  const handleAddCashPair = () => {
    setCashPriceCurrencyPairs([...cashPriceCurrencyPairs, { price: "", currency: "PLN" }]);
  };

  const handleRemoveCashPair = (index) => {
    if (cashPriceCurrencyPairs.length > 1) {
      const updatedPairs = cashPriceCurrencyPairs.filter((_, i) => i !== index);
      setCashPriceCurrencyPairs(updatedPairs);
    }
  };

  const handleCashPairChange = (index, field, value) => {
    const updatedPairs = [...cashPriceCurrencyPairs];
    updatedPairs[index][field] = value;
    setCashPriceCurrencyPairs(updatedPairs);
  };

  const handleAddCardPair = () => {
    setCardPriceCurrencyPairs([...cardPriceCurrencyPairs, { price: "", currency: "PLN" }]);
  };

  const handleRemoveCardPair = (index) => {
    if (cardPriceCurrencyPairs.length > 1) {
      const updatedPairs = cardPriceCurrencyPairs.filter((_, i) => i !== index);
      setCardPriceCurrencyPairs(updatedPairs);
    }
  };

  const handleCardPairChange = (index, field, value) => {
    const updatedPairs = [...cardPriceCurrencyPairs];
    updatedPairs[index][field] = value;
    setCardPriceCurrencyPairs(updatedPairs);
  };

  const openCurrencyMenu = (index, type) => {
    setCurrentCurrencyIndex(index);
    setCurrentCurrencyType(type);
    setCurrencyMenuVisible(true);
  };

  const selectCurrency = (currency) => {
    if (currentCurrencyType === "cash") {
      handleCashPairChange(currentCurrencyIndex, "currency", currency);
    } else if (currentCurrencyType === "card") {
      handleCardPairChange(currentCurrencyIndex, "currency", currency);
    }
    setCurrencyMenuVisible(false);
  };

  // Funkcja do wyszukiwania zaliczek na podstawie nazwy produktu i rozmiaru
  const searchAdvances = async (productName, size) => {
    try {
      const response = await tokenService.authenticatedFetch(
        getApiUrl(`/financial-operations/search/advances?productName=${encodeURIComponent(productName)}&size=${encodeURIComponent(size)}`),
        {
          method: 'GET'
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const advances = await response.json();
      
      setAvailableAdvances(advances);
      
      // Jeśli jest tylko jedna zaliczka, automatycznie ją wybierz
      if (advances.length === 1) {
        setSelectedAdvance(advances[0]);
        setAdvanceAmount(advances[0].amount.toString());
      }
      
      return advances;
    } catch (error) {
      Logger.error('❌ Błąd wyszukiwania zaliczek:', error);
      Alert.alert('Błąd', 'Nie udało się wyszukać zaliczek');
      return [];
    }
  };

  // Obsługa zmiany checkbox odbioru
  const handlePickupChange = async (newPickupValue, currentFullName, currentSize) => {
    setIsPickup(newPickupValue);
    
    if (newPickupValue && currentFullName && currentSize) {
      // Jeśli zaznaczono odbiór, wyszukaj dostępne zaliczki
      await searchAdvances(currentFullName, currentSize);
    } else {
      // Jeśli odznaczono odbiór, wyczyść dane zaliczek
      setAvailableAdvances([]);
      setSelectedAdvance(null);
      setAdvanceAmount("");
    }
  };

  // Auto-recalculate commissions after sale
  const recalculateCommissions = async () => {
    try {
      const requestBody = {
        sellingPoint: user?.sellingPoint,
        date: new Date().toISOString().split('T')[0]
      };
      
      const response = await tokenService.authenticatedFetch(
        getApiUrl('/sales-assignments/recalculate-commissions'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        }
      );
      
      if (response.ok) {
        const result = await response.json();
      } else {
        const errorText = await response.text();
        Logger.error('Nie udalo sie przeliczyc prowizji:', errorText);
      }
    } catch (error) {
      Logger.error('Blad podczas przeliczania prowizji:', error);
    }
  };

  const handleSubmit = async () => {
    // WALIDACJA: Sprawdź czy kod kreskowy nie jest pusty
    if (!barcode || barcode.trim() === "") {
      setErrorMessage("Proszę wpisać lub zeskanować kod kreskowy.");
      setErrorModalVisible(true);
      return;
    }

    const matchedItems = stateData?.filter(item => item.barcode === barcode);
    
    let fullName, size, symbol;

    // Check if this is a remaining products barcode (000 + XX + 00 + XX)
    const builtRemainingProductName = await buildRemainingProductNameFromBarcode(barcode);
    const isRemainingProduct = builtRemainingProductName !== null;
    
    // Check if this is a bag barcode (000 + non-zero at position 6)
    const isBag = buildBagNameFromBarcode(barcode) !== null;
    
    // Check if this is a wallet barcode (000 + 0 at position 6 + non-zero at position 7)
    const isWallet = buildWalletNameFromBarcode(barcode) !== null;

    // Sprawdź czy mamy dane z stateData czy z buildJacketNameFromBarcode
    if (matchedItems && matchedItems.length > 0) {
      // Dane z stateData
      fullName = matchedItems[0].fullName;
      size = (isBag || isWallet || isRemainingProduct) ? "-" : matchedItems[0].size; // For bags, wallets and remaining products, send "-" instead of empty
      symbol = selectedOption || matchedItems[0].symbol || "Unknown";
    } else {
      // Check for built names (jacket, bag, wallet, or remaining product)
      const builtJacketName = buildJacketNameFromBarcode(barcode);
      const builtBagName = buildBagNameFromBarcode(barcode);
      const builtWalletName = buildWalletNameFromBarcode(barcode);
      
      if (builtJacketName || builtBagName || builtWalletName || builtRemainingProductName) {
        if (isBag || isWallet || isRemainingProduct) {
          // For bags, wallets and remaining products, use the full modalMessage as name (includes color)
          fullName = modalMessage;
          size = "-"; // No size for bags, wallets and remaining products
        } else {
          // For jackets, try to extract name and size from modalMessage
          const parts = modalMessage.split(' ');
          const sizePart = parts[parts.length - 1]; // Ostatnia część to rozmiar
          const namePart = parts.slice(0, -1).join(' '); // Reszta to nazwa
          
          fullName = namePart || modalMessage;
          size = sizePart || "Unknown";
        }
        symbol = selectedOption || "Generated";
      } else {
        // ❌ WALIDACJA: Produkt nie został znaleziony
        setErrorMessage(`Nie znaleziono produktu o kodzie kreskowym: ${barcode}. Sprawdź kod i spróbuj ponownie.`);
        setErrorModalVisible(true);
        return;
      }
    }

    const sellingPoint = user?.sellingPoint || "Unknown";

    // Filtruj tylko ceny które nie są puste
    const validCashPrices = cashPriceCurrencyPairs
      .filter(pair => pair.price && pair.price.trim() !== "")
      .map(pair => ({ price: pair.price, currency: pair.currency }));
    
    const validCardPrices = cardPriceCurrencyPairs
      .filter(pair => pair.price && pair.price.trim() !== "")
      .map(pair => ({ price: pair.price, currency: pair.currency }));

    // WALIDACJA: Sprawdź czy jest przynajmniej jedna płatność większa od zera
    const totalCash = validCashPrices.reduce((sum, pair) => sum + parseFloat(pair.price || 0), 0);
    const totalCard = validCardPrices.reduce((sum, pair) => sum + parseFloat(pair.price || 0), 0);
    const totalPayment = totalCash + totalCard;

    if (totalPayment <= 0) {
      setErrorMessage("Proszę wprowadzić kwotę płatności (gotówka lub karta).");
      setErrorModalVisible(true);
      return;
    }

    const payload = {
      fullName,
      timestamp: new Date().toISOString(), // Use ISO format for consistent date parsing
      barcode,
      size,
      sellingPoint,
      from: selectedOption || symbol, // Use the selected symbol, not the default sellingPoint
      cash: validCashPrices,
      card: validCardPrices,
      symbol, // Add symbol field
      isPickup: isPickup, // Add pickup information
      advanceAmount: isPickup ? parseFloat(advanceAmount) || 0 : 0, // Add advance amount for pickups
      advanceOperationId: isPickup && selectedAdvance?._id ? selectedAdvance._id : null, // Add related advance ID (matches backend field name)
      employeeId: user?.employeeId || null, // Use Employee ObjectId for WorkHours matching
      employeeName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown' : null // Add employee name
    };

    // Walidacja wymaganych pól
    if (!payload.fullName || !payload.size || !payload.from) {
      Logger.error('❌ Brakuje wymaganych pól:', {
        fullName: payload.fullName,
        size: payload.size,
        from: payload.from
      });
      Alert.alert("Błąd", "Brakuje wymaganych informacji o produkcie");
      return;
    }

    try {
      Logger.debug('\n📝 === DODAWANIE SPRZEDAŻY (FRONTEND) ===');
      Logger.debug('📦 Payload:', {
        fullName: payload.fullName,
        size: payload.size,
        barcode: payload.barcode,
        sellingPoint: payload.sellingPoint,
        from: payload.from,
        cashTotal: payload.cash?.reduce((sum, item) => sum + parseFloat(item.price || 0), 0),
        cardTotal: payload.card?.reduce((sum, item) => sum + parseFloat(item.price || 0), 0),
        isPickup: payload.isPickup,
        employeeId: payload.employeeId,
        timestamp: new Date().toLocaleString('pl-PL')
      });
      
      const response = await tokenService.authenticatedFetch(getApiUrl("/sales/save-sales"), {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      Logger.debug('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        Logger.error('❌ Response error:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      const responseData = await response.json();
      Logger.debug('✅ Sprzedaż zapisana:', responseData?.sales?._id);
      
      // Backend już automatycznie przeliczył prowizje po dodaniu sprzedaży
      
      // Show success modal instead of alert
      setSuccessMessage("Dane zostały zapisane pomyślnie!");
      setSuccessModalVisible(true);

      // Reset modal state
      setCashPriceCurrencyPairs([{ price: "", currency: "PLN" }]);
      setCardPriceCurrencyPairs([{ price: "", currency: "PLN" }]);
      setBarcode("");
      setSelectedOption("");
      setModalMessage("");
    } catch (error) {
      Logger.error("Error saving data:", error);
      
      let errorMessage = "Failed to save data.";
      if (error.message.includes('401')) {
        errorMessage = "Nie jesteś zalogowany. Zaloguj się ponownie.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert("Błąd", errorMessage);
    }

    setModalVisible(false);
    setScanned(false); // Reset stanu skanowania po submit
    
    // Reset all form state
    setBarcode("");
    setModalMessage("");
    setSelectedOption("");
    setCashPriceCurrencyPairs([{ price: "", currency: "PLN" }]);
    setCardPriceCurrencyPairs([{ price: "", currency: "PLN" }]);
    setIsPickup(false);
    setAdvanceAmount("");
    setSelectedAdvance(null);
    setAvailableAdvances([]);
    setCurrentProductName("");
    setCurrentProductSize("");
  };

  // Usuńmy to sprawdzenie - komponent powinien się renderować zawsze
  // if (!isActive) return null; // Render nothing if the tab is not active

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <CameraView
          style={styles.camera}
          facing={facing}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code39", "code128"],
          }}
          onBarcodeScanned={handleScan}
        />
        {/* Overlay using absolute positioning */}
        <View style={[styles.overlay, { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none" }]}>
          <View style={styles.scanArea} />
        </View>
        
        {/* Przycisk do resetowania skanowania - pokazuje się tylko gdy scanned=true */}
        {scanned && (
          <View style={{ position: "absolute", bottom: 100, left: 0, right: 0, alignItems: "center" }}>
            <TouchableOpacity
              style={{
                backgroundColor: "#0d6efd",
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8,
                opacity: 0.9
              }}
              onPress={() => {
                setScanned(false);
                setBarcode("");
                setModalMessage("");
                setSelectedOption("");
                setCashPriceCurrencyPairs([{ price: "", currency: "PLN" }]);
                setCardPriceCurrencyPairs([{ price: "", currency: "PLN" }]);
                setIsPickup(false);
                setAdvanceAmount("");
                setSelectedAdvance(null);
                setCurrentProductName("");
                setCurrentProductSize("");
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Skanuj ponownie</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {modalVisible && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: "black", width: "100%", height: "100%", justifyContent: "flex-start", alignItems: "center", zIndex: 5 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView contentContainerStyle={[styles.scrollViewContent, { paddingBottom: Math.max(120, insets.bottom + 120) }]}>
              <View style={[styles.modalContent, { flex: 1, backgroundColor: "black", width: "100%", height: "100%", justifyContent: "flex-start", alignItems: "center", zIndex: 5 }]}>
                <Pressable
                  style={styles.closeButton}
                  onPress={() => {
                    setModalVisible(false);
                    setScanned(false); // Reset stanu skanowania gdy zamykamy modal
                    setBarcode("");
                    setModalMessage("");
                    setSelectedOption("");
                    setCashPriceCurrencyPairs([{ price: "", currency: "PLN" }]);
                    setCardPriceCurrencyPairs([{ price: "", currency: "PLN" }]);
                    setIsPickup(false);
                    setAdvanceAmount("");
                    setSelectedAdvance(null);
                    setCurrentProductName("");
                    setCurrentProductSize("");
                  }}
                >
                  <Text style={styles.closeButtonText}>X</Text>
                </Pressable>
                <Text style={{ fontSize: 16, color: "white", marginBottom: 8, marginTop: 16, fontWeight: "bold" }}>Kod kreskowy</Text>
                <TextInput
                  style={styles.inputField}
                  value={barcode}
                  onChangeText={handleBarcodeChange}
                  editable={true}
                  placeholder="Wpisz lub zeskanuj kod kreskowy"
                  autoFocus={true}
                />
                <Text style={{ fontSize: 16, color: "white", marginBottom: 8, marginTop: 16 }}>Sprzedano produkt:</Text>
                <TextInput
                  style={styles.inputField}
                  value={modalMessage}
                  editable={false}
                />
                <Text style={{ fontSize: 16, color: "white", marginBottom: 8 }}>Gdzie</Text>
                <TextInput
                  style={styles.inputField}
                  value={user?.sellingPoint || "Unknown"}
                  editable={false}
                  placeholder="Selling Point"
                />
                <Text style={{ fontSize: 16, color: "white", marginBottom: 8 }}>Sprzedano od:</Text>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "white",
                    borderRadius: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    marginBottom: 20,
                    width: "100%",
                  }}
                >
                  <TouchableOpacity
                    style={{
                      height: 40,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "black",
                      borderRadius: 5,
                    }}
                    onPress={openSellingPointModal}
                  >
                    <Text style={{ color: "white" }}>
                      {selectedOption || "Wybierz punkt sprzedaży"}
                    </Text>
                  </TouchableOpacity>
                </View>
                {sellingPointMenuVisible && (
                  <Modal
                    transparent={true}
                    animationType="slide"
                    visible={sellingPointMenuVisible}
                    onRequestClose={() => setSellingPointMenuVisible(false)}
                  >
                    <View style={styles.currencyModalContainer}>
                      <View style={styles.currencyModalContent}>
                        <Text style={styles.currencyModalTitle}>Wybierz punkt sprzedaży</Text>
                        <Text style={{ color: '#a1a1aa', textAlign: 'center', fontSize: 14, marginBottom: 15 }}>
                          Wybierz punkt sprzedaży dla tego produktu
                        </Text>
                        
                        <ScrollView style={{ maxHeight: 400, width: '100%', marginVertical: 15 }}>
                          {getMatchingSymbols().length > 0 ? (
                            getMatchingSymbols().map((item) => (
                              <TouchableOpacity
                                key={item._id}
                                style={styles.currencyModalItem}
                                onPress={() => selectSellingPointFromModal(item.symbol)}
                              >
                                <Text style={styles.currencyModalItemText}>
                                  {item.symbol}
                                </Text>
                              </TouchableOpacity>
                            ))
                          ) : (
                            <View style={{ padding: 20 }}>
                              <Text style={{ color: 'white', textAlign: 'center', fontSize: 16 }}>
                                {barcode ? 
                                  `Brak tego produktu w punktach sprzedaży w lokalizacji "${user?.location || 'nieznana'}"` :
                                  'Zeskanuj kod kreskowy aby zobaczyć dostępne punkty sprzedaży'
                                }
                              </Text>
                            </View>
                          )}
                        </ScrollView>
                        
                        <TouchableOpacity
                          style={styles.currencyModalCloseButton}
                          onPress={() => setSellingPointMenuVisible(false)}
                        >
                          <Text style={styles.currencyModalCloseButtonText}>Zamknij</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>
                )}

                {/* Checkbox Odbiór */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 20,
                  padding: 15,
                  borderWidth: 1,
                  borderColor: 'white',
                  borderRadius: 8,
                }}>
                  <TouchableOpacity
                    style={{
                      width: 24,
                      height: 24,
                      borderWidth: 2,
                      borderColor: 'white',
                      borderRadius: 4,
                      backgroundColor: isPickup ? 'rgb(13, 110, 253)' : 'transparent',
                      marginRight: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={async () => {
                      const newPickupValue = !isPickup;
                      await handlePickupChange(newPickupValue, currentProductName, currentProductSize);
                    }}
                  >
                    {isPickup && (
                      <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>✓</Text>
                    )}
                  </TouchableOpacity>
                  <Text style={{ color: 'white', fontSize: 16 }}>
                    Odbiór (dopłata do zaliczki)
                  </Text>
                </View>

                <Text style={{
                  fontSize: 16,
                  marginBottom: 10,
                  textAlign: "center",
                  color: "white",
                }}>{isPickup ? 'Dopłata' : 'Płatność gotówką'}</Text>
                <View
                  style={{
                    width: "100%",
                    borderWidth: 1,
                    borderColor: "white",
                    padding: 20,
                  }}
                >
                  {cashPriceCurrencyPairs.map((pair, index) => (
                    <View
                      key={`cash-${index}`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 20,
                      }}
                    >
                      <TextInput
                        style={{
                          flex: 1,
                          height: 40,
                          borderColor: "white",
                          borderWidth: 1,
                          borderRadius: 5,
                          paddingHorizontal: 10,
                          color: "white",
                          backgroundColor: "black",
                          marginRight: 10,
                        }}
                        value={pair.price}
                        onChangeText={(value) => {
                          const numericValue = value.replace(/[^0-9.]/g, "");
                          handleCashPairChange(index, "price", numericValue);
                        }}
                        placeholder="Wpisz kwotę"
                        keyboardType="numeric"
                      />
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          height: 40,
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: "black",
                          borderColor: "white",
                          borderWidth: 1,
                          borderRadius: 5,
                        }}
                        onPress={() => openCurrencyModal(index)}
                      >
                        <Text style={{ color: "white" }}>{pair.currency || "PLN"}</Text>
                      </TouchableOpacity>
                      {index > 0 && (
                        <TouchableOpacity
                          style={{
                            marginLeft: 10,
                            paddingVertical: 5,
                            paddingHorizontal: 10,
                            backgroundColor: "red",
                            borderRadius: 5,
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                          onPress={() => handleRemoveCashPair(index)}
                        >
                          <Text style={{ color: "white" }}>Usuń</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  <Pressable style={styles.addPairButton} onPress={handleAddCashPair}>
                    <Text style={styles.addPairButtonText}>Dodaj parę</Text>
                  </Pressable>
                </View>
                {currencyModalVisible && (
                  <Modal
                    transparent={true}
                    animationType="slide"
                    visible={currencyModalVisible}
                    onRequestClose={() => setCurrencyModalVisible(false)}
                  >
                    <View style={styles.currencyModalContainer}>
                      <View style={styles.currencyModalContent}>
                        <Text style={styles.currencyModalTitle}>Wybierz walutę</Text>
                        <Text style={{ color: '#a1a1aa', textAlign: 'center', fontSize: 14, marginBottom: 15 }}>
                          Wybierz walutę dla płatności
                        </Text>
                        
                        <ScrollView style={{ maxHeight: 400, width: '100%', marginVertical: 15 }}>
                          {availableCurrencies.map((item) => (
                            <TouchableOpacity
                              key={item}
                              style={styles.currencyModalItem}
                              onPress={() => selectCurrencyFromModal(item)}
                            >
                              <Text style={styles.currencyModalItemText}>{item}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        
                        <TouchableOpacity
                          style={styles.currencyModalCloseButton}
                          onPress={() => setCurrencyModalVisible(false)}
                        >
                          <Text style={styles.currencyModalCloseButtonText}>Zamknij</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>
                )}
                <Text style={{
                  fontSize: 16,
                  marginBottom: 10,
                  marginTop: 20,
                  textAlign: "center",
                  color: "white",
                }}>{isPickup ? "Dopłata kartą" : "Płatność kartą"}</Text>
                <View
                  style={{
                    width: "100%",
                    borderWidth: 1,
                    borderColor: "white",
                    padding: 20,
                  }}
                >
                  {cardPriceCurrencyPairs.map((pair, index) => (
                    <View
                      key={`card-${index}`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 20,
                      }}
                    >
                      <TextInput
                        style={{
                          flex: 1,
                          height: 40,
                          borderColor: "white",
                          borderWidth: 1,
                          borderRadius: 5,
                          paddingHorizontal: 10,
                          color: "white",
                          backgroundColor: "black",
                          marginRight: 10,
                        }}
                        value={pair.price}
                        onChangeText={(value) => {
                          const numericValue = value.replace(/[^0-9.]/g, "");
                          handleCardPairChange(index, "price", numericValue);
                        }}
                        placeholder="Wpisz kwotę"
                        keyboardType="numeric"
                      />
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          height: 40,
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: "black",
                          borderColor: "white",
                          borderWidth: 1,
                          borderRadius: 5,
                        }}
                        onPress={() => openCurrencyModal(index)}
                      >
                        <Text style={{ color: "white" }}>{pair.currency}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <View style={styles.modalButtons}>
                  <Pressable
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => {
                      setModalVisible(false);
                      setScanned(false); // Reset stanu skanowania
                      setBarcode("");
                      setModalMessage("");
                      setSelectedOption("");
                      setCashPriceCurrencyPairs([{ price: "", currency: "PLN" }]);
                      setCardPriceCurrencyPairs([{ price: "", currency: "PLN" }]);
                      setIsPickup(false);
                      setAdvanceAmount("");
                      setSelectedAdvance(null);
                      setCurrentProductName("");
                      setCurrentProductSize("");
                    }}
                  >
                    <Text style={styles.buttonText}>Anuluj</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.button, styles.addButton]}
                    onPress={handleSubmit}
                  >
                    <Text style={styles.buttonText}>Dodaj</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      )}
      
      {/* Error Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={errorModalVisible}
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={styles.currencyModalContainer}>
          <View style={styles.successModalContent}>
            <View style={[styles.successIconContainer, { backgroundColor: '#dc3545' }]}>
              <Text style={styles.successIcon}>✕</Text>
            </View>
            <Text style={styles.successModalTitle}>Uwaga</Text>
            <Text style={styles.successModalMessage}>
              {errorMessage}
            </Text>
            
            <TouchableOpacity
              style={[styles.currencyModalItem, { backgroundColor: '#dc3545', marginTop: 20, width: '90%' }]}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={styles.currencyModalItemText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.currencyModalContainer}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.successModalTitle}>Sukces!</Text>
            <Text style={styles.successModalMessage}>
              {successMessage}
            </Text>
            
            <TouchableOpacity
              style={[styles.currencyModalItem, { backgroundColor: '#007bff', marginTop: 20, width: '90%' }]}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={styles.currencyModalItemText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black",color: "white" },
  message: { textAlign: "center", marginTop: 20, color: "white" },
  camera: { flex: 1 },
  buttonContainer: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
  },
  modalButtons: {
    flexDirection: "row", // Align buttons side by side
    justifyContent: "space-between", // Add space between buttons
    marginTop: 20,
    width: "100%", // Ensure buttons take full width
  },
  button: {
    flex: 1, // Equal width for both buttons
    marginHorizontal: 10, // Add spacing between buttons
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "gray",
  },
  addButton: {
    backgroundColor: "green",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 10,
  },
  picker: {
    height: 55, // Ensure enough height for text
    width: "100%",
    marginBottom: 20,
    borderColor: "gray",
    borderWidth: 1,
    backgroundColor: "white", // Ensure Picker is visible
    zIndex: 100, // Ensure Picker is above other elements
    elevation: 10, // Add elevation for Android
    justifyContent: "center", // Center text vertically
    overflow: "visible", // Allow dropdown to render outside boundaries
  },
  currencyPicker: {
    flex: 1,
    height: 55,
    borderColor: "gray",
    borderWidth: 1,
    backgroundColor: "white", // Ensure Picker is visible
    zIndex: 100, // Ensure Picker is above other elements
    elevation: 10, // Add elevation for Android
    overflow: "visible", // Allow dropdown to render outside boundaries
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-start", // Align content to the top
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 5, // Ensure modal container is below modal content
  },
  modalContent: {
    width: "100%", // Full width
    height: "100%", // Full height
    padding: 20,
    backgroundColor: "black", // Set background color to black
    borderRadius: 0, // Remove border radius for full-screen effect
    alignItems: "center",
    zIndex: 10, // Ensure modal content is above other elements
    elevation: 5, // Add elevation for Android
    overflow: "visible", // Allow content to render outside boundaries
  },
  modalScrollView: {
    width: "100%",
    flexGrow: 1,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    color: "white", // Set text color to white
  },
  closeButton: {
    top: 10, // Place it near the top
    right: 10, // Place it on the right side
    backgroundColor: "red", // Set background color to red
    borderRadius: 100, // Make the button round
    position: "absolute", // Position it absolutely
    width: 30, // Set width and height for the button
    height: 30,
    justifyContent: "center", // Center the text inside the button

  },
  closeButtonText: {
    color: "white", // Set close button text color to white
    fontSize: 16,
    textAlign: "center", // Center the text
  },
  inputField: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 20,
    width: "100%",
    paddingHorizontal: 10,
    color: "white", // Set input text color to white
    backgroundColor: "black", // Match input background with modal
  },
  pairContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1, // Add border width
    borderColor: "white", // Add border color
  },
  priceInput: {
    flex: 1,
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginRight: 10,
    paddingHorizontal: 10,
  },
  addPairButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "rgb(13, 110, 253)", // Set background color to blue
    borderRadius: 5,
    alignItems: "center",
  },
  addPairButtonText: {
    color: "white",
    fontSize: 16,
  },
  removePairButton: {
    marginLeft: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "red",
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  removePairButtonText: {
    color: "white",
    fontSize: 14,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: 20,
  },
  scrollViewContent: {
    flexGrow: 1,
    padding: 20,
  },
  currencyButton: {
    flex: 1,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
    borderColor: "white",
    borderWidth: 1,
    borderRadius: 5,
    marginLeft: 10,
  },
  currencyButtonText: {
    color: "white",
    fontSize: 16,
  },
  currencyModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyModalContent: {
    backgroundColor: '#000000', // Prawdziwy czarny jak główne tło aplikacji
    borderRadius: 15,
    padding: 25,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: '#0d6efd', // Główny kolor aplikacji
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
  },
  currencyModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  currencyModalItem: {
    backgroundColor: '#0d6efd', // Główny kolor aplikacji
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ffffff',
    alignItems: 'center',
    width: '100%', // Changed from 90% to 100%
    alignSelf: 'center', // Center the button horizontally
  },
  currencyModalItemText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  currencyModalCloseButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ffffff',
    alignItems: 'center',
    width: '100%', // Changed from 90% to 100%
    marginTop: 20,
    alignSelf: 'center', // Center the button horizontally
  },
  currencyModalCloseButtonText: {
    color: "white",
    fontSize: 16,
  },
  // Success Modal Styles
  successModalContent: {
    backgroundColor: '#000000',
    borderRadius: 15,
    padding: 30,
    width: '85%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007bff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  successModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 15,
  },
  successModalMessage: {
    fontSize: 16,
    color: '#e5e7eb',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 10,
  },
});

export default QRScanner;
