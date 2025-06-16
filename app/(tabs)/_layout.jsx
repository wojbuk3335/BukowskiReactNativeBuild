import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, StyleSheet, Text, View } from "react-native";

import { icons } from "../../constants";

const TabIcon = ({ icon, color, name, focused, customIcon }) => {
  return (
    <View style={styles.tabIconContainer}>
      {customIcon ? (
        <Ionicons
          name={customIcon}
          size={29}
          color={color}
          style={{ marginBottom: 0 }}
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

const TabLayout = () => {
  return (
    <>
      {/* Add a View to set the status bar background color */}
      <View style={{ height: 32, backgroundColor: "#161622" }} />
      <Tabs
        options={{ headerShown: false }}
        screenOptions={{
          tabBarActiveTintColor: "#0d6efd",
          tabBarInactiveTintColor: "#CDCDE0",
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: "black",
            borderTopWidth: 1,
            borderTopColor: "#232533",
            height: 84,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                icon={icons.home}
                color={color}
                name="Sprzedaż"
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="writeoff"
          options={{
            title: "Odpisać",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                customIcon="arrow-forward-circle"
                color={color}
                name="Odpisać"
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                icon={icons.bookmark}
                color={color}
                name="Szukaj"
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="create"
          options={{
            title: "Create",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                icon={icons.plus}
                color={color}
                name="Dodaj"
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                icon={icons.profile}
                color={color}
                name="Profil"
                focused={focused}
              />
            ),
          }}
        />
      </Tabs>

      <StatusBar style="light" />
    </>
  );
};

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 80,
    paddingTop: 16,
    height: 60,
    gap: 8,
  },
  icon: {
    width: 24,
    height: 24,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    textAlign: "center",
  },
  tabTextFocused: {
    fontWeight: "600",
  },
  tabTextRegular: {
    fontWeight: "400",
  },
});

export default TabLayout;
