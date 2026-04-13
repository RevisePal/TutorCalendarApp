import React, { useState } from "react";
import * as Clipboard from "expo-clipboard";
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

  ScrollView,
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

const generateTuteeCode = (existingTutees = []) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const existingCodes = existingTutees.map((t) => t.tuteeCode).filter(Boolean);
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (existingCodes.includes(code));
  return code;
};

export default function NewTuteeModal({ visible, onClose, onAddTutee, inviteCode }) {
  const [email, setEmail] = useState("");
  const [nameOnly, setNameOnly] = useState("");
  const [error, setError] = useState(null);
  const [nameError, setNameError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nameLoading, setNameLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    await Share.share({
      message: `Join me on BookingBuddy! Use my invite code to connect: ${inviteCode}\n\nDownload the app: https://apps.apple.com/us/app/bookingbuddy/id1635777567`,
      url: "https://apps.apple.com/us/app/bookingbuddy/id1635777567",
    });
  };

  const addTuteeByEmail = async () => {
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
      const isAlreadyAdded = currentTutees.some(
        (t) => t.email === newTutee.email || t.userId === newTutee.userId
      );

      if (isAlreadyAdded) {
        setError("This tutee is already in your list.");
        return;
      }

      await updateDoc(tutorDocRef, { tutees: [...currentTutees, newTutee] });

      const currentTutors = tuteeData.myTutors || [];
      const isTutorAlreadyAdded = currentTutors.some((t) => t.id === tutorId);
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

  const addTuteeByName = async () => {
    if (!nameOnly.trim()) {
      setNameError("Please enter a name.");
      return;
    }
    setNameLoading(true);
    setNameError(null);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setNameError("No tutor is currently logged in.");
        return;
      }

      const db = getFirestore();
      const tutorId = currentUser.uid;
      const tutorDocRef = doc(db, "Tutor", tutorId);
      const tutorDoc = await getDoc(tutorDocRef);

      if (!tutorDoc.exists()) {
        setNameError("Tutor document does not exist.");
        return;
      }

      const tutorData = tutorDoc.data();
      const currentTutees = tutorData.tutees || [];
      const tuteeCode = generateTuteeCode(currentTutees);
      const newTutee = {
        name: nameOnly.trim(),
        userId: null,
        email: null,
        photoUrl: null,
        tuteeCode,
      };

      await updateDoc(tutorDocRef, { tutees: [...currentTutees, newTutee] });

      setNameSuccess(true);
      onAddTutee(newTutee);

      setTimeout(() => {
        setNameOnly("");
        setNameError(null);
        setNameSuccess(false);
        onClose();
      }, 1000);

    } catch (err) {
      console.error("Error adding tutee by name:", err);
      setNameError("Something went wrong. Please try again.");
    } finally {
      setNameLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setNameOnly("");
    setError(null);
    setNameError(null);
    setSuccess(false);
    setNameSuccess(false);
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
              <ScrollView
                style={styles.sheet}
                contentContainerStyle={styles.sheetContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Handle bar */}
                <View style={styles.handle} />
               

                {/* ── Section 1: Invite code ── */}
                {inviteCode && (
                  <>
                  
                  {/* <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.title}>Add a Tutee</Text>
                    <Text style={styles.subtitle}>
                      Choose how you'd like to add your tutee
                    </Text>
                  </View> */}
                  <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                    <Ionicons name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Share your invite code</Text>
                      <Text style={styles.sectionSubtitle}>
                        Share the code to your tutee to link accounts. Linked accounts can share files, receive
                        notifications, and see bookings on both sides.
                      </Text>
                    </View>
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
                            <Ionicons
                              name={copied ? "checkmark" : "copy-outline"}
                              size={15}
                              color={copied ? "#0D9488" : "#6B7280"}
                            />
                            <Text style={[styles.codeBtnText, copied && styles.codeBtnTextDone]}>
                              {copied ? "Copied!" : "Copy"}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.shareBtn}
                            onPress={handleShare}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="share-outline" size={15} color="#FFFFFF" />
                            <Text style={styles.shareBtnText}>Share</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </>
                )}

                {/* ── Divider ── */}
                <View style={styles.sectionDivider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* ── Section 2: Add by email ── */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Link by email</Text>
                </View>
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

                {error && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {success && (
                  <View style={styles.successBox}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#0D9488" />
                    <Text style={styles.successText}>Tutee linked successfully!</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.addButton, loading && styles.addButtonDisabled]}
                  onPress={addTuteeByEmail}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="link-outline" size={18} color="#fff" />
                      <Text style={styles.addButtonText}>Link Account</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* ── Divider ── */}
                <View style={[styles.sectionDivider, { marginTop: 24 }]}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* ── Section 3: Name only ── */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Add by name only</Text>
                  <Text style={styles.sectionSubtitle}>
                    Add a tutee without linking an account. File sharing or
                    notifications are not enabled.
                  </Text>
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Full name</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="e.g. Alex Johnson"
                    value={nameOnly}
                    onChangeText={(t) => { setNameOnly(t); setNameError(null); }}
                    autoCapitalize="words"
                    autoCorrect={false}
                    textColor="#111827"
                    outlineColor="#E5E7EB"
                    activeOutlineColor="#0D9488"
                    theme={{ colors: { placeholder: "#9CA3AF", background: "#FAFAFA" } }}
                    style={styles.input}
                  />
                </View>

                {nameError && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{nameError}</Text>
                  </View>
                )}

                {nameSuccess && (
                  <View style={styles.successBox}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#0D9488" />
                    <Text style={styles.successText}>Tutee added!</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.addButton, styles.addButtonOutline, nameLoading && styles.addButtonDisabled]}
                  onPress={addTuteeByName}
                  disabled={nameLoading}
                  activeOpacity={0.85}
                >
                  {nameLoading ? (
                    <ActivityIndicator color="#0D9488" />
                  ) : (
                    <>
                      <Ionicons name="person-add-outline" size={18} color="#0D9488" />
                      <Text style={[styles.addButtonText, styles.addButtonTextOutline]}>
                        Add Without Account
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

              </ScrollView>
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
    maxHeight: "95%",
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingBottom: 80,
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
    position: "absolute",
    top: 20,
    right: 12,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  inputWrapper: {
    marginBottom: 12,
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
    marginBottom: 12,
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
    marginBottom: 12,
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
    paddingVertical: 14,
    borderRadius: 14,
  },
  addButtonOutline: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#0D9488",
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },
  addButtonTextOutline: {
    color: "#0D9488",
  },
  codeSection: {
    backgroundColor: "#F0FDFA",
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
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
    marginBottom: 20,
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
