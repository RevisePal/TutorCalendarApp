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
} from "react-native";
import { auth, db } from "../firebase";
import { setDoc, doc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import BackButton from "../components/backButton";
import { TouchableOpacity } from "react-native-gesture-handler";
import { serverTimestamp } from "firebase/firestore";
import { TextInput, RadioButton } from "react-native-paper";
import PropTypes from "prop-types";

export default function SignUp({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user"); // role state

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert("Validation Error", "Please fill in all required fields.");
      return;
    }

    try {
      const authUser = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("User created:", authUser.user.email);

      if (role === "tutor") {
        await setDoc(doc(db, "Tutor", authUser.user.uid), {
          email: authUser.user.email,
          name: name,
          createdAt: serverTimestamp(),
          isOnboarded: false,
        });
        navigation.navigate("TutorOnboarding"); // Ensure this matches the Stack.Screen name
      } else {
        await setDoc(doc(db, "users", authUser.user.uid), {
          email: authUser.user.email,
          name: name,
          createdAt: serverTimestamp(),
        });
        navigation.navigate("MainTabs"); // Ensure this matches the Stack.Screen name
      }
    } catch (error) {
      console.error("Sign Up Error:", error);
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
            <View style={styles.radioContainer}>
              <Text style={styles.radioLabel}>Sign up as:</Text>
              <View style={styles.radioRow}>
                <View style={styles.radioButton}>
                  <View style={styles.radioButtonContainer}>
                    <RadioButton
                      value="user"
                      status={role === "user" ? "checked" : "unchecked"}
                      onPress={() => setRole("user")}
                      color="gold"
                      uncheckedColor="gold" // Set the border color to gold when unchecked
                    />
                  </View>
                  <Text style={styles.radioText}>Tutee</Text>
                </View>
                <View style={styles.radioButton}>
                  <View style={styles.radioButtonContainer}>
                    <RadioButton
                      value="tutor"
                      status={role === "tutor" ? "checked" : "unchecked"}
                      onPress={() => setRole("tutor")}
                      color="gold"
                      uncheckedColor="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.radioText}>Tutor</Text>
                </View>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                textContentType="givenName"
                selectionColor="gold"
                underlineColor="gold"
                mode="flat"
                activeOutlineColor="white"
                textColor="#fff"
                label={"Full Name"}
                theme={{
                  colors: {
                    placeholder: "gold",
                    text: "gold",
                    primary: "white",
                  },
                }}
                value={name}
                onChangeText={(e) => setName(e)}
                style={styles.input}
              />
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
                onChangeText={(e) => setEmail(e)}
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
            </View>
            <TouchableOpacity style={styles.submit} onPress={handleSignUp}>
              <Text style={styles.submitText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

SignUp.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "space-between",
    paddingBottom: 50,
  },
  backButtonContainer: {
    position: "absolute",
    top: 60,
    left: 30,
    zIndex: 10,
  },
  logoContainer: {
    marginTop: "30%",
    alignItems: "center",
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
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  submitText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 18,
  },
  radioContainer: {
    flexDirection: "row",
    marginTop: 20,
    alignItems: "center",
    paddingHorizontal: 20,
    marginLeft: 20,
  },
  radioRow: {
    flexDirection: "row", // Align the radio buttons horizontally
    justifyContent: "center", // Center the content horizontally
  },
  radioLabel: {
    color: "gold",
    fontSize: 20,
    marginBottom: 10,
    fontWeight: "700",
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingLeft: 20,
  },
  radioButtonContainer: {
    borderWidth: 1, // Add border width
    borderColor: "white", // Set border color to white
    borderRadius: 5, // Add border radius for rounded corners
    padding: 0, // Optional: Add padding for spacing
    marginRight: 2,
  },
  radioText: {
    color: "white",
    marginLeft: 5,
    fontStyle: "italic",
    fontSize: 20,
  },
});
