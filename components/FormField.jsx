import { useState } from "react";
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { icons } from "../constants";

const FormField = ({
  title,
  value,
  placeholder,
  handleChangeText,
  otherStyles,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.fieldContainer, otherStyles]}>
      <Text style={styles.label}>{title}</Text>

      <View
        style={[
          styles.inputWrapper,
          { borderColor: isFocused ? "#0d6efd" : "#000000" },
        ]}
      >
        <TextInput
          style={styles.input}
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#0d6efd"
          onChangeText={handleChangeText}
          secureTextEntry={props.secureTextEntry && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {props.secureTextEntry && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Image
              source={!showPassword ? icons.eye : icons.eyeHide}
              style={styles.icon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: "#f3f4f6",
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 8,
  },
  inputWrapper: {
    width: "100%",
    height: 64,
    paddingHorizontal: 16,
    backgroundColor: "#18181b",
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  icon: {
    width: 24,
    height: 24,
  },
});

export default FormField;
