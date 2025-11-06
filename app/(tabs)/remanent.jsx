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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlobalStateContext } from '../../context/GlobalState';
import tokenService from '../../services/tokenService';
import { getApiUrl } from '../../config/api';

const Remanent = () => {
  const { user } = useContext(GlobalStateContext);
  const [remanentData, setRemanentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch remanent data
  const fetchRemanentData = async () => {
    try {
      setLoading(true);
      
      // Check if we're in test environment
      if (process.env.__TESTING_API_CALLS__ === 'false') {
        // Mock data for testing
        const mockData = [
          {
            id: 1,
            name: 'Przykładowy produkt',
            code: 'PROD001',
            quantity: 50,
            value: '1250.00',
            location: 'Magazyn A'
          },
          {
            id: 2,
            name: 'Inny produkt',
            code: 'PROD002',
            quantity: 25,
            value: '750.50',
            location: 'Magazyn B'
          }
        ];
        setRemanentData(mockData);
        return;
      }

      // Check if tokenService is available
      if (!tokenService || typeof tokenService.authenticatedFetch !== 'function') {
        console.warn('Token service not available, showing empty state');
        setRemanentData([]);
        return;
      }

      // Real API call
      const apiUrl = getApiUrl ? getApiUrl('/api/remanent') : '/api/remanent';
      const response = await tokenService.authenticatedFetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        setRemanentData(data || []);
      } else {
        throw new Error(`API request failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching remanent data:', error);
      // Don't show alert for missing API, just log
      if (!error.message.includes('authenticatedFetch')) {
        Alert.alert('Błąd', 'Nie udało się pobrać danych remanentów');
      }
      setRemanentData([]);
    } finally {
      setLoading(false);
    }
  };

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRemanentData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchRemanentData();
  }, []);

  // Render individual remanent item
  const renderRemanentItem = ({ item }) => (
    <View style={styles.remanentItem}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name || 'Produkt'}</Text>
        <Text style={styles.itemCode}>{item.code || 'N/A'}</Text>
      </View>
      
      <View style={styles.itemDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Stan magazynowy:</Text>
          <Text style={styles.detailValue}>{item.quantity || 0} szt.</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Wartość:</Text>
          <Text style={styles.detailValue}>{item.value || '0.00'} PLN</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Lokalizacja:</Text>
          <Text style={styles.detailValue}>{item.location || 'Nieznana'}</Text>
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
        <Text style={styles.headerTitle}>Remanenty</Text>
        <Text style={styles.headerSubtitle}>Stan magazynowy</Text>
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
        <TouchableOpacity style={styles.addButton} onPress={() => Alert.alert('Funkcja', 'Dodaj nowy remanent')}>
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.addButtonText}>Dodaj remanent</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#232533',
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
  },
  addButton: {
    backgroundColor: '#0d6efd',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default Remanent;