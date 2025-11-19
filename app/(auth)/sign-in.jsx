import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useNavigation } from "expo-router";
import { useContext, useEffect, useState } from "react";
import { Dimensions, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CustomButton from "../../components/CustomButton";
import FormField from "../../components/FormField";
import { GlobalStateContext } from "../../context/GlobalState";
import Logger from "../../services/logger"; // Import logger service
import bukowskiLogo from "./bukowski.png"; // Import the image

const SignIn = () => {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigation = useNavigation();
  const { setUser, bukowski_login, isLoading, user } = useContext(GlobalStateContext); // Access global state

  useEffect(() => {
    const checkUserInStorage = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          setUser(JSON.parse(userData)); // Restore user data to global state
          router.replace("/home"); // Redirect to home screen
        } else {
        }
      } catch (error) {
        Logger.error("Failed to retrieve user data from storage:", error);
      }
    };

    checkUserInStorage();
  }, []);

  const submit = async () => {
    try {
      setError(""); // Clear any previous errors
      const response = await bukowski_login(form.email, form.password, navigation);
      setUser(response); // Update global state with user data
      
      router.replace("/home") // Redirect to home screen
    } catch (error) {
      setError("Logowanie nie powiodło się. Sprawdź swoje dane i spróbuj ponownie.");
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: "#000", flex: 1 }}>
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
});

export default SignIn;

