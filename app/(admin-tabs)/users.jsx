import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import { GlobalStateContext } from "../../context/GlobalState";
import Logger from "../../services/logger";

const Users = () => {
  const { users, fetchUsers, isLoading } = useContext(GlobalStateContext);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      await fetchUsers();
    } catch (error) {
      Logger.error("Error loading users:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin":
        return "shield-checkmark";
      case "magazyn":
        return "cube";
      case "dom":
        return "home";
      default:
        return "person";
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "#dc3545";
      case "magazyn":
        return "#0d6efd";
      case "dom":
        return "#ffc107";
      default:
        return "#198754";
    }
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={[styles.roleIcon, { backgroundColor: getRoleColor(item.role) }]}>
          <Ionicons name={getRoleIcon(item.role)} size={24} color="#fff" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.email}</Text>
          <Text style={styles.userRole}>{item.role.toUpperCase()}</Text>
        </View>
      </View>
      
      {item.symbol && (
        <View style={styles.userDetails}>
          <Text style={styles.userDetailLabel}>Symbol:</Text>
          <Text style={styles.userDetailValue}>{item.symbol}</Text>
        </View>
      )}
      
      {item.sellingPoint && (
        <View style={styles.userDetails}>
          <Text style={styles.userDetailLabel}>Punkt sprzedaży:</Text>
          <Text style={styles.userDetailValue}>{item.sellingPoint}</Text>
        </View>
      )}
      
      {item.location && (
        <View style={styles.userDetails}>
          <Text style={styles.userDetailLabel}>Lokalizacja:</Text>
          <Text style={styles.userDetailValue}>{item.location}</Text>
        </View>
      )}
    </View>
  );

  if (isLoading && !users) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0d6efd" />
          <Text style={styles.loadingText}>Ładowanie użytkowników...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Użytkownicy</Text>
        <Text style={styles.subtitle}>Łącznie: {users?.length || 0}</Text>
      </View>

      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#CDCDE0" />
            <Text style={styles.emptyText}>Brak użytkowników</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#161622",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#232533",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#CDCDE0",
  },
  listContent: {
    padding: 16,
  },
  userCard: {
    backgroundColor: "#1E1E2D",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#232533",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: "#CDCDE0",
  },
  userDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#232533",
  },
  userDetailLabel: {
    fontSize: 14,
    color: "#CDCDE0",
  },
  userDetailValue: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#CDCDE0",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#CDCDE0",
  },
});

export default Users;
