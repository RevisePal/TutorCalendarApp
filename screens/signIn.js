import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
} from "react-native";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { getAuth } from "firebase/auth";
import BackButton from "../components/backButton";
import { TextInput } from "react-native-paper"; // Use TextInput from react-native-paper
import PropTypes from "prop-types"; // Add this import

export default function SignIn({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const auth = getAuth();

  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigation.navigate("MainTabs", { screen: "Home" });
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleForgotPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Success",
        "Password reset link has been sent to your email."
      );
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}
        >
          <View style={styles.container}>
            <View style={styles.backButtonContainer}>
              <BackButton />
            </View>
            <View style={styles.logoContainer}>
              <Image
                source={require("../assets/tutorLogo.png")}
                style={{ width: 300, height: 234 }}
              />
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                textContentType="emailAddress"
                selectionColor="#0D9488"
                underlineColor="#0D9488"
                mode="flat"
                activeOutlineColor="#0D9488"
                textColor="#111827"
                label={"Email"}
                theme={{
                  colors: {
                    placeholder: "#6B7280",
                    text: "#111827",
                    primary: "#0D9488",
                  },
                }}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
              />
              <TextInput
                label="Password"
                selectionColor="#0D9488"
                underlineColor="#0D9488"
                mode="flat"
                activeOutlineColor="#0D9488"
                textColor="#111827"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                theme={{
                  colors: {
                    placeholder: "#6B7280",
                    text: "#111827",
                    primary: "#0D9488",
                  },
                }}
                style={styles.input}
              />
              <TouchableOpacity style={styles.submit} onPress={handleSignIn}>
                <Text style={styles.submitText}>Log In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

SignIn.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E6FAF8",
    justifyContent: "space-between",
    paddingBottom: 50,
  },
  forgotPassword: {
    marginTop: 10,
  },
  forgotPasswordText: {
    color: "#0D9488",
  },
  backButtonContainer: {
    position: "absolute",
    top: 60,
    left: 30,
    zIndex: 10,
  },
  inputContainer: {
    alignItems: "center",
    width: "100%",
  },
  input: {
    marginBottom: 18,
    backgroundColor: "transparent",
    width: "80%",
  },
  submit: {
    backgroundColor: "#0D9488",
    marginBottom: 10,
    width: "80%",
    padding: 20,
    marginTop: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 18,
  },
  logoContainer: {
    marginTop: "30%",
    alignItems: "center",
  },
});
