import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlobalStateContext } from '../../context/GlobalState';
import tokenService from '../../services/tokenService';
import { getApiUrl } from '../../config/api';

const Cudzych = () => {
  const { user } = useContext(GlobalStateContext);
  const [cudzichItems, setCudzichItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCudzychData = async () => {
    setIsLoading(true);
    try {
      const response = await tokenService.authenticatedFetch(getApiUrl('/state'));
      
      if (response && response.ok) {
        const data = await response.json();
        const stateArray = Array.isArray(data) ? data : (data?.state_data || []);
        
        // Filtruj elementy dla użytkownika Parzygnat - tutaj możesz dostosować logikę filtrowania
        const filteredItems = stateArray.filter(item => {
          // Przykład: pokaż wszystkie elementy sprzedane przez innych użytkowników
          return item.userSymbol && item.userSymbol !== user?.symbol;
        });
        
        setCudzichItems(filteredItems);
      }
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się pobrać danych');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.symbol === 'P') {
      fetchCudzichData();
    }
  }, [user]);

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemText}>Kod: {item.barcode}</Text>
      <Text style={styles.itemText}>Rozmiar: {item.size}</Text>
      <Text style={styles.itemText}>Kolor: {item.color}</Text>
      <Text style={styles.itemText}>Cena: {item.price} zł</Text>
      <Text style={styles.itemText}>Użytkownik: {item.userSymbol}</Text>
      {item.dateSold && (
        <Text style={styles.itemText}>Data sprzedaży: {new Date(item.dateSold).toLocaleDateString('pl-PL')}</Text>
      )}
    </View>
  );

  if (user?.symbol !== 'P') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDenied}>
          <Text style={styles.accessDeniedText}>Brak dostępu do tej sekcji</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Cudzich</Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={fetchCudzychData}
          disabled={isLoading}
        >
          <Text style={styles.refreshButtonText}>
            {isLoading ? 'Ładowanie...' : 'Odśwież'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cudzichItems}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item._id || item.barcode || index}`}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isLoading ? 'Ładowanie danych...' : 'Brak danych do wyświetlenia'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161622',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#232533',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    backgroundColor: '#0d6efd',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  itemContainer: {
    backgroundColor: '#232533',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  itemText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#CDCDE0',
    fontSize: 16,
    textAlign: 'center',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accessDeniedText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
});

export default Cudzych;