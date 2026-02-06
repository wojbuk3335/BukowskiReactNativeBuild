import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useContext, useEffect, useState } from "react";
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CustomButton from "../../components/CustomButton";
import FormField from "../../components/FormField";
import { GlobalStateContext } from "../../context/GlobalState";
import Logger from "../../services/logger"; // Import logger service
import tokenService from "../../services/tokenService"; // Import token service
import bukowskiLogo from "./bukowski.png"; // Import the image

const SignIn = () => {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isAdminPanel, setIsAdminPanel] = useState(false);
  const navigation = useNavigation();
  const { setUser, bukowski_login, isLoading, user } = useContext(GlobalStateContext); // Access global state

  useEffect(() => {
    const checkUserInStorage = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser); // Restore user data to global state
          tokenService.isInitializing = false; // User has logged in before
          
          // Redirect based on user role
          if (parsedUser.role === 'admin') {
            router.replace("/(admin-tabs)/dashboard");
          } else {
            router.replace("/home");
          }
        } else {
          // No user data found - definitely first launch
          tokenService.isInitializing = false;
        }
      } catch (error) {
        Logger.error("Failed to retrieve user data from storage:", error);
        tokenService.isInitializing = false;
      }
    };

    checkUserInStorage();
  }, []);

  const submit = async () => {
    try {
      setError(""); // Clear any previous errors
      const response = await bukowski_login(form.email, form.password, navigation, isAdminPanel);
      
      // Check if user role matches the selected panel
      if (isAdminPanel && response.role !== 'admin') {
        setError("To konto nie ma uprawnień administratora");
        await AsyncStorage.removeItem("user");
        setUser(null);
        return;
      }
      
      if (!isAdminPanel && response.role === 'admin') {
        setError("Konto administratora nie może zalogować się do panelu użytkownika");
        await AsyncStorage.removeItem("user");
        setUser(null);
        return;
      }
      
      setUser(response); // Update global state with user data
      
      // Redirect to appropriate panel based on role
      if (response.role === 'admin') {
        router.replace("/(admin-tabs)/dashboard"); // Admin panel
      } else {
        router.replace("/home"); // User panel
      }
    } catch (error) {
      setError("Logowanie nie powiodło się. Sprawdź swoje dane i spróbuj ponownie.");
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: "#000", flex: 1 }}>
      <StatusBar backgroundColor="black" style="light" />
      <ScrollView>
        <View
          style={[
            styles.container,
            { minHeight: Dimensions.get("window").height - 100 },
          ]}
        >


          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(e) => {
              setForm({ ...form, email: e.trim() });
              if (error) setError(""); // Clear error when user starts typing
            }}
            otherStyles="mt-7"
            keyboardType="email-address"
          />

          <FormField
            title="Hasło"
            value={form.password}
            handleChangeText={(e) => {
              setForm({ ...form, password: e.trim() });
              if (error) setError(""); // Clear error when user starts typing
            }}
            otherStyles="mt-7"
            secureTextEntry={true} // Explicitly enable secure text entry
          />

          <CustomButton
            title="Zologuj się"
            handlePress={submit}
            containerStyles={styles.button}
            isLoading={isLoading} // Use global isLoading state
          />

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity 
            onPress={() => setIsAdminPanel(!isAdminPanel)}
            style={styles.switchPanel}
          >
            <Text style={styles.switchPanelText}>
              {isAdminPanel ? "Przejdź do panelu użytkownika" : "Przejdź do panelu administratora"}
            </Text>
          </TouchableOpacity>

          <View style={styles.panelInfo}>
            <Text style={styles.panelInfoText}>
              {isAdminPanel ? "PANEL ADMINISTRACYJNY" : "PANEL UŻYTKOWNIKA"}
            </Text>
          </View>
            
          <Image
            source={bukowskiLogo} // Use the imported image
            resizeMode="contain"
            style={styles.logo}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginVertical: 24,
    flex: 1,
  },
  button: {
    marginTop: 28,
    marginBottom: 16,
    width: "100%",
    height: 64,
    justifyContent: "center",
  },
  logo: {
    width: 190,
    height: 54,
    alignSelf: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: "#dc2626",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginHorizontal: 4,
  },
  errorText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  switchPanel: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  switchPanelText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  panelInfo: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  panelInfoText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
});

export default SignIn;

