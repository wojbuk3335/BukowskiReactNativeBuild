import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import tokenService from "../services/tokenService";
import { getApiUrl } from "../config/api";

const RemainingProductsList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  
  // Form states
  const [pozNr, setPozNr] = useState("");
  const [pozKod, setPozKod] = useState("");
  const [productType, setProductType] = useState("Rękawiczka");
  const [startingNumber, setStartingNumber] = useState(10);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Validation function for Poz_Kod - different rules based on product type
  const validatePozKod = (value, type) => {
    if (!value || value === '') return { isValid: true, message: '' };
    
    // Special validation for Pasek (Belt) - format: "APS 052" (3 letters + space + 3 digits)
    if (type === 'Pasek') {
      const beltPattern = /^[A-Z]{3} \d{3}$/;
      if (!beltPattern.test(value)) {
        return { 
          isValid: false, 
          message: 'Pasek musi mieć format: 3 duże litery + spacja + 3 cyfry (np. APS 052)' 
        };
      }
      return { isValid: true, message: '' };
    }
    
    // Validation for Rękawiczka - MUST have a dot followed by exactly 3 digits
    if (type === 'Rękawiczka') {
      // Check if the value contains at least one number with a dot and exactly 3 digits after it
      const hasValidDecimal = /\d+\.\d{3}/.test(value);
      
      if (!hasValidDecimal) {
        return { 
          isValid: false, 
          message: 'Rękawiczka: Poz_Kod musi zawierać liczbę z kropką i dokładnie 3 cyframi po niej (np. Rekawiczka12.123)' 
        };
      }
      
      // Additional check: make sure no numbers have more than 3 decimal places
      const decimalMatches = value.match(/\d+\.\d+/g);
      if (decimalMatches) {
        for (let match of decimalMatches) {
          const decimalPart = match.split('.')[1];
          if (decimalPart && decimalPart.length !== 3) {
            return { 
              isValid: false, 
              message: 'Rękawiczka: Wszystkie liczby muszą mieć dokładnie 3 cyfry po kropce (np. 12.123)' 
            };
          }
        }
      }
      
      if (value.length > 100) {
        return { 
          isValid: false, 
          message: 'Poz_Kod może mieć maksymalnie 100 znaków' 
        };
      }
      
      return { isValid: true, message: '' };
    }
    
    // Default validation
    const decimalMatches = value.match(/\d+\.\d+/g);
    if (decimalMatches) {
      for (let match of decimalMatches) {
        const decimalPart = match.split('.')[1];
        if (decimalPart && decimalPart.length > 3) {
          return { 
            isValid: false, 
            message: 'Poz_Kod nie może zawierać liczb z więcej niż 3 cyframi po kropce' 
          };
        }
      }
    }
    
    if (value.length > 100) {
      return { 
        isValid: false, 
        message: 'Poz_Kod może mieć maksymalnie 100 znaków' 
      };
    }
    
    return { isValid: true, message: '' };
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = getApiUrl("/excel/remaining-products/get-all-remaining-products");
      const response = await tokenService.authenticatedFetch(url);
      
      if (response.ok) {
        const data = await response.json();
        
        // Sort by number descending (newest first)
        const sortedProducts = (data.remainingProducts || []).sort((a, b) => {
          return Number(b.Poz_Nr) - Number(a.Poz_Nr);
        });
        
        setProducts(sortedProducts);
      }
    } catch (error) {
      setErrorMessage("Nie udało się pobrać listy produktów");
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    try {
      setLoading(true);
      
      // Get all products to find next number
      const url = getApiUrl("/excel/remaining-products/get-all-remaining-products");
      const response = await tokenService.authenticatedFetch(url);
      
      if (!response.ok) {
        throw new Error("Nie udało się pobrać listy produktów");
      }
      
      const data = await response.json();
      const productList = data.remainingProducts || [];
      
      let nextPozNr;
      if (productList.length === 0) {
        // First row - use starting number, validate range
        if (startingNumber < 10 || startingNumber > 99) {
          setErrorMessage("Numer początkowy musi być w zakresie 10-99.");
          setShowErrorModal(true);
          setLoading(false);
          return;
        }
        nextPozNr = startingNumber;
      } else {
        const maxPozNr = Math.max(...productList.map(product => Number(product.Poz_Nr) || 0));
        nextPozNr = maxPozNr + 1;
      }
      
      // Check if we reached the limit (max 99)
      if (nextPozNr > 99) {
        setErrorMessage("Osiągnięto maksymalną liczbę produktów (99). Nie można dodać więcej.");
        setShowErrorModal(true);
        setLoading(false);
        return;
      }
      
      // Create new product
      const newProduct = {
        Poz_Nr: nextPozNr,
        Poz_Kod: ""
      };
      
      const addUrl = getApiUrl("/excel/remaining-products/insert-remaining-products");
      const addResponse = await tokenService.authenticatedFetch(addUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([newProduct]),
      });
      
      if (addResponse.ok) {
        setSuccessMessage("Nowy produkt został dodany");
        setShowSuccessModal(true);
        fetchProducts();
      } else {
        const errorData = await addResponse.json();
        setErrorMessage(errorData.error?.message || "Nie udało się dodać produktu");
        setShowErrorModal(true);
      }
    } catch (error) {
      setErrorMessage("Wystąpił błąd podczas dodawania produktu");
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product) => {
    const defaultProductType = product.productType || 'Rękawiczka';
    setEditingProduct(product);
    setPozNr(product.Poz_Nr.toString());
    setPozKod(product.Poz_Kod || "");
    setProductType(defaultProductType);
    
    // Validate existing code
    if (product.Poz_Kod) {
      const validation = validatePozKod(product.Poz_Kod, defaultProductType);
      setValidationMessage(validation.isValid ? '' : validation.message);
    } else {
      setValidationMessage('');
    }
    
    setShowModal(true);
  };

  const handlePozKodChange = (text) => {
    setPozKod(text);
    
    // Real-time validation feedback
    if (text !== '') {
      const validation = validatePozKod(text, productType);
      setValidationMessage(validation.isValid ? '' : validation.message);
    } else {
      setValidationMessage('');
    }
  };

  const handleProductTypeChange = (value) => {
    setProductType(value);
    
    // Update validation for current value with new product type
    if (pozKod !== '') {
      const validation = validatePozKod(pozKod, value);
      setValidationMessage(validation.isValid ? '' : validation.message);
    } else {
      setValidationMessage('');
    }
  };

  const handleSaveProduct = async () => {
    // Validate before saving
    const validation = validatePozKod(pozKod, productType);
    if (!validation.isValid) {
      setErrorMessage(validation.message);
      setShowErrorModal(true);
      return;
    }
    
    // Check for duplicate Poz_Kod (only if not empty)
    if (pozKod !== "") {
      const duplicate = products.find(
        product => 
          product.Poz_Kod === pozKod && 
          product._id !== editingProduct?._id
      );

      if (duplicate) {
        setErrorMessage(`Kod "${pozKod}" już istnieje w bazie danych. Proszę wybrać inną wartość.`);
        setShowErrorModal(true);
        return;
      }
    }

    try {
      const url = getApiUrl(`/excel/remaining-products/update-remaining-products/${editingProduct._id}`);
      const response = await tokenService.authenticatedFetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Poz_Kod: pozKod,
          productType: productType,
        }),
      });

      if (response.ok) {
        setSuccessMessage("Produkt został zaktualizowany");
        setShowModal(false);
        setValidationMessage('');
        setShowSuccessModal(true);
        fetchProducts();
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error?.message || "Nie udało się zaktualizować produktu");
        setShowErrorModal(true);
      }
    } catch (error) {
      setErrorMessage("Wystąpił błąd podczas zapisywania");
      setShowErrorModal(true);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.Poz_Kod?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.Poz_Nr?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.productType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderProduct = ({ item, index }) => {
    return (
      <View style={styles.productCard}>
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Text style={styles.productNumber}>Nr: {item.Poz_Nr}</Text>
            <Text style={styles.productCode}>
              Kod: {item.Poz_Kod || "(Brak kodu)"}
            </Text>
            {item.productType && (
              <Text style={styles.productTypeText}>
                Typ: {item.productType}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditProduct(item)}
        >
          <Ionicons name="pencil" size={18} color="#fff" />
          <Text style={styles.editButtonText}>Edytuj</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pozostały asortyment</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddProduct}
          disabled={loading}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={20} color="#F59E0B" />
        <Text style={styles.infoText}>
          Zakres: 10-99 (max 90 pozycji)
        </Text>
      </View>

      {/* Starting Number Input - only visible when list is empty */}
      {products.length === 0 && !loading && (
        <View style={styles.startingNumberContainer}>
          <Text style={styles.startingNumberLabel}>Numer początkowy:</Text>
          <TextInput
            style={styles.startingNumberInput}
            value={startingNumber.toString()}
            onChangeText={(text) => {
              const num = parseInt(text) || 10;
              if (num < 10) {
                setStartingNumber(10);
              } else if (num > 99) {
                setStartingNumber(99);
              } else {
                setStartingNumber(num);
              }
            }}
            keyboardType="numeric"
            placeholder="10"
            placeholderTextColor="#64748B"
          />
          <Text style={styles.startingNumberHint}>(zakres: 10-99)</Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Szukaj produktu..."
          placeholderTextColor="#64748B"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm("")}>
            <Ionicons name="close-circle" size={20} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Products List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color="#475569" />
          <Text style={styles.emptyText}>
            {searchTerm ? "Nie znaleziono produktów" : "Brak produktów"}
          </Text>
          {!searchTerm && (
            <Text style={styles.emptyHint}>
              Naciśnij "+" aby dodać nowy produkt
            </Text>
          )}
        </View>
      ) : (
        <>
          <View style={styles.countContainer}>
            <Text style={styles.countText}>
              Znaleziono: {filteredProducts.length} / {products.length} produktów
            </Text>
          </View>
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {/* Edit Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowModal(false);
          setValidationMessage('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Edytuj produkt
              </Text>
              <TouchableOpacity onPress={() => {
                setShowModal(false);
                setValidationMessage('');
              }}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Numer produktu */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Numer produktu</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputDisabled]}
                  value={pozNr}
                  editable={false}
                />
                <Text style={styles.formHint}>Numer nie może być edytowany</Text>
              </View>

              {/* Typ produktu */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Typ produktu</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={productType}
                    onValueChange={handleProductTypeChange}
                    style={styles.picker}
                    dropdownIconColor="#fff"
                  >
                    <Picker.Item label="Rękawiczka" value="Rękawiczka" />
                    <Picker.Item label="Pasek" value="Pasek" />
                  </Picker>
                </View>
                <Text style={styles.formHint}>
                  {productType === 'Pasek' 
                    ? 'Pasek: 3 wielkie litery + spacja + 3 cyfry (np. APS 052)'
                    : 'Rękawiczka: liczba z kropką i 3 cyfry po niej (np. 12.123)'
                  }
                </Text>
              </View>

              {/* Kod produktu */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Kod produktu</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={productType === 'Pasek' ? "np. APS 052" : "np. Rekawiczka12.123"}
                  placeholderTextColor="#64748B"
                  value={pozKod}
                  onChangeText={handlePozKodChange}
                  autoCapitalize={productType === 'Pasek' ? 'characters' : 'none'}
                />
                {validationMessage !== '' && (
                  <Text style={styles.validationError}>{validationMessage}</Text>
                )}
                <Text style={styles.formHint}>
                  Kod musi być unikalny (jeśli podany)
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowModal(false);
                  setValidationMessage('');
                }}
              >
                <Text style={styles.cancelButtonText}>Anuluj</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveProduct}
              >
                <Text style={styles.saveButtonText}>Zapisz</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Sukces!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="close-circle" size={64} color="#DC2626" />
            </View>
            <Text style={styles.successTitle}>Błąd</Text>
            <Text style={styles.successMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: '#DC2626' }]}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#000000",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F59E0B",
    borderRadius: 20,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#94A3B8",
  },
  startingNumberContainer: {
    backgroundColor: "#0A0A0A",
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  startingNumberLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  startingNumberInput: {
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#fff",
    marginBottom: 4,
  },
  startingNumberHint: {
    fontSize: 12,
    color: "#64748B",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0A0A0A",
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#fff",
  },
  countContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  countText: {
    fontSize: 14,
    color: "#64748B",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 16,
    textAlign: "center",
  },
  emptyHint: {
    fontSize: 14,
    color: "#475569",
    marginTop: 8,
    textAlign: "center",
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  productCard: {
    backgroundColor: "#0A0A0A",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  productHeader: {
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F59E0B",
    marginBottom: 4,
  },
  productCode: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 2,
  },
  productTypeText: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    backgroundColor: "#F59E0B",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0A0A0A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#fff",
  },
  formInputDisabled: {
    backgroundColor: "#0A0A0A",
    color: "#64748B",
  },
  pickerContainer: {
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 12,
    overflow: "hidden",
  },
  picker: {
    color: "#fff",
    backgroundColor: "transparent",
  },
  formHint: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  validationError: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#1E293B",
  },
  saveButton: {
    backgroundColor: "#F59E0B",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  successModalContent: {
    backgroundColor: "#0A0A0A",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    width: "80%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
});

export default RemainingProductsList;
