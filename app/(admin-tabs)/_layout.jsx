import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, StyleSheet, Text, View } from "react-native";
import { useContext } from "react";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { icons } from "../../constants";
import { GlobalStateContext } from "../../context/GlobalState";

const TabIcon = ({ icon, color, name, focused, customIcon }) => {
  return (
    <View style={styles.tabIconContainer}>
      {customIcon ? (
        <Ionicons
          name={customIcon}
          size={22}
          color={color}
          style={{ marginBottom: 4 }}
        />
      ) : (
        <Image
          source={icon}
          resizeMode="contain"
          tintColor={color}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.tabText,
          focused ? styles.tabTextFocused : styles.tabTextRegular,
          { color },
        ]}
      >
        {name}
      </Text>
    </View>
  );
};

const AdminTabLayout = () => {
  const { user } = useContext(GlobalStateContext);
  const insets = useSafeAreaInsets();

  return (
    <>
      {/* Add a View to set the status bar background color */}
      <View style={{ height: 32, backgroundColor: "black" }} />
      <Tabs
        options={{ headerShown: false }}
        screenOptions={{
          tabBarActiveTintColor: "#dc3545", // Red for admin
          tabBarInactiveTintColor: "#CDCDE0",
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: "black",
            borderTopWidth: 1,
            borderTopColor: "#232533",
            height: 90,
            paddingBottom: 10,
            paddingTop: 15,
            paddingHorizontal: 4,
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Sprawdź",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                customIcon="grid"
                color={color}
                name="Sprawdź"
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="users"
          options={{
            title: "Dobierz",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                customIcon="shirt"
                color={color}
                name="Dobierz"
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="reports"
          options={{
            title: "Raporty",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                customIcon="bar-chart"
                color={color}
                name="Raporty"
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title: "Ustawienia",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                customIcon="settings"
                color={color}
                name="Ustawienia"
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: "Profil",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                customIcon="person"
                color={color}
                name="Profil"
                focused={focused}
              />
            ),
          }}
        />
      </Tabs>
      <StatusBar backgroundColor="black" style="light" />
    </>
  );
};

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 46,
    paddingTop: 0,
    height: 56,
    gap: 2,
    marginBottom: 20,
  },
  icon: {
    width: 22,
    height: 22,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 9,
    textAlign: "center",
    minHeight: 12,
    lineHeight: 12,
    flexWrap: "nowrap",
    numberOfLines: 1,
  },
  tabTextFocused: {
    fontWeight: "600",
  },
  tabTextRegular: {
    fontWeight: "400",
  },
});

export default AdminTabLayout;
