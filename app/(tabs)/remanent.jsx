import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { GlobalStateContext } from '../../context/GlobalState';
import tokenService from '../../services/tokenService';
import { getApiUrl } from '../../config/api';

const Remanent = () => {
  const { user, sizes, colors, stocks, stateData, fetchSizes, fetchColors, fetchStock } = useContext(GlobalStateContext);
  const [remanentData, setRemanentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // QR Scanner states
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedJackets, setScannedJackets] = useState([]);
  const [facing, setFacing] = useState('back');
  
  // Price list state for remanent
  const [remanentPriceList, setRemanentPriceList] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [scanningEnabled, setScanningEnabled] = useState(true);
  
  // Comparison modal states
  const [comparisonModalVisible, setComparisonModalVisible] = useState(false);
  const [comparisonResults, setComparisonResults] = useState(null);
  const [sentCorrections, setSentCorrections] = useState(new Set()); // Zestaw wysłanych korekt

  // Fetch remanent data
  const fetchRemanentData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch real remanent data from API
      const response = await tokenService.authenticatedFetch(getApiUrl('/remanent'));
      
      if (response.ok) {
        const data = await response.json();
        
        // Backend returns remanent records with nested items
        // We need to flatten them into individual jacket items
        const flattenedItems = [];
        
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach(remanentRecord => {
            if (remanentRecord.items && Array.isArray(remanentRecord.items)) {
              remanentRecord.items.forEach(item => {
                flattenedItems.push({
                  id: item._id || item.id || Date.now() + Math.random(),
                  remanentId: remanentRecord._id, // Add remanent record ID for deletion
                  name: item.name,
                  code: item.code,
                  quantity: item.quantity || 1,
                  value: item.value || '0.00',
                  location: item.location,
                  scannedAt: item.scannedAt || remanentRecord.timestamp,
                  timestamp: remanentRecord.timestamp
                });
              });
            }
          });
        }
        
        setRemanentData(flattenedItems);
        console.log('✅ Remanent data loaded from API:', flattenedItems.length, 'items');
      } else {
        // Start with empty list - only scanned items will be added
        setRemanentData([]);
        console.log('📝 Starting with empty remanent list');
      }
    } catch (error) {
      console.error('❌ Error fetching remanent data:', error);
      // Start with empty list on error
      setRemanentData([]);
      console.log('📝 Using empty remanent list due to error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch remanent price list
  const fetchRemanentPriceList = async () => {
    try {
      const response = await tokenService.authenticatedFetch(getApiUrl('/cudzich/pricelist'));
      
      if (response.ok) {
        const data = await response.json();
        setRemanentPriceList(data);
      } else {
        console.error('❌ Błąd pobierania cennika remanent:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching remanent price list:', error);
    }
  };

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRemanentData();
    setRefreshing(false);
  };

  // QR Scanner functions
  const openQRScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Błąd', 'Brak uprawnień do kamery');
        return;
      }
    }
    
    // Reset stanu wysłanych korekt przy rozpoczęciu nowego skanowania (bez alertu)
    await resetSentCorrections(false);
    
    setScannedJackets([]);
    setScannerVisible(true);
    setScanned(false);
    setLastScannedCode('');
    setScanningEnabled(true);
  };

  const handleScan = async ({ data, type }) => {
    // Prevent multiple scans of the same code
    if (!scanningEnabled || data === lastScannedCode) {
      return;
    }

    // Disable scanning temporarily
    setScanningEnabled(false);
    setLastScannedCode(data);
    
    // Check if jacket already scanned
    const alreadyScanned = scannedJackets.find(jacket => jacket.code === data);
    if (alreadyScanned) {
      // Quick re-enable for duplicate (no alert needed)
      setTimeout(() => {
        setScanningEnabled(true);
        setLastScannedCode('');
      }, 800);
      return;
    }

    // Get jacket name from barcode
    const jacketName = await getJacketNameFromBarcode(data);

    // Add scanned jacket to list
    const newJacket = {
      id: Date.now(),
      code: data,
      name: jacketName,
      scannedAt: new Date().toLocaleTimeString()
    };
    
    setScannedJackets(prev => [...prev, newJacket]);
    
    // Re-enable scanning after short delay
    setTimeout(() => {
      setScanningEnabled(true);
      setLastScannedCode('');
    }, 800);
  };

  const confirmScannedJackets = async () => {
    if (scannedJackets.length === 0) {
      return; // Silently do nothing if no jackets
    }

    try {
      // Prepare data for API
      const remanentItemsForAPI = scannedJackets.map(jacket => {
        const price = getPriceFromProductName(jacket.name);
        
        return {
          name: jacket.name,
          code: jacket.code,
          quantity: 1,
          value: parseFloat(price) || 0,
          location: user?.location || user?.symbol || 'Nieznana lokalizacja',
          scannedAt: new Date().toISOString(),
          scannedBy: user?.name || user?.username || 'Nieznany użytkownik'
        };
      });

      // Save to database via API
      const response = await tokenService.authenticatedFetch(getApiUrl('/remanent'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: remanentItemsForAPI,
          timestamp: new Date().toISOString(),
          userId: user?.id
        })
      });

      if (response.ok) {
        console.log('✅ Remanent items saved to database');
        
        // Add scanned jackets to local state
        const newRemanentItems = scannedJackets.map(jacket => {
          const price = getPriceFromProductName(jacket.name);
          
          return {
            id: jacket.id,
            name: jacket.name,
            code: jacket.code,
            quantity: 1,
            value: price,
            location: user?.location || user?.symbol || 'Nieznana lokalizacja',
            scannedAt: jacket.scannedAt
          };
        });

        setRemanentData(prev => [...prev, ...newRemanentItems]);
      } else {
        console.error('❌ Failed to save remanent items:', response.status);
        // Still add to local state even if API fails
        const newRemanentItems = scannedJackets.map(jacket => {
          const price = getPriceFromProductName(jacket.name);
          
          return {
            id: jacket.id,
            name: jacket.name,
            code: jacket.code,
            quantity: 1,
            value: price,
            location: user?.location || user?.symbol || 'Nieznana lokalizacja',
            scannedAt: jacket.scannedAt
          };
        });

        setRemanentData(prev => [...prev, ...newRemanentItems]);
      }
      
      // Clear scanned jackets but keep scanner open
      setScannedJackets([]);
      setLastScannedCode('');
      setScanningEnabled(true);
      
      // No success alert - continue scanning immediately
    } catch (error) {
      console.error('Error adding scanned jackets:', error);
      // Even on error, add to local state and clear the list
      const newRemanentItems = scannedJackets.map(jacket => {
        const price = getPriceFromProductName(jacket.name);
        
        return {
          id: jacket.id,
          name: jacket.name,
          code: jacket.code,
          quantity: 1,
          value: price,
          location: user?.location || user?.symbol || 'Nieznana lokalizacja',
          scannedAt: jacket.scannedAt
        };
      });

      setRemanentData(prev => [...prev, ...newRemanentItems]);
      setScannedJackets([]);
      setLastScannedCode('');
      setScanningEnabled(true);
    }
  };

  const removeScannedJacket = (jacketId) => {
    setScannedJackets(prev => prev.filter(jacket => jacket.id !== jacketId));
  };

  const removeRemanentItem = async (itemId) => {
    try {
      // Find the item to get its remanentId
      const itemToDelete = remanentData.find(item => item.id === itemId);
      
      if (!itemToDelete) {
        console.error('❌ Item not found in local data');
        return;
      }

      // If item was just scanned (no remanentId), only remove from local state
      if (!itemToDelete.remanentId) {
        setRemanentData(prev => prev.filter(item => item.id !== itemId));
        return;
      }

      // Call API to delete from database
      const response = await tokenService.authenticatedFetch(
        getApiUrl(`/remanent/${itemToDelete.remanentId}/items/${itemId}`),
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        // Remove from local state only after successful API call
        setRemanentData(prev => prev.filter(item => item.id !== itemId));
        console.log('✅ Item removed from database and local state');
      } else {
        console.error('❌ Failed to delete item from database:', response.status);
        // Still remove from local state for better UX
        setRemanentData(prev => prev.filter(item => item.id !== itemId));
      }
    } catch (error) {
      console.error('❌ Error deleting item:', error);
      // Still remove from local state on error
      setRemanentData(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const cancelScanning = () => {
    setScannerVisible(false);
    setScannedJackets([]);
    setScanned(false);
    setLastScannedCode('');
    setScanningEnabled(true);
  };

  const checkCurrentState = async () => {
    try {
      // Pytaj użytkownika czy chce zresetować korekty przed nowym sprawdzeniem
      if (sentCorrections.size > 0) {
        Alert.alert(
          'Nowe sprawdzenie stanu',
          `Masz już ${sentCorrections.size} wysłanych korekt. Czy chcesz je zresetować i móc wysłać ponownie?`,
          [
            {
              text: 'Nie',
              onPress: () => performStateCheck(),
              style: 'cancel',
            },
            {
              text: 'Tak, resetuj',
              onPress: async () => {
                await resetSentCorrections(false); // Reset bez alertu
                performStateCheck();
              },
            },
          ],
          { cancelable: true }
        );
      } else {
        performStateCheck();
      }
    } catch (error) {
      console.error('❌ Error in checkCurrentState:', error);
      Alert.alert('Błąd', 'Wystąpił błąd podczas sprawdzania stanu');
    }
  };

  const performStateCheck = async () => {
    try {
      // NIE resetuj wysłanych korekt - pozostaw je zapamiętane
      
      // Pobierz stan magazynowy z endpointu /state
      const response = await tokenService.authenticatedFetch(getApiUrl('/state'));
      
      if (response.ok) {
        const allStateData = await response.json();
        
        // Filtruj produkty dla aktualnego użytkownika
        const currentState = allStateData.filter(item => item.symbol === user?.symbol);
        
        // Porównaj remanent z aktualnym stanem
        const missingItems = []; // Produkty w stanie, ale nie w remanencie
        const extraItems = []; // Produkty w remanencie, ale nie w stanie
        
        // Sprawdź co brakuje (jest w stanie, ale nie zeskanowane)
        currentState.forEach(stateItem => {
          const existsInRemanent = remanentData.find(remanentItem => 
            remanentItem.code === stateItem.barcode
          );
          
          if (!existsInRemanent) {
            missingItems.push({
              name: stateItem.fullName,
              size: stateItem.size,
              code: stateItem.barcode,
              price: stateItem.price
            });
          }
        });
        
        // Sprawdź co się nadwyżkuje (zeskanowane, ale nie ma w stanie)
        remanentData.forEach(remanentItem => {
          const existsInState = currentState.find(stateItem => 
            stateItem.barcode === remanentItem.code
          );
          
          if (!existsInState) {
            extraItems.push({
              name: remanentItem.name,
              size: remanentItem.size || 'Nieznany',
              code: remanentItem.code,
              price: remanentItem.value
            });
          }
        });
        
        // Pokaż wyniki w modalu
        console.log('🔍 Porównanie:', {
          currentStateCount: currentState.length,
          remanentCount: remanentData.length,
          missingItems: missingItems,
          extraItems: extraItems
        });
        
        setComparisonResults({
          currentStateCount: currentState.length,
          remanentCount: remanentData.length,
          missingItems: missingItems,
          extraItems: extraItems
        });
        setComparisonModalVisible(true);
        
      } else {
        console.error('❌ Failed to fetch current state:', response.status);
        Alert.alert('Błąd', 'Nie udało się pobrać aktualnego stanu');
      }
    } catch (error) {
      console.error('❌ Error checking current state:', error);
      Alert.alert('Błąd', 'Wystąpił błąd podczas sprawdzania stanu');
    }
  };

  // Funkcja do wysyłania korekty
  const sendToCorrections = async (item, errorType) => {
    try {
      // Sprawdź czy już wysłane
      const correctionKey = `${item.code}_${errorType}`;
      if (sentCorrections.has(correctionKey)) {
        // Korekta już wysłana - nie rób nic
        return;
      }

      // Określ typ operacji na podstawie błędu
      const attemptedOperation = errorType === 'MISSING_IN_STATE' ? 'REMANENT_BRAK' : 'REMANENT_NADWYŻKA';
      
      const correctionData = {
        fullName: item.name,
        size: item.size,
        barcode: item.code,
        sellingPoint: user?.sellingPoint || user?.location || user?.symbol || 'Nieznany punkt', // sellingPoint PIERWSZY - to jest nazwa punktu!
        symbol: user?.symbol || 'Nieznany',
        errorType: errorType, // 'MISSING_IN_STATE' lub 'EXTRA_IN_REMANENT'
        description: errorType === 'MISSING_IN_STATE' 
          ? `Remanent - Brak: Produkt jest w stanie, ale nie został zeskanowany podczas remanentu` 
          : `Remanent - Nadwyżka: Produkt został zeskanowany, ale nie ma go w stanie magazynowym`,
        attemptedOperation: attemptedOperation, // 'REMANENT_BRAK' lub 'REMANENT_NADWYŻKA'
        originalPrice: item.price,
        discountPrice: item.price,
        transactionId: `REMANENT_${user?.symbol || 'UNKNOWN'}_${Date.now()}`
      };

      console.log('📤 Wysyłanie korekty:', correctionData);

      const response = await tokenService.authenticatedFetch(getApiUrl('/corrections'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(correctionData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Korekta wysłana:', result);
        
        // Dodaj do wysłanych korekt i zapisz do localStorage
        const newSentCorrections = new Set(sentCorrections).add(correctionKey);
        setSentCorrections(newSentCorrections);
        await saveSentCorrections(newSentCorrections);
        
        // Usuń alert - tylko zmień wygląd przycisku
      } else {
        console.error('❌ Błąd wysyłania korekty:', response.status);
        const errorText = await response.text();
        console.error('❌ Error details:', errorText);
        Alert.alert('Błąd', 'Nie udało się wysłać korekty do systemu');
      }
    } catch (error) {
      console.error('❌ Error sending correction:', error);
      Alert.alert('Błąd', 'Wystąpił błąd podczas wysyłania korekty');
    }
  };

  // Funkcja sprawdzająca czy korekta została już wysłana
  const isCorrectionSent = (item, errorType) => {
    const correctionKey = `${item.code}_${errorType}`;
    return sentCorrections.has(correctionKey);
  };

  // Funkcje do zarządzania trwałym przechowywaniem wysłanych korekt
  const loadSentCorrections = async () => {
    try {
      const userKey = `sentCorrections_${user?.symbol || 'unknown'}`;
      const savedCorrections = await AsyncStorage.getItem(userKey);
      if (savedCorrections) {
        const parsed = JSON.parse(savedCorrections);
        setSentCorrections(new Set(parsed));
        console.log('📥 Załadowano wysłane korekty:', parsed.length);
      }
    } catch (error) {
      console.error('❌ Błąd ładowania wysłanych korekt:', error);
    }
  };

  const saveSentCorrections = async (corrections) => {
    try {
      const userKey = `sentCorrections_${user?.symbol || 'unknown'}`;
      const correctionsArray = Array.from(corrections);
      await AsyncStorage.setItem(userKey, JSON.stringify(correctionsArray));
      console.log('💾 Zapisano wysłane korekty:', correctionsArray.length);
    } catch (error) {
      console.error('❌ Błąd zapisywania wysłanych korekt:', error);
    }
  };

  // Funkcja resetowania wysłanych korekt (do debugowania)
  const resetSentCorrections = async (showAlert = true) => {
    try {
      const userKey = `sentCorrections_${user?.symbol || 'unknown'}`;
      await AsyncStorage.removeItem(userKey);
      setSentCorrections(new Set());
      console.log('🗑️ Zresetowano wysłane korekty');
      
      // Pokaż krótkie potwierdzenie tylko jeśli showAlert = true
      if (showAlert) {
        Alert.alert(
          'Reset wykonany',
          'Wszystkie korekty mogą być teraz wysłane ponownie',
          [{ text: 'OK' }],
          { cancelable: true }
        );
      }
    } catch (error) {
      console.error('❌ Błąd resetowania korekt:', error);
    }
  };

  useEffect(() => {
    fetchRemanentData();
    fetchRemanentPriceList();
    
    // Załaduj wysłane korekty dla tego użytkownika
    if (user?.symbol) {
      loadSentCorrections();
    }
    
    // Ensure lookup data is loaded
    const loadLookupData = async () => {
      try {
        if (fetchSizes && (!sizes || sizes.length === 0)) {
          await fetchSizes();
        }
        if (fetchColors && (!colors || colors.length === 0)) {
          await fetchColors();
        }
        if (fetchStock && (!stocks || stocks.length === 0)) {
          await fetchStock();
        }
      } catch (error) {
        console.log('Error loading lookup data:', error);
      }
    };
    
    loadLookupData();
  }, [user?.symbol]); // Dodano user?.symbol jako dependency

  // Helper function to build jacket name from barcode
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
      
      console.log('Barcode pattern match:', { stockCode, colorCode, sizeCode });
      console.log('Available data:', { 
        stocksCount: stocks?.length || 0, 
        colorsCount: colors?.length || 0, 
        sizesCount: sizes?.length || 0 
      });
      
      // Try to extract arrays from the objects
      const stocksArray = Array.isArray(stocks) ? stocks : (stocks?.data || stocks?.stocks || []);
      const colorsArray = Array.isArray(colors) ? colors : (colors?.data || colors?.colors || []);
      const sizesArray = Array.isArray(sizes) ? sizes : (sizes?.data || sizes?.sizes || []);
      
      // Mock data as fallback when real data is not available
      const mockStocks = [
        { Tow_Kod: "001", Tow_Opis: "Kurtka zimowa" },
        { Tow_Kod: "002", Tow_Opis: "Kurtka jesienna" },
        { Tow_Kod: "003", Tow_Opis: "Płaszcz" },
        { Tow_Kod: "037", Tow_Opis: "Kurtka sportowa" },
      ];
      
      const mockColors = [
        { Kol_Kod: "01", Kol_Opis: "CZARNY" },
        { Kol_Kod: "02", Kol_Opis: "BIAŁY" },
        { Kol_Kod: "03", Kol_Opis: "CZERWONY" },
        { Kol_Kod: "04", Kol_Opis: "NIEBIESKI" },
        { Kol_Kod: "21", Kol_Opis: "ZIELONY" },
      ];
      
      const mockSizes = [
        { Roz_Kod: "001", Roz_Opis: "XS" },
        { Roz_Kod: "002", Roz_Opis: "S" },
        { Roz_Kod: "003", Roz_Opis: "M" },
        { Roz_Kod: "004", Roz_Opis: "L" },
        { Roz_Kod: "005", Roz_Opis: "XL" },
        { Roz_Kod: "006", Roz_Opis: "2XL" },
      ];
      
      // Use real data if available, otherwise use mock data
      const finalStocks = stocksArray.length > 0 ? stocksArray : mockStocks;
      const finalColors = colorsArray.length > 0 ? colorsArray : mockColors;
      const finalSizes = sizesArray.length > 0 ? sizesArray : mockSizes;
      
      // Look up stock (Tow_Opis) from first 3 digits
      const stockItem = finalStocks.find(stock => stock.Tow_Kod === stockCode);
      const stockName = stockItem?.Tow_Opis || `Kod_${stockCode}`;
      
      // Look up color (Kol_Opis) from next 2 digits  
      const colorItem = finalColors.find(color => color.Kol_Kod === colorCode);
      const colorName = colorItem?.Kol_Opis || `Kolor_${colorCode}`;
      
      // Look up size name from next 3 digits
      const sizeItem = finalSizes.find(size => size.Roz_Kod === sizeCode);
      const sizeName = sizeItem?.Roz_Opis || `Rozmiar_${sizeCode}`;
      
      console.log('Lookup results:', { stockName, colorName, sizeName });
      
      // Build the jacket name with proper fallbacks
      const jacketName = `${stockName || 'Nieznany'} ${colorName || 'Nieznany'} ${sizeName || 'Nieznany'}`;
      
      return jacketName;
    } catch (error) {
      console.error("Error building jacket name from barcode:", error);
      return null;
    }
  };

  // Helper function to build remaining product name from barcode
  const buildRemainingProductNameFromBarcode = async (barcodeData) => {
    try {
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
      
      // Mock colors data as fallback
      const mockColors = [
        { Kol_Kod: "01", Kol_Opis: "CZARNY" },
        { Kol_Kod: "02", Kol_Opis: "BIAŁY" },
        { Kol_Kod: "03", Kol_Opis: "CZERWONY" },
        { Kol_Kod: "04", Kol_Opis: "NIEBIESKI" },
        { Kol_Kod: "21", Kol_Opis: "ZIELONY" },
      ];
      
      // Use real data if available, otherwise use mock data
      const finalColors = colorsArray.length > 0 ? colorsArray : mockColors;
      
      // Look up color (Kol_Opis) from positions 4-5
      const colorItem = finalColors.find(color => color.Kol_Kod === colorCode);
      const colorName = colorItem?.Kol_Opis || `Kolor_${colorCode}`;
      
      // For remanent, we'll use mock remaining products data since API might not be available
      const mockRemainingProducts = [
        { Poz_Nr: "01", Poz_Kod: "Ada" },
        { Poz_Nr: "02", Poz_Kod: "Bela" },
        { Poz_Nr: "03", Poz_Kod: "Carla" },
        { Poz_Nr: "04", Poz_Kod: "Diana" },
        { Poz_Nr: "05", Poz_Kod: "Eva" },
        { Poz_Nr: "06", Poz_Kod: "Fiona" },
        { Poz_Nr: "07", Poz_Kod: "Gloria" },
        { Poz_Nr: "08", Poz_Kod: "Helena" },
        { Poz_Nr: "09", Poz_Kod: "Inez" },
      ];
      
      // Convert productCode to number for comparison
      const productCodeNumber = parseInt(productCode, 10);
      
      const productItem = mockRemainingProducts.find(product => 
        parseInt(product.Poz_Nr, 10) === productCodeNumber
      );
      
      const productName = productItem?.Poz_Kod || `Produkt_${productCode}`;
      
      // Build the remaining product name: Poz_Kod + color
      const fullRemainingProductName = `${productName} ${colorName}`;
      
      return fullRemainingProductName;
    } catch (error) {
      console.error("Error building remaining product name from barcode:", error);
      return null;
    }
  };

  // Function to get jacket name from barcode (tries different patterns)
  const getJacketNameFromBarcode = async (barcodeData) => {
    // Try remaining products pattern first
    const remainingProductName = await buildRemainingProductNameFromBarcode(barcodeData);
    if (remainingProductName) {
      return remainingProductName;
    }

    // Try jacket pattern
    const jacketName = buildJacketNameFromBarcode(barcodeData);
    if (jacketName) {
      return jacketName;
    }

    // Try to match with stateData as fallback
    if (stateData && Array.isArray(stateData)) {
      const matchedItem = stateData.find(item => item.barcode === barcodeData);
      if (matchedItem) {
        return `${matchedItem.fullName} ${matchedItem.size}`;
      }
    }

    // Fallback to just showing the barcode
    return `Kurtka ${barcodeData}`;
  };

  // Price functions similar to cudzych.jsx
  const getPriceFromRemanentList = (productName) => {
    if (remanentPriceList && remanentPriceList.items && Array.isArray(remanentPriceList.items)) {
      // First try exact match
      let priceItem = remanentPriceList.items.find(item => 
        item.fullName === productName
      );
      
      // If no exact match, try without size (remove last word)
      if (!priceItem && productName.includes(' ')) {
        const words = productName.split(' ');
        if (words.length > 2) {
          // Try removing last word (size)
          const nameWithoutSize = words.slice(0, -1).join(' ');
          priceItem = remanentPriceList.items.find(item => 
            item.fullName === nameWithoutSize
          );
        }
      }
      
      if (priceItem) {
        return priceItem.price.toString();
      }
    }
    return "0.00";
  };

  // Helper function to get price from product name
  const getPriceFromProductName = (productName) => {
    if (!productName) {
      return "0.00";
    }
    return getPriceFromRemanentList(productName);
  };

  // Render individual remanent item
  const renderRemanentItem = ({ item }) => (
    <View style={styles.remanentItem}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name || 'Produkt'}</Text>
        <View style={styles.itemHeaderRight}>
          <Text style={styles.itemCode}>{item.code || 'N/A'}</Text>
          <TouchableOpacity
            onPress={() => removeRemanentItem(item.id)}
            style={styles.removeRemanentButton}
          >
            <Ionicons name="close" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.itemDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Cena:</Text>
          <Text style={styles.detailValue}>{item.value || '0.00'} PLN</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Punkt sprzedaży:</Text>
          <Text style={styles.detailValue}>{user?.sellingPoint || user?.location || user?.symbol || 'Nieznany punkt'}</Text>
        </View>
      </View>

      <View style={styles.itemActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleItemAction(item, 'edit')}
        >
          <Ionicons name="create-outline" size={20} color="#0d6efd" />
          <Text style={styles.actionText}>Edytuj</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleItemAction(item, 'inventory')}
        >
          <Ionicons name="list-outline" size={20} color="#28a745" />
          <Text style={styles.actionText}>Inwentarz</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Handle item actions
  const handleItemAction = (item, action) => {
    switch (action) {
      case 'edit':
        Alert.alert(
          'Edycja produktu',
          `Edytuj: ${item.name}`,
          [{ text: 'OK' }]
        );
        break;
      case 'inventory':
        Alert.alert(
          'Inwentarz',
          `Przeprowadź inwentarz dla: ${item.name}`,
          [{ text: 'OK' }]
        );
        break;
      default:
        break;
    }
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={{ backgroundColor: "#000", flex: 1 }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0d6efd" />
          <Text style={styles.loadingText}>Ładowanie remanentów...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ backgroundColor: "#000", flex: 1 }}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Remanenty</Text>
            <Text style={styles.headerSubtitle}>Stan magazynowy</Text>
          </View>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetSentCorrections}
            title="Resetuj wysłane korekty"
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.resetButtonText}>Reset korekt</Text>
          </TouchableOpacity>
        </View>
      </View>

      {remanentData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="archive-outline" size={64} color="#CDCDE0" />
          <Text style={styles.emptyText}>Brak danych remanentów</Text>
          <Text style={styles.emptySubtext}>
            Skontaktuj się z administratorem aby skonfigurować remanenty
          </Text>
        </View>
      ) : (
        <FlatList
          data={remanentData}
          renderItem={renderRemanentItem}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0d6efd']}
              tintColor="#0d6efd"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.addButton} onPress={openQRScanner}>
          <Ionicons name="qr-code" size={24} color="white" />
          <Text style={styles.addButtonText}>Skanuj kurtki</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.checkButton} onPress={checkCurrentState}>
          <Ionicons name="checkmark-circle" size={24} color="white" />
          <Text style={styles.checkButtonText}>Sprawdź</Text>
        </TouchableOpacity>
      </View>

      {/* QR Scanner Modal */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        onRequestClose={cancelScanning}
      >
        <SafeAreaView style={{ backgroundColor: "#000", flex: 1 }}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity onPress={cancelScanning} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Skanuj kody kurtek</Text>
            <View style={styles.placeholderButton} />
          </View>

          <View style={styles.scannerContainer}>
            {permission?.granted ? (
              <CameraView
                style={styles.camera}
                facing={facing}
                barcodeScannerSettings={{
                  barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code39", "code128"],
                }}
                onBarcodeScanned={scanningEnabled ? handleScan : undefined}
              />
            ) : (
              <View style={styles.permissionContainer}>
                <Text style={styles.permissionText}>Brak uprawnień do kamery</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
                  <Text style={styles.permissionButtonText}>Udziel uprawnień</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Scanner overlay */}
            <View style={styles.overlay}>
              <View style={[
                styles.scanArea, 
                { borderColor: scanningEnabled ? '#0d6efd' : '#dc3545' }
              ]} />
              {!scanningEnabled && (
                <View style={styles.scanningDisabled}>
                  <Text style={styles.scanningDisabledText}>Przetwarzanie...</Text>
                </View>
              )}
            </View>
          </View>

          {/* Scanned jackets list */}
          {scannedJackets.length > 0 && (
            <View style={styles.scannedListContainer}>
              <Text style={styles.scannedListTitle}>
                Zeskanowane kurtki ({scannedJackets.length})
              </Text>
              <FlatList
                data={scannedJackets}
                horizontal
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.scannedJacket}>
                    <TouchableOpacity
                      onPress={() => removeScannedJacket(item.id)}
                      style={styles.removeJacketButton}
                    >
                      <Ionicons name="close" size={16} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.jacketName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.jacketCode}>{item.code}</Text>
                    <Text style={styles.jacketTime}>{item.scannedAt}</Text>
                  </View>
                )}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.scannerFooter}>
            {scannedJackets.length > 0 && (
              <TouchableOpacity 
                onPress={confirmScannedJackets}
                style={styles.confirmButton}
              >
                <Ionicons name="checkmark" size={24} color="white" />
                <Text style={styles.confirmButtonText}>
                  Zatwierdź ({scannedJackets.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal porównania remanent vs stan */}
      <Modal
        visible={comparisonModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Porównanie Remanent vs Stan</Text>
            <TouchableOpacity
              onPress={() => setComparisonModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {comparisonResults ? (
            <ScrollView style={styles.comparisonContent} showsVerticalScrollIndicator={false}>
              {/* Statystyki */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{comparisonResults.currentStateCount || 0}</Text>
                  <Text style={styles.statLabel}>Na stanie</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{comparisonResults.remanentCount || 0}</Text>
                  <Text style={styles.statLabel}>Zeskanowane</Text>
                </View>
              </View>

              {/* Produkty brakujące */}
              {comparisonResults.missingItems && comparisonResults.missingItems.length > 0 && (
                <View style={styles.resultSection}>
                  <Text style={styles.sectionTitle}>
                    ❌ Brakuje ({comparisonResults.missingItems.length})
                  </Text>
                  <Text style={styles.sectionSubtitle}>Produkty w stanie, ale nie zeskanowane</Text>
                  {comparisonResults.missingItems.map((item, index) => (
                    <View key={index} style={styles.resultItem}>
                      <View style={styles.resultItemContent}>
                        <Text style={styles.itemName}>
                          {item.name && item.size ? `${item.name} ${item.size}` : item.name || 'Nieznany produkt'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.sendCorrectionButton, 
                          isCorrectionSent(item, 'MISSING_IN_STATE') && styles.sentButton
                        ]}
                        onPress={() => sendToCorrections(item, 'MISSING_IN_STATE')}
                        disabled={isCorrectionSent(item, 'MISSING_IN_STATE')}
                      >
                        <Ionicons 
                          name={isCorrectionSent(item, 'MISSING_IN_STATE') ? "checkmark" : "send"} 
                          size={16} 
                          color="white" 
                        />
                        <Text style={styles.sendButtonText}>
                          {isCorrectionSent(item, 'MISSING_IN_STATE') ? 'Wysłano' : 'Wyślij do korekt'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Produkty nadwyżkowe */}
              {comparisonResults.extraItems && comparisonResults.extraItems.length > 0 && (
                <View style={styles.resultSection}>
                  <Text style={styles.sectionTitle}>
                    ⚠️ Nadwyżka ({comparisonResults.extraItems.length})
                  </Text>
                  <Text style={styles.sectionSubtitle}>Produkty zeskanowane, ale nie ma ich w stanie</Text>
                  {comparisonResults.extraItems.map((item, index) => (
                    <View key={index} style={styles.resultItem}>
                      <View style={styles.resultItemContent}>
                        <Text style={styles.itemName}>{item.name || 'Nieznany produkt'}</Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.sendCorrectionButton, 
                          isCorrectionSent(item, 'EXTRA_IN_REMANENT') && styles.sentButton
                        ]}
                        onPress={() => sendToCorrections(item, 'EXTRA_IN_REMANENT')}
                        disabled={isCorrectionSent(item, 'EXTRA_IN_REMANENT')}
                      >
                        <Ionicons 
                          name={isCorrectionSent(item, 'EXTRA_IN_REMANENT') ? "checkmark" : "send"} 
                          size={16} 
                          color="white" 
                        />
                        <Text style={styles.sendButtonText}>
                          {isCorrectionSent(item, 'EXTRA_IN_REMANENT') ? 'Wysłano' : 'Wyślij do korekt'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Wszystko OK */}
              {(!comparisonResults.missingItems || comparisonResults.missingItems.length === 0) && 
               (!comparisonResults.extraItems || comparisonResults.extraItems.length === 0) && (
                <View style={styles.resultSection}>
                  <Text style={styles.successTitle}>🎉 Wszystko się zgadza!</Text>
                  <Text style={styles.successSubtitle}>Remanent jest zgodny ze stanem magazynowym</Text>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.comparisonContent}>
              <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Ładowanie danych...</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#232533',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#CDCDE0',
  },
  resetButton: {
    backgroundColor: '#6c757d',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 12,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  remanentItem: {
    backgroundColor: '#1E1E2D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#232533',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  itemCode: {
    fontSize: 14,
    color: '#CDCDE0',
    backgroundColor: '#232533',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  removeRemanentButton: {
    backgroundColor: '#dc3545',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#CDCDE0',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#232533',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#232533',
    minWidth: 100,
    justifyContent: 'center',
  },
  actionText: {
    color: 'white',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CDCDE0',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#232533',
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    backgroundColor: '#0d6efd',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    flex: 1,
  },
  checkButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    flex: 1,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  checkButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // QR Scanner styles
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#232533',
  },
  closeButton: {
    padding: 8,
  },
  scannerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholderButton: {
    width: 44,
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#161622',
  },
  permissionText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#0d6efd',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#0d6efd',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanningDisabled: {
    position: 'absolute',
    bottom: -50,
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scanningDisabledText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scannedListContainer: {
    backgroundColor: '#1E1E2D',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#232533',
    maxHeight: 120,
  },
  scannedListTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  scannedJacket: {
    backgroundColor: '#232533',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 120,
    position: 'relative',
  },
  removeJacketButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#dc3545',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  jacketName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 16,
  },
  jacketCode: {
    color: '#CDCDE0',
    fontSize: 12,
    marginBottom: 4,
  },
  jacketTime: {
    color: '#CDCDE0',
    fontSize: 12,
  },
  scannerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#232533',
  },
  confirmButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Styles for comparison modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#232533',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 8,
  },
  comparisonContent: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000000',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    backgroundColor: '#232533',
    borderRadius: 12,
    padding: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0d6efd',
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  resultSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  resultItem: {
    backgroundColor: '#232533',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultItemContent: {
    flex: 1,
  },
  sendCorrectionButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 12,
  },
  sentButton: {
    backgroundColor: '#28a745',
    opacity: 0.7,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: '#888',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
});

export default Remanent;