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
import { TextInput } from "react-native-paper";
import PropTypes from "prop-types";

const generateInviteCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

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
          inviteCode: generateInviteCode(),
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
            <View style={styles.roleContainer}>
              <Text style={styles.radioLabel}>I am a...</Text>
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[styles.roleButton, role === "user" && styles.roleButtonActive]}
                  activeOpacity={0.8}
                  onPress={() => setRole("user")}
                >
                  <Text style={styles.roleButtonEmoji}>🎓</Text>
                  <Text style={[styles.roleButtonText, role === "user" && styles.roleButtonTextActive]}>Tutee</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleButton, role === "tutor" && styles.roleButtonActive]}
                  activeOpacity={0.8}
                  onPress={() => setRole("tutor")}
                >
                  <Text style={styles.roleButtonEmoji}>📚</Text>
                  <Text style={[styles.roleButtonText, role === "tutor" && styles.roleButtonTextActive]}>Tutor</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                textContentType="givenName"
                selectionColor="#0D9488"
                underlineColor="#0D9488"
                mode="flat"
                activeOutlineColor="#0D9488"
                textColor="#111827"
                label={"Full Name"}
                theme={{
                  colors: {
                    placeholder: "#6B7280",
                    text: "#111827",
                    primary: "#0D9488",
                  },
                }}
                value={name}
                onChangeText={(e) => setName(e)}
                style={styles.input}
              />
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
                onChangeText={(e) => setEmail(e)}
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
    backgroundColor: "#E6FAF8",
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
    backgroundColor: "#0D9488",
    marginBottom: 10,
    width: "80%",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  submitText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 18,
  },
  roleContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    width: "100%",
    alignItems: "center",
  },
  radioLabel: {
    color: "#0D9488",
    fontSize: 18,
    marginBottom: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  roleRow: {
    flexDirection: "row",
    justifyContent: "center",
    width: "80%",
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#0D9488",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    marginHorizontal: 6,
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  roleButtonActive: {
    backgroundColor: "#0D9488",
    shadowOpacity: 0.25,
    elevation: 6,
  },
  roleButtonEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  roleButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0D9488",
  },
  roleButtonTextActive: {
    color: "#FFFFFF",
  },
  roleButtonSub: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "400",
  },
  roleButtonSubActive: {
    color: "#CCFBF1",
  },
});
