import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useCallback, useContext, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GlobalStateContext } from '../../context/GlobalState';
import Logger from '../../services/logger'; // Import logger service
import QRScannerSearch from '../QRScannerSearch';
import LogoutButton from '../../components/LogoutButton';

const SearchScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false); // Dodano stan dla pull-to-refresh
  const isFocused = useIsFocused();
  const { stateData, user, sizes, colors, goods, fetchState } = useContext(GlobalStateContext);

  useFocusEffect(
    useCallback(() => {
      setModalVisible(true);
      setShowQR(false);
      setShowSearchBar(false);
      return () => {
        setModalVisible(false);
        setShowQR(false);
        setShowSearchBar(false);
      };
    }, [])
  );

  // Funkcja odświeżania dla pull-to-refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchState(); // Odświeżenie danych z backendu
    } catch (error) {
      Logger.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredData = stateData?.filter(item => {
    const search = searchText.trim().toLowerCase();
    if (!search) return true;
    const searchWords = search.split(/\s+/);
    const color = (item.color || '').toLowerCase();

    // Polish color stemming: remove common endings for basic matching
    const stemPolishColor = (str) =>
      str
        .replace(/(y|a|e|ego|ej|ą|ę|i|iego|iej|ym|im|ie|ich|ych|emu|emu|ący|ąca|ące|ami|ami|owi|owie|ów|om|ach|u|o|ą)$/g, '');

    const itemString = (
      (item.fullName || '') + ' ' +
      (item.size || '') + ' ' +
      (item.symbol || '') + ' ' +
      (item.barcode || '') + ' ' +
      color
    ).toLowerCase();

    return searchWords.every(word => {
      // Try stemmed color matching for Polish endings
      if (color && (stemPolishColor(color) === stemPolishColor(word))) return true;
      if (itemString.includes(word)) return true;
      // Also try stemmed word in itemString
      if (itemString.includes(stemPolishColor(word))) return true;
      return false;
    });
  })?.sort((a, b) => {
    // Sortowanie alfabetyczne według fullName
    const nameA = (a.fullName || '').toLowerCase();
    const nameB = (b.fullName || '').toLowerCase();
    return nameA.localeCompare(nameB, 'pl', { sensitivity: 'base' });
  }) || [];

  if (showQR) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <QRScannerSearch
          stateData={stateData}
          user={user}
          sizes={sizes}
          colors={colors}
          goods={goods}
          isActive={isFocused}
        />
        <TouchableOpacity
          style={[styles.optionButton, { width: '100%', alignSelf: 'stretch' }]}
          onPress={() => {
            setShowQR(false);
            setModalVisible(true);
          }}
        >
          <Text style={styles.optionText}>Powrót</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showSearchBar) {
    return (
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBarRow}>
          <TextInput
            style={styles.searchBar}
            placeholder="Szukaj..."
            placeholderTextColor="#888"
            value={searchText}
            onChangeText={setSearchText}
            autoFocus
          />
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          <TouchableOpacity
            style={[styles.optionButton, { 
              marginBottom: 16, 
              width: '100%'
            }]}
            onPress={() => {
              setShowSearchBar(false);
              setModalVisible(true);
            }}
          >
            <Text style={styles.optionText}>Powrót</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          testID="search-flatlist"
          contentContainerStyle={{ paddingHorizontal: 0 }}
          data={filteredData}
          keyExtractor={item => item.id}
          onRefresh={handleRefresh} // Dodano funkcję odświeżania
          refreshing={isRefreshing} // Dodano stan odświeżania
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.item,
                { marginHorizontal: 0 }, // Remove side margins - same as writeoff.jsx
              ]}
            >
              <Text 
                style={[
                  styles.itemTextLeft,
                  {
                    fontSize: (item.fullName?.length || 0) + (item.size?.length || 0) > 20 ? 10 : 12,
                    fontWeight: "bold",
                  },
                ]} 
                numberOfLines={1}
              >
                {index + 1}. {item.fullName}   {item.size}   {item.barcode}
              </Text>
              <View
                style={styles.dotsButton}
              >
                <Text style={styles.dotsText}>{item.symbol}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Brak wyników</Text>
          }
          keyboardShouldPersistTaps="handled"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LogoutButton position="top-right" />
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Wybierz opcję wyszukiwania</Text>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setModalVisible(false);
                setShowQR(true);
              }}
            >
              <Text style={styles.optionText}>📱 Wyszukaj po kodzie</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setModalVisible(false);
                setShowSearchBar(true);
              }}
            >
              <Text style={styles.optionText}>🔍 Wyszukaj w wyszukiwarce</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, styles.closeButton]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeText}>✕ Zamknij</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: '#0d6efd', // Główny kolor aplikacji
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ffffff',
    alignItems: 'center',
    width: '90%',
  },
  optionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#ef4444',
    marginTop: 10,
  },
  closeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchBarContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'flex-start',
    paddingTop: 40,
    paddingHorizontal: 0, // Changed from 16 to 0 to match writeoff.jsx
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16, // Add padding only to search row
  },
  searchBar: {
    flex: 1,
    backgroundColor: 'black',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  listItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  listItemText: {
    color: '#fff',
    fontSize: 13,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 13,
  },
  // --- Items styles same as writeoff.jsx ---
  item: {
    backgroundColor: "#0d6efd",
    paddingVertical: 9, // Increased from 7 for even more vertical space
    paddingHorizontal: 3, // Keep horizontal padding minimal
    borderRadius: 5,
    width: "100%",
    marginVertical: 3, // Zmniejszono z 5 na 3
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemTextLeft: {
    color: "white",
    fontSize: 12, // Delikatnie zwiększono z 11 na 12
    fontWeight: "bold", // Standardized font weight
    textAlign: "left",
    flex: 1,
  },
  dotsButton: {
    padding: 5,
  },
  dotsText: {
    color: "white",
    fontSize: 12, // Smaller font for symbol
    fontWeight: "bold",
  },
  
});

export default SearchScreen;
