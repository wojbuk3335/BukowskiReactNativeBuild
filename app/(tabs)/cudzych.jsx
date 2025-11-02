import React, { useContext, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  FlatList, 
  Alert,
  ScrollView,
  RefreshControl,
  Platform
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { GlobalStateContext } from '../../context/GlobalState';

import { getApiUrl } from '../../config/api';
import tokenService from '../../services/tokenService';

const Cudzych = () => {
  const { user, goods, fetchGoods, sizes, fetchSizes } = useContext(GlobalStateContext);
  
  // State management
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [odbiorModalVisible, setOdbiorModalVisible] = useState(false);
  const [zwrotModalVisible, setZwrotModalVisible] = useState(false);
  const [wplataModalVisible, setWplataModalVisible] = useState(false);
  const [wyplataModalVisible, setWyplataModalVisible] = useState(false);
  
  // Form states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productSearchText, setProductSearchText] = useState('');
  const [selectedSize, setSelectedSize] = useState(null);
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  
  // Dropdown states
  const [productDropdownVisible, setProductDropdownVisible] = useState(false);
  const [sizeDropdownVisible, setSizeDropdownVisible] = useState(false);
  
  // Filtered products for search
  const [filteredProducts, setFilteredProducts] = useState([]);
  
  // Payment form states
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Date filter states
  const [dateFilterVisible, setDateFilterVisible] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState(null);
  const [filterEndDate, setFilterEndDate] = useState(null);
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  
  // Price list state
  const [cudzichPriceList, setCudzichPriceList] = useState(null);

  // Load data on component mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Debug goods changes
  useEffect(() => {
    // Goods are ready for use
  }, [goods]);

  // Filter products based on search text
  useEffect(() => {
    if (productSearchText.length > 0) {
      const filtered = goods.filter(product =>
        product.fullName?.toLowerCase().includes(productSearchText.toLowerCase())
      );
      setFilteredProducts(filtered.slice(0, 10)); // Limit to 10 results
    } else {
      setFilteredProducts([]);
    }
  }, [productSearchText, goods]);

  // Filter transactions by date
  useEffect(() => {
    if (!transactions || transactions.length === 0) {
      setFilteredTransactions([]);
      return;
    }

    let filtered = transactions;

    if (filterStartDate || filterEndDate) {
      filtered = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        const startDate = filterStartDate ? new Date(filterStartDate.setHours(0, 0, 0, 0)) : null;
        const endDate = filterEndDate ? new Date(filterEndDate.setHours(23, 59, 59, 999)) : null;

        if (startDate && endDate) {
          return transactionDate >= startDate && transactionDate <= endDate;
        } else if (startDate) {
          return transactionDate >= startDate;
        } else if (endDate) {
          return transactionDate <= endDate;
        }
        return true;
      });
    }

    setFilteredTransactions(filtered);
    // Filtered transactions updated
  }, [transactions, filterStartDate, filterEndDate]);

  // Auto-fetch price when product is selected (bez czekania na rozmiar)
  useEffect(() => {
    if (selectedProduct && cudzichPriceList) {
      const fetchedPrice = getPriceFromProduct(selectedProduct);
      setPrice(fetchedPrice.toString());
    }
  }, [selectedProduct, cudzichPriceList]);

  // Access control - after all hooks
  if (user?.symbol !== 'P') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.text}>Brak dostępu do tej sekcji</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Load balance, transactions and price list
  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBalance(),
        fetchTransactions(),
        fetchCudzichPriceList(),
        fetchGoods(),
        fetchSizes()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Błąd', 'Nie udało się załadować danych');
    } finally {
      setLoading(false);
    }
  };

  // Fetch current balance
  const fetchBalance = async () => {
    try {
      const response = await tokenService.authenticatedFetch(getApiUrl('/cudzich/balance?userSymbol=P&recipientId=cudzich'));
      
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      const response = await tokenService.authenticatedFetch(getApiUrl('/cudzich/transactions?userSymbol=P&recipientId=cudzich'));
      
      if (response.ok) {
        const data = await response.json();
        setTransactions(data || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  // Fetch Cudzich price list
  const fetchCudzichPriceList = async () => {
    try {
      const response = await tokenService.authenticatedFetch(getApiUrl('/cudzich/pricelist'));
      
      if (response.ok) {
        const data = await response.json();
        setCudzichPriceList(data);
      } else {
        console.error('❌ Błąd pobierania cennika:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching Cudzich price list:', error);
    }
  };





  // Get price from Cudzich price list
  const getPriceFromProduct = (product) => {
    if (!product) {
      return 0;
    }

    // Sprawdź cenę w cenniku Cudzich
    if (cudzichPriceList && cudzichPriceList.items && Array.isArray(cudzichPriceList.items)) {
      // Price list loaded
      
      const priceItem = cudzichPriceList.items.find(item => 
        item.fullName === product.fullName
      );
      
      if (priceItem) {
        return priceItem.price;
      }
    }

    // Jeśli nie ma w cenniku Cudzich, użyj ceny z produktu jako fallback
    return product.price || 0;
  };

  // Handle product selection
  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setProductSearchText(product.fullName); // Set search text to selected product name
    setProductDropdownVisible(false);
    
    // Auto-fetch price
    const fetchedPrice = getPriceFromProduct(product);
    setPrice(fetchedPrice.toString());
  };

  // Handle size change (cena jest już ustawiona po wyborze produktu)


  // Create transaction
  const createTransaction = async (type) => {
    // Validate that a product is selected and text matches
    if (!selectedProduct) {
      Alert.alert('Błąd', 'Proszę wybrać produkt z listy');
      return;
    }

    // Validate that the search text matches the selected product
    if (productSearchText !== selectedProduct.fullName) {
      Alert.alert('Błąd', 'Proszę wybrać produkt z listy wyszukiwania');
      return;
    }

    // Validate that a size is selected from the list
    if (!selectedSize || !size) {
      Alert.alert('Błąd', 'Proszę wybrać rozmiar z listy');
      return;
    }

    if (!price) {
      Alert.alert('Błąd', 'Proszę wypełnić wszystkie wymagane pola');
      return;
    }

    if (parseFloat(price) <= 0) {
      Alert.alert('Błąd', 'Cena musi być większa od 0');
      return;
    }

    // User validation

    try {
      setLoading(true);
      
      const response = await tokenService.authenticatedFetch(getApiUrl('/cudzich/transactions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: type,
          productId: selectedProduct._id,
          productName: selectedProduct.fullName,
          size: size,
          price: parseFloat(price),
          userSymbol: 'P',
          recipientId: 'cudzich',
          notes: notes
        })
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          'Sukces', 
          `${type === 'odbior' ? 'Odbiór' : 'Zwrot'} został zapisany\nNowe saldo: ${data.newBalance}zł`
        );
        
        // Refresh data
        await Promise.all([fetchBalance(), fetchTransactions()]);
        
        // Reset form and close modal
        resetForm();
        setOdbiorModalVisible(false);
        setZwrotModalVisible(false);
      } else {
        const errorData = await response.json();
        Alert.alert('Błąd', errorData.error || 'Nie udało się zapisać transakcji');
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Błąd', 'Nie udało się połączyć z serwerem');
    } finally {
      setLoading(false);
    }
  };

  // Create payment transaction (wpłata lub wypłata)
  const createPaymentTransaction = async (type) => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      Alert.alert('Błąd', 'Proszę wpisać prawidłową kwotę');
      return;
    }

    // Creating payment transaction

    try {
      setLoading(true);
      
      const response = await tokenService.authenticatedFetch(getApiUrl('/cudzich/transactions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: type,
          price: parseFloat(paymentAmount),
          userSymbol: 'P',
          recipientId: 'cudzich',
          notes: paymentNotes
        })
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          'Sukces', 
          `${type === 'wplata' ? 'Wpłata' : 'Wypłata'} została zapisana\nNowe saldo: ${data.newBalance}zł`
        );
        
        // Refresh data
        await Promise.all([fetchBalance(), fetchTransactions()]);
        
        // Reset form and close modal
        resetPaymentForm();
        setWplataModalVisible(false);
        setWyplataModalVisible(false);
      } else {
        const errorData = await response.json();
        Alert.alert('Błąd', errorData.error || 'Nie udało się zapisać płatności');
      }
    } catch (error) {
      console.error('❌ Error creating payment:', error);
      Alert.alert('Błąd', 'Nie udało się połączyć z serwerem');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedProduct(null);
    setProductSearchText('');
    setSelectedSize(null);
    setSize('');
    setPrice('');
    setNotes('');
    setProductDropdownVisible(false);
    setSizeDropdownVisible(false);
  };

  // Reset payment form
  const resetPaymentForm = () => {
    setPaymentAmount('');
    setPaymentNotes('');
  };

  // Date filter functions
  const clearDateFilters = () => {
    setFilterStartDate(null);
    setFilterEndDate(null);
  };

  const formatDateForDisplay = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };



  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL') + ' ' + date.toLocaleTimeString('pl-PL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Render transaction item
  const renderTransaction = ({ item }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionHeader}>
        <Text style={[
          styles.transactionType, 
          { color: 
            item.type === 'odbior' ? '#dc3545' : 
            item.type === 'zwrot' ? '#28a745' :
            item.type === 'wplata' ? '#ffc107' : '#17a2b8'
          }
        ]}>
          {item.type === 'odbior' ? 'ODBIÓR' : 
           item.type === 'zwrot' ? 'ZWROT' :
           item.type === 'wplata' ? 'WPŁATA' : 'WYPŁATA'}
        </Text>
        <Text style={styles.transactionPrice}>
          {(item.type === 'odbior' || item.type === 'wyplata') ? '+' : '-'}{item.price}zł
        </Text>
      </View>
      {item.productName && <Text style={styles.transactionProduct}>{item.productName}</Text>}
      {item.size && <Text style={styles.transactionSize}>Rozmiar: {item.size}</Text>}
      <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
      {item.notes && <Text style={styles.transactionNotes}>Uwagi: {item.notes}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with balance */}
        <View style={styles.header}>
          <Text style={styles.title}>Tomasz Cudzich</Text>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Saldo do zapłaty:</Text>
            <Text style={[
              styles.balanceAmount,
              { color: balance >= 0 ? '#ff6b6b' : '#51cf66' }
            ]}>
              {balance}zł
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.smallButton, { backgroundColor: '#dc3545' }]}
            onPress={() => setOdbiorModalVisible(true)}
          >
            <Text style={styles.smallButtonText}>Odbiór</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.smallButton, { backgroundColor: '#28a745' }]}
            onPress={() => setZwrotModalVisible(true)}
          >
            <Text style={styles.smallButtonText}>Zwrot</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.smallButton, { backgroundColor: '#ffc107' }]}
            onPress={() => setWplataModalVisible(true)}
          >
            <Text style={styles.smallButtonText}>Wpłata</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.smallButton, { backgroundColor: '#17a2b8' }]}
            onPress={() => setWyplataModalVisible(true)}
          >
            <Text style={styles.smallButtonText}>Wypłata</Text>
          </TouchableOpacity>
        </View>

        {/* Transactions list */}
        <View style={styles.transactionsContainer}>
          <View style={styles.transactionHeader}>
            <Text style={styles.sectionTitle}>Historia transakcji</Text>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setDateFilterVisible(true)}
            >
              <Text style={styles.filterButtonText}>📅 Filtruj</Text>
            </TouchableOpacity>
          </View>

          {/* Date filter display */}
          {(filterStartDate || filterEndDate) && (
            <View style={styles.dateFilterDisplay}>
              <Text style={styles.dateFilterText}>
                Okres: {formatDateForDisplay(filterStartDate) || 'Od początku'} - {formatDateForDisplay(filterEndDate) || 'Do teraz'}
              </Text>
              <TouchableOpacity onPress={clearDateFilters} style={styles.clearFilterButton}>
                <Text style={styles.clearFilterText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {(filteredTransactions.length > 0 || transactions.length > 0) ? (
            <FlatList
              data={filteredTransactions.length > 0 ? filteredTransactions : transactions}
              keyExtractor={(item) => item._id}
              renderItem={renderTransaction}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noTransactions}>
              {(filterStartDate || filterEndDate) ? 'Brak transakcji w wybranym okresie' : 'Brak transakcji'}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Transaction Modal (shared for odbior and zwrot) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={odbiorModalVisible || zwrotModalVisible}
        onRequestClose={() => {
          setOdbiorModalVisible(false);
          setZwrotModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {odbiorModalVisible ? 'ODBIÓR KURTKI' : 'ZWROT KURTKI'}
            </Text>

            {/* Product search */}
            <View style={styles.productContainer}>
              <Text style={styles.fieldLabel}>Wybierz produkt:</Text>
              <TextInput
                style={styles.input}
                placeholder="Wyszukaj kurtkę..."
                value={productSearchText}
                onChangeText={(text) => {
                  setProductSearchText(text);
                  setProductDropdownVisible(text.length > 0);
                  // Clear selected product if text doesn't match
                  if (selectedProduct && !selectedProduct.fullName.toLowerCase().includes(text.toLowerCase())) {
                    setSelectedProduct(null);
                    setPrice('');
                  }
                }}
                onFocus={() => {
                  if (productSearchText.length > 0) setProductDropdownVisible(true);
                }}
                placeholderTextColor="#666"
              />

              {/* Product dropdown */}
              {productDropdownVisible && (
                <View style={styles.relativeDropdown}>
                {!goods || goods.length === 0 ? (
                  <Text style={styles.noDataText}>Brak dostępnych produktów</Text>
                ) : filteredProducts.length === 0 ? (
                  <Text style={styles.noDataText}>Brak produktów pasujących do wyszukiwania</Text>
                ) : (
                  <FlatList
                    data={filteredProducts}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          handleProductSelect(item);
                          setProductDropdownVisible(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{item.fullName}</Text>
                      </TouchableOpacity>
                    )}
                    maxHeight={200}
                  />
                )}
                <TouchableOpacity
                  style={styles.closeDropdownButton}
                  onPress={() => setProductDropdownVisible(false)}
                >
                  <Text style={styles.closeDropdownText}>Zamknij</Text>
                </TouchableOpacity>
              </View>
            )}
            </View>

            {/* Size dropdown */}
            <View style={styles.productContainer}>
              <Text style={styles.fieldLabel}>Rozmiar:</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setSizeDropdownVisible(!sizeDropdownVisible)}
              >
                <Text style={[styles.inputText, !size && { color: '#666' }]}>
                  {size || 'Wybierz rozmiar...'}
                </Text>
              </TouchableOpacity>

              {/* Size dropdown list */}
              {sizeDropdownVisible && (
                <View style={styles.relativeDropdown}>
                {!sizes || sizes.length === 0 ? (
                  <Text style={styles.noDataText}>Brak dostępnych rozmiarów</Text>
                ) : (
                  <FlatList
                    data={sizes}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          const sizeText = item.Roz_Opis || item.nazwa || item.name;
                          setSelectedSize(item);
                          setSize(sizeText);
                          setSizeDropdownVisible(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>
                          {item.Roz_Opis || item.nazwa || item.name}
                        </Text>
                      </TouchableOpacity>
                    )}
                    maxHeight={200}
                  />
                )}
                <TouchableOpacity
                  style={styles.closeDropdownButton}
                  onPress={() => setSizeDropdownVisible(false)}
                >
                  <Text style={styles.closeDropdownText}>Zamknij</Text>
                </TouchableOpacity>
              </View>
            )}
            </View>

            {/* Price input */}
            <Text style={styles.fieldLabel}>Cena (zł):</Text>
            <TextInput
              style={[styles.input, styles.readonlyInput]}
              placeholder="Cena z cennika"
              value={price}
              editable={false}
              placeholderTextColor="#666"
            />

            {/* Notes input */}
            <Text style={styles.fieldLabel}>Uwagi (opcjonalne):</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Dodatkowe informacje..."
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholderTextColor="#666"
            />

            {/* Modal buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setOdbiorModalVisible(false);
                  setZwrotModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: odbiorModalVisible ? '#ff6b6b' : '#51cf66' }
                ]}
                onPress={() => createTransaction(odbiorModalVisible ? 'odbior' : 'zwrot')}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {odbiorModalVisible ? 'Zapisz Odbiór' : 'Zapisz Zwrot'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal (shared for wpłata and wypłata) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={wplataModalVisible || wyplataModalVisible}
        onRequestClose={() => {
          resetPaymentForm();
          setWplataModalVisible(false);
          setWyplataModalVisible(false);
        }}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {wplataModalVisible ? 'WPŁATA OD TOMKA' : 'WYPŁATA DLA TOMKA'}
            </Text>

            {/* Amount input */}
            <Text style={styles.fieldLabel}>Kwota (zł):</Text>
            <TextInput
              style={styles.input}
              placeholder="Wpisz kwotę..."
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="numeric"
              placeholderTextColor="#666"
            />

            {/* Notes input */}
            <Text style={styles.fieldLabel}>Uwagi (opcjonalne):</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Dodatkowe informacje..."
              value={paymentNotes}
              onChangeText={setPaymentNotes}
              multiline={true}
              numberOfLines={3}
              placeholderTextColor="#666"
            />

            {/* Modal buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  resetPaymentForm();
                  setWplataModalVisible(false);
                  setWyplataModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: wplataModalVisible ? '#339af0' : '#fd7e14' }
                ]}
                onPress={() => createPaymentTransaction(wplataModalVisible ? 'wplata' : 'wyplata')}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {wplataModalVisible ? 'Zapisz Wpłatę' : 'Zapisz Wypłatę'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={dateFilterVisible}
        onRequestClose={() => setDateFilterVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Filtruj po dacie</Text>



            {/* Quick filters */}
            <Text style={styles.fieldLabel}>Szybki wybór:</Text>
            <View style={styles.quickFilters}>
              <TouchableOpacity 
                style={styles.quickFilterButton}
                onPress={() => {
                  const today = new Date();
                  setFilterStartDate(today);
                  setFilterEndDate(today);
                }}
              >
                <Text style={styles.quickFilterText}>Dziś</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickFilterButton}
                onPress={() => {
                  const today = new Date();
                  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                  setFilterStartDate(weekAgo);
                  setFilterEndDate(today);
                }}
              >
                <Text style={styles.quickFilterText}>7 dni</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickFilterButton}
                onPress={() => {
                  const today = new Date();
                  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                  setFilterStartDate(monthAgo);
                  setFilterEndDate(today);
                }}
              >
                <Text style={styles.quickFilterText}>30 dni</Text>
              </TouchableOpacity>
            </View>

            {/* Modal buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  clearDateFilters();
                  setDateFilterVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Wyczyść</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: '#339af0' }]}
                onPress={() => setDateFilterVisible(false)}
              >
                <Text style={styles.saveButtonText}>Zastosuj</Text>
              </TouchableOpacity>
            </View>



          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Header styles
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  balanceContainer: {
    alignItems: 'center',
  },
  balanceLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  
  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    gap: 8,
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'white',
    flex: 1,
  },
  smallButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Transactions
  transactionsContainer: {
    padding: 20,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterButton: {
    backgroundColor: '#0d6efd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dateFilterDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0d6efd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  dateFilterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  clearFilterButton: {
    backgroundColor: 'red',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearFilterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  transactionItem: {
    backgroundColor: 'black',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'white',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  transactionPrice: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  transactionProduct: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transactionSize: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transactionDate: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  transactionNotes: {
    color: '#bbb',
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
  },
  noTransactions: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  
  // Modal styles
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
    width: '80%', // Szerszy modal
    maxHeight: '80%', // Ograniczamy wysokość
    borderWidth: 1,
    borderColor: 'white',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'black',
    borderRadius: 10,
    padding: 16,
    width: '70%',
    borderWidth: 1,
    borderColor: 'white',
  },
  modalTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  
  // Form styles
  fieldLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: 'black',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'white',
    padding: 12,
    color: 'white',
    fontSize: 14,
  },
  inputText: {
    color: 'white',
    fontSize: 14,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  readonlyInput: {
    backgroundColor: '#333',
    borderColor: 'white',
    color: 'white',
  },
  
  // Product container
  productContainer: {
    position: 'relative',
    zIndex: 1,
  },
  
  // Product dropdown
  dropdown: {
    backgroundColor: 'black',
    borderRadius: 8,
    marginTop: 5,
    borderWidth: 1,
    borderColor: 'white',
    maxHeight: 250,
  },
  
  // Absolute dropdown to prevent layout shift
  dropdownAbsolute: {
    position: 'absolute',
    top: 70, // Adjust based on label + input height
    left: 0,
    right: 0,
    backgroundColor: 'black',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'white',
    maxHeight: 250,
    zIndex: 1000,
    elevation: 1000, // For Android
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'white',
  },
  dropdownItemText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeDropdownButton: {
    backgroundColor: '#555',
    padding: 12,
    alignItems: 'center',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  closeDropdownText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noDataText: {
    color: 'white',
    fontSize: 14,
    padding: 15,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  
  // Modal buttons
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'red',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#0d6efd',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Date picker styles
  dateButton: {
    backgroundColor: '#0d6efd',
    borderRadius: 8,
    padding: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  dateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  quickFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickFilterButton: {
    backgroundColor: '#0d6efd',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  quickFilterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Dropdown container styles
  dropdownContainer: {
    position: 'relative',
  },
  relativeDropdown: {
    backgroundColor: '#333',
    borderRadius: 8,
    maxHeight: 200,
    marginTop: 5, // Mały odstęp od inputa
    zIndex: 1000, // Wysoki zIndex
    elevation: 5, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

});

export default Cudzych;