import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect
import React, { useContext, useEffect, useState } from 'react';
import { Alert, FlatList, Keyboard, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Import SafeAreaView for safe area handling
import { getApiUrl } from "../../config/api"; // Import API configuration
import { GlobalStateContext } from "../../context/GlobalState"; // Import global state context
import tokenService from '../../services/tokenService';

const Home = () => {
  const { user, logout } = React.useContext(GlobalStateContext); // Access global state and logout function
  const { stateData, users, fetchUsers, goods, fetchGoods } = useContext(GlobalStateContext); // Access state data, users, goods, fetchGoods and fetchUsers from global context
  const [salesData, setSalesData] = useState([]); // State to store API data
  const [filteredData, setFilteredData] = useState([]); // State to store filtered data
  const [totals, setTotals] = useState({ cash: {}, card: {} }); // State to store aggregated totals
  const [modalVisible, setModalVisible] = useState(false); // State for modal visibility
  const [selectedItem, setSelectedItem] = useState(null); // State for selected item
  const [refreshing, setRefreshing] = useState(false); // State for refresh control
  const [editModalVisible, setEditModalVisible] = useState(false); // State for edit modal visibility
  const [editData, setEditData] = useState(null); // State to store data for editing
  const [otherAccountsData, setOtherAccountsData] = useState([]); // State for sales on other accounts
  const [transferredItems, setTransferredItems] = useState([]); // State for transferred items
  const [receivedItems, setReceivedItems] = useState([]); // State for items transferred to this account
  const [editFromModalVisible, setEditFromModalVisible] = useState(false); // State for new modal visibility
  const [newFromValue, setNewFromValue] = useState(""); // State for the new 'from' value
  const [symbolSelectionVisible, setSymbolSelectionVisible] = useState(false); // State for symbol selection visibility
  const [selectedSymbol, setSelectedSymbol] = useState(""); // State for selected symbol
  const [cashPriceCurrencyPairs, setCashPriceCurrencyPairs] = useState([{ price: "", currency: "PLN" }]); // State for cash payment
  const [cardPriceCurrencyPairs, setCardPriceCurrencyPairs] = useState([{ price: "", currency: "PLN" }]); // State for card payment
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false); // State for currency modal
  const [currentCurrencyPairIndex, setCurrentCurrencyPairIndex] = useState(null); // Track the index of the pair being edited
  const [currentCurrencyType, setCurrentCurrencyType] = useState(""); // "cash" or "card"
  const [advancesData, setAdvancesData] = useState([]); // State for advances/zaliczki
  const [deductionsData, setDeductionsData] = useState([]); // State for deductions/odpisane kwoty
  const [deductionModalVisible, setDeductionModalVisible] = useState(false); // State for deduction modal
  const [deductionAmount, setDeductionAmount] = useState(""); // State for deduction amount
  const [deductionCurrency, setDeductionCurrency] = useState("PLN"); // State for deduction currency
  const [deductionReason, setDeductionReason] = useState(""); // State for deduction reason
  const [cancelDeductionModalVisible, setCancelDeductionModalVisible] = useState(false); // State for cancel deduction modal
  const [selectedDeductionItem, setSelectedDeductionItem] = useState(null); // Selected deduction item to cancel
  
  // States for "Dopisz kwotę" (Add Amount) - identical functionality
  const [addAmountModalVisible, setAddAmountModalVisible] = useState(false); // State for add amount modal
  const [addAmountAmount, setAddAmountAmount] = useState(""); // State for add amount amount
  const [addAmountCurrency, setAddAmountCurrency] = useState("PLN"); // State for add amount currency
  const [addAmountReason, setAddAmountReason] = useState(""); // State for add amount reason
  
  // New states for reason selection
  const [reasonType, setReasonType] = useState(""); // "product" or "other"
  const [selectedProduct, setSelectedProduct] = useState(""); // Selected product ID
  const [products, setProducts] = useState([]); // Available products from state
  const [productSearchQuery, setProductSearchQuery] = useState(""); // Search query for products
  const [filteredProducts, setFilteredProducts] = useState([]); // Filtered products based on search
  const [showProductDropdown, setShowProductDropdown] = useState(false); // Control dropdown visibility
  const [productFinalPrice, setProductFinalPrice] = useState(""); // Final agreed price for product
  
  const availableCurrencies = ["PLN", "HUF", "GBP", "ILS", "USD", "EUR", "CAN"]; // Available currencies

  // Funkcja identyczna z QRScanner - filtruje użytkowników z tej samej lokalizacji
  const getMatchingSymbols = () => {
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

  const fetchSalesData = async () => {
    try {
      const response = await tokenService.authenticatedFetch(getApiUrl('/sales/get-all-sales'));
      const data = await response.json();
      
      // Ensure data is an array
      const salesArray = Array.isArray(data) ? data : (data?.sales || data?.data || []);
      setSalesData(salesArray); // Update state with API data

      // Filter data based on user's sellingPoint and current date
      // FOR TESTING: Uncomment line below to simulate tomorrow
      // const today = '2025-08-11'; // TEST: Simulate tomorrow (dzień później)
      const today = new Date().toISOString().split('T')[0]; // NORMAL: Real today
      const filtered = salesArray.filter(
        item => item.sellingPoint === user?.sellingPoint && item.date?.startsWith(today)
      );
      setFilteredData(filtered); // Update state with filtered data

      const otherAccounts = salesArray.filter(
        item => item.sellingPoint !== user?.sellingPoint && item.from === user?.symbol && item.date?.startsWith(today)
      );
      setOtherAccountsData(otherAccounts); // Update state with other accounts data

      // Calculate totals grouped by currency
      const currencyTotals = { cash: {}, card: {} };
      filtered.forEach((item) => {
        item.cash?.forEach(({ price, currency }) => {
          currencyTotals.cash[currency] = (currencyTotals.cash[currency] || 0) + price;
        });
        item.card?.forEach(({ price, currency }) => {
          currencyTotals.card[currency] = (currencyTotals.card[currency] || 0) + price;
        });
      });
      setTotals(currencyTotals); // Update totals state
    } catch (error) {
      console.error('Error fetching sales data:', error);
    }
  };

  const fetchItemData = async (id) => {
    try {
      const response = await tokenService.authenticatedFetch(getApiUrl(`/sales/${id}`));
      if (!response.ok) {
        throw new Error("Failed to fetch item data.");
      }
      const data = await response.json();
      setEditData(data); // Set the fetched data for editing

      // Map cash and card fields to ensure proper structure and handle null/undefined prices
      setCashPriceCurrencyPairs(
        data.cash?.map(({ price, currency }) => ({ price: price ? price.toString() : "", currency })) || [{ price: "", currency: "PLN" }]
      );
      setCardPriceCurrencyPairs(
        data.card?.map(({ price, currency }) => ({ price: price ? price.toString() : "", currency })) || [{ price: "", currency: "PLN" }]
      );

      setEditModalVisible(true); // Show the edit modal
    } catch (error) {
      console.error("Error fetching item data:", error.message);
    }
  };

  const updateItem = async () => {
    try {
      if (editData?._id) {
        const updatedData = {
          ...editData,
          cash: cashPriceCurrencyPairs.map(({ price, currency }) => ({ price: parseFloat(price) || 0, currency })),
          card: cardPriceCurrencyPairs.map(({ price, currency }) => ({ price: parseFloat(price) || 0, currency })),
        };

        const response = await tokenService.authenticatedFetch(
          getApiUrl(`/sales/update-sales/${editData._id}`),
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedData), // Send updated data
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update the item.");
        }

        const updatedItem = await response.json(); // Fetch the updated item from the server

        setFilteredData((prev) =>
          prev.map((item) => (item._id === updatedItem._id ? updatedItem : item))
        ); // Update the item in the list
        setEditModalVisible(false); // Close the edit modal
      } else {
        console.error("No valid ID found for the item to update.");
      }
    } catch (error) {
      console.error("Error updating item:", error.message);
    }
  };

  // Recalculate totals dynamically whenever filteredData changes
  useEffect(() => {
    const newTotals = { cash: {}, card: {} };
    filteredData.forEach((item) => {
      item.cash?.forEach(({ price, currency }) => {
        newTotals.cash[currency] = (newTotals.cash[currency] || 0) + price;
      });
      item.card?.forEach(({ price, currency }) => {
        newTotals.card[currency] = (newTotals.card[currency] || 0) + price;
      });
    });
    setTotals(newTotals); // Update totals state
  }, [filteredData]);

  // Fetch and set products from goods when component mounts
  useEffect(() => {
    const loadProducts = async () => {
      try {
        // Only fetch if goods is empty or not loaded yet
        if (!goods || goods.length === 0) {
          console.log('Fetching goods...');
          await fetchGoods(); // This will update goods in context
        } else {
          console.log('Goods already loaded:', goods.length);
        }
      } catch (error) {
        console.error('Error fetching goods:', error);
      }
    };
    
    loadProducts();
  }, []); // Empty dependency array - run only once on mount

  // Set products from goods when goods are loaded
  useEffect(() => {
    if (goods && Array.isArray(goods) && goods.length > 0) {
      console.log('Setting products from goods:', goods.length);
      setProducts(goods);
      setFilteredProducts(goods); // Initialize filtered products
    }
  }, [goods]);

  // Filter products based on search query
  useEffect(() => {
    if (!productSearchQuery) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => 
        (product.fullName && product.fullName.toLowerCase().includes(productSearchQuery.toLowerCase())) ||
        (product.code && product.code.toLowerCase().includes(productSearchQuery.toLowerCase())) ||
        (product.name && product.name.toLowerCase().includes(productSearchQuery.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  }, [productSearchQuery, products]);

  const fetchTransferredItems = async () => {
    try {
      const response = await tokenService.authenticatedFetch(getApiUrl("/transfer"));
      const data = await response.json();
      
      // Ensure data is an array
      const transferArray = Array.isArray(data) ? data : (data?.transfers || data?.data || []);
      const filteredData = transferArray.filter((item) => item.transfer_from === user.symbol);
      
      setTransferredItems(filteredData); // Filter items by transfer_from
    } catch (error) {
      console.error("Error fetching transferred items:", error);
      setTransferredItems([]); // Fallback to empty array
    }
  };

  const fetchReceivedItems = async () => {
    try {
      const response = await tokenService.authenticatedFetch(getApiUrl("/transfer"));
      const data = await response.json();
      
      // Ensure data is an array
      const transferArray = Array.isArray(data) ? data : (data?.transfers || data?.data || []);
      setReceivedItems(transferArray.filter((item) => item.transfer_to === user.symbol)); // Filter items by transfer_to
    } catch (error) {
      console.error("Error fetching received items:", error);
      setReceivedItems([]); // Fallback to empty array
    }
  };

  const fetchAdvances = async () => {
    try {
      const response = await tokenService.authenticatedFetch(getApiUrl("/transfer"));
      const data = await response.json();
      
      // Ensure data is an array
      const transferArray = Array.isArray(data) ? data : (data?.transfers || data?.data || []);
      
      // Filtruj tylko te transfery które mają zaliczki i są od obecnego użytkownika
      const advancesFiltered = transferArray.filter((item) => 
        item.transfer_from === user.symbol && 
        item.advancePayment && 
        item.advancePayment > 0
      );
      
      setAdvancesData(advancesFiltered);
    } catch (error) {
      console.error("Error fetching advances:", error);
      setAdvancesData([]); // Fallback to empty array
    }
  };

  const fetchFinancialOperations = async () => {
    try {
      const response = await tokenService.authenticatedFetch(getApiUrl("/financial-operations"));
      const data = await response.json();
      
      // Ensure data is an array
      const operationsArray = Array.isArray(data) ? data : (data?.operations || data?.data || []);
      
      // Filtruj operacje finansowe dla obecnego użytkownika
      const operationsFiltered = operationsArray.filter((item) => 
        item.userSymbol === user.symbol
      );
      
      setDeductionsData(operationsFiltered); // Keep same state variable for now to avoid breaking changes
    } catch (error) {
      console.error("Error fetching financial operations:", error);
      // Fallback to old deductions endpoint if new one doesn't exist yet
      try {
        const response = await tokenService.authenticatedFetch(getApiUrl("/deductions"));
        const data = await response.json();
        const deductionsArray = Array.isArray(data) ? data : (data?.deductions || data?.data || []);
        const deductionsFiltered = deductionsArray.filter((item) => 
          item.userSymbol === user.symbol
        );
        setDeductionsData(deductionsFiltered);
      } catch (fallbackError) {
        console.error("Error fetching deductions fallback:", fallbackError);
        setDeductionsData([]);
      }
    }
  };

  // Function to calculate available funds by currency
  const calculateAvailableFunds = () => {
    // FOR TESTING: Uncomment line below to simulate tomorrow
    // const today = '2025-08-11'; // TEST: Simulate tomorrow (dzień później)
    const today = new Date().toISOString().split('T')[0]; // NORMAL: Real today
    
    // Calculate total sales by currency
    const salesTotals = {};
    filteredData.forEach(item => {
      [...(item.cash || []), ...(item.card || [])]
        .filter(({ price }) => price !== undefined && price !== null && price !== "" && price !== 0)
        .forEach(({ price, currency }) => {
          salesTotals[currency] = (salesTotals[currency] || 0) + parseFloat(price);
        });
    });
    
    // Calculate total advances by currency
    const advancesTotals = {};
    transferredItems
      .filter(item => item.date && item.date.startsWith(today) && item.advancePayment > 0)
      .forEach(item => {
        const currency = item.advancePaymentCurrency;
        advancesTotals[currency] = (advancesTotals[currency] || 0) + item.advancePayment;
      });
    
    // Calculate total financial operations by currency (positive amounts add, negative amounts subtract)
    const operationsTotals = {};
    deductionsData
      .filter(item => item.date && item.date.startsWith(today))
      .forEach(item => {
        const currency = item.currency;
        // Use actual amount (positive or negative) directly
        operationsTotals[currency] = (operationsTotals[currency] || 0) + item.amount;
      });
    
    // Calculate available funds by currency
    const allCurrencies = new Set([
      ...Object.keys(salesTotals),
      ...Object.keys(advancesTotals),
      ...Object.keys(operationsTotals)
    ]);
    
    const availableFunds = {};
    allCurrencies.forEach(currency => {
      const sales = salesTotals[currency] || 0;
      const advances = advancesTotals[currency] || 0;
      const operations = operationsTotals[currency] || 0;
      availableFunds[currency] = sales + advances + operations; // Add operations (can be positive or negative)
    });
    
    return availableFunds;
  };

  const submitDeduction = async () => {
    if (!deductionAmount || parseFloat(deductionAmount) <= 0) {
      Alert.alert("Błąd", "Proszę wprowadzić prawidłową kwotę.");
      return;
    }
    
    if (!deductionReason.trim()) {
      Alert.alert("Błąd", "Proszę wprowadzić powód odpisania.");
      return;
    }
    
    // Check if there are sufficient funds
    const availableFunds = calculateAvailableFunds();
    const requestedAmount = parseFloat(deductionAmount);
    const currentAvailable = availableFunds[deductionCurrency] || 0;
    
    if (requestedAmount > currentAvailable) {
      Alert.alert(
        "Niewystarczające środki", 
        `Nie można odpisać ${requestedAmount} ${deductionCurrency}.\n\nDostępne środki w ${deductionCurrency}: ${currentAvailable.toFixed(2)}\n\nSprawdź "Zamknięcie dnia" na dole ekranu, aby zobaczyć wszystkie dostępne środki.`,
        [{ text: "OK", style: "default" }]
      );
      return;
    }
    
    try {
      const operationData = {
        userSymbol: user.symbol,
        amount: -parseFloat(deductionAmount), // Negative for deduction
        currency: deductionCurrency,
        type: "deduction",
        reason: deductionReason.trim(),
        date: new Date().toISOString(),
      };
      
      const response = await tokenService.authenticatedFetch(getApiUrl("/financial-operations"), {
        method: "POST",
        body: JSON.stringify(operationData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to submit deduction");
      }
      
      // Reset form and refresh data
      setDeductionAmount("");
      setDeductionCurrency("PLN");
      setDeductionReason("");
      setDeductionModalVisible(false);
      await fetchFinancialOperations();
      
      Alert.alert("Sukces", "Kwota została odpisana.");
    } catch (error) {
      console.error("Error submitting deduction:", error);
      Alert.alert("Błąd", "Nie udało się odpisać kwoty. Spróbuj ponownie.");
    }
  };

  const submitAddAmount = async () => {
    if (!addAmountAmount || parseFloat(addAmountAmount) <= 0) {
      Alert.alert("Błąd", "Proszę wprowadzić prawidłową kwotę.");
      return;
    }
    
    // Validate reason selection
    if (!reasonType) {
      Alert.alert("Błąd", "Proszę wybrać powód dopisania.");
      return;
    }
    
    if (reasonType === 'product' && !selectedProduct) {
      Alert.alert("Błąd", "Proszę wybrać produkt.");
      return;
    }
    
    if (reasonType === 'other' && !addAmountReason.trim()) {
      Alert.alert("Błąd", "Proszę wprowadzić powód dopisania.");
      return;
    }
    
    try {
      // Prepare reason based on selection
      let finalReason = '';
      if (reasonType === 'product') {
        const selectedProductObj = products.find(p => p._id === selectedProduct);
        const productName = selectedProductObj?.fullName || selectedProductObj?.code || 'Nieznany produkt';
        
        if (productFinalPrice) {
          const finalPrice = parseFloat(productFinalPrice);
          const advance = parseFloat(addAmountAmount);
          const remaining = finalPrice - advance;
          finalReason = `Zaliczka na produkt: ${productName}. Cena finalna: ${finalPrice.toFixed(2)} ${addAmountCurrency}, Dopłata: ${remaining.toFixed(2)} ${addAmountCurrency}`;
        } else {
          finalReason = `Zaliczka na produkt: ${productName}`;
        }
      } else {
        finalReason = addAmountReason.trim();
      }
      
      const operationData = {
        userSymbol: user.symbol,
        amount: parseFloat(addAmountAmount), // Positive amount for addition
        currency: addAmountCurrency,
        type: "addition",
        reason: finalReason,
        date: new Date().toISOString(),
      };

      // Add product-related data if it's a product transaction
      if (reasonType === 'product' && selectedProduct) {
        const selectedProductObj = products.find(p => p._id === selectedProduct);
        operationData.productId = selectedProduct;
        operationData.productName = selectedProductObj?.fullName || selectedProductObj?.code || 'Nieznany produkt';
        
        if (productFinalPrice) {
          operationData.finalPrice = parseFloat(productFinalPrice);
          operationData.remainingAmount = parseFloat(productFinalPrice) - parseFloat(addAmountAmount);
        }
      }
      
      const response = await tokenService.authenticatedFetch(getApiUrl("/financial-operations"), {
        method: "POST",
        body: JSON.stringify(operationData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to submit addition");
      }
      
      // Reset form and refresh data
      setAddAmountAmount("");
      setAddAmountCurrency("PLN");
      setAddAmountReason("");
      setReasonType("");
      setSelectedProduct("");
      setProductSearchQuery("");
      setShowProductDropdown(false);
      setProductFinalPrice("");
      setAddAmountModalVisible(false);
      await fetchFinancialOperations();
      
      Alert.alert("Sukces", "Kwota została dopisana.");
    } catch (error) {
      console.error("Error submitting addition:", error);
      Alert.alert("Błąd", "Nie udało się dopisać kwoty. Spróbuj ponownie.");
    }
  };

  const cancelDeduction = async () => {
    if (!selectedDeductionItem) {
      Alert.alert("Błąd", "Nie wybrano pozycji do anulowania.");
      return;
    }
    
    try {
      const response = await tokenService.authenticatedFetch(getApiUrl(`/financial-operations/${selectedDeductionItem._id}`), {
        method: "DELETE"
      });
      
      if (!response.ok) {
        throw new Error("Failed to cancel deduction");
      }
      
      // Close modal and refresh data
      setCancelDeductionModalVisible(false);
      setSelectedDeductionItem(null);
      await fetchFinancialOperations();
      
      Alert.alert("Sukces", "Operacja została anulowana.");
    } catch (error) {
      console.error("Error canceling deduction:", error);
      Alert.alert("Błąd", "Nie udało się anulować odpisanej kwoty. Spróbuj ponownie.");
    }
  };

  const openCancelDeductionModal = (item) => {
    setSelectedDeductionItem(item);
    setCancelDeductionModalVisible(true);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchSalesData(); // Fetch sales data when the tab is focused
      fetchUsers(); // Fetch users data for symbol selection
      if (user?.symbol) { // Ensure user exists before fetching items
        fetchTransferredItems(); // Fetch transferred items when the tab is focused
        fetchReceivedItems(); // Fetch received items when the tab is focused
        fetchAdvances(); // Fetch advances when the tab is focused
        fetchFinancialOperations(); // Fetch financial operations when the tab is focused
      }
    }, [user?.symbol]) // Refetch when the user's symbol changes
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSalesData(); // Fetch data on pull-to-refresh
    await fetchUsers(); // Fetch users data for symbol selection
    if (user?.symbol) {
      await fetchTransferredItems();
      await fetchReceivedItems();
      await fetchAdvances();
      await fetchFinancialOperations();
    }
    setRefreshing(false);
  };

  const updateFromField = async () => {
    try {
      if (selectedItem?._id) {
        const updatedItem = { ...selectedItem, from: newFromValue }; // Update the 'from' field
        const response = await tokenService.authenticatedFetch(
          getApiUrl(`/sales/update-sales/${selectedItem._id}`),
          {
            method: "PATCH",
            body: JSON.stringify(updatedItem),
          }
        );
        if (!response.ok) {
          throw new Error("Failed to update the 'from' field.");
        }
        setFilteredData((prev) =>
          prev.map((item) => (item._id === selectedItem._id ? updatedItem : item))
        ); // Update the item in the list
        setEditFromModalVisible(false); // Close the modal
      } else {
        console.error("No valid ID found for the selected item.");
      }
    } catch (error) {
      console.error("Error updating 'from' field:", error.message);
    }
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

  const openCurrencyModal = (index, type) => {
    setCurrentCurrencyPairIndex(index);
    setCurrentCurrencyType(type);
    setCurrencyModalVisible(true);
  };

  const selectCurrencyFromModal = (currency) => {
    if (currentCurrencyType === "cash") {
      handleCashPairChange(currentCurrencyPairIndex, "currency", currency);
    } else if (currentCurrencyType === "card") {
      handleCardPairChange(currentCurrencyPairIndex, "currency", currency);
    }
    setCurrencyModalVisible(false);
  };

  return (
    <>
      <SafeAreaView style={{ backgroundColor: "#000", flex: 1 }}>
        <FlatList
          testID="home-flatlist"
          data={filteredData}
          keyExtractor={(item, index) => item?._id?.toString() || index.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item, index }) => (
            <View style={styles.item}>
              <Text
                style={[
                  styles.itemTextLeft,
                  {
                    fontSize: item.fullName.length + item.size.length > 20 ? 10 : 12,
                    fontWeight: "bold",
                  },
                ]}
              >
                {index + 1}. {item.fullName} {item.size} ({item.from}){item.source === 'Cudzich' ? '(Cudzich)' : ''}{" "}
                {[...(item.cash || []), ...(item.card || [])]
                  .filter(({ price }) => price !== undefined && price !== null && price !== "" && price !== 0)
                  .map(({ price, currency }, idx, arr) => (
                    <Text
                      key={`payment-${idx}`}
                      style={{
                        color: idx < (item.cash?.length || 0) ? "white" : "red",
                      }}
                    >
                      {price} {currency}
                      {idx < arr.length - 1 ? "  " : ""}
                    </Text>
                  ))}
              </Text>
              <TouchableOpacity onPress={() => { setSelectedItem(item); setModalVisible(true); }} style={styles.dotsButton}>
                <Text style={styles.dotsText}>⋮</Text>
              </TouchableOpacity>
            </View>
          )}
          ListHeaderComponent={() => {
            return (
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
                </View>
                
                {/* Buttons for deductions - above Sprzedaż section */}
                <View style={{ 
                  flexDirection: "row", 
                  justifyContent: "center", 
                  marginBottom: 10,
                  gap: 10
                }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#dc3545',
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: 'white',
                    }}
                    onPress={() => setDeductionModalVisible(true)}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                      Odpisz kwotę
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#28a745',
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: 'white',
                    }}
                    onPress={() => setAddAmountModalVisible(true)}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                      Dopisz kwotę
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#d1d5db", fontSize: 14, fontWeight: "bold", marginRight: 8 }}>Sprzedaż:</Text>
                </View>
              </View>
            );
          }}
          ListFooterComponent={() => {
            // Only show transfers with a valid date matching today
            // FOR TESTING: Uncomment line below to simulate tomorrow
            // const today = '2025-08-11'; // TEST: Simulate tomorrow (dzień później)
            const today = new Date().toISOString().split('T')[0]; // NORMAL: Real today
            const transferredToday = transferredItems.filter(
              item => item.date && item.date.startsWith(today) && item.transfer_to !== 'SOLD'
            );
            const receivedToday = receivedItems.filter(
              item => item.date && item.date.startsWith(today)
            );
            return (
              <View style={{ marginTop: 24 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: "#d1d5db", fontWeight: "bold" }}>Suma:</Text>
                  <View style={{ flexDirection: "row" }}>
                    <Text style={{ fontSize: 13, color: "#d1d5db", marginRight: 16 }}>Gotówki:</Text>
                    {Object.entries(totals.cash || {}).map(([currency, total]) => (
                      <Text key={`cash-${currency}`} style={{ fontSize: 10, color: "#fff", marginRight: 8 }}>
                        {total} {currency}
                      </Text>
                    ))}
                  </View>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                  <Text style={{ fontSize: 13, color: "#d1d5db", marginRight: 16 }}>Na kartę:</Text>
                  {Object.entries(totals.card || {}).map(([currency, total]) => (
                    <Text key={`card-${currency}`} style={{ fontSize: 10, color: "#fff", marginRight: 8 }}>
                      {total} {currency}
                    </Text>
                  ))}
                </View>
                {/* Section for sales on other accounts */}
                {otherAccountsData.length > 0 && (
                  <View style={{ marginTop: 24 }}>
                    <Text style={{ fontSize: 13, color: "#d1d5db", fontWeight: "bold", marginBottom: 8 }}>Sprzedano na innych kontach:</Text>
                    {otherAccountsData.map((item, index) => (
                      <View key={item._id || index} style={{ marginBottom: 16, paddingHorizontal: 16, paddingVertical: 8, flexDirection: "row", alignItems: "center", borderRadius: 8, backgroundColor: "#0d6efd" }}>
                        <Text style={{ fontSize: 13, color: "#d1d5db", flex: 1, fontWeight: "bold" }}>{index + 1}. {item.fullName} {item.size}</Text>
                        <Text style={{ fontSize: 13, color: "#fff" }}>
                          {item.sellingPoint || "Brak informacji o miejscu sprzedaży"}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {/* Section for transferred items */}
                {transferredToday.length > 0 && (
                  <View style={{ marginTop: 24 }}>
                    <Text style={{ fontSize: 13, color: "#d1d5db", fontWeight: "bold", marginBottom: 8 }}>Odpisać ze stanu:</Text>
                    {transferredToday.map((item, index) => (
                      <View
                        key={item.productId || index}
                        style={styles.transferredItem}
                      >
                        <Text style={styles.transferredItemTextLeft}>
                          {index + 1}. {item.fullName} {item.size}
                        </Text>
                        <Text style={styles.transferredItemTextRight}>
                          Przepisano do: {item.transfer_to}
                          {item.reason && (item.transfer_to?.toLowerCase() === 'dom' || item.transfer_to?.toLowerCase() === 'd') && (
                            <Text style={{ fontSize: 11, color: "#fbbf24" }}>
                              {' '}({item.reason.length > 15 ? item.reason.substring(0, 15) + '...' : item.reason})
                            </Text>
                          )}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {/* Section for received items */}
                {receivedToday.length > 0 && (
                  <View style={{ marginTop: 24 }}>
                    <Text style={{ fontSize: 13, color: "#d1d5db", fontWeight: "bold", marginBottom: 8 }}>Dopisać na to konto:</Text>
                    {receivedToday.map((item, index) => (
                      <View
                        key={item.productId || index}
                        style={styles.receivedItem}
                      >
                        <Text style={styles.receivedItemTextLeft}>
                          {index + 1}. {item.fullName} {item.size}
                        </Text>
                        <Text style={styles.receivedItemTextRight}>
                          Przesłano z: {item.transfer_from}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {/* Section for advances/zaliczki */}
                {(() => {
                  // FOR TESTING: Uncomment line below to simulate tomorrow
                  // const today = '2025-08-11'; // TEST: Simulate tomorrow (dzień później)
                  const today = new Date().toISOString().split('T')[0]; // NORMAL: Real today
                  const advancesToday = advancesData.filter(
                    item => item.date && item.date.startsWith(today)
                  );
                  
                  return advancesToday.length > 0 && (
                    <View style={{ marginTop: 24 }}>
                      <Text style={{ fontSize: 13, color: "#d1d5db", fontWeight: "bold", marginBottom: 8 }}>Zaliczki wzięte dzisiaj:</Text>
                      {advancesToday.map((item, index) => (
                        <View
                          key={item.productId || index}
                          style={styles.advanceItem}
                        >
                          <Text style={styles.advanceItemTextLeft}>
                            {index + 1}. {item.fullName} {item.size}
                          </Text>
                          <Text style={styles.advanceItemTextRight}>
                            Zaliczka: {item.advancePayment} {item.advancePaymentCurrency}
                            {item.reason && (
                              <Text style={{ fontSize: 11, color: "#fbbf24" }}>
                                {' '}({item.reason.length > 15 ? item.reason.substring(0, 15) + '...' : item.reason})
                              </Text>
                            )}
                          </Text>
                        </View>
                      ))}
                      {/* Suma zaliczek pogrupowana według walut */}
                      <View style={{ marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#374151" }}>
                        <Text style={{ fontSize: 12, color: "#9ca3af", fontWeight: "bold", textAlign: "right" }}>
                          Suma zaliczek: {' '}
                          {(() => {
                            const advanceTotals = {};
                            advancesToday.forEach(item => {
                              const currency = item.advancePaymentCurrency;
                              advanceTotals[currency] = (advanceTotals[currency] || 0) + item.advancePayment;
                            });
                            return Object.entries(advanceTotals)
                              .map(([currency, total]) => `${total} ${currency}`)
                              .join(', ');
                          })()}
                        </Text>
                      </View>
                    </View>
                  );
                })()}
                
                {/* Section for deductions/odpisane kwoty */}
                {(() => {
                  // FOR TESTING: Uncomment line below to simulate tomorrow
                  // const today = '2025-08-11'; // TEST: Simulate tomorrow (dzień później)
                  const today = new Date().toISOString().split('T')[0]; // NORMAL: Real today
                  const deductionsToday = deductionsData.filter(
                    item => item.date && item.date.startsWith(today)
                  );
                  
                  return deductionsToday.length > 0 && (
                    <View style={{ marginTop: 24 }}>
                      <Text style={{ fontSize: 13, color: "#d1d5db", fontWeight: "bold", marginBottom: 8 }}>Operacje dzisiaj:</Text>
                      {deductionsToday.map((item, index) => (
                        <View
                          key={item._id || index}
                          style={[
                            styles.deductionItem,
                            (item.type === 'addition' || item.amount > 0) 
                              ? { backgroundColor: '#059669' } // Green background for additions
                              : { backgroundColor: '#dc2626' } // Red background for deductions
                          ]}
                        >
                          <Text style={styles.deductionItemTextLeft}>
                            {index + 1}. {item.reason}
                          </Text>
                          <Text style={styles.deductionItemTextRight}>
                            {(item.type === 'addition' || item.amount > 0)
                              ? `+${Math.abs(item.amount)} ${item.currency}`
                              : `-${Math.abs(item.amount)} ${item.currency}`
                            }
                          </Text>
                          <TouchableOpacity
                            onPress={() => openCancelDeductionModal(item)}
                            style={{
                              paddingLeft: 8,
                              paddingVertical: 4,
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Text style={{ color: "white", fontSize: 16 }}>⋮</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                      {/* Suma odpisanych kwot pogrupowana według walut */}
                      <View style={{ marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#374151" }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, color: "#9ca3af", fontWeight: "bold" }}>
                            Bilans operacji: {' '}
                          </Text>
                          {(() => {
                            const operationTotals = {};
                            deductionsToday.forEach(item => {
                              const currency = item.currency;
                              // Use the amount directly (positive for additions, negative for deductions)
                              operationTotals[currency] = (operationTotals[currency] || 0) + item.amount;
                            });
                            return Object.entries(operationTotals)
                              .map(([currency, total], index) => {
                                const sign = total >= 0 ? '+' : '-';
                                const color = total >= 0 ? '#10b981' : '#ef4444'; // Green for positive, red for negative
                                return (
                                  <Text key={currency} style={{ fontSize: 12, color, fontWeight: "bold", marginLeft: index > 0 ? 8 : 0 }}>
                                    {sign}{Math.abs(total)} {currency}
                                  </Text>
                                );
                              });
                          })()}
                        </View>
                      </View>
                    </View>
                  );
                })()}
                
                {/* Financial Summary Section - Zamknięcie Dnia */}
                {(() => {
                  // FOR TESTING: Uncomment line below to simulate tomorrow
                  // const today = '2025-08-11'; // TEST: Simulate tomorrow (dzień później)
                  const today = new Date().toISOString().split('T')[0]; // NORMAL: Real today
                  
                  // Calculate total sales by currency
                  const salesTotals = {};
                  filteredData.forEach(item => {
                    [...(item.cash || []), ...(item.card || [])]
                      .filter(({ price }) => price !== undefined && price !== null && price !== "" && price !== 0)
                      .forEach(({ price, currency }) => {
                        salesTotals[currency] = (salesTotals[currency] || 0) + parseFloat(price);
                      });
                  });
                  
                  // Calculate total advances by currency
                  const advancesTotals = {};
                  transferredItems
                    .filter(item => item.date && item.date.startsWith(today) && item.advancePayment > 0)
                    .forEach(item => {
                      const currency = item.advancePaymentCurrency;
                      advancesTotals[currency] = (advancesTotals[currency] || 0) + item.advancePayment;
                    });
                  
                  // Calculate total financial operations by currency
                  const operationsTotals = {};
                  deductionsData
                    .filter(item => item.date && item.date.startsWith(today))
                    .forEach(item => {
                      const currency = item.currency;
                      operationsTotals[currency] = (operationsTotals[currency] || 0) + item.amount;
                    });
                  
                  // Calculate final totals by currency
                  const allCurrencies = new Set([
                    ...Object.keys(salesTotals),
                    ...Object.keys(advancesTotals),
                    ...Object.keys(operationsTotals)
                  ]);
                  
                  const finalTotals = {};
                  allCurrencies.forEach(currency => {
                    const sales = salesTotals[currency] || 0;
                    const advances = advancesTotals[currency] || 0;
                    const operations = operationsTotals[currency] || 0;
                    finalTotals[currency] = sales + advances + operations;
                  });
                  
                  return allCurrencies.size > 0 && (
                    <View style={{ 
                      marginTop: 32, 
                      paddingTop: 20, 
                      borderTopWidth: 2, 
                      borderTopColor: "#fbbf24", // Golden border
                      backgroundColor: "#1f2937", // Dark gray background
                      padding: 16,
                      borderRadius: 8,
                      marginHorizontal: 8
                    }}>
                      <Text style={{ 
                        fontSize: 16, 
                        color: "#fbbf24", // Golden text
                        fontWeight: "bold", 
                        marginBottom: 16, 
                        textAlign: "center" 
                      }}>
                        🏦 ZAMKNIĘCIE DNIA
                      </Text>
                      
                      {/* Sales */}
                      <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 14, color: "#10b981", fontWeight: "bold", marginBottom: 4 }}>
                          📈 UTARG (Sprzedaż):
                        </Text>
                        {Object.entries(salesTotals).map(([currency, total]) => (
                          <Text key={`sales-${currency}`} style={{ fontSize: 13, color: "#d1fae5", marginLeft: 16 }}>
                            +{total.toFixed(2)} {currency}
                          </Text>
                        ))}
                      </View>
                      
                      {/* Advances */}
                      {Object.keys(advancesTotals).length > 0 && (
                        <View style={{ marginBottom: 12 }}>
                          <Text style={{ fontSize: 14, color: "#3b82f6", fontWeight: "bold", marginBottom: 4 }}>
                            💰 ZALICZKI (od klientów):
                          </Text>
                          {Object.entries(advancesTotals).map(([currency, total]) => (
                            <Text key={`advances-${currency}`} style={{ fontSize: 13, color: "#dbeafe", marginLeft: 16 }}>
                              +{total.toFixed(2)} {currency}
                            </Text>
                          ))}
                        </View>
                      )}
                      
                      {/* Financial Operations */}
                      {Object.keys(operationsTotals).length > 0 && (
                        <View style={{ marginBottom: 12 }}>
                          <Text style={{ fontSize: 14, color: "#fbbf24", fontWeight: "bold", marginBottom: 4 }}>
                            � OPERACJE FINANSOWE:
                          </Text>
                          {Object.entries(operationsTotals).map(([currency, total]) => (
                            <Text key={`operations-${currency}`} style={{ 
                              fontSize: 13, 
                              color: total >= 0 ? "#10b981" : "#fecaca", 
                              marginLeft: 16 
                            }}>
                              {total >= 0 ? '+' : ''}{total.toFixed(2)} {currency}
                            </Text>
                          ))}
                        </View>
                      )}
                      
                      {/* Final Total */}
                      <View style={{ 
                        marginTop: 16, 
                        paddingTop: 12, 
                        borderTopWidth: 1, 
                        borderTopColor: "#fbbf24" 
                      }}>
                        <Text style={{ 
                          fontSize: 15, 
                          color: "#fbbf24", 
                          fontWeight: "bold", 
                          marginBottom: 8,
                          textAlign: "center" 
                        }}>
                          💳 KWOTA DO ROZLICZENIA:
                        </Text>
                        {Object.entries(finalTotals).map(([currency, total]) => (
                          <Text 
                            key={`final-${currency}`} 
                            style={{ 
                              fontSize: 16, 
                              color: total >= 0 ? "#10b981" : "#ef4444", 
                              fontWeight: "bold",
                              textAlign: "center",
                              marginBottom: 2
                            }}
                          >
                            {total >= 0 ? '+' : ''}{total.toFixed(2)} {currency}
                          </Text>
                        ))}
                        <Text style={{ 
                          fontSize: 11, 
                          color: "#9ca3af", 
                          textAlign: "center",
                          marginTop: 8,
                          fontStyle: "italic" 
                        }}>
                          Kwota jaką powinieneś mieć w kasie na koniec dnia
                        </Text>
                      </View>
                    </View>
                  );
                })()}
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
        {/* Edit Modal - Identyczny z QRScanner */}
        <Modal
          transparent={false}
          visible={editModalVisible}
          animationType="slide"
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: "black", width: "100%", height: "100%", justifyContent: "flex-start", alignItems: "center", zIndex: 5 }}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
                <View style={[{ flex: 1, backgroundColor: "black", width: "100%", height: "100%", justifyContent: "flex-start", alignItems: "center", zIndex: 5 }]}>
                  <Pressable
                    style={{
                      position: "absolute",
                      top: 40,
                      right: 20,
                      width: 40,
                      height: 40,
                      backgroundColor: "red",
                      borderRadius: 20,
                      justifyContent: "center",
                      alignItems: "center",
                      zIndex: 10
                    }}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>X</Text>
                  </Pressable>
                  
                  <Text style={{ fontSize: 16, color: "white", marginBottom: 8, marginTop: 80 }}>Edytuj Produkt:</Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: "white",
                      borderRadius: 5,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      color: "white",
                      backgroundColor: "black",
                      marginBottom: 20,
                      width: "100%"
                    }}
                    value={editData?.fullName || ""}
                    editable={false}
                    placeholder="Nazwa produktu"
                    placeholderTextColor="gray"
                  />
                  
                  <Text style={{ fontSize: 16, color: "white", marginBottom: 8 }}>Rozmiar</Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: "white",
                      borderRadius: 5,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      color: "white",
                      backgroundColor: "black",
                      marginBottom: 20,
                      width: "100%"
                    }}
                    value={editData?.size || ""}
                    editable={false}
                    placeholder="Rozmiar"
                    placeholderTextColor="gray"
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
                      onPress={() => {
                        const matchingSymbols = getMatchingSymbols();
                        
                        if (matchingSymbols.length > 0) {
                          setSymbolSelectionVisible(true);
                        } else {
                          Alert.alert("Brak symboli", "Nie znaleziono punktów sprzedaży w Twojej lokalizacji.");
                        }
                      }}
                    >
                      <Text style={{ color: "white" }}>
                        {editData?.from || "Wybierz punkt sprzedaży"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                {/* Cash Payment Section */}
                <Text style={{ fontSize: 16, marginBottom: 10, textAlign: "center", color: "white" }}>Płatność gotówką</Text>
                <View style={{ width: "100%", borderWidth: 1, borderColor: "white", padding: 20 }}>
                  {cashPriceCurrencyPairs.map((pair, index) => (
                    <View key={`cash-${index}`} style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
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
                        onPress={() => openCurrencyModal(index, "cash")}
                      >
                        <Text style={{ color: "white" }}>{pair.currency}</Text>
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
                  <Pressable style={{ marginTop: 10, padding: 10, backgroundColor: "rgb(13, 110, 253)", borderRadius: 5, alignItems: "center" }} onPress={handleAddCashPair}>
                    <Text style={{ color: "white", fontSize: 16 }}>Dodaj parę</Text>
                  </Pressable>
                </View>

                {/* Card Payment Section */}
                <Text style={{ fontSize: 16, marginBottom: 10, marginTop: 20, textAlign: "center", color: "white" }}>Płatność kartą</Text>
                <View style={{ width: "100%", borderWidth: 1, borderColor: "white", padding: 20 }}>
                  {cardPriceCurrencyPairs.map((pair, index) => (
                    <View key={`card-${index}`} style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
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
                        onPress={() => openCurrencyModal(index, "card")}
                      >
                        <Text style={{ color: "white" }}>{pair.currency}</Text>
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
                          onPress={() => handleRemoveCardPair(index)}
                        >
                          <Text style={{ color: "white" }}>Usuń</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  <Pressable style={{ marginTop: 10, padding: 10, backgroundColor: "rgb(13, 110, 253)", borderRadius: 5, alignItems: "center" }} onPress={handleAddCardPair}>
                    <Text style={{ color: "white", fontSize: 16 }}>Dodaj parę</Text>
                  </Pressable>
                </View>

                {/* Przyciski identyczne z QRScanner */}
                <View style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 20,
                  width: "100%",
                }}>
                  <Pressable
                    style={{
                      flex: 1,
                      marginHorizontal: 10,
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: "center",
                      backgroundColor: "gray",
                    }}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={{ color: "white", fontSize: 16 }}>Anuluj</Text>
                  </Pressable>
                  <Pressable
                    style={{
                      flex: 1,
                      marginHorizontal: 10,
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: "center",
                      backgroundColor: "green",
                    }}
                    onPress={updateItem}
                  >
                    <Text style={{ color: "white", fontSize: 16 }}>Zapisz</Text>
                  </Pressable>
                </View>
                </View>
              </ScrollView>
            </TouchableWithoutFeedback>
          </View>
        </Modal>
        {/* Edit From Modal */}
        <Modal
          transparent={true}
          visible={editFromModalVisible}
          animationType="fade"
          onRequestClose={() => setEditFromModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
            <View
              className="w-3/4 rounded-lg shadow-lg"
              style={{
                backgroundColor: "black",
                borderWidth: 1,
                borderColor: "white",
              }}
            >
              <View
                className="p-4 rounded-t-lg"
                style={{
                  backgroundColor: "black",
                }}
              >
                <Text className="text-lg font-bold text-white text-center">Edytuj Miejsce</Text>
              </View>
              <View className="p-6">
                <TextInput
                  style={{
                    backgroundColor: "white",
                    color: "black",
                    padding: 10,
                    borderRadius: 5,
                    marginBottom: 10,
                  }}
                  value={newFromValue}
                  onChangeText={(text) => setNewFromValue(text)} // Update the new 'from' value
                  placeholder="Wprowadź nowe miejsce"
                />
                <Pressable
                  onPress={updateFromField}
                  style={{
                    backgroundColor: "#0d6efd",
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 5,
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "bold", textAlign: "center" }}>Zapisz</Text>
                </Pressable>
                <Pressable
                  onPress={() => setEditFromModalVisible(false)}
                  style={{
                    backgroundColor: "#6c757d",
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 5,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "bold", textAlign: "center" }}>Anuluj</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
        {/* Symbol Selection Modal - Identyczny z QRScanner */}
        <Modal
          transparent={true}
          visible={symbolSelectionVisible}
          animationType="slide"
          onRequestClose={() => setSymbolSelectionVisible(false)}
        >
          <View style={styles.currencyModalContainer}>
            <View style={styles.currencyModalContent}>
              <Text style={styles.currencyModalTitle}>Wybierz punkt sprzedaży</Text>
              {getMatchingSymbols().length > 0 ? (
                <FlatList
                  data={getMatchingSymbols()}
                  keyExtractor={(item) => item._id || item.symbol}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.currencyModalItem}
                      onPress={() => {
                        setEditData((prev) => ({ ...prev, from: item.symbol })); // Update 'from' field
                        setSymbolSelectionVisible(false); // Close modal
                      }}
                    >
                      <Text style={styles.currencyModalItemText}>
                        {item.symbol}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              ) : (
                <Text style={styles.currencyModalItemText}>
                  {`Brak punktów sprzedaży w lokalizacji "${user?.location || 'nieznana'}"`}
                </Text>
              )}
              <Pressable
                style={styles.currencyModalCloseButton}
                onPress={() => setSymbolSelectionVisible(false)}
              >
                <Text style={styles.currencyModalCloseButtonText}>Zamknij</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        {/* Options Modal */}
        <Modal
          transparent
          visible={modalVisible}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Opcje</Text>
              <TouchableOpacity
                onPress={() => {
                  if (selectedItem?._id) {
                    fetchItemData(selectedItem._id); // Fetch data and open edit modal
                    setModalVisible(false); // Close options modal
                  }
                }}
                style={styles.optionButton}
              >
                <Text style={styles.optionText}>Edytuj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (selectedItem?._id) {
                    Alert.alert(
                      "Potwierdzenie usunięcia",
                      "Czy na pewno chcesz usunąć kurtkę? Kurtka wróci automatycznie do stanu, z którego została sprzedana.",
                      [
                        {
                          text: "Anuluj",
                          style: "cancel",
                        },
                        {
                          text: "Usuń",
                          style: "destructive",
                          onPress: async () => {
                            try {
                              const response = await tokenService.authenticatedFetch(
                                getApiUrl(`/sales/delete-sale/${selectedItem._id}`),
                                { method: "DELETE" }
                              );
                              if (!response.ok) {
                                throw new Error("Failed to delete the sale.");
                              }
                              setFilteredData((prev) =>
                                prev.filter((item) => item._id !== selectedItem._id)
                              ); // Remove the item from the list
                              setModalVisible(false); // Close the modal
                            } catch (error) {
                              console.error("Error deleting item:", error.message);
                            }
                          },
                        },
                      ]
                    );
                  } else {
                    console.error("No valid ID found for the selected item.");
                  }
                }}
                style={[styles.optionButton, styles.deleteButton]}
              >
                <Text style={styles.optionText}>Usuń</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.optionButton, styles.closeButton]}
              >
                <Text style={styles.closeText}>Zamknij</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* Currency Modal */}
        {currencyModalVisible && (
          <Modal
            transparent
            animationType="slide"
            visible={currencyModalVisible}
            onRequestClose={() => setCurrencyModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Wybierz walutę</Text>
                {availableCurrencies.map((currency, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.optionButton}
                    onPress={() => selectCurrencyFromModal(currency)}
                  >
                    <Text style={styles.optionText}>{currency}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.optionButton, styles.closeButton]}
                  onPress={() => setCurrencyModalVisible(false)}
                >
                  <Text style={styles.closeText}>Zamknij</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
        
        {/* Deduction Modal */}
        <Modal
          transparent={true}
          visible={deductionModalVisible}
          animationType="fade"
          onRequestClose={() => setDeductionModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: '85%' }]}>
              <Text style={styles.modalTitle}>Odpisz kwotę</Text>
              
              {/* Available funds display */}
              {(() => {
                const availableFunds = calculateAvailableFunds();
                const currentAvailable = availableFunds[deductionCurrency] || 0;
                return (
                  <View style={{ 
                    width: '100%', 
                    marginBottom: 15, 
                    backgroundColor: '#374151', 
                    padding: 10, 
                    borderRadius: 6 
                  }}>
                    <Text style={{ 
                      color: '#10b981', 
                      fontSize: 13, 
                      textAlign: 'center', 
                      fontWeight: 'bold' 
                    }}>
                      💰 Dostępne środki w {deductionCurrency}: {currentAvailable.toFixed(2)}
                    </Text>
                    {Object.keys(availableFunds).length > 1 && (
                      <Text style={{ 
                        color: '#9ca3af', 
                        fontSize: 11, 
                        textAlign: 'center', 
                        marginTop: 4 
                      }}>
                        Inne waluty: {Object.entries(availableFunds)
                          .filter(([currency]) => currency !== deductionCurrency)
                          .map(([currency, amount]) => `${amount.toFixed(2)} ${currency}`)
                          .join(', ')}
                      </Text>
                    )}
                  </View>
                );
              })()}
              
              {/* Amount input */}
              <View style={{ width: '100%', marginBottom: 15 }}>
                <Text style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>Kwota:</Text>
                <TextInput
                  style={{
                    backgroundColor: 'black',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                    color: 'white',
                    borderWidth: 1,
                    borderColor: 'white',
                    textAlign: 'center',
                  }}
                  placeholder="0.00"
                  placeholderTextColor="#ccc"
                  value={deductionAmount}
                  onChangeText={setDeductionAmount}
                  keyboardType="numeric"
                />
              </View>
              
              {/* Currency selection */}
              <View style={{ width: '100%', marginBottom: 15 }}>
                <Text style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>Waluta:</Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#0d6efd',
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'white',
                  }}
                  onPress={() => {/* Currency selection logic can be added here */}}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                    {deductionCurrency}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Reason input */}
              <View style={{ width: '100%', marginBottom: 20 }}>
                <Text style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>Powód odpisania:</Text>
                <TextInput
                  style={{
                    backgroundColor: 'black',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    color: 'white',
                    borderWidth: 1,
                    borderColor: 'white',
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                  placeholder="Wpisz powód odpisania kwoty..."
                  placeholderTextColor="#ccc"
                  value={deductionReason}
                  onChangeText={setDeductionReason}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>
              
              {/* Action buttons */}
              <TouchableOpacity
                style={[styles.optionButton, { backgroundColor: '#28a745', marginBottom: 10 }]}
                onPress={submitDeduction}
              >
                <Text style={styles.optionText}>Odpisz kwotę</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.optionButton, styles.closeButton]}
                onPress={() => {
                  setDeductionModalVisible(false);
                  setDeductionAmount("");
                  setDeductionCurrency("PLN");
                  setDeductionReason("");
                }}
              >
                <Text style={styles.closeText}>Anuluj</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        
        {/* Cancel Deduction Modal */}
        <Modal
          transparent={true}
          visible={cancelDeductionModalVisible}
          animationType="fade"
          onRequestClose={() => setCancelDeductionModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: '80%' }]}>
              <Text style={styles.modalTitle}>Anuluj odpisaną kwotę</Text>
              
              {selectedDeductionItem && (
                <View style={{ width: '100%', marginBottom: 20 }}>
                  <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 8 }}>
                    Czy na pewno chcesz anulować tę odpisaną kwotę?
                  </Text>
                  <View style={{ 
                    backgroundColor: '#374151', 
                    padding: 12, 
                    borderRadius: 8, 
                    marginBottom: 15 
                  }}>
                    <Text style={{ color: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
                      {selectedDeductionItem.reason}
                    </Text>
                    <Text style={{ 
                      color: (selectedDeductionItem.type === 'addition' || selectedDeductionItem.amount > 0) ? '#10b981' : '#ef4444', 
                      fontSize: 18, 
                      fontWeight: 'bold', 
                      textAlign: 'center', 
                      marginTop: 4 
                    }}>
                      {(selectedDeductionItem.type === 'addition' || selectedDeductionItem.amount > 0)
                        ? `+${Math.abs(selectedDeductionItem.amount)} ${selectedDeductionItem.currency}`
                        : `-${Math.abs(selectedDeductionItem.amount)} ${selectedDeductionItem.currency}`
                      }
                    </Text>
                  </View>
                </View>
              )}
              
              <TouchableOpacity
                style={[styles.optionButton, { backgroundColor: '#ef4444', marginBottom: 10 }]}
                onPress={cancelDeduction}
              >
                <Text style={styles.optionText}>Tak, anuluj odpisaną kwotę</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.optionButton, styles.closeButton]}
                onPress={() => {
                  setCancelDeductionModalVisible(false);
                  setSelectedDeductionItem(null);
                }}
              >
                <Text style={styles.closeText}>Nie, zostaw</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Add Amount Modal */}
        <Modal
          transparent={true}
          visible={addAmountModalVisible}
          animationType="fade"
          onRequestClose={() => {
            setAddAmountModalVisible(false);
            setReasonType("");
            setSelectedProduct("");
            setAddAmountReason("");
            setProductSearchQuery("");
            setShowProductDropdown(false);
            setProductFinalPrice("");
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: '85%' }]}>
              <Text style={styles.modalTitle}>Dopisz kwotę</Text>
              
              {/* Amount input */}
              <View style={{ width: '100%', marginBottom: 15 }}>
                <Text style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>Kwota:</Text>
                <TextInput
                  style={{
                    backgroundColor: 'black',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                    color: 'white',
                    borderWidth: 1,
                    borderColor: '#10b981', // Green border for addition
                    textAlign: 'center',
                  }}
                  placeholder="0.00"
                  placeholderTextColor="#ccc"
                  value={addAmountAmount}
                  onChangeText={setAddAmountAmount}
                  keyboardType="numeric"
                />
              </View>
              
              {/* Currency selection */}
              <View style={{ width: '100%', marginBottom: 15 }}>
                <Text style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>Waluta:</Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#10b981', // Green for addition
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'white',
                  }}
                  onPress={() => {/* Currency selection logic can be added here */}}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                    {addAmountCurrency}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Reason selection */}
              <View style={{ width: '100%', marginBottom: 20 }}>
                <Text style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>Powód dopisania:</Text>
                
                {/* Radio buttons */}
                <View style={{ marginBottom: 15 }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                    onPress={() => {
                      console.log('Selected product radio');
                      setReasonType('product');
                      setAddAmountReason('');
                      setShowProductDropdown(false);
                    }}
                  >
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: '#10b981',
                      backgroundColor: reasonType === 'product' ? '#10b981' : 'transparent',
                      marginRight: 10,
                    }} />
                    <Text style={{ color: '#fff', fontSize: 14 }}>Zaliczka na produkt</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      setReasonType('other');
                      setSelectedProduct('');
                      setProductFinalPrice('');
                    }}
                  >
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: '#10b981',
                      backgroundColor: reasonType === 'other' ? '#10b981' : 'transparent',
                      marginRight: 10,
                    }} />
                    <Text style={{ color: '#fff', fontSize: 14 }}>Inny powód dopisania</Text>
                  </TouchableOpacity>
                </View>

                {/* Conditional product search */}
                {reasonType === 'product' && (
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ color: '#fff', fontSize: 12, marginBottom: 5 }}>Wybierz produkt:</Text>
                    
                    {/* Search input */}
                    <TextInput
                      style={{
                        backgroundColor: 'black',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 14,
                        color: 'white',
                        borderWidth: 1,
                        borderColor: '#10b981',
                        marginBottom: 10,
                      }}
                      placeholder="Wpisz nazwę lub kod produktu..."
                      placeholderTextColor="#ccc"
                      value={productSearchQuery}
                      onChangeText={(text) => {
                        setProductSearchQuery(text);
                        setShowProductDropdown(true); // Show dropdown when typing
                      }}
                      onFocus={() => {
                        if (productSearchQuery && !selectedProduct) {
                          setShowProductDropdown(true);
                        }
                      }}
                    />
                    
                    {/* Products list */}
                    {productSearchQuery && showProductDropdown && (
                      <View style={{
                        maxHeight: 150,
                        backgroundColor: 'black',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#10b981',
                        position: 'relative',
                      }}>
                        {/* Close button */}
                        <TouchableOpacity
                          style={{
                            position: 'absolute',
                            top: 5,
                            right: 10,
                            zIndex: 1,
                            backgroundColor: '#333',
                            borderRadius: 10,
                            width: 20,
                            height: 20,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                          onPress={() => setShowProductDropdown(false)}
                        >
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>×</Text>
                        </TouchableOpacity>
                        
                        <ScrollView 
                          nestedScrollEnabled={true}
                        >
                        {filteredProducts.length > 0 ? (
                          filteredProducts.slice(0, 10).map(product => (
                            <TouchableOpacity
                              key={product._id}
                              style={{
                                padding: 12,
                                borderBottomWidth: 1,
                                borderBottomColor: '#333',
                                backgroundColor: selectedProduct === product._id ? '#10b981' : 'transparent',
                              }}
                              onPress={() => {
                                setSelectedProduct(product._id);
                                setProductSearchQuery(product.fullName || product.code || product.name || 'Produkt');
                                setShowProductDropdown(false); // Hide dropdown after selection
                              }}
                            >
                              <Text style={{ color: '#fff', fontSize: 13 }}>
                                {product.fullName || product.code || product.name || 'Nieznany produkt'}
                              </Text>
                              {product.code && product.fullName && (
                                <Text style={{ color: '#ccc', fontSize: 11 }}>
                                  Kod: {product.code}
                                </Text>
                              )}
                            </TouchableOpacity>
                          ))
                        ) : (
                          <View style={{ padding: 12 }}>
                            <Text style={{ color: '#ccc', fontSize: 13, textAlign: 'center' }}>
                              Brak produktów pasujących do wyszukiwania
                            </Text>
                          </View>
                        )}
                        </ScrollView>
                      </View>
                    )}
                    
                    {/* Product final price input - only when product is selected */}
                    {selectedProduct && (
                      <View style={{ marginTop: 15 }}>
                        <Text style={{ color: '#fff', fontSize: 12, marginBottom: 5 }}>
                          Uzgodniona cena finalna produktu:
                        </Text>
                        <TextInput
                          style={{
                            backgroundColor: 'black',
                            borderRadius: 8,
                            padding: 12,
                            fontSize: 14,
                            color: 'white',
                            borderWidth: 1,
                            borderColor: '#10b981',
                            textAlign: 'center',
                          }}
                          placeholder="0.00"
                          placeholderTextColor="#ccc"
                          value={productFinalPrice}
                          onChangeText={setProductFinalPrice}
                          keyboardType="numeric"
                        />
                        
                        {/* Show calculation when both amounts are filled */}
                        {productFinalPrice && addAmountAmount && (
                          <View style={{
                            marginTop: 10,
                            padding: 10,
                            backgroundColor: '#333',
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#10b981',
                          }}>
                            <Text style={{ color: '#fff', fontSize: 13, textAlign: 'center' }}>
                              <Text style={{ fontWeight: 'bold' }}>Zaliczka:</Text> {parseFloat(addAmountAmount || 0).toFixed(2)} {addAmountCurrency}
                            </Text>
                            <Text style={{ color: '#fff', fontSize: 13, textAlign: 'center', marginTop: 3 }}>
                              <Text style={{ fontWeight: 'bold' }}>Cena finalna:</Text> {parseFloat(productFinalPrice || 0).toFixed(2)} {addAmountCurrency}
                            </Text>
                            <Text style={{ 
                              color: parseFloat(productFinalPrice || 0) - parseFloat(addAmountAmount || 0) > 0 ? '#ff6b6b' : '#10b981', 
                              fontSize: 14, 
                              textAlign: 'center', 
                              marginTop: 5,
                              fontWeight: 'bold'
                            }}>
                              Dopłata: {(parseFloat(productFinalPrice || 0) - parseFloat(addAmountAmount || 0)).toFixed(2)} {addAmountCurrency}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Conditional text input */}
                {reasonType === 'other' && (
                  <TextInput
                    style={{
                      backgroundColor: 'black',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      color: 'white',
                      borderWidth: 1,
                      borderColor: '#10b981',
                      minHeight: 80,
                      textAlignVertical: 'top',
                    }}
                    placeholder="Wpisz powód dopisania kwoty..."
                    placeholderTextColor="#ccc"
                    value={addAmountReason}
                    onChangeText={setAddAmountReason}
                    multiline={true}
                    numberOfLines={3}
                  />
                )}
              </View>
              
              {/* Action buttons */}
              <TouchableOpacity
                style={[styles.optionButton, { backgroundColor: '#10b981', marginBottom: 10 }]} // Green button
                onPress={submitAddAmount}
              >
                <Text style={styles.optionText}>Dopisz kwotę</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.optionButton, styles.closeButton]}
                onPress={() => {
                  setAddAmountModalVisible(false);
                  setAddAmountAmount("");
                  setAddAmountCurrency("PLN");
                  setAddAmountReason("");
                  setReasonType("");
                  setSelectedProduct("");
                  setProductSearchQuery("");
                  setShowProductDropdown(false);
                  setProductFinalPrice("");
                }}
              >
                <Text style={styles.closeText}>Anuluj</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  item: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#0d6efd", // Blue color for items
    borderRadius: 8,
    flexDirection: "row", // Align content in a single row
    alignItems: "center", // Center content vertically
  },
  itemText: {
    color: "white",
    fontSize: 14, // Standardized font size
    fontWeight: "bold", // Standardized font weight
    textAlign: "left",
    flex: 1,
  },
  transferredItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#0d6efd", // Blue background for transferred items
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  receivedItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "yellow", // Yellow background for received items
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemTextLeft: {
    color: "white",
    fontSize: 14, // Standardized font size
    fontWeight: "bold", // Standardized font weight
    textAlign: "left",
    flex: 1,
  },
  itemTextRight: {
    color: "white",
    fontSize: 14, // Standardized font size
    fontWeight: "bold", // Standardized font weight
    textAlign: "right",
    flex: 1,
  },
  dotsButton: {
    position: "absolute",
    right: 2,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  dotsText: {
    color: "white",
    fontSize: 25,
    textAlign: "center",
  },
  receivedItemText: {
    color: "black", // Black text for received items
    fontSize: 16, // Match font size from writeoff.jsx
    fontWeight: "bold", // Bold text for emphasis
    flex: 1, // Allow text to take available space
  },
  receivedItemTextLeft: {
    color: "black", // Black text for left-aligned content
    fontSize: 16, // Match font size from writeoff.jsx
    fontWeight: "bold", // Bold text for emphasis
    flex: 1, // Allow text to take available space
    textAlign: "left", // Align text to the left
  },
  receivedItemTextRight: {
    color: "black", // Black text for right-aligned content
    fontSize: 16, // Match font size from writeoff.jsx
    fontWeight: "bold", // Bold text for emphasis
    textAlign: "right", // Align text to the right
  },
  text: {
    color: "white", // White text for items
    fontSize: 14, // Adjust font size for items
  },
  transferredItemTextLeft: {
    color: "white", // White text for left-aligned content
    fontSize: 13, // Match font size from writeoff.jsx
    fontWeight: "bold", // Bold text for emphasis
    flex: 1, // Allow text to take available space
    textAlign: "left", // Align text to the left
  },
  transferredItemTextRight: {
    color: "white", // White text for right-aligned content
    fontSize: 13, // Match font size from writeoff.jsx
    fontWeight: "bold", // Bold text for emphasis
    textAlign: "right", // Align text to the right
  },
  // Unified modal styles from search.jsx
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'black',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    width: '70%',
    color: '#fff',
    borderWidth: 1,
    borderColor: 'white',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#fff',
    textAlign: 'center',
  },
  optionButton: {
    backgroundColor: '#0d6efd',
    padding: 8,
    borderRadius: 8,
    marginVertical: 6,
    width: '90%',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    color: '#fff',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  closeButton: {
    backgroundColor: 'red',
  },
  closeText: {
    color: 'white',
    fontSize: 14,
  },
  advanceItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#10b981", // Green background for advances
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  advanceItemTextLeft: {
    color: "white", // White text for left-aligned content
    fontSize: 13, // Match font size from writeoff.jsx
    fontWeight: "bold", // Bold text for emphasis
    flex: 1, // Allow text to take available space
    textAlign: "left", // Align text to the left
  },
  advanceItemTextRight: {
    color: "white", // White text for right-aligned content
    fontSize: 13, // Match font size from writeoff.jsx
    fontWeight: "bold", // Bold text for emphasis
    textAlign: "right", // Align text to the right
  },
  deductionItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#374151", // Neutral gray background (will be overridden by inline styles)
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deductionItemTextLeft: {
    color: "white", // White text for left-aligned content
    fontSize: 13, // Match font size from writeoff.jsx
    fontWeight: "bold", // Bold text for emphasis
    flex: 1, // Allow text to take available space
    textAlign: "left", // Align text to the left
  },
  deductionItemTextRight: {
    color: "white", // White text for right-aligned content
    fontSize: 13, // Match font size from writeoff.jsx
    fontWeight: "bold", // Bold text for emphasis
    textAlign: "right", // Align text to the right
  },
  // Style identyczne z QRScanner dla modal wyboru symboli
  currencyModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
  },
  currencyModalContent: {
    width: "80%",
    backgroundColor: "black",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  currencyModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 15,
  },
  currencyModalItem: {
    paddingVertical: 5, // Reduce vertical padding for shorter height
    paddingHorizontal: 30, // Increase horizontal padding for wider items
    marginVertical: 5, // Add vertical margin between items
    borderBottomWidth: 1,
    borderBottomColor: "gray",
    width: 100, // Set the width to 100px
    alignItems: "center",
    backgroundColor: "rgb(13, 110, 253)", // Set background color to blue
  },
  currencyModalItemText: {
    color: "white",
    fontSize: 16,
  },
  currencyModalCloseButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "red",
    borderRadius: 5,
    alignItems: "center",
  },
  currencyModalCloseButtonText: {
    color: "white",
    fontSize: 16,
  },
});
export default Home; // Export the Home component