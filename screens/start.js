import React from "react";
import PropTypes from "prop-types";
import { TouchableOpacity, View, Text, StyleSheet, Image, StatusBar } from "react-native";

export default function Start({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#E6FAF8" />

      {/* Decorative top accent line */}
      <View style={styles.accentLine} />

      <View style={styles.subcontainer}>
        <Image
          source={require("../assets/tutorName.png")}
          style={styles.logoName}
        />
        <View style={styles.logoShadow}>
          <Image
            source={require("../assets/tutorLogo.png")}
            style={styles.logoImage}
          />
        </View>
        <Text style={styles.tagline}>Your lessons. All in one place.</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.signUp}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("SignUp")}
        >
          <Text style={styles.signUpText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signIn}
          activeOpacity={0.75}
          onPress={() => navigation.navigate("SignIn")}
        >
          <Text style={styles.signInText}>I already have an account</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom spacing */}
      <View style={styles.bottomSpacer} />
    </View>
  );
}

Start.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

const ACCENT = "#0D9488";       // teal
const ACCENT_LIGHT = "#CCFBF1"; // soft teal tint
const BG = "#E6FAF8";           // light teal bg
const TEXT_MUTED = "#6B7280";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: BG,
    paddingHorizontal: 24,
  },
  accentLine: {
    width: "40%",
    height: 3,
    backgroundColor: ACCENT,
    borderRadius: 2,
    marginTop: 16,
    opacity: 0.9,
  },
  subcontainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoName: {
    resizeMode: "stretch",
    width: 300,
    height: 90,
    marginBottom: 40,
  },
  logoShadow: {
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  logoImage: {
    width: 260,
    height: 203,
  },
  tagline: {
    marginTop: 28,
    color: TEXT_MUTED,
    fontSize: 14,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "500",
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 8,
  },
  signUp: {
    backgroundColor: ACCENT,
    width: "100%",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  signUpText: {
    fontWeight: "700",
    color: "#FFFFFF",
    fontSize: 17,
    letterSpacing: 0.5,
  },
  signIn: {
    borderWidth: 1.5,
    borderColor: ACCENT_LIGHT,
    backgroundColor: "#FFFFFF",
    width: "100%",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  signInText: {
    color: ACCENT,
    fontSize: 16,
    letterSpacing: 0.3,
    fontWeight: "500",
  },
  bottomSpacer: {
    height: 24,
  },
});
