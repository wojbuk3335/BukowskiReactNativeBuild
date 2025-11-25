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

const TabLayout = () => {
  const { user } = useContext(GlobalStateContext);
  const isParzygnat = user?.symbol === 'P';
  const insets = useSafeAreaInsets();

  return (
    <>
      {/* Add a View to set the status bar background color */}
      <View style={{ height: 32, backgroundColor: "black" }} />
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
            paddingBottom: Math.max(insets.bottom - 5, 0),
            paddingHorizontal: 4,
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
            title: "Stan",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                customIcon="arrow-forward-circle"
                color={color}
                name="Stan"
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
          name="cudzych"
          options={{
            title: "Cudzich",
            headerShown: false,
            href: isParzygnat ? "/cudzych" : null,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                icon={icons.book}
                color={color}
                name="Cudzich"
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: "Zamówienia",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                icon={icons.profile}
                color={color}
                name="Zamów"
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="remanent"
          options={{
            title: "Remanent",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                customIcon={focused ? "archive" : "archive-outline"}
                color={color}
                name="Remanent"
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
    paddingTop: 8,
    height: 56,
    gap: 2,
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
    flexWrap: 'nowrap',
    numberOfLines: 1,
  },
  tabTextFocused: {
    fontWeight: "600",
  },
  tabTextRegular: {
    fontWeight: "400",
  },
});

export default TabLayout;
