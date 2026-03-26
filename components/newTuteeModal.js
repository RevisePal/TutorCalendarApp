import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Share,
  Clipboard,
} from "react-native";
import { TextInput } from "react-native-paper";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

export default function NewTuteeModal({ visible, onClose, onAddTutee, inviteCode }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    await Share.share({
      message: `Join me on the app! Use my invite code to connect: ${inviteCode}`,
    });
  };

  const addTutee = async () => {
    if (!email.trim()) {
      setError("Please enter an email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setError("No tutor is currently logged in.");
        return;
      }

      const db = getFirestore();
      const tutorId = currentUser.uid;

      const tutorDocRef = doc(db, "Tutor", tutorId);
      const tutorDoc = await getDoc(tutorDocRef);

      if (!tutorDoc.exists()) {
        setError("Tutor document does not exist.");
        return;
      }

      const tutorData = tutorDoc.data();
      const tutorInfo = {
        id: tutorId,
        name: tutorData.name || "Unknown",
        subject: tutorData.subject || "No subject provided",
      };

      const userQuery = query(
        collection(db, "users"),
        where("email", "==", email.trim().toLowerCase())
      );
      const querySnapshot = await getDocs(userQuery);

      if (querySnapshot.empty) {
        setError("No account found with that email.");
        return;
      }

      const tuteeDoc = querySnapshot.docs[0];
      const tuteeData = tuteeDoc.data();
      const tuteeDocRef = doc(db, "users", tuteeDoc.id);

      const newTutee = {
        name: tuteeData.name || "Unknown",
        userId: tuteeDoc.id,
        email: tuteeData.email,
        photoUrl: tuteeData.photoUrl || null,
      };

      const currentTutees = tutorData.tutees || [];
      const isAlreadyAdded = currentTutees.some((t) => t.email === newTutee.email);

      if (isAlreadyAdded) {
        setError("This tutee is already in your list.");
        return;
      }

      await updateDoc(tutorDocRef, { tutees: [...currentTutees, newTutee] });

      const currentTutors = tuteeData.myTutors || [];
      const isTutorAlreadyAdded = currentTutors.some((t) => t.tutorId === tutorId);
      if (!isTutorAlreadyAdded) {
        await updateDoc(tuteeDocRef, { myTutors: [...currentTutors, tutorInfo] });
      }

      setSuccess(true);
      onAddTutee(newTutee);

      setTimeout(() => {
        setEmail("");
        setError(null);
        setSuccess(false);
        onClose();
      }, 1000);

    } catch (err) {
      console.error("Error adding tutee:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={styles.sheet}>

                {/* Handle bar */}
                <View style={styles.handle} />

                {/* Header */}
                <View style={styles.header}>
                  <View>
                    <Text style={styles.title}>Add a Tutee</Text>
                    <Text style={styles.subtitle}>Share your code or add a tutee by email</Text>
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                    <Ionicons name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {/* Invite code */}
                {inviteCode && (
                  <View style={styles.codeSection}>
                    <Text style={styles.codeLabel}>Your invite code</Text>
                    <View style={styles.codeRow}>
                      <Text style={styles.codeText}>{inviteCode}</Text>
                      <View style={styles.codeActions}>
                        <TouchableOpacity
                          style={[styles.codeBtn, copied && styles.codeBtnDone]}
                          onPress={handleCopy}
                          activeOpacity={0.8}
                        >
                          <Ionicons name={copied ? "checkmark" : "copy-outline"} size={15} color={copied ? "#0D9488" : "#6B7280"} />
                          <Text style={[styles.codeBtnText, copied && styles.codeBtnTextDone]}>
                            {copied ? "Copied!" : "Copy"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
                          <Ionicons name="share-outline" size={15} color="#FFFFFF" />
                          <Text style={styles.shareBtnText}>Share</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {/* Divider */}
                <View style={styles.sectionDivider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or add by email</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Email address</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="tutee@example.com"
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError(null); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textColor="#111827"
                    outlineColor="#CCFBF1"
                    activeOutlineColor="#0D9488"
                    theme={{ colors: { placeholder: "#9CA3AF", background: "#F9FFFE" } }}
                    style={styles.input}
                  />
                </View>

                {/* Error */}
                {error && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Success */}
                {success && (
                  <View style={styles.successBox}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#0D9488" />
                    <Text style={styles.successText}>Tutee added successfully!</Text>
                  </View>
                )}

                {/* Button */}
                <TouchableOpacity
                  style={[styles.addButton, loading && styles.addButtonDisabled]}
                  onPress={addTutee}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="person-add-outline" size={18} color="#fff" />
                      <Text style={styles.addButtonText}>Add Tutee</Text>
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
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
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
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  closeButton: {
    padding: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F9FFFE",
    fontSize: 15,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  successText: {
    color: "#0D9488",
    fontSize: 13,
    marginLeft: 6,
  },
  addButton: {
    backgroundColor: "#0D9488",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  addButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  codeSection: {
    backgroundColor: "#F0FDFA",
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  codeText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0D9488",
    letterSpacing: 6,
  },
  codeActions: {
    flexDirection: "row",
  },
  codeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    marginRight: 8,
  },
  codeBtnDone: {
    borderColor: "#CCFBF1",
    backgroundColor: "#F0FDFA",
  },
  codeBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginLeft: 4,
  },
  codeBtnTextDone: {
    color: "#0D9488",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: "#0D9488",
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginHorizontal: 10,
  },
});
