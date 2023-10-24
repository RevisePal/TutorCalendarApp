import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { getAuth } from "firebase/auth";
import BackButton from "../components/backButton";

export default function SignIn({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const auth = getAuth();

  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigation.navigate("App", {
        screen: "Main",
        params: { screen: "Explore" },
      });
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
    <View style={styles.container}>
      <View style={styles.backButtonContainer}>
        <BackButton />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.submit} onPress={handleSignIn}>
        <Text style={styles.submitText}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.forgotPassword}
        onPress={handleForgotPassword}
      >
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  forgotPassword: {
    marginTop: 10,
  },
  forgotPasswordText: {
    color: "#3b88c3",
    textDecorationLine: "underline",
  },
  backButtonContainer: {
    position: "absolute",
    top: 60,
    left: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: "#3b88c3",
    width: "80%",
    padding: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  submit: {
    backgroundColor: "#3b88c3",
    marginBottom: 10,
    width: 300,
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
