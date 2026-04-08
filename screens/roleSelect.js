import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";

export default function RoleSelect({ navigation }) {
  const [role, setRole] = useState("tutee");

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#E6FAF8" />

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color="#0D9488" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.heading}>I am a...</Text>
        <Text style={styles.sub}>Choose your role to get started</Text>

        <View style={styles.cards}>
          <TouchableOpacity
            style={[styles.card, role === "tutee" && styles.cardActive]}
            activeOpacity={0.8}
            onPress={() => setRole("tutee")}
          >
            <View style={[styles.iconCircle, role === "tutee" && styles.iconCircleActive]}>
              <Ionicons name="book-outline" size={32} color={role === "tutee" ? "#fff" : "#0D9488"} />
            </View>
            <Text style={[styles.cardTitle, role === "tutee" && styles.cardTitleActive]}>Tutee</Text>
            <Text style={[styles.cardSub, role === "tutee" && styles.cardSubActive]}>
            Discover tutors and keep track of every session
            </Text>
            {role === "tutee" && (
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, role === "tutor" && styles.cardActive]}
            activeOpacity={0.8}
            onPress={() => setRole("tutor")}
          >
            <View style={[styles.iconCircle, role === "tutor" && styles.iconCircleActive]}>
              <Ionicons name="school-outline" size={32} color={role === "tutor" ? "#fff" : "#0D9488"} />
            </View>
            <Text style={[styles.cardTitle, role === "tutor" && styles.cardTitleActive]}>Tutor</Text>
            <Text style={[styles.cardSub, role === "tutor" && styles.cardSubActive]}>
            Create and manage your bookings with ease
            </Text>
            {role === "tutor" && (
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, !role && styles.continueBtnDisabled]}
          activeOpacity={0.85}
          disabled={!role}
          onPress={() => navigation.navigate("Register", { role })}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

RoleSelect.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E6FAF8",
  },
  backBtn: {
    marginTop: 8,
    marginLeft: 20,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  heading: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 40,
  },
  cards: {
    gap: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    position: "relative",
  },
  cardActive: {
    borderColor: "#0D9488",
    backgroundColor: "#F0FDFA",
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#CCFBF1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconCircleActive: {
    backgroundColor: "#0D9488",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  cardTitleActive: {
    color: "#0D9488",
  },
  cardSub: {
    fontSize: 14,
    color: "#6B7280",
  },
  cardSubActive: {
    color: "#0F766E",
  },
  checkBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0D9488",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  continueBtn: {
    backgroundColor: "#0D9488",
    borderRadius: 14,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  continueBtnDisabled: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
