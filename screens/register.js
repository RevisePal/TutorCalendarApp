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
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Ionicons } from "@expo/vector-icons";
import { TextInput } from "react-native-paper";
import PropTypes from "prop-types";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

const GOOGLE_WEB_CLIENT_ID = "1066277274773-lnrrtsvot7g0rah9rat4sl1ciq0634dj.apps.googleusercontent.com";
const GOOGLE_IOS_CLIENT_ID = "1066277274773-j4eik9uo10891ia3b06cacgr89lbqj7t.apps.googleusercontent.com";

const generateInviteCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

export default function Register({ navigation, route }) {
  const role = route.params?.role ?? "tutee";
  const isTutor = role === "tutor";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const auth = getAuth();

  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (googleResponse?.type === "success") {
      handleSocialCredential(googleResponse.authentication.idToken, "google");
    }
  }, [googleResponse]);

  // Creates the correct Firestore doc for a new user based on their chosen role.
  // Returns false if the user already has a doc (returning user via social auth).
  const createUserDoc = async (user, displayName) => {
    const uid = user.uid;
    const [tutorSnap, userSnap] = await Promise.all([
      getDoc(doc(db, "Tutor", uid)),
      getDoc(doc(db, "users", uid)),
    ]);
    if (tutorSnap.exists() || userSnap.exists()) return false;

    const resolvedName = displayName || user.displayName || "";

    if (isTutor) {
      await setDoc(doc(db, "Tutor", uid), {
        email: user.email || "",
        name: resolvedName,
        photoUrl: user.photoURL || null,
        inviteCode: generateInviteCode(),
        tutees: [],
        isOnboarded: false,
        isActive: true,
        createdAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, "users", uid), {
        email: user.email || "",
        name: resolvedName,
        photoUrl: user.photoURL || null,
        myTutors: [],
        createdAt: serverTimestamp(),
      });
    }
    return true;
  };

  const handleSocialCredential = async (idToken, provider) => {
    setLoading(true);
    try {
      let credential;
      if (provider === "google") {
        credential = GoogleAuthProvider.credential(idToken);
      }
      const { user } = await signInWithCredential(auth, credential);
      const isNew = await createUserDoc(user);
      if (isNew && isTutor) {
        navigation.navigate("TutorOnboarding");
      } else {
        navigation.navigate("MainTabs");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
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
      const appleDisplayName = appleCredential.fullName
        ? [appleCredential.fullName.givenName, appleCredential.fullName.familyName]
            .filter(Boolean)
            .join(" ")
        : null;
      const isNew = await createUserDoc(user, appleDisplayName);
      if (isNew && isTutor) {
        navigation.navigate("TutorOnboarding");
      } else {
        navigation.navigate("MainTabs");
      }
    } catch (error) {
      if (error.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("Error", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Validation Error", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await createUserDoc(user, name.trim());
      if (isTutor) {
        navigation.navigate("TutorOnboarding");
      } else {
        navigation.navigate("MainTabs");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
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
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color="#0D9488" />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <Image
                source={require("../assets/tutorLogo.png")}
                style={{ width: 240, height: 187 }}
              />
            </View>

            <View style={styles.roleBadge}>
              <Ionicons
                name={isTutor ? "school-outline" : "book-outline"}
                size={14}
                color={isTutor ? "#0D9488" : "#6366F1"}
              />
              <Text style={[styles.roleBadgeText, isTutor ? styles.roleBadgeTutor : styles.roleBadgeTutee]}>
                Signing up as {isTutor ? "Tutor" : "Tutee"}
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                textContentType="givenName"
                selectionColor="#0D9488"
                underlineColor="#0D9488"
                mode="flat"
                activeOutlineColor="#0D9488"
                textColor="#111827"
                label="Full Name"
                theme={{ colors: { placeholder: "#6B7280", text: "#111827", primary: "#0D9488" } }}
                value={name}
                onChangeText={setName}
                style={styles.input}
              />
              <TextInput
                textContentType="emailAddress"
                selectionColor="#0D9488"
                underlineColor="#0D9488"
                mode="flat"
                activeOutlineColor="#0D9488"
                textColor="#111827"
                label="Email"
                theme={{ colors: { placeholder: "#6B7280", text: "#111827", primary: "#0D9488" } }}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
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
                theme={{ colors: { placeholder: "#6B7280", text: "#111827", primary: "#0D9488" } }}
                style={styles.input}
              />

              <TouchableOpacity
                style={[styles.submit, loading && styles.submitDisabled]}
                onPress={handleEmailRegister}
                disabled={loading}
              >
                <Text style={styles.submitText}>Create Account</Text>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => googlePromptAsync()}
                disabled={loading}
                activeOpacity={0.75}
              >
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <Text style={styles.socialBtnText}>Continue with Google</Text>
              </TouchableOpacity>

              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={[styles.socialBtn, styles.appleBtnStyle]}
                  onPress={handleAppleSignUp}
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

Register.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
    navigate: PropTypes.func.isRequired,
  }).isRequired,
  route: PropTypes.shape({
    params: PropTypes.shape({ role: PropTypes.string }),
  }).isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E6FAF8",
    paddingBottom: 50,
  },
  backBtn: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    marginTop: "25%",
    alignItems: "center",
    marginBottom: 16,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#CCFBF1",
    gap: 6,
    marginBottom: 24,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  roleBadgeTutor: { color: "#0D9488" },
  roleBadgeTutee: { color: "#6366F1" },
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
    marginTop: 24,
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
