import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function InviteCodeCard({ code, onPress }) {
  if (!code) return null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.left}>
        <Text style={styles.label}>Your invite code</Text>
        <Text style={styles.code}>{code}</Text>
        <Text style={styles.hint}>Tap to copy or share with tutees</Text>
      </View>
      <View style={styles.right}>
        <View style={styles.shareButton}>
          <Ionicons name="share-outline" size={18} color="#FFFFFF" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  left: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  code: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0D9488",
    letterSpacing: 6,
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  right: {
    marginLeft: 12,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0D9488",
    alignItems: "center",
    justifyContent: "center",
  },
});
