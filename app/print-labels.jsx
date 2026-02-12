import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { getApiUrl } from '../config/api';
import tokenService from '../services/tokenService';

const PrintLabels = () => {
  // State management
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [inventoryData, setInventoryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [selectedLocalization, setSelectedLocalization] = useState(null);
  const [selectedSellingPoint, setSelectedSellingPoint] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedManufacturer, setSelectedManufacturer] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Data for filters
  const [localizations, setLocalizations] = useState([]);
  const [sellingPoints, setSellingPoints] = useState([]); // All selling points
  const [allUsers, setAllUsers] = useState([]); // Store all users for filtering
  const [products, setProducts] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [colors, setColors] = useState([]);
  
  // Active filter dropdown
  const [activeFilter, setActiveFilter] = useState(null);
  const [filterSearch, setFilterSearch] = useState('');
  
  // Printing states
  const [printingId, setPrintingId] = useState(null);
  const [printingAll, setPrintingAll] = useState(false);
  
  // Price list for dedicated pricing
  const [priceLists, setPriceLists] = useState({});

  const categories = [
    'Kurtki kożuchy futra',
    'Torebki',
    'Portfele',
    'Pozostały asortyment',
    'Paski',
    'Rękawiczki'
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  // Reset selling point when localization changes
  useEffect(() => {
    if (selectedLocalization && sellingPoints.length > 0) {
      // Check if current selected point is still valid for the new localization
      const pointStillValid = sellingPoints.find(p => 
        p.value === selectedSellingPoint && 
        (p.value === 'all' || p.location === selectedLocalization)
      );
      if (!pointStillValid) {
        setSelectedSellingPoint('all');
      }
    }
  }, [selectedLocalization]);

  useEffect(() => {
    if (localizations.length > 0 && sellingPoints.length > 0) {
      loadInventoryData();
    }
  }, [selectedLocalization, selectedSellingPoint]);

  useEffect(() => {
    if (inventoryData.length > 0) {
      applyFilters();
    }
  }, [inventoryData, searchQuery, selectedLocalization, selectedSellingPoint, selectedCategory, selectedSize, selectedManufacturer, selectedProduct]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [usersRes, goodsRes, sizesRes, manufacturersRes, colorsRes, localizationsRes] = await Promise.all([
        tokenService.authenticatedFetch(getApiUrl('/user')),
        tokenService.authenticatedFetch(getApiUrl('/excel/goods/get-all-goods')),
        tokenService.authenticatedFetch(getApiUrl('/excel/size/get-all-sizes')),
        tokenService.authenticatedFetch(getApiUrl('/manufacturers')),
        tokenService.authenticatedFetch(getApiUrl('/excel/color/get-all-colors')),
        tokenService.authenticatedFetch(getApiUrl('/excel/localization/get-all-localizations')),
      ]);

      const usersData = await usersRes.json();
      const goodsData = await goodsRes.json();
      const sizesData = await sizesRes.json();
      const manufacturersData = await manufacturersRes.json();
      const colorsData = await colorsRes.json();
      const localizationsData = await localizationsRes.json();

      // Localizations
      if (localizationsData && localizationsData.localizations && Array.isArray(localizationsData.localizations)) {
        const validLocalizations = localizationsData.localizations.filter(l => 
          l.Miejsc_1_Kod_1 && l.Miejsc_1_Kod_1.toString().trim() !== ''
        );
        const locArray = validLocalizations.map(l => ({
          value: l._id,
          label: l.Miejsc_1_Opis_1
        }));
        console.log('=== LOCALIZATIONS LOADED ===');
        console.log('Localizations count:', locArray.length);
        if (locArray.length > 0) {
          console.log('First localization:', locArray[0]);
        }
        setLocalizations(locArray);
      }

      // Store all users for location-based filtering
      const usersArray = usersData?.users || [];
      console.log('=== USERS LOADED ===');
      console.log('Users count:', usersArray.length);
      if (usersArray.length > 0) {
        console.log('First user:', usersArray[0]);
        console.log('First user location:', usersArray[0].location);
      }
      setAllUsers(usersArray);
      
      // Selling points - will be filtered by location later
      if (Array.isArray(usersArray) && usersArray.length > 0) {
        const points = usersArray
          .filter((u) => {
            if (u.role === 'magazyn') return true;
            return u.role === 'user' && u.sellingPoint && u.sellingPoint.trim() !== '' && u.sellingPoint !== 'Cudzich';
          })
          .map((u) => ({
            value: u._id,
            label: u.role === 'magazyn' ? 'Magazyn' : u.sellingPoint,
            symbol: u.symbol,
            location: u.location,
            pointNumber: u.pointNumber,
          }));
        
        const uniquePoints = Array.from(new Map(points.map((p) => [p.label, p])).values());
        setSellingPoints([{ value: 'all', label: 'Wszystkie punkty' }, ...uniquePoints]);
        
        // Load price lists for all users
        await loadPriceLists(usersArray);
      }

      // Products
      if (goodsData && goodsData.goods && Array.isArray(goodsData.goods)) {
        const productsData = goodsData.goods.map(g => ({
          value: g._id,
          label: g.fullName,
          category: g.category,
          barcode: g.barcode,
          manufacturerId: g.manufacturerId,
          price: g.price
        }));
        setProducts(productsData);
      }

      // Sizes
      if (sizesData && sizesData.sizes && Array.isArray(sizesData.sizes)) {
        setSizes(sizesData.sizes.map(s => ({ value: s._id, label: s.Roz_Opis })));
      }

      // Manufacturers
      if (manufacturersData && manufacturersData.manufacturers && Array.isArray(manufacturersData.manufacturers)) {
        setManufacturers(manufacturersData.manufacturers.map(m => ({
          value: m._id,
          label: m.Prod_Opis || m.name
        })));
      }

      // Colors
      if (colorsData && colorsData.colors && Array.isArray(colorsData.colors)) {
        setColors(colorsData.colors);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Błąd', 'Nie udało się pobrać danych');
    } finally {
      setLoading(false);
    }
  };

  const loadPriceLists = async (users) => {
    const lists = {};
    for (const user of users) {
      if (user.role === 'user' || user.role === 'magazyn') {
        try {
          const response = await tokenService.authenticatedFetch(getApiUrl(`/pricelists/${user._id}`));
          if (response.ok) {
            const data = await response.json();
            lists[user._id] = { items: data.priceList || [] };
          }
        } catch (error) {
          // Ignore errors for individual price lists
        }
      }
    }
    setPriceLists(lists);
  };

  const loadInventoryData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      let endpoint;
      if (!selectedSellingPoint || selectedSellingPoint === 'all') {
        endpoint = `/state/all/inventory?date=${today}`;
      } else {
        endpoint = `/state/${selectedSellingPoint}/inventory?date=${today}`;
      }
      
      const response = await tokenService.authenticatedFetch(getApiUrl(endpoint));
      const data = await response.json();

      console.log('=== INVENTORY DATA LOADED ===');
      console.log('Endpoint:', endpoint);
      console.log('Data received:', data);
      console.log('Inventory count:', data?.inventory?.length || 0);
      if (data?.inventory?.length > 0) {
        console.log('First inventory item:', data.inventory[0]);
      }

      if (data && data.inventory && Array.isArray(data.inventory)) {
        // Expand items by quantity AND by selling points
        // If item has "T, M" and quantity 2, create 4 items: T(1), T(2), M(1), M(2)
        const expandedInventory = [];
        data.inventory.forEach(item => {
          const quantity = item.quantity || 1;
          
          // Split selling points if it's a comma-separated string
          let sellingPointsList = [];
          if (item.sellingPoints && typeof item.sellingPoints === 'string') {
            sellingPointsList = item.sellingPoints.split(',').map(sp => sp.trim());
          } else if (item.sellingPoint) {
            sellingPointsList = [item.sellingPoint];
          } else {
            sellingPointsList = [''];
          }
          
          // Create separate item for each selling point and each quantity
          sellingPointsList.forEach((singlePoint, pointIndex) => {
            for (let i = 0; i < quantity; i++) {
              expandedInventory.push({
                ...item,
                sellingPoints: singlePoint, // Override with single point
                sellingPoint: singlePoint,
                quantity: 1, // Each expanded item has quantity 1
                _expandedIndex: `${pointIndex}-${i}` // For unique key
              });
            }
          });
        });
        console.log('Expanded inventory count:', expandedInventory.length);
        setInventoryData(expandedInventory);
      } else {
        setInventoryData([]);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      Alert.alert('Błąd', 'Nie udało się pobrać stanów magazynowych');
    }
  };

  const applyFilters = () => {
    console.log('=== APPLY FILTERS START ===');
    console.log('inventoryData length:', inventoryData.length);
    console.log('selectedLocalization:', selectedLocalization);
    console.log('selectedSellingPoint:', selectedSellingPoint);
    console.log('allUsers length:', allUsers.length);
    
    let filtered = [...inventoryData];
    console.log('Starting filtered length:', filtered.length);

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        // item.product is already product name in /state/all/inventory
        const productName = item.product || '';
        const sizeLabel = item.size || '';
        const barcode = item.barcodes || item.barcode || '';
        
        return (
          productName.toLowerCase().includes(query) ||
          barcode.toLowerCase().includes(query) ||
          sizeLabel.toLowerCase().includes(query)
        );
      });
    }

    // Localization filter (PRIORITY) - based on sellingPoint's location
    if (selectedLocalization) {
      console.log('=== LOCALIZATION FILTER ===');
      console.log('Selected localization ID:', selectedLocalization);
      console.log('Before localization filter:', filtered.length);
      
      // Log first few items to see structure
      if (filtered.length > 0) {
        console.log('First item structure:', filtered[0]);
        console.log('First item sellingPoints:', filtered[0].sellingPoints);
      }
      
      // Get selected location label
      const selectedLocLabel = localizations.find(l => l.value === selectedLocalization)?.label;
      console.log('Selected location label:', selectedLocLabel);
      
      // After expansion, sellingPoints is a single point (e.g., "T" or "M")
      filtered = filtered.filter((item) => {
        const singlePoint = item.sellingPoints || item.sellingPoint || '';
        
        // Find user by symbol or name matching
        const user = allUsers.find(u => {
          const symbol = u.symbol || '';
          const sellingPoint = u.sellingPoint || '';
          return symbol === singlePoint || 
                 sellingPoint === singlePoint ||
                 (u.role === 'magazyn' && singlePoint === 'MAGAZYN');
        });
        
        // Check if this user has the selected location
        return user && user.location === selectedLocLabel;
      });
      
      console.log('After localization filter:', filtered.length);
    }

    // Selling point filter
    if (selectedSellingPoint && selectedSellingPoint !== 'all') {
      console.log('=== SELLING POINT FILTER ===');
      console.log('Selected selling point ID:', selectedSellingPoint);
      console.log('Before selling point filter:', filtered.length);
      
      // Get the user to find their symbol
      const selectedUser = allUsers.find(u => u._id === selectedSellingPoint);
      const selectedSymbol = selectedUser?.symbol || '';
      const selectedName = selectedUser?.sellingPoint || '';
      console.log('Selected user symbol:', selectedSymbol);
      console.log('Selected user name:', selectedName);
      
      filtered = filtered.filter((item) => {
        const singlePoint = item.sellingPoints || item.sellingPoint || '';
        // Match by symbol or name
        return singlePoint === selectedSymbol || 
               singlePoint === selectedName ||
               (selectedUser?.role === 'magazyn' && singlePoint === 'MAGAZYN');
      });
      console.log('After selling point filter:', filtered.length);
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter((item) => {
        // Try to find product by name
        const product = products.find(p => 
          p.label === item.product || p.value === item.fullName
        );
        return product && product.category === selectedCategory;
      });
    }

    // Size filter - item.size might be text or ID
    if (selectedSize) {
      const selectedSizeLabel = sizes.find(s => s.value === selectedSize)?.label;
      filtered = filtered.filter((item) => 
        item.size === selectedSize || item.size === selectedSizeLabel
      );
    }

    // Manufacturer filter
    if (selectedManufacturer) {
      filtered = filtered.filter((item) => {
        const product = products.find(p => 
          p.label === item.product || p.value === item.fullName
        );
        return product && product.manufacturerId === selectedManufacturer;
      });
    }

    // Product filter - item might have product name or fullName as ID
    if (selectedProduct) {
      const selectedProductName = products.find(p => p.value === selectedProduct)?.label;
      filtered = filtered.filter((item) => 
        item.fullName === selectedProduct || item.product === selectedProductName
      );
    }

    console.log('=== FINAL FILTERED LENGTH:', filtered.length, '===');
    setFilteredData(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInventoryData();
    setRefreshing(false);
  };

  const clearFilters = () => {
    setSelectedLocalization(null);
    setSelectedSellingPoint('all');
    setSelectedCategory(null);
    setSelectedSize(null);
    setSelectedManufacturer(null);
    setSelectedProduct(null);
    setSearchQuery('');
  };

  const toggleFilter = (filterName) => {
    if (activeFilter === filterName) {
      setActiveFilter(null);
    } else {
      setActiveFilter(filterName);
      setFilterSearch('');
    }
  };

  const getFilteredOptions = (options, searchTerm) => {
    if (!searchTerm.trim()) return options;
    const query = searchTerm.toLowerCase();
    return options.filter(opt => opt.label.toLowerCase().includes(query));
  };

  // Filter selling points based on selected localization
  const getFilteredSellingPoints = () => {
    if (!selectedLocalization) {
      return sellingPoints; // Show all if no localization selected
    }

    const selectedLocData = localizations.find(l => l.value === selectedLocalization);
    if (!selectedLocData) {
      return sellingPoints;
    }

    // Filter points that belong to selected localization
    // user.location is string label (not ID), compare with selected location label
    const filtered = sellingPoints.filter(point => {
      if (point.value === 'all') return true; // Keep "Wszystkie punkty" option
      return point.location === selectedLocData.label;
    });

    return filtered;
  };

  // Helper functions to convert IDs to labels OR return text if already text
  const getProductName = (productIdOrName) => {
    if (!productIdOrName) return 'Nieznany produkt';
    // If it's already a text name (from /state/all/inventory), return it
    if (typeof productIdOrName === 'string' && !productIdOrName.match(/^[0-9a-f]{24}$/i)) {
      return productIdOrName;
    }
    // Otherwise treat as ID
    const product = products.find(p => p.value === productIdOrName);
    return product?.label || 'Nieznany produkt';
  };

  const getSizeLabel = (sizeIdOrName) => {
    if (!sizeIdOrName) return '-';
    // If it's already a text name, return it
    if (typeof sizeIdOrName === 'string' && !sizeIdOrName.match(/^[0-9a-f]{24}$/i)) {
      return sizeIdOrName;
    }
    // Otherwise treat as ID
    const size = sizes.find(s => s.value === sizeIdOrName);
    return size?.label || '-';
  };

  const getSellingPointLabel = (userIdOrSymbol) => {
    if (!userIdOrSymbol) return '-';
    // If it's a string like "T, M, MAGAZYN", return it
    if (typeof userIdOrSymbol === 'string' && !userIdOrSymbol.match(/^[0-9a-f]{24}$/i)) {
      return userIdOrSymbol;
    }
    // Otherwise treat as user ID
    const user = allUsers.find(u => u._id === userIdOrSymbol);
    return user?.sellingPoint || user?.symbol || '-';
  };

  const getLocationLabel = (pointSymbolOrId) => {
    if (!pointSymbolOrId) return null;
    
    // Try to find user by ID first (if it's an ID format)
    if (typeof pointSymbolOrId === 'string' && pointSymbolOrId.match(/^[0-9a-f]{24}$/i)) {
      const user = allUsers.find(u => u._id === pointSymbolOrId);
      if (user && user.location) {
        // user.location might be ID or string
        if (typeof user.location === 'string' && !user.location.match(/^[0-9a-f]{24}$/i)) {
          return user.location;
        }
        const localization = localizations.find(l => l.value === user.location);
        return localization?.label || null;
      }
    }
    
    // Otherwise treat as symbol (e.g., "T", "M", "MAGAZYN") and find user by symbol
    const user = allUsers.find(u => {
      const symbol = u.symbol || '';
      const sellingPoint = u.sellingPoint || '';
      return symbol === pointSymbolOrId || 
             sellingPoint === pointSymbolOrId ||
             (u.role === 'magazyn' && pointSymbolOrId === 'MAGAZYN');
    });
    
    if (!user || !user.location) return null;
    
    // user.location might be ID or string
    if (typeof user.location === 'string' && !user.location.match(/^[0-9a-f]{24}$/i)) {
      return user.location;
    }
    
    const localization = localizations.find(l => l.value === user.location);
    return localization?.label || null;
  };

  // Price list logic (same as users.jsx)
  const getPriceFromPriceList = (item, itemSize, userId) => {
    const priceList = priceLists[userId];
    if (!priceList || !priceList.items) {
      return null;
    }

    let itemBarcode = item.barcodes || item.barcode;
    // If barcodes is a string with multiple codes, take first one
    if (itemBarcode && typeof itemBarcode === 'string' && itemBarcode.includes(',')) {
      itemBarcode = itemBarcode.split(',')[0].trim();
    }
    const normalizedBarcode = itemBarcode !== undefined && itemBarcode !== null
      ? itemBarcode.toString().trim()
      : null;
    
    // item.fullName is product ID or item.product is product name
    const itemFullName = item.product || getProductName(item.fullName);
    const normalizedFullName = itemFullName ? itemFullName.trim() : null;

    const priceListItem = priceList.items.find(priceItem => {
      const priceItemCode = priceItem.code !== undefined && priceItem.code !== null
        ? priceItem.code.toString().trim()
        : null;
      const priceItemFullName = priceItem.fullName ? priceItem.fullName.trim() : null;

      if (normalizedBarcode && priceItemCode && priceItemCode === normalizedBarcode) {
        return true;
      }

      if (priceItemFullName && normalizedFullName && priceItemFullName === normalizedFullName) {
        return true;
      }

      return priceItemFullName && normalizedFullName &&
        priceItemFullName === normalizedFullName &&
        priceItem.category === item.category;
    });

    if (!priceListItem) {
      return null;
    }

    const result = {
      regularPrice: priceListItem.price || 0,
      discountPrice: priceListItem.discountPrice || 0,
      sizeExceptionPrice: null,
      hasDiscount: priceListItem.discountPrice && priceListItem.discountPrice > 0
    };

    if (itemSize && priceListItem.priceExceptions && priceListItem.priceExceptions.length > 0) {
      const sizeException = priceListItem.priceExceptions.find(exception => {
        const exceptionSizeName = exception.size?.Roz_Opis || exception.size;
        return exceptionSizeName === itemSize;
      });

      if (sizeException) {
        result.sizeExceptionPrice = sizeException.value;
      }
    }

    return result;
  };

  const getColorCodeFromName = (itemName) => {
    if (!itemName || !colors.length) return null;
    const foundColor = colors.find(color => {
      const colorName = color.Kol_Opis.toLowerCase();
      const itemNameLower = itemName.toLowerCase();
      return itemNameLower.includes(colorName);
    });
    return foundColor ? foundColor.Kol_Kod : null;
  };

  const generateZplCode = (item, priceOverride = null, userId = null) => {
    try {
      console.log('=== GENERATE ZPL ===');
      console.log('Item:', item);
      console.log('Item keys:', Object.keys(item));
      
      // /state/all/inventory: product, barcodes, sellingPoints, size
      // /state/${userId}/inventory: fullName, barcode, sellingPoint, size
      
      const itemName = item.product || getProductName(item.fullName);
      console.log('Item name:', itemName);
      
      const itemSize = item.size ? getSizeLabel(item.size) : '-';
      console.log('Item size:', itemSize);
      
      let barcode = 'NO-BARCODE';
      const itemBarcode = item.barcodes || item.barcode;
      if (itemBarcode) {
        // If barcodes is a string with multiple codes, take first one
        barcode = itemBarcode.split(',')[0].trim();
      }
      console.log('Barcode:', barcode);
      
      let price = null;
      if (priceOverride !== null && priceOverride !== undefined) {
        price = priceOverride;
      } else if (item.price !== undefined && item.price !== null) {
        price = item.price;
      }
      console.log('Price:', price);
      
      // Get selling point label
      const sellingPointLabel = userId 
        ? getSellingPointLabel(userId)
        : (item.sellingPoints || getSellingPointLabel(item.sellingPoint));
      console.log('Selling point label:', sellingPointLabel);
      
      let symbol = 'N/A';
      const pointMapping = {
        P: '01',
        M: '02',
        K: '03',
        T: '04',
        S: '05',
        Kar: '06',
        Magazyn: '02'
      };
      
      // Get pointNumber from user if available
      const userToCheck = userId || item.sellingPoint || item.sellingPoints;
      if (userToCheck) {
        let user;
        // Check if it's a MongoDB ID
        if (/^[0-9a-f]{24}$/i.test(userToCheck)) {
          user = allUsers.find(u => u._id === userToCheck);
        } else {
          // It's a symbol like "T", "M", find user by symbol or sellingPoint
          user = allUsers.find(u => {
            const symbol = u.symbol || '';
            const sellingPoint = u.sellingPoint || '';
            return symbol === userToCheck || 
                   sellingPoint === userToCheck ||
                   (u.role === 'magazyn' && userToCheck === 'MAGAZYN');
          });
        }
        
        if (user && user.pointNumber) {
          symbol = user.pointNumber;
        } else if (user && user.symbol) {
          // Try symbol from user
          const userSymbol = user.symbol;
          if (pointMapping[userSymbol]) {
            symbol = pointMapping[userSymbol];
          } else {
            // Try from sellingPoint name
            for (const [key, value] of Object.entries(pointMapping)) {
              if (sellingPointLabel.includes(key)) {
                symbol = value;
                break;
              }
            }
          }
        }
      }

      let processedName = (itemName || 'N/A');
      processedName = processedName
        .replace(/\s*(czarny|czarna|czarne|biały|biała|białe|niebieski|niebieska|niebieskie|czerwony|czerwona|czerwone|zielony|zielona|zielone|żółty|żółta|żółte|szary|szara|szare|brązowy|brązowa|brązowe|różowy|różowa|różowe|fioletowy|fioletowa|fioletowe|pomarańczowy|pomarańczowa|pomarańczowe|kakao|beżowy|beżowa|beżowe|beż|kremowy|kremowa|kremowe|granatowy|granatowa|granatowe|bordowy|bordowa|bordowe|khaki|oliwkowy|oliwkowa|oliwkowe|złoty|złota|złote|srebrny|srebrna|srebrne|miętowy|miętowa|miętowe)\s*/gi, '')
        .trim();

      const colorCode = getColorCodeFromName(itemName);
      if (colorCode) {
        processedName += ' ' + colorCode;
      }

      const safeName = processedName.replace(/[^\x00-\x7F]/g, '?');
      
      let displaySize = itemSize || 'N/A';
      if (displaySize === 'No Size' || displaySize === 'NO SIZE') {
        displaySize = '-';
      }
      const safeSize = displaySize.replace(/[^\x00-\x7F]/g, '?');
      
      const safeTransfer = (symbol || 'N/A').replace(/[^\x00-\x7F]/g, '?');
      const safePrice = (price !== null && price !== undefined) 
        ? price.toString().replace(/[^\x00-\x7F]/g, '?') 
        : 'N/A';

      return `^XA
^MMT
^PW450
^LL0400
^LS0
^FT3,50^A0N,40,40^FD${safeName}^FS
^FT320,55^A0N,40,40^FDCena:^FS
^FT320,105^A0N,55,55^FD${safePrice} zl^FS

^FT3,120^A0N,38,38^FDRozmiar: ${safeSize}^FS
^FT3,150^A0N,25,25^FDPunkt: ${safeTransfer}^FS
^BY2,3,85^FT80,238^BCN,,N,N
^FD${barcode}^FS
^FT125,280^A0N,28,28^FB200,1,0,C,0^FD${barcode}^FS
^XZ`;
    } catch (error) {
      console.error('Error generating ZPL:', error);
      return null;
    }
  };

  const sendZplToPrinter = async (zplCode) => {
    const printerIP = '192.168.1.25';
    const printerPort = 9100;
    const printerUrl = `http://${printerIP}:${printerPort}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300);

    try {
      await fetch(printerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: zplCode,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        return true;
      }
      return false;
    }
  };

  const handlePrintLabel = async (item, userId = null, uniqueKey = null) => {
    const itemBarcode = item.barcode || item.barcodes;
    setPrintingId(uniqueKey || itemBarcode);
    
    try {
      const itemSize = getSizeLabel(item.size); // Convert size ID/name to label for price list lookup
      const priceInfo = getPriceFromPriceList(item, itemSize, userId);
      const shouldPrintTwoLabels = priceInfo && priceInfo.hasDiscount && !priceInfo.sizeExceptionPrice;

      if (shouldPrintTwoLabels) {
        const regularZpl = generateZplCode(item, priceInfo.regularPrice, userId);
        const discountZpl = generateZplCode(item, priceInfo.discountPrice, userId);

        const regularResult = await sendZplToPrinter(regularZpl);
        const discountResult = await sendZplToPrinter(discountZpl);

        setPrintingId(null);
        return regularResult && discountResult;
      }

      // Get fallback price from products
      const productName = item.product || getProductName(item.fullName);
      const product = products.find(p => p.label === productName || p.value === item.fullName);
      const fallbackPrice = product?.price || item.price || null;
      
      const finalPrice = priceInfo?.sizeExceptionPrice ?? priceInfo?.regularPrice ?? fallbackPrice;
      const zplCode = generateZplCode(item, finalPrice, userId);

      const result = await sendZplToPrinter(zplCode);
      setPrintingId(null);
      return result;
    } catch (error) {
      setPrintingId(null);
      return false;
    }
  };

  const handlePrintAll = async () => {
    if (filteredData.length === 0) {
      Alert.alert('Brak danych', 'Nie ma produktów do wydrukowania');
      return;
    }

    Alert.alert(
      'Masowy wydruk',
      `Czy na pewno chcesz wydrukować ${filteredData.length} etykiet?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Drukuj',
          onPress: async () => {
            setPrintingAll(true);
            let successCount = 0;
            let errorCount = 0;

            for (const item of filteredData) {
              try {
                // Find user ID for this specific selling point
                const singlePoint = item.sellingPoints || item.sellingPoint;
                const pointUser = allUsers.find(u => {
                  const symbol = u.symbol || '';
                  const sellingPoint = u.sellingPoint || '';
                  return symbol === singlePoint || 
                         sellingPoint === singlePoint ||
                         (u.role === 'magazyn' && singlePoint === 'MAGAZYN');
                });
                const itemBarcode = item.barcodes || item.barcode;
                const itemUniqueKey = `${itemBarcode}-${item._expandedIndex || 0}`;
                const result = await handlePrintLabel(item, pointUser?._id || null, itemUniqueKey);
                if (result) {
                  successCount++;
                } else {
                  errorCount++;
                }
                // Small delay between prints
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (error) {
                errorCount++;
              }
            }

            setPrintingAll(false);
            Alert.alert(
              'Wydruk zakończony',
              `Wydrukowano: ${successCount}\nBłędy: ${errorCount}`
            );
          }
        }
      ]
    );
  };

  const renderFilterDropdown = (filterName, options, selectedValue, onSelect, placeholder) => {
    const isActive = activeFilter === filterName;
    const isStringArray = typeof options[0] === 'string';
    
    const selectedLabel = isStringArray 
      ? selectedValue 
      : options.find(opt => opt.value === selectedValue)?.label;
    
    const filteredOptions = isStringArray
      ? options.filter(opt => filterSearch === '' || opt.toLowerCase().includes(filterSearch.toLowerCase()))
      : getFilteredOptions(options, filterSearch);

    return (
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedValue && styles.filterButtonActive,
            isActive && styles.filterButtonOpen
          ]}
          onPress={() => toggleFilter(filterName)}
        >
          <Text style={[styles.filterButtonText, selectedValue && styles.filterButtonTextActive]}>
            {selectedLabel || placeholder}
          </Text>
          <Ionicons
            name={isActive ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={selectedValue ? '#fff' : '#64748B'}
          />
        </TouchableOpacity>

        {isActive && (
          <View style={styles.dropdownContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Szukaj..."
                placeholderTextColor="#64748B"
                value={filterSearch}
                onChangeText={setFilterSearch}
              />
              {filterSearch.length > 0 && (
                <TouchableOpacity onPress={() => setFilterSearch('')}>
                  <Ionicons name="close-circle" size={20} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
              {filterName !== 'sellingPoint' && filterName !== 'localization' && (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    onSelect(null);
                    setActiveFilter(null);
                  }}
                >
                  <Text style={styles.dropdownItemText}>Wszystkie</Text>
                </TouchableOpacity>
              )}

              {isStringArray ? (
                filteredOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.dropdownItem, selectedValue === option && styles.dropdownItemSelected]}
                    onPress={() => {
                      onSelect(option);
                      setActiveFilter(null);
                      setFilterSearch('');
                    }}
                  >
                    <Text style={[styles.dropdownItemText, selectedValue === option && styles.dropdownItemTextSelected]}>
                      {option}
                    </Text>
                    {selectedValue === option && <Ionicons name="checkmark" size={20} color="#0d6efd" />}
                  </TouchableOpacity>
                ))
              ) : (
                filteredOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.dropdownItem, selectedValue === option.value && styles.dropdownItemSelected]}
                    onPress={() => {
                      onSelect(option.value);
                      setActiveFilter(null);
                      setFilterSearch('');
                    }}
                  >
                    <Text style={[styles.dropdownItemText, selectedValue === option.value && styles.dropdownItemTextSelected]}>
                      {option.label}
                    </Text>
                    {selectedValue === option.value && <Ionicons name="checkmark" size={20} color="#0d6efd" />}
                  </TouchableOpacity>
                ))
              )}

              {filteredOptions.length === 0 && (
                <View style={styles.dropdownItem}>
                  <Text style={styles.dropdownItemText}>Brak wyników</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wydruk etykiet</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Search */}
        <View style={styles.card}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Szukaj produktu, kodu..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filters Toggle */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="filter" size={20} color="#0d6efd" />
            <Text style={styles.filterToggleText}>
              {showFilters ? 'Ukryj filtry' : 'Pokaż filtry'}
            </Text>
            <Ionicons
              name={showFilters ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#0d6efd"
            />
          </TouchableOpacity>

          {(selectedLocalization || selectedSellingPoint !== 'all' || selectedCategory || selectedSize || selectedManufacturer || selectedProduct) && (
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Wyczyść filtry</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        {showFilters && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Filtry</Text>
            
            {/* LOCALIZATION - PRIORITY FILTER AT TOP */}
            {renderFilterDropdown(
              'localization',
              localizations,
              selectedLocalization,
              setSelectedLocalization,
              'Lokalizacja (wszystkie)'
            )}

            {renderFilterDropdown(
              'sellingPoint',
              getFilteredSellingPoints(),
              selectedSellingPoint,
              setSelectedSellingPoint,
              'Punkt sprzedaży'
            )}

            {renderFilterDropdown(
              'category',
              categories,
              selectedCategory,
              setSelectedCategory,
              'Kategoria'
            )}

            {renderFilterDropdown(
              'size',
              sizes,
              selectedSize,
              setSelectedSize,
              'Rozmiar'
            )}

            {renderFilterDropdown(
              'manufacturer',
              manufacturers,
              selectedManufacturer,
              setSelectedManufacturer,
              'Grupa producenta'
            )}

            {renderFilterDropdown(
              'product',
              products,
              selectedProduct,
              setSelectedProduct,
              'Konkretny produkt'
            )}
          </View>
        )}

        {/* Print All Button */}
        {filteredData.length > 0 && (
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.printAllButton, printingAll && styles.printAllButtonDisabled]}
              onPress={handlePrintAll}
              disabled={printingAll}
            >
              {printingAll ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.printAllButtonText}>Drukowanie...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="print" size={20} color="#fff" />
                  <Text style={styles.printAllButtonText}>
                    Drukuj wszystkie ({filteredData.length})
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Products List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Produkty ({filteredData.length})
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0d6efd" />
              <Text style={styles.loadingText}>Ładowanie danych...</Text>
            </View>
          ) : filteredData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>Brak danych dla wybranych filtrów</Text>
            </View>
          ) : (
            filteredData.map((item, index) => {
              // After expansion: each item has single point in sellingPoints or sellingPoint
              const productName = item.product || getProductName(item.fullName);
              const sizeLabel = getSizeLabel(item.size);
              const singlePoint = item.sellingPoints || item.sellingPoint;
              const sellingPointLabel = singlePoint || '-';
              const locationLabel = getLocationLabel(singlePoint);
              const barcode = item.barcodes || item.barcode;
              const uniqueKey = `${barcode}-${item._expandedIndex || 0}-${index}`;
              
              return (
              <View key={uniqueKey} style={styles.inventoryItem}>
                <View style={styles.inventoryItemHeader}>
                  <Text style={styles.productName}>{productName}</Text>
                  <View style={styles.headerActions}>
                    <TouchableOpacity
                      style={styles.printButton}
                      onPress={() => {
                        // Find user ID for this specific selling point
                        const pointUser = allUsers.find(u => {
                          const symbol = u.symbol || '';
                          const sellingPoint = u.sellingPoint || '';
                          return symbol === singlePoint || 
                                 sellingPoint === singlePoint ||
                                 (u.role === 'magazyn' && singlePoint === 'MAGAZYN');
                        });
                        handlePrintLabel(item, pointUser?._id || null, uniqueKey);
                      }}
                      disabled={printingId === uniqueKey || printingAll}
                    >
                      {printingId === uniqueKey ? (
                        <ActivityIndicator size="small" color="#0d6efd" />
                      ) : (
                        <Ionicons name="print" size={20} color="#0d6efd" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.inventoryItemDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="barcode-outline" size={16} color="#64748B" />
                    <Text style={styles.detailText}>{barcode || '-'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="resize-outline" size={16} color="#64748B" />
                    <Text style={styles.detailText}>{sizeLabel}</Text>
                  </View>
                  
                  {locationLabel && (
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={16} color="#64748B" />
                      <Text style={styles.detailText}>{locationLabel}</Text>
                    </View>
                  )}
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="storefront-outline" size={16} color="#64748B" />
                    <Text style={styles.detailText}>{sellingPointLabel}</Text>
                  </View>
                </View>
              </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  filterToggleText: {
    color: '#0d6efd',
    fontSize: 16,
    fontWeight: '600',
  },
  clearFiltersButton: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#dc262620',
    borderRadius: 8,
    alignItems: 'center',
  },
  clearFiltersText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    marginBottom: 12,
    position: 'relative',
    zIndex: 1,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  filterButtonActive: {
    backgroundColor: '#0d6efd',
    borderColor: '#0d6efd',
  },
  filterButtonOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  filterButtonText: {
    color: '#64748B',
    fontSize: 16,
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  dropdownContainer: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  dropdownItemSelected: {
    backgroundColor: '#0d6efd10',
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 16,
  },
  dropdownItemTextSelected: {
    color: '#0d6efd',
    fontWeight: '600',
  },
  printAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  printAllButtonDisabled: {
    backgroundColor: '#64748B',
  },
  printAllButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inventoryItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  inventoryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  printButton: {
    backgroundColor: '#0d6efd20',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0d6efd',
  },
  inventoryItemDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    color: '#64748B',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#64748B',
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#64748B',
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default PrintLabels;
