import React, { useState, useEffect } from "react";
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
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import BackButton from "../components/backButton";
import { TextInput } from "react-native-paper";
import PropTypes from "prop-types";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { Ionicons } from "@expo/vector-icons";

// Web client ID: Google Cloud Console → APIs & Services → Credentials → "Web client (auto created by Google Service)"
const GOOGLE_WEB_CLIENT_ID = "1066277274773-lnrrtsvot7g0rah9rat4sl1ciq0634dj.apps.googleusercontent.com";
// iOS client ID: Google Cloud Console → APIs & Services → Credentials → Create Credentials → OAuth client ID → iOS
const GOOGLE_IOS_CLIENT_ID = "1066277274773-j4eik9uo10891ia3b06cacgr89lbqj7t.apps.googleusercontent.com";
const GOOGLE_ANDROID_CLIENT_ID = "1066277274773-odaq9gd4pob2dhcqnp15cm0483chen1j.apps.googleusercontent.com";

export default function SignIn({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const auth = getAuth();

  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (googleResponse?.type === "success") {
      handleGoogleCredential(googleResponse.authentication.idToken);
    }
  }, [googleResponse]);

  // Creates a Firestore user doc for first-time social sign-ins (defaults to tutee)
  const ensureUserDoc = async (user) => {
    const uid = user.uid;
    const [tutorSnap, userSnap] = await Promise.all([
      getDoc(doc(db, "Tutor", uid)),
      getDoc(doc(db, "users", uid)),
    ]);
    if (tutorSnap.exists() || userSnap.exists()) return;
    await setDoc(doc(db, "users", uid), {
      email: user.email || "",
      name: user.displayName || "",
      photoUrl: user.photoURL || null,
      myTutors: [],
      createdAt: serverTimestamp(),
    });
  };

  const handleGoogleCredential = async (idToken) => {
    setLoading(true);
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const { user } = await signInWithCredential(auth, credential);
      await ensureUserDoc(user);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      const provider = new OAuthProvider("apple.com");
      const credential = provider.credential({
        idToken: appleCredential.identityToken,
        rawNonce,
      });
      const { user } = await signInWithCredential(auth, credential);
      await ensureUserDoc(user);
    } catch (error) {
      if (error.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("Error", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/invalid-credential"
      ) {
        Alert.alert("Incorrect email or password", "Please check your details and try again.");
      } else {
        Alert.alert("Error", error.message);
      }
    }
  };

  const handleForgotPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Success", "Password reset link has been sent to your email.");
    } catch (error) {
      if (error.code === "auth/user-not-found" || error.code === "auth/invalid-email") {
        Alert.alert("Email not found", "No account found with that email address.");
      } else {
        Alert.alert("Error", error.message);
      }
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
              <TouchableOpacity
                style={[styles.submit, loading && styles.submitDisabled]}
                onPress={handleSignIn}
                disabled={loading}
              >
                <Text style={styles.submitText}>Log In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google */}
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => googlePromptAsync()}
                disabled={loading}
                activeOpacity={0.75}
              >
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <Text style={styles.socialBtnText}>Continue with Google</Text>
              </TouchableOpacity>

              {/* Apple (iOS only) */}
              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={[styles.socialBtn, styles.appleBtnStyle]}
                  onPress={handleAppleSignIn}
                  disabled={loading}
                  activeOpacity={0.75}
                >
                  <Ionicons name="logo-apple" size={20} color="#111827" />
                  <Text style={[styles.socialBtnText, { color: "#111827" }]}>Continue with Apple</Text>
                </TouchableOpacity>
              )}
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
  submitDisabled: {
    backgroundColor: "#9CA3AF",
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "80%",
    marginTop: 24,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#D1D5DB",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "80%",
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
    gap: 10,
  },
  appleBtnStyle: {
    borderColor: "#111827",
  },
  socialBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
});
