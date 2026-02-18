import React, { useState, useEffect, useRef, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import axios from "axios";
import { getApiUrl, API_CONFIG } from "../config/api";
import { GlobalStateContext } from "../context/GlobalState";

const WarehouseMobile = () => {
  const insets = useSafeAreaInsets();
  const { user, isLoggedIn, getValidAccessToken } = useContext(GlobalStateContext);

  // State management
  const [goods, setGoods] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCorrection, setIsCorrection] = useState(false); // Correction mode state

  const [productName, setProductName] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState("1");

  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredSizes, setFilteredSizes] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [priceList, setPriceList] = useState([]); // State for dedykowany cennik
  const [editingItem, setEditingItem] = useState(null); // State for edit modal
  const [editFullName, setEditFullName] = useState("");
  const [editDate, setEditDate] = useState(new Date());
  const [editSize, setEditSize] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);

  // Notification Modal states
  const [notificationModal, setNotificationModal] = useState({
    visible: false,
    title: "",
    message: "",
    type: "error", // 'error', 'success', 'confirmation'
    confirmText: "OK",
    cancelText: "Anuluj",
    onConfirm: null,
    onCancel: null,
  });

  const productInputRef = useRef(null);
  const sizeInputRef = useRef(null);

  // Fetch initial data
  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    const initializeFetch = async () => {
      setLoading(true);
      try {
        // Get fresh token for API calls
        const accessToken = await getValidAccessToken();
        
        await Promise.all([
          fetchGoods(accessToken),
          fetchSizes(accessToken),
          fetchTableData(accessToken),
        ]);
      } catch (error) {
        console.error("❌ Error during initial fetch:", error.message);
      } finally {
        setLoading(false);
      }
    };

    initializeFetch();
  }, [isLoggedIn, getValidAccessToken]);

  const fetchGoods = async (token) => {
    try {
      
      // Step 1: Fetch all users to find MAGAZYN
      const usersUrl = getApiUrl("/user");
      const usersResponse = await axios.get(usersUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const magazynUser = usersResponse.data?.users?.find(u => u.symbol === 'MAGAZYN');
      const magazynUserId = magazynUser?._id;
      
      // Step 2: Fetch dedykowany cennik if MAGAZYN user exists
      let priceList = null;
      if (magazynUserId) {
        try {
          const priceListUrl = getApiUrl(`/pricelists/${magazynUserId}`);
          const priceListResponse = await axios.get(priceListUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });
          priceList = priceListResponse.data?.priceList || [];
        } catch (error) {
          // Continue without dedykowany cennik
        }
      }
      
      // Step 3: Fetch base goods
      const url = getApiUrl("/excel/goods/get-all-goods");
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.data?.goods && Array.isArray(response.data.goods)) {
        // Step 4: Merge with dedykowany cennik prices
        const mergedGoods = response.data.goods.map(good => {
          let finalPrice = good.price;
          let finalDiscountPrice = good.discount_price;
          
          if (priceList && priceList.length > 0) {
            const priceListItem = priceList.find(item => 
              (item.originalGoodId && item.originalGoodId === good._id) ||
              item.fullName === good.fullName
            );
            
            if (priceListItem) {
              finalPrice = priceListItem.price !== undefined ? priceListItem.price : finalPrice;
              finalDiscountPrice = priceListItem.discountPrice !== undefined ? priceListItem.discountPrice : finalDiscountPrice;
              

            }
          }
          
          return {
            ...good,
            price: finalPrice,
            discount_price: finalDiscountPrice
          };
        });
        
        const validGoods = mergedGoods.filter(
          (good) => good.fullName && good.fullName.trim() !== ""
        );
        
        setGoods(validGoods);
        setFilteredProducts(validGoods);
      } else {
        console.warn("⚠️ No goods array found in response, response.data:", response.data);
      }
    } catch (error) {
      console.error("❌ Error fetching goods:", error.message);
      console.error("🔴 Error response status:", error.response?.status);
      console.error("🔴 Error response data:", error.response?.data);
    }
  };

  const fetchSizes = async (token) => {
    try {
      const url = getApiUrl("/excel/size/get-all-sizes");
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data?.sizes) {
        setSizes(response.data.sizes);
        setFilteredSizes(response.data.sizes);
      }
    } catch (error) {
      console.error("❌ Error fetching sizes:", error);
    }
  };

  const fetchTableData = async (token) => {
    try {
      // Step 1: Fetch dedykowany cennik
      let fetchedPriceList = null;
      try {
        const usersUrl = getApiUrl("/user");
        const usersResponse = await axios.get(usersUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const magazynUser = usersResponse.data?.users?.find(u => u.symbol === 'MAGAZYN');
        const magazynUserId = magazynUser?._id;
        
        if (magazynUserId) {
          const priceListUrl = getApiUrl(`/pricelists/${magazynUserId}`);
          const priceListResponse = await axios.get(priceListUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });
          fetchedPriceList = priceListResponse.data?.priceList || [];
        }
      } catch (error) {
        // Continue without dedykowany cennik
      }
      
      setPriceList(fetchedPriceList || []);
      
      // Step 2: Fetch state data
      const url = getApiUrl("/state");
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data) {
        // Sort by createdAt descending (newest first)
        const sortedData = [...response.data].sort((a, b) => {
          const dateA = new Date(a.createdAt || a.date || 0);
          const dateB = new Date(b.createdAt || b.date || 0);
          return dateB - dateA;
        });
        setTableData(sortedData);
      }
    } catch (error) {
      console.error("Error fetching table data:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const accessToken = await getValidAccessToken();
      await fetchTableData(accessToken);
    } catch (error) {
      console.error("Error during refresh:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle product name input
  const handleProductNameChange = (text) => {
    setProductName(text);
    if (text.trim()) {
      const filtered = goods.filter((good) =>
        good.fullName.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredProducts(filtered);
      setShowProductDropdown(true);
    } else {
      setFilteredProducts(goods);
      setShowProductDropdown(false);
    }
  };

  // Handle size input
  const handleSizeChange = (text) => {
    setSelectedSize(text);
    if (text.trim()) {
      const filtered = sizes.filter((size) =>
        size.Roz_Opis.toLowerCase() === text.toLowerCase()
      );
      setFilteredSizes(filtered);
      setShowSizeDropdown(true);
    } else {
      setFilteredSizes(sizes);
      setShowSizeDropdown(false);
    }
  };

  // Select product from dropdown
  const selectProduct = (product) => {
    setProductName(product.fullName);
    setShowProductDropdown(false);
    setTimeout(() => {
      sizeInputRef.current?.focus();
    }, 100);
  };

  // Select size and add product
  const selectSize = (size) => {
    setSelectedSize(size.Roz_Opis);
    setShowSizeDropdown(false);
    addProduct(size.Roz_Opis);
  };

  // Add product to warehouse
  const addProduct = async (sizeValue) => {
    if (!productName.trim()) {
      showNotification({
        title: "Błąd",
        message: "Wybierz nazwę produktu",
        type: "error",
      });
      return;
    }

    if (!sizeValue.trim()) {
      showNotification({
        title: "Błąd",
        message: "Wybierz rozmiar",
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      // Get fresh token before making request
      const accessToken = await getValidAccessToken();

      const selectedGood = goods.find((g) => g.fullName === productName);
      if (!selectedGood) {
        console.error("Product not found. Searching for:", productName);
        console.error("Available products:", goods.map(g => g.fullName));
        showNotification({
          title: "Błąd",
          message: "Produkt nie znaleziony w bazie",
          type: "error",
        });
        setLoading(false);
        return;
      }
      
      // For MAGAZYN (warehouse), get price from dedicated price list
      let finalPrice = selectedGood.price;
      let finalDiscountPrice = selectedGood.discount_price || 0;
      
      try {
        // Fetch users to find MAGAZYN ID dynamically
        const usersUrl = getApiUrl("/user");
        const usersResponse = await axios.get(usersUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const magazynUser = usersResponse.data?.users?.find(u => u.symbol === 'MAGAZYN');
        const magazynUserId = magazynUser?._id;
        
        if (magazynUserId) {
          const priceListUrl = getApiUrl(`/pricelists/${magazynUserId}`);
          const priceListResponse = await axios.get(priceListUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          
          const priceList = priceListResponse.data?.priceList || [];
          
          if (priceList && priceList.length > 0) {
            const priceListItem = priceList.find(item =>
              (item.originalGoodId && item.originalGoodId === selectedGood._id) ||
              item.fullName === selectedGood.fullName
            );
            
            if (priceListItem && priceListItem.price !== undefined) {
              finalPrice = priceListItem.price;
              finalDiscountPrice = priceListItem.discountPrice || 0;
            }
          }
        }
      } catch (priceError) {
        // If price list fetch fails, fall back to product price
      }

      const dataToSend = {
        fullName: productName,
        size: sizeValue,
        plec: selectedGood.gender || "Unisex",
        date: selectedDate.toISOString(),
        sellingPoint: "MAGAZYN",
        // Backend expects price in "price;discount_price" format as string
        price: `${finalPrice};${finalDiscountPrice || 0}`,
        isCorrection: isCorrection, // Add correction mode flag
      };
      
      // Add product multiple times based on quantity
      const quantityNum = parseInt(quantity) || 1;
      const url = getApiUrl("/state");
      for (let i = 0; i < quantityNum; i++) {
        await axios.post(url, dataToSend, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }
      
      // Reset form
      setProductName("");
      setSelectedSize("");
      setQuantity("1");
      
      // Refresh table and refocus on product input
      await fetchTableData(accessToken);
      setTimeout(() => {
        productInputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error("❌ Error adding product to warehouse:", error.response?.data || error.message);
      showNotification({
        title: "Błąd",
        message: error.response?.data?.message || error.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete product from warehouse
  const deleteProduct = async (id) => {
    const alertTitle = isCorrection 
      ? "Usuń produkt (korekta - zostanie uwzględniona w raportach)"
      : "Usuń produkt (produkcja)";
    const alertMessage = "Czy chcesz usunąć ten produkt?";
    
    showNotification({
      title: alertTitle,
      message: alertMessage,
      type: "confirmation",
      confirmText: "Usuń",
      cancelText: "Anuluj",
      onConfirm: async () => {
        try {
          const accessToken = await getValidAccessToken();
          const deleteUrl = getApiUrl(`/state/${id}`);
          await axios.delete(deleteUrl, {
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              "is-correction": isCorrection ? "true" : "false"
            },
          });
          await fetchTableData(accessToken);
          showNotification({
            title: "Sukces",
            message: "Produkt usunięty",
            type: "success",
          });
        } catch (error) {
          showNotification({
            title: "Błąd",
            message: error.message,
            type: "error",
          });
        }
      },
    });
  };

  // Handle date picker change
  const handleDateChange = (event, date) => {
    if (date) {
      setSelectedDate(date);
    }
    setShowDatePicker(false);
  };

  // Render product row
  // Handle edit button click
  const handleEditClick = (item) => {
    setEditingItem(item);
    setEditFullName(item.fullName);
    setEditDate(new Date(item.date));
    setEditSize(item.size);
    setShowEditModal(true);
  };

  // Save edited product
  const handleSaveEdit = async () => {
    if (!editFullName.trim()) {
      showNotification({
        title: "Błąd",
        message: "Nazwa produktu nie może być pusta",
        type: "error",
      });
      return;
    }

    try {
      const accessToken = await getValidAccessToken();
      const updateUrl = getApiUrl(`/state/${editingItem.id || editingItem._id}`);
      await axios.put(updateUrl, {
        fullName: editFullName,
        date: editDate.toISOString(),
        size: editSize,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      setShowEditModal(false);
      await fetchTableData(accessToken);
    } catch (error) {
      showNotification({
        title: "Błąd",
        message: error.response?.data?.message || error.message,
        type: "error",
      });
    }
  };

  // Handle print button
  const handlePrintLabel = async (item) => {
    try {
      // For mobile, we'll simulate printing by sharing the data
      // In a real app, you'd send to a Zebra printer API or print service
      const labelData = `${item.fullName}\nRozmiar: ${item.size}\nData: ${new Date(item.date).toLocaleDateString("pl-PL")}\nBarcode: ${item.barcode || "N/A"}`;
      
      // Show success notification
      showNotification({
        title: "Drukuj",
        message: "Drukowanie etykiety (Integracja z drukarką Zebra - w pełnej wersji)",
        type: "success",
        confirmText: "OK",
        onConfirm: () => {},
      });
    } catch (error) {
      showNotification({
        title: "Błąd",
        message: "Nie udało się drukować etykiety",
        type: "error",
      });
    }
  };

  // Helper function to show notifications
  const showNotification = ({
    title = "",
    message = "",
    type = "error",
    confirmText = "OK",
    cancelText = "Anuluj",
    onConfirm = null,
    onCancel = null,
  }) => {
    setNotificationModal({
      visible: true,
      title,
      message,
      type,
      confirmText,
      cancelText,
      onConfirm,
      onCancel,
    });
  };

  // Helper function to safely convert any value to string
  const safeString = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === "string") return val;
    if (typeof val === "number") return val.toString();
    if (typeof val === "object") {
      if (val.Roz_Opis) return String(val.Roz_Opis);
      return String(val.toString ? val.toString() : "");
    }
    return String(val);
  };

  const renderTableRow = ({ item, index }) => {
    // Step 1: Get final price and exceptions from dedykowany cennik if available
    let displayPrice = item.price;
    let displayDiscountPrice = item.discount_price;
    let displayPriceExceptions = item.priceExceptions;
    let priceListItem = null;
    const fullNameStr = typeof item.fullName === "string"
      ? item.fullName
      : (item.fullName?.fullName || safeString(item.fullName));

    if (priceList && priceList.length > 0 && item.fullName) {
      priceListItem = priceList.find(pli =>
        (pli.fullName && pli.fullName === fullNameStr) ||
        (pli.originalGoodId && item.fullName?._id && pli.originalGoodId === item.fullName._id.toString())
      );
      
      if (priceListItem) {
        displayPrice = priceListItem.price !== undefined ? priceListItem.price : displayPrice;
        displayDiscountPrice = priceListItem.discountPrice !== undefined ? priceListItem.discountPrice : displayDiscountPrice;
        displayPriceExceptions = priceListItem.priceExceptions !== undefined ? priceListItem.priceExceptions : displayPriceExceptions;
      }
    }

    if (!priceListItem && goods && goods.length > 0) {
      const goodsItem = goods.find(good =>
        (item.fullName?._id && good._id && good._id === item.fullName._id) ||
        good.fullName === fullNameStr
      );

      if (goodsItem) {
        displayPrice = goodsItem.price !== undefined ? goodsItem.price : displayPrice;
        displayDiscountPrice = goodsItem.discount_price !== undefined ? goodsItem.discount_price : displayDiscountPrice;
        displayPriceExceptions = goodsItem.priceExceptions !== undefined ? goodsItem.priceExceptions : displayPriceExceptions;
      }
    }
    
    // Compute exceptions string - ensure all values are strings
    const exceptionsText = displayPriceExceptions && displayPriceExceptions.length > 0
      ? displayPriceExceptions
          .map((e) => {
            if (!e) return "";
            const sizeLabel = (e.size && e.size.Roz_Opis) || e.size || "";
            const exceptionValue = e.value !== undefined && e.value !== null ? e.value : "";
            if (!sizeLabel && exceptionValue === "") return "";
            return exceptionValue === "" ? safeString(sizeLabel) : `${safeString(sizeLabel)}=${safeString(exceptionValue)}`;
          })
          .filter(Boolean)
          .join(", ")
      : null;

    return (
      <View style={styles.card}>
        {/* Card number */}
        <Text style={styles.cardNumber}>{`#${index + 1}`}</Text>

        {/* Product name - main content */}
        <Text style={styles.cardProductName} numberOfLines={2}>
          {safeString(item.fullName)}
        </Text>

        {/* Info rows */}
        <View style={styles.cardInfoRow}>
          <Text style={styles.cardInfoLabel}>Rozmiar:</Text>
          <Text style={styles.cardInfoValue}>{safeString(item.size)}</Text>
        </View>

        <View style={styles.cardInfoRow}>
          <Text style={styles.cardInfoLabel}>Data:</Text>
          <Text style={styles.cardInfoValue}>
            {item.date ? safeString(new Date(item.date).toLocaleDateString("pl-PL")) : "N/A"}
          </Text>
        </View>

        {item.symbol ? (
          <View style={styles.cardInfoRow}>
            <Text style={styles.cardInfoLabel}>Symbol:</Text>
            <Text style={styles.cardInfoValue}>{safeString(item.symbol)}</Text>
          </View>
        ) : null}

        {displayPrice ? (
          <View style={styles.cardInfoRow}>
            <Text style={styles.cardInfoLabel}>Cena (PLN):</Text>
            <Text style={styles.cardInfoValue}>{typeof displayPrice === 'number' ? displayPrice.toFixed(2) : safeString(displayPrice)}</Text>
          </View>
        ) : null}

        {displayDiscountPrice ? (
          <View style={styles.cardInfoRow}>
            <Text style={styles.cardInfoLabel}>Cena promocyjna:</Text>
            <Text style={styles.cardInfoValue}>{typeof displayDiscountPrice === 'number' ? displayDiscountPrice.toFixed(2) : safeString(displayDiscountPrice)}</Text>
          </View>
        ) : null}

        {exceptionsText ? (
          <View style={styles.cardInfoRow}>
            <Text style={styles.cardInfoLabel}>Wyjątki:</Text>
            <Text style={styles.cardInfoValue}>{safeString(exceptionsText)}</Text>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={styles.cardActionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditClick(item)}
          >
            <Ionicons name="pencil" size={16} color="#FFC107" />
            <Text style={styles.actionButtonText}>Edytuj</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.printButton]}
            onPress={() => handlePrintLabel(item)}
          >
            <Ionicons name="print" size={16} color="#0D6EFD" />
            <Text style={styles.actionButtonText}>Drukuj</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => deleteProduct(item.id || item._id)}
          >
            <Ionicons name="trash" size={16} color="#FF6B6B" />
            <Text style={styles.actionButtonText}>Usuń</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#000000" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Magazyn</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.content}
      >

        {/* Input Form */}
        <View style={styles.formContainer}>
          {/* Correction Mode Info Alert with Checkbox */}
          <View style={styles.correctionAlert}>
            <Pressable
              style={styles.checkboxContainer}
              onPress={() => setIsCorrection(!isCorrection)}
            >
              <View
                style={[
                  styles.checkbox,
                  isCorrection && styles.checkboxChecked,
                ]}
              >
                {isCorrection && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <Text style={styles.correctionLabel}>Tryb korekty</Text>
            </Pressable>
            <Text style={styles.correctionInfo}>
              ℹ️ <Text style={{ fontWeight: "bold" }}>Informacja:</Text> Checkbox
              jest przeznaczony dla korekt inwentaryzacyjnych. Wszystkie operacje
              dodawania i usuwania produktów{" "}
              <Text style={{ fontWeight: "bold" }}>będą uwzględniane w raportach</Text>.
            </Text>
          </View>

          <Text style={styles.label}>Ilość</Text>
          <TextInput
            style={styles.input}
            placeholder="1"
            placeholderTextColor="#666"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Nazwa produktu</Text>
          <View style={styles.dropdownContainer}>
            <TextInput
              ref={productInputRef}
              style={styles.input}
              placeholder="Wpisz nazwę produktu"
              placeholderTextColor="#666"
              value={productName}
              onChangeText={handleProductNameChange}
              returnKeyType="next"
              onSubmitEditing={() => sizeInputRef.current?.focus()}
            />
            {showProductDropdown && filteredProducts.length > 0 && (
              <ScrollView
                style={styles.dropdownMenu}
                nestedScrollEnabled={true}
                scrollEnabled={filteredProducts.length > 5}
              >
                {filteredProducts.slice(0, 10).map((product, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.dropdownItem}
                    onPress={() => selectProduct(product)}
                  >
                    <Text style={styles.dropdownItemText}>
                      {product.fullName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <Text style={styles.label}>Rozmiar</Text>
          <View style={styles.dropdownContainer}>
            <TextInput
              ref={sizeInputRef}
              style={styles.input}
              placeholder="Wpisz rozmiar"
              placeholderTextColor="#666"
              value={selectedSize}
              onChangeText={handleSizeChange}
              returnKeyType="done"
            />
            {showSizeDropdown && filteredSizes.length > 0 && (
              <ScrollView
                style={styles.dropdownMenu}
                nestedScrollEnabled={true}
                scrollEnabled={filteredSizes.length > 5}
              >
                {filteredSizes.map((size, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.dropdownItem}
                    onPress={() => selectSize(size)}
                  >
                    <Text style={styles.dropdownItemText}>
                      {size.Roz_Opis}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <Text style={styles.label}>Data</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color="#0D6EFD" />
            <Text style={styles.dateText}>
              {selectedDate.toLocaleDateString("pl-PL")}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              locale="pl"
            />
          )}
        </View>

        {/* Products List as Cards */}
        <FlatList
          data={tableData}
          renderItem={renderTableRow}
          keyExtractor={(item, idx) => item._id || idx.toString()}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Brak produktów w magazynie</Text>
          }
        />
      </ScrollView>

      {/* Edit Modal */}
      {showEditModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edytuj produkt</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.label}>Nazwa produktu</Text>
              <TextInput
                style={styles.input}
                placeholder="Nazwa produktu"
                placeholderTextColor="#666"
                value={editFullName}
                onChangeText={setEditFullName}
              />

              <Text style={styles.label}>Rozmiar</Text>
              <TextInput
                style={styles.input}
                placeholder="Rozmiar"
                placeholderTextColor="#666"
                value={editSize}
                onChangeText={setEditSize}
              />

              <Text style={styles.label}>Data</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color="#0D6EFD" />
                <Text style={styles.dateText}>
                  {editDate.toLocaleDateString("pl-PL")}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={editDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => {
                    if (date) setEditDate(date);
                    setShowDatePicker(false);
                  }}
                />
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalButtonText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalButtonText}>Zapisz</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Notification Modal */}
      {notificationModal.visible && (
        <View style={styles.notificationOverlay}>
          <View style={styles.notificationModal}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>
                {notificationModal.title}
              </Text>
            </View>

            <View style={styles.notificationContent}>
              <Text style={styles.notificationMessage}>
                {notificationModal.message}
              </Text>
            </View>

            <View style={styles.notificationFooter}>
              {notificationModal.type === "confirmation" && (
                <TouchableOpacity
                  style={styles.notificationButtonCancel}
                  onPress={() => {
                    if (notificationModal.onCancel) {
                      notificationModal.onCancel();
                    }
                    setNotificationModal({ ...notificationModal, visible: false });
                  }}
                >
                  <Text style={styles.notificationButtonText}>
                    {notificationModal.cancelText}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.notificationButton,
                  notificationModal.type === "success"
                    ? styles.notificationButtonSuccess
                    : notificationModal.type === "confirmation"
                    ? styles.notificationButtonConfirm
                    : styles.notificationButtonError,
                ]}
                onPress={() => {
                  if (notificationModal.onConfirm) {
                    notificationModal.onConfirm();
                  }
                  setNotificationModal({ ...notificationModal, visible: false });
                }}
              >
                <Text style={styles.notificationButtonText}>
                  {notificationModal.confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
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
    flex: 1,
    textAlign: "center",
  },
  content: {
    flex: 1,
    padding: 15,
  },
  formContainer: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 15,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  label: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "black",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 6,
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  correctionAlert: {
    backgroundColor: "#1a472a",
    borderWidth: 1,
    borderColor: "#0D6EFD",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#0D6EFD",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    backgroundColor: "#0D6EFD",
  },
  checkmark: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  correctionLabel: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  correctionInfo: {
    color: "#ccc",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  dropdownContainer: {
    position: "relative",
    marginBottom: 0,
  },
  dropdownMenu: {
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 6,
    marginTop: 4,
    maxHeight: 150,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  dropdownItemText: {
    color: "white",
    fontSize: 13,
  },
  dateButton: {
    backgroundColor: "black",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateText: {
    color: "white",
    fontSize: 14,
  },
  addButton: {
    backgroundColor: "#0D6EFD",
    borderRadius: 6,
    paddingVertical: 12,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginBottom: 0,
    marginTop: -8,
  },
  tableCell: {
    color: "#888",
    fontSize: 11,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 12,
    position: "relative",
  },
  cardNumber: {
    fontSize: 11,
    color: "#888",
    marginBottom: 8,
    fontWeight: "600",
  },
  cardProductName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
    lineHeight: 18,
  },
  cardInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    alignItems: "center",
  },
  cardInfoLabel: {
    fontSize: 11,
    color: "#888",
    fontWeight: "600",
    flex: 0.4,
  },
  cardInfoValue: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "500",
    flex: 0.6,
    textAlign: "right",
  },
  cardActionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  editButton: {
    borderColor: "#FFC107",
    backgroundColor: "#3d3a00",
  },
  printButton: {
    borderColor: "#0D6EFD",
    backgroundColor: "#0d1f36",
  },
  deleteButton: {
    borderColor: "#FF6B6B",
    backgroundColor: "#3d1a1a",
  },
  actionButtonText: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  cardDeleteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 8,
    backgroundColor: "#222",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    paddingVertical: 20,
    fontSize: 14,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
    backgroundColor: "#1a1a1a",
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  modalButton: {
    flex: 1,
    backgroundColor: "#555",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#666",
  },
  modalButtonSave: {
    backgroundColor: "#4CAF50",
    borderColor: "#45a049",
  },
  modalButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  notificationModal: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    minWidth: 280,
    maxWidth: "85%",
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  notificationHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  notificationTitle: {
    color: "white",
    fontSize: 17,
    fontWeight: "bold",
  },
  notificationContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  notificationMessage: {
    color: "#ccc",
    fontSize: 14,
    lineHeight: 20,
  },
  notificationFooter: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
    justifyContent: "flex-end",
  },
  notificationButton: {
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  notificationButtonSuccess: {
    backgroundColor: "#4CAF50",
    borderColor: "#45a049",
  },
  notificationButtonConfirm: {
    backgroundColor: "#0D6EFD",
    borderColor: "#0a4fc4",
  },
  notificationButtonError: {
    backgroundColor: "#555",
    borderColor: "#666",
  },
  notificationButtonCancel: {
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: "#333",
    borderColor: "#555",
  },
  notificationButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  notificationOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
});

export default WarehouseMobile;
