import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
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
      <View style={styles.logoContainer}>
        <Image
          source={require("../assets/tutorLogo.png")}
          style={{ width: 300, height: 234 }}
        />
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          textContentType="emailAddress"
          selectionColor="gold"
          underlineColor="gold"
          mode="flat"
          activeOutlineColor="white"
          textColor="white"
          label={"Email"}
          theme={{
            colors: {
              placeholder: "gold",
              text: "gold",
              primary: "white",
            },
          }}
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          label="Password"
          selectionColor="gold"
          underlineColor="gold"
          mode="flat"
          activeOutlineColor="white"
          textColor="white"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          theme={{
            colors: {
              placeholder: "gold",
              text: "white",
              primary: "white",
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
    backgroundColor: "#000000",
    justifyContent: "space-between", // Add this line
    paddingBottom: 50, // Add this line
  },
  forgotPassword: {
    marginTop: 10,
  },
  forgotPasswordText: {
    color: "gold",
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
    borderWidth: 1,
    backgroundColor: "gold",
    marginBottom: 10,
    width: "80%",
    padding: 20,
    marginTop:40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 18,
  },
  logoContainer: {
    marginTop: "30%",
    alignItems: "center",
  },
});