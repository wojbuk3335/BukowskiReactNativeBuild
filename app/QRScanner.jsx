import axios from "axios"; // Import axios for HTTP requests
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useState } from "react";
import { Alert, FlatList, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { getApiUrl } from "../config/api";

const QRScanner = ({ stateData, user, sizes, colors, goods, stocks, users, getFilteredSellingPoints, isActive }) => {
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
  const [sellingPointMenuVisible, setSellingPointMenuVisible] = useState(false); // State for "Sprzedano od" popup
  const availableCurrencies = ["PLN", "HUF", "GBP", "ILS", "USD", "EUR", "CAN"];
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false); // State for currency modal
  const [currentCurrencyPairIndex, setCurrentCurrencyPairIndex] = useState(null); // Track the index of the pair being edited
  const [cameraActive, setCameraActive] = useState(true); // Zarządzanie aktywnością kamery - rozpoczynamy z aktywną kamerą
  const [cameraVisible, setCameraVisible] = useState(true); // Widoczność kamery

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
      const regex = /^(\d{3})(\d{2})(\d{3})0000(\d)$/;
      const match = barcodeData.match(regex);
      
      if (!match) {
        return null; // Not the expected pattern
      }

      const [, stockCode, colorCode, sizeCode] = match;
      
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
      console.error("Error building jacket name from barcode:", error);
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

  const handleScan = ({ data, type }) => {
    if (!scanned) {
      setScanned(true);
      setBarcode(data); // Set the scanned barcode

      // First, try to build jacket name from barcode pattern (four zeros before last digit)
      const builtJacketName = buildJacketNameFromBarcode(data);
      
      if (builtJacketName) {
        // Use the built jacket name for barcodes with four zeros pattern
        setModalMessage(builtJacketName);
        
        // Ustaw domyślny punkt sprzedaży na zalogowanego użytkownika
        const availableOptions = getMatchingSymbols(data); // Przekaż aktualny kod kreskowy
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
      } else {
        // Fall back to original logic - match the scanned barcode with the stateData
        const matchedItem = stateData?.find(item => item.barcode === data);

        if (matchedItem) {
          setModalMessage(`${matchedItem.fullName + ' ' + matchedItem.size}`);
          
          // Ustaw domyślny punkt sprzedaży na zalogowanego użytkownika
          const availableOptions = getMatchingSymbols(data); // Przekaż aktualny kod kreskowy
          if (availableOptions.length > 0) {
            // Sprawdź czy zalogowany użytkownik jest w tej lokalizacji
            const currentUserInLocation = availableOptions.find(option => option.symbol === user?.symbol);
            if (currentUserInLocation) {
              setSelectedOption(user.symbol); // Zalogowany użytkownik jest w lokalizacji - ustaw jako domyślny
            } else {
              setSelectedOption(availableOptions[0].symbol); // Fallback - pierwszy z listy
            }
          } else {
            setSelectedOption(matchedItem.symbol); // Fallback na pierwotną logikę
          }
        } else {
          setModalMessage("Nie ma takiej kurtki"); // No match found
          setSelectedOption(""); // Clear selected option if no match
        }
      }

      setModalVisible(true); // Show the modal
      // Usuwamy automatyczny timeout - reset będzie tylko przy zamykaniu modala
    }
    // Usuwamy log o ignorowaniu skanów żeby nie spamować
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

  const handleSubmit = async () => {
    const matchedItems = stateData?.filter(item => item.barcode === barcode);
    
    let fullName, size, symbol;

    // Sprawdź czy mamy dane z stateData czy z buildJacketNameFromBarcode
    if (matchedItems && matchedItems.length > 0) {
      // Dane z stateData
      fullName = matchedItems[0].fullName;
      size = matchedItems[0].size;
      symbol = selectedOption || matchedItems[0].symbol || "Unknown";
    } else {
      // Dane z buildJacketNameFromBarcode (modalMessage zawiera pełną nazwę)
      const builtJacketName = buildJacketNameFromBarcode(barcode);
      if (builtJacketName) {
        // Spróbuj wyodrębnić nazwę i rozmiar z modalMessage
        const parts = modalMessage.split(' ');
        const sizePart = parts[parts.length - 1]; // Ostatnia część to rozmiar
        const namePart = parts.slice(0, -1).join(' '); // Reszta to nazwa
        
        fullName = namePart || modalMessage;
        size = sizePart || "Unknown";
        symbol = selectedOption || "Generated";
      } else {
        // Fallback dla nieznanych produktów
        fullName = modalMessage || "Unknown Product";
        size = "Unknown";
        symbol = selectedOption || "Unknown";
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

    const payload = {
      fullName,
      timestamp: new Date().toLocaleString(), // Format to include both date and time
      barcode,
      size,
      sellingPoint,
      from: selectedOption || symbol, // Use the selected symbol, not the default sellingPoint
      cash: validCashPrices,
      card: validCardPrices,
      symbol // Add symbol field
    };

    // Walidacja wymaganych pól
    if (!payload.fullName || !payload.size || !payload.from) {
      console.error('❌ Brakuje wymaganych pól:', {
        fullName: payload.fullName,
        size: payload.size,
        from: payload.from
      });
      Alert.alert("Błąd", "Brakuje wymaganych informacji o produkcie");
      return;
    }

    try {
      const response = await axios.post(getApiUrl("/sales/save-sales"), payload);
      Alert.alert("Success", "Dane zostały zapisane pomyślnie!");

      // Reset modal state
      setCashPriceCurrencyPairs([{ price: "", currency: "PLN" }]);
      setCardPriceCurrencyPairs([{ price: "", currency: "PLN" }]);
      setBarcode("");
      setSelectedOption("");
      setModalMessage("");
    } catch (error) {
      console.error("Error saving data:", error);
      Alert.alert("Error", "Failed to save data.");
    }

    setModalVisible(false);
    setScanned(false); // Reset stanu skanowania po submit
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
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Skanuj ponownie</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {modalVisible && (
        <View style={{ flex: 1, backgroundColor: "black", width: "100%", height: "100%", justifyContent: "flex-start", alignItems: "center", zIndex: 5 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
              <View style={[styles.modalContent, { flex: 1, backgroundColor: "black", width: "100%", height: "100%", justifyContent: "flex-start", alignItems: "center", zIndex: 5 }]}>
                <Pressable
                  style={styles.closeButton}
                  onPress={() => {
                    setModalVisible(false);
                    setScanned(false); // Reset stanu skanowania gdy zamykamy modal
                  }}
                >
                  <Text style={styles.closeButtonText}>X</Text>
                </Pressable>
                <Text style={{ fontSize: 16, color: "white", marginBottom: 8 }}>Sprzedano produkt:</Text>
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
                <Text style={{ fontSize: 16, color: "white", marginBottom: 8 }}>Kod kreskowy</Text>
                <TextInput
                  style={styles.inputField}
                  value={barcode}
                  editable={false}
                  placeholder="Barcode"
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
                        {getMatchingSymbols().length > 0 ? (
                          <FlatList
                            data={getMatchingSymbols()}
                            keyExtractor={(item) => item._id}
                            renderItem={({ item }) => (
                              <TouchableOpacity
                                style={styles.currencyModalItem}
                                onPress={() => selectSellingPointFromModal(item.symbol)}
                              >
                                <Text style={styles.currencyModalItemText}>
                                  {item.symbol}
                                </Text>
                              </TouchableOpacity>
                            )}
                          />
                        ) : (
                          <Text style={styles.currencyModalItemText}>
                            {barcode ? 
                              `Brak tego produktu w punktach sprzedaży w lokalizacji "${user?.location || 'nieznana'}"` :
                              'Zeskanuj kod kreskowy aby zobaczyć dostępne punkty sprzedaży'
                            }
                          </Text>
                        )}
                        <Pressable
                          style={styles.currencyModalCloseButton}
                          onPress={() => setSellingPointMenuVisible(false)}
                        >
                          <Text style={styles.currencyModalCloseButtonText}>Zamknij</Text>
                        </Pressable>
                      </View>
                    </View>
                  </Modal>
                )}
                <Text style={{
                  fontSize: 16,
                  marginBottom: 10,
                  textAlign: "center",
                  color: "white",
                }}>Płatność gotówką</Text>
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
                        <FlatList
                          data={availableCurrencies}
                          keyExtractor={(item) => item}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={styles.currencyModalItem}
                              onPress={() => selectCurrencyFromModal(item)}
                            >
                              <Text style={styles.currencyModalItemText}>{item}</Text>
                            </TouchableOpacity>
                          )}
                        />
                        <Pressable
                          style={styles.currencyModalCloseButton}
                          onPress={() => setCurrencyModalVisible(false)}
                        >
                          <Text style={styles.currencyModalCloseButtonText}>Zamknij</Text>
                        </Pressable>
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
                }}>Płatność kartą</Text>
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
        </View>
      )}
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

export default QRScanner;