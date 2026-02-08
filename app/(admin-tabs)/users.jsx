import React, { useContext, useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { GlobalStateContext } from "../../context/GlobalState";
import tokenService from "../../services/tokenService";
import { getApiUrl } from "../../config/api";
import LogoutButton from "../../components/LogoutButton";

const Users = () => {
  const insets = useSafeAreaInsets(); // Get safe area insets
  const { users, fetchUsers } = useContext(GlobalStateContext);
  
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [userSymbol, setUserSymbol] = useState("");
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");

  // Filter out admin users
  const filteredUsers = users.filter((u) => !u.isAdmin);

  useEffect(() => {
    if (users.length === 0) {
      fetchUsers();
    }
  }, []);

  const fetchItemsToPick = async () => {
    if (!selectedUserId) {
      setInfoMessage("Wybierz najpierw użytkownika");
      setShowInfoModal(true);
      return;
    }

    try {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split("T")[0];
      const url = getApiUrl(`/state/items-to-pick?userId=${selectedUserId}&date=${dateStr}`);
      
      const response = await tokenService.authenticatedFetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
        setUserSymbol(data.userSymbol || "");
        
        if (data.count === 0) {
          setInfoMessage("Brak kurtek do dobrania dla wybranego użytkownika i daty");
          setShowInfoModal(true);
        }
      } else {
        setInfoMessage("Nie udało się pobrać danych");
        setShowInfoModal(true);
        setItems([]);
      }
    } catch (error) {
      console.error("Error fetching items to pick:", error);
      setInfoMessage("Wystąpił błąd podczas pobierania danych");
      setShowInfoModal(true);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemNumber}>#{index + 1}</Text>
        <View style={styles.itemBadge}>
          <Ionicons name="checkmark-circle" size={20} color="#0D6EFD" />
          <Text style={styles.itemBadgeText}>Do dobrania</Text>
        </View>
      </View>
      
      <View style={styles.itemDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="pricetag" size={18} color="#94A3B8" />
          <Text style={styles.detailLabel}>Nazwa:</Text>
          <Text style={styles.detailValue}>{item.fullName}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="resize" size={18} color="#94A3B8" />
          <Text style={styles.detailLabel}>Rozmiar:</Text>
          <Text style={styles.detailValue}>{item.size}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="barcode" size={18} color="#94A3B8" />
          <Text style={styles.detailLabel}>Kod:</Text>
          <Text style={styles.detailValue}>{item.barcode}</Text>
        </View>
      </View>
    </View>
  );

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="shirt" size={32} color="#fff" />
        </View>
        <Text style={styles.title}>Dobierz Kurtki</Text>
        <Text style={styles.subtitle}>
          Lista kurtek do dobrania z magazynu
        </Text>
      </View>

      {/* User Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>Wybierz użytkownika:</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowUserModal(true)}
        >
          <Text style={styles.selectButtonText}>
            {selectedUserId 
              ? filteredUsers.find(u => u._id === selectedUserId)?.username || 
                filteredUsers.find(u => u._id === selectedUserId)?.email || 
                "Użytkownik"
              : "Wybierz użytkownika..."}
          </Text>
          <Ionicons name="people" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Date Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>Wybierz datę:</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.selectButtonText}>
            {selectedDate.toLocaleDateString("pl-PL")}
          </Text>
          <Ionicons name="calendar" size={24} color="#fff" />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) {
                setSelectedDate(date);
                setItems([]); // Clear items on date change
              }
            }}
          />
        )}
      </View>

      {/* Fetch Button */}
      <TouchableOpacity
        style={[styles.fetchButton, loading && styles.fetchButtonDisabled]}
        onPress={fetchItemsToPick}
        disabled={loading || !selectedUserId}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="search" size={24} color="#fff" />
            <Text style={styles.fetchButtonText}>Pobierz listę</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Results Header */}
      {items.length > 0 && (
        <View style={styles.resultsHeader}>
          <Ionicons name="list" size={24} color="#0D6EFD" />
          <Text style={styles.resultsTitle}>
            Znaleziono: {items.length} {items.length === 1 ? "kurtkę" : "kurtek"}
          </Text>
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={{
      flex: 1,
      backgroundColor: "#000000",
      paddingBottom: Math.max(20, insets.bottom + 20)
    }}>
      <LogoutButton position="top-right" />
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item._id}-${index}`}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="shirt-outline" size={64} color="#475569" />
              <Text style={styles.emptyText}>
                Wybierz użytkownika i datę, aby zobaczyć listę
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={[styles.listContainer, { paddingBottom: Math.max(120, insets.bottom + 120) }]}
        showsVerticalScrollIndicator={false}
      />

      {/* User Selection Modal */}
      <Modal
        visible={showUserModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wybierz użytkownika</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.userItem,
                    selectedUserId === item._id && styles.userItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedUserId(item._id);
                    setShowUserModal(false);
                    setItems([]); // Clear items on user change
                  }}
                >
                  <View style={styles.userItemContent}>
                    <Ionicons 
                      name="person-circle" 
                      size={32} 
                      color={selectedUserId === item._id ? "#0D6EFD" : "#64748B"} 
                    />
                    <View style={styles.userItemText}>
                      <Text style={styles.userItemName}>
                        {item.username || item.email}
                      </Text>
                      {item.symbol && (
                        <Text style={styles.userItemSymbol}>{item.symbol}</Text>
                      )}
                    </View>
                  </View>
                  {selectedUserId === item._id && (
                    <Ionicons name="checkmark-circle" size={24} color="#0D6EFD" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalContent}>
            <View style={styles.infoModalIconContainer}>
              <Ionicons name="information-circle" size={64} color="#0D6EFD" />
            </View>
            <Text style={styles.infoModalTitle}>Informacja</Text>
            <Text style={styles.infoModalMessage}>{infoMessage}</Text>
            <TouchableOpacity
              style={styles.infoModalButton}
              onPress={() => setShowInfoModal(false)}
            >
              <Text style={styles.infoModalButtonText}>OK</Text>
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
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#0D6EFD",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
  },
  section: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  selectButtonText: {
    fontSize: 16,
    color: "#fff",
    flex: 1,
  },
  fetchButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0D6EFD",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  fetchButtonDisabled: {
    backgroundColor: "#475569",
  },
  fetchButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 10,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0D6EFD",
  },
  listContainer: {
    paddingBottom: 20,
  },
  itemCard: {
    marginHorizontal: 20,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  itemNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0D6EFD",
  },
  itemBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D6EFD20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  itemBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0D6EFD",
  },
  itemDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#94A3B8",
    width: 70,
  },
  detailValue: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
    flex: 1,
  },
  emptyContainer: {
    minHeight: 400,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  userItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  userItemSelected: {
    backgroundColor: "#0D6EFD20",
  },
  userItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  userItemText: {
    flex: 1,
  },
  userItemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
  },
  userItemSymbol: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 2,
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  infoModalContent: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#334155",
  },
  infoModalIconContainer: {
    marginBottom: 20,
  },
  infoModalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  infoModalMessage: {
    fontSize: 16,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  infoModalButton: {
    backgroundColor: "#0D6EFD",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 120,
  },
  infoModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
});

export default Users;
