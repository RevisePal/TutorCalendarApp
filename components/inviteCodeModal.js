import React, { useState } from "react";
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, TouchableWithoutFeedback,
} from "react-native";
import { TextInput } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import {
  getFirestore, collection, query, where, getDocs,
  doc, getDoc, updateDoc,
} from "firebase/firestore";

export default function InviteCodeModal({ visible, onClose, onLinked }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (code.trim().length !== 6) {
      setError("Please enter a valid 6-character code.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const auth = getAuth();
      const db = getFirestore();
      const tuteeId = auth.currentUser.uid;

      // Find tutor by invite code
      const q = query(collection(db, "Tutor"), where("inviteCode", "==", code.trim().toUpperCase()));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError("No tutor found with that code. Check and try again.");
        return;
      }

      const tutorDoc = snap.docs[0];
      const tutorId = tutorDoc.id;
      const tutorData = tutorDoc.data();

      // Get tutee data
      const tuteeDocRef = doc(db, "users", tuteeId);
      const tuteeSnap = await getDoc(tuteeDocRef);
      if (!tuteeSnap.exists()) {
        setError("Your account was not found.");
        return;
      }
      const tuteeData = tuteeSnap.data();

      // Check not already linked
      const currentTutors = tuteeData.myTutors || [];
      if (currentTutors.some((t) => t.id === tutorId)) {
        setError("You are already connected to this tutor.");
        return;
      }

      const currentTutees = tutorData.tutees || [];
      if (currentTutees.some((t) => t.userId === tuteeId)) {
        setError("You are already connected to this tutor.");
        return;
      }

      // Link tutor → tutee
      const newTutee = {
        userId: tuteeId,
        name: tuteeData.name || "Unknown",
        email: tuteeData.email,
        photoUrl: tuteeData.photoUrl || null,
      };
      await updateDoc(doc(db, "Tutor", tutorId), { tutees: [...currentTutees, newTutee] });

      // Link tutee → tutor
      const newTutor = { id: tutorId, name: tutorData.name || "Unknown", subject: "" };
      await updateDoc(tuteeDocRef, { myTutors: [...currentTutors, newTutor] });

      setSuccess(true);
      onLinked();
      setTimeout(() => {
        setCode("");
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Invite code error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCode("");
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <View style={styles.sheet}>
                <View style={styles.handle} />
                <View style={styles.header}>
                  <View>
                    <Text style={styles.title}>Enter Invite Code</Text>
                    <Text style={styles.subtitle}>Ask your tutor for their 6-character code</Text>
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                    <Ionicons name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrapper}>
                  <TextInput
                    mode="outlined"
                    placeholder="e.g. A3X9KZ"
                    value={code}
                    onChangeText={(t) => { setCode(t.toUpperCase()); setError(null); }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={6}
                    textColor="#111827"
                    outlineColor="#CCFBF1"
                    activeOutlineColor="#0D9488"
                    theme={{ colors: { placeholder: "#9CA3AF", background: "#F9FFFE" } }}
                    style={styles.input}
                  />
                </View>

                {error && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {success && (
                  <View style={styles.successBox}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#0D9488" />
                    <Text style={styles.successText}>Connected successfully!</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Ionicons name="link-outline" size={18} color="#fff" />
                      <Text style={styles.submitText}>Connect to Tutor</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
  handle: { width: 40, height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 2 },
  subtitle: { fontSize: 13, color: "#6B7280" },
  closeButton: { padding: 4, backgroundColor: "#F3F4F6", borderRadius: 20 },
  inputWrapper: { marginBottom: 16 },
  input: { backgroundColor: "#F9FFFE", fontSize: 20, letterSpacing: 4, fontWeight: "700" },
  errorBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 10, padding: 10, marginBottom: 16 },
  errorText: { color: "#EF4444", fontSize: 13, marginLeft: 6, flex: 1 },
  successBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F0FDF4", borderRadius: 10, padding: 10, marginBottom: 16 },
  successText: { color: "#0D9488", fontSize: 13, marginLeft: 6 },
  submitButton: { backgroundColor: "#0D9488", flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 14, marginTop: 4 },
  submitDisabled: { backgroundColor: "#9CA3AF" },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginLeft: 8 },
});
