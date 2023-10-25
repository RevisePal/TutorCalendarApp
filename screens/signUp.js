import React, { useState } from "react";
import { View, TextInput, Text, StyleSheet, Alert } from "react-native";
import firebase, { auth, db } from "../firebase";
import { setDoc, doc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import BackButton from "../components/backButton";
import { TouchableOpacity } from "react-native-gesture-handler";
import { serverTimestamp } from "firebase/firestore";

export default function SignUp({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignUp = async () => {
    try {
      // Create user with email and password
      const authUser = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Add user data to Firestore
      await setDoc(doc(db, "users", authUser.user.uid), {
        email: authUser.user.email,
        createdAt: serverTimestamp(), // Use the modular import here
      });

      navigation.navigate("App", {
        screen: "Main",
        params: { screen: "Explore" },
      });
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
      <TouchableOpacity style={styles.submit} onPress={handleSignUp}>
        <Text style={styles.submitText}>Sign Up</Text>
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  submit: {
    borderWidth: 1,
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
