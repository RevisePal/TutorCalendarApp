import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, TouchableWithoutFeedback,
  StyleSheet, Modal, Share, Clipboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TutorInviteModal({ visible, onClose, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    await Share.share({
      message: `Join me on the app! Use my invite code to connect: ${code}`,
    });
  };

  if (!code) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Invite Code</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>Share this code with your tutees so they can connect with you</Text>

        {/* Code display */}
        <View style={styles.codeBox}>
          <Text style={styles.code}>{code}</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, copied && styles.actionBtnDone]}
            onPress={handleCopy}
            activeOpacity={0.8}
          >
            <Ionicons
              name={copied ? "checkmark-circle" : "copy-outline"}
              size={20}
              color={copied ? "#0D9488" : "#6B7280"}
            />
            <Text style={[styles.actionBtnText, copied && styles.actionBtnTextDone]}>
              {copied ? "Copied!" : "Copy Code"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-outline" size={20} color="#FFFFFF" />
            <Text style={styles.shareBtnText}>Share Code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 28,
    lineHeight: 20,
  },
  codeBox: {
    backgroundColor: "#F0FDFA",
    borderWidth: 2,
    borderColor: "#CCFBF1",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    marginBottom: 28,
  },
  code: {
    fontSize: 38,
    fontWeight: "800",
    color: "#0D9488",
    letterSpacing: 10,
  },
  actions: {
    flexDirection: "row",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    marginRight: 12,
  },
  actionBtnDone: {
    borderColor: "#CCFBF1",
    backgroundColor: "#F0FDFA",
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
    marginLeft: 6,
  },
  actionBtnTextDone: {
    color: "#0D9488",
  },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#0D9488",
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 6,
  },
});
