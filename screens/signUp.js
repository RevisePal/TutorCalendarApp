import React, { useState } from "react";
import { View, TextInput, Text, StyleSheet, Alert } from "react-native";
import firebase, { auth, db } from "../firebase";
import { setDoc, doc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import BackButton from "../components/backButton";
import { TouchableOpacity } from "react-native-gesture-handler";
import { serverTimestamp } from "firebase/firestore";
import * as Google from "expo-google-app-auth";

export default function SignUp({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  //   const handleGoogleSignUp = async () => {
  //     try {
  //       const result = await Google.logInAsync({
  //         androidClientId:
  //           "633404670440-gpet5rvbb6e1k33qba8vfjf8f3tdahrj.apps.googleusercontent.com",
  //         iosClientId:
  //           "633404670440-hf43refjao42vrvcikbi464ib6pgdpmb.apps.googleusercontent.com",
  //         scopes: ["profile", "email"],
  //       });

  //       if (result.type === "success") {
  //         // Use Google Access Token to sign in with Firebase
  //         const credential = firebase.auth.GoogleAuthProvider.credential(
  //           result.idToken
  //         );

  //         const authUser = await firebase.auth().signInWithCredential(credential);

  //         // Add user data to Firestore
  //         await db.collection("users").doc(authUser.user.uid).set({
  //           email: authUser.user.email,
  //           createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  //         });

  //         Alert.alert("Success", "User registered successfully!");
  //       } else {
  //         return { cancelled: true };
  //       }
  //     } catch (e) {
  //       Alert.alert("Error", e.message);
  //     }
  //   };

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
      {/* <TouchableOpacity style={styles.submit} onPress={handleGoogleSignUp}>
        <Text style={styles.submitText}>Sign Up with Google</Text>
      </TouchableOpacity> */}
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
