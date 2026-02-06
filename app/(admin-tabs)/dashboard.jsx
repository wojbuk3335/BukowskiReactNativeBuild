import { router } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import { GlobalStateContext } from "../../context/GlobalState";
import Logger from "../../services/logger";

const Dashboard = () => {
  const { user, fetchState, stateData, users, fetchUsers } = useContext(GlobalStateContext);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalUsers: 0,
    todaySales: 0,
    totalValue: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (stateData && users) {
      calculateStats();
    }
  }, [stateData, users]);

  const loadData = async () => {
    try {
      await Promise.all([fetchState(), fetchUsers()]);
    } catch (error) {
      Logger.error("Error loading dashboard data:", error);
    }
  };

  const calculateStats = () => {
    const totalProducts = stateData?.length || 0;
    const totalUsers = users?.length || 0;
    const totalValue = stateData?.reduce((sum, item) => sum + (item.purchasePrice || 0), 0) || 0;

    setStats({
      totalProducts,
      totalUsers,
      todaySales: 0, // To be implemented
      totalValue,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Panel Administratora</Text>
          <Text style={styles.subtitle}>Witaj, {user?.email}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Ionicons name="cube-outline" size={32} color="#fff" />
            <Text style={styles.statValue}>{stats.totalProducts}</Text>
            <Text style={styles.statLabel}>Produkty w stanie</Text>
          </View>

          <View style={[styles.statCard, styles.statCardSuccess]}>
            <Ionicons name="people-outline" size={32} color="#fff" />
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Użytkownicy</Text>
          </View>

          <View style={[styles.statCard, styles.statCardWarning]}>
            <Ionicons name="cart-outline" size={32} color="#fff" />
            <Text style={styles.statValue}>{stats.todaySales}</Text>
            <Text style={styles.statLabel}>Sprzedaż dzisiaj</Text>
          </View>

          <View style={[styles.statCard, styles.statCardDanger]}>
            <Ionicons name="cash-outline" size={32} color="#fff" />
            <Text style={styles.statValue}>{stats.totalValue.toFixed(2)} zł</Text>
            <Text style={styles.statLabel}>Wartość stanu</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Szybkie akcje</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push("/(admin-tabs)/users")}
          >
            <Ionicons name="person-add" size={24} color="#0d6efd" />
            <Text style={styles.actionButtonText}>Zarządzaj użytkownikami</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push("/(admin-tabs)/reports")}
          >
            <Ionicons name="document-text" size={24} color="#0d6efd" />
            <Text style={styles.actionButtonText}>Zobacz raporty</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push("/(admin-tabs)/settings")}
          >
            <Ionicons name="settings" size={24} color="#0d6efd" />
            <Text style={styles.actionButtonText}>Ustawienia systemu</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#161622",
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
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
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  statCardPrimary: {
    backgroundColor: "#0d6efd",
  },
  statCardSuccess: {
    backgroundColor: "#198754",
  },
  statCardWarning: {
    backgroundColor: "#ffc107",
  },
  statCardDanger: {
    backgroundColor: "#dc3545",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#fff",
    marginTop: 4,
    textAlign: "center",
  },
  quickActions: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E2D",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#232533",
  },
  actionButtonText: {
    fontSize: 16,
    color: "#fff",
    marginLeft: 12,
  },
});

export default Dashboard;
