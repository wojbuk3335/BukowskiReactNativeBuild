import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import LogoutButton from "../../components/LogoutButton";

const Reports = () => {
  const insets = useSafeAreaInsets(); // Get safe area insets
  const reportTypes = [
    {
      id: 1,
      title: "Raport sprzedaży",
      description: "Szczegółowy raport wszystkich sprzedaży",
      icon: "cart",
      color: "#0d6efd",
    },
    {
      id: 2,
      title: "Raport stanów magazynowych",
      description: "Aktualny stan wszystkich produktów",
      icon: "cube",
      color: "#198754",
    },
    {
      id: 3,
      title: "Raport transferów",
      description: "Historia wszystkich transferów",
      icon: "swap-horizontal",
      color: "#ffc107",
    },
    {
      id: 4,
      title: "Raport finansowy",
      description: "Przychody, koszty i wynagrodzenia",
      icon: "cash",
      color: "#dc3545",
    },
    {
      id: 5,
      title: "Raport aktywności użytkowników",
      description: "Godziny pracy i aktywność",
      icon: "time",
      color: "#6f42c1",
    },
  ];

  return (
    <SafeAreaView style={{
      flex: 1,
      backgroundColor: "#000000",
      paddingBottom: Math.max(20, insets.bottom + 20)
    }}>
      <LogoutButton position="top-right" />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(120, insets.bottom + 120) }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Raporty</Text>
          <Text style={styles.subtitle}>Wybierz rodzaj raportu</Text>
        </View>

        <View style={styles.reportsContainer}>
          {reportTypes.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={styles.reportCard}
              onPress={() => {
                // TODO: Navigate to report details
              }}
            >
              <View
                style={[
                  styles.reportIcon,
                  { backgroundColor: report.color },
                ]}
              >
                <Ionicons name={report.icon} size={32} color="#fff" />
              </View>
              <View style={styles.reportInfo}>
                <Text style={styles.reportTitle}>{report.title}</Text>
                <Text style={styles.reportDescription}>
                  {report.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#CDCDE0" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.quickStats}>
          <Text style={styles.sectionTitle}>Szybkie statystyki</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>-</Text>
              <Text style={styles.statLabel}>Dziś sprzedaż</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>-</Text>
              <Text style={styles.statLabel}>Ten tydzień</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>-</Text>
              <Text style={styles.statLabel}>Ten miesiąc</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>-</Text>
              <Text style={styles.statLabel}>Łącznie</Text>
            </View>
          </View>
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
  reportsContainer: {
    marginBottom: 24,
  },
  reportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E2D",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#232533",
  },
  reportIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 14,
    color: "#CDCDE0",
  },
  quickStats: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statItem: {
    width: "48%",
    backgroundColor: "#1E1E2D",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#232533",
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0d6efd",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#CDCDE0",
    textAlign: "center",
  },
});

export default Reports;
