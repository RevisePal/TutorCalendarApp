import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { auth, db } from "../firebase";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc, deleteDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const generateInviteCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

export default function ProfileScreen() {
  const [userData, setUserData] = useState({ email: "", name: "", photoUrl: "" });
  const [isTutor, setIsTutor] = useState(false);
  const [switchLoading, setSwitchLoading] = useState(false);
  const [tutorFields, setTutorFields] = useState({ phone: "", website: "", bio: "" });
  const [editingTutor, setEditingTutor] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editBio, setEditBio] = useState("");
  const [savingTutor, setSavingTutor] = useState(false);
  const navigation = useNavigation();
  const currentUser = auth.currentUser;

  const fetchUserData = async () => {
    const userId = currentUser.uid;
    try {
      const tutorSnap = await getDoc(doc(db, "Tutor", userId));
      if (tutorSnap.exists() && tutorSnap.data().isActive !== false) {
        const d = tutorSnap.data();
        setUserData({ email: d.email, name: d.name, photoUrl: d.photoUrl || "" });
        setIsTutor(true);
        const fields = { phone: d.phone || "", website: d.website || "", bio: d.bio || "" };
        setTutorFields(fields);
        setEditPhone(fields.phone);
        setEditWebsite(fields.website);
        setEditBio(fields.bio);
      } else {
        const userSnap = await getDoc(doc(db, "users", userId));
        if (userSnap.exists()) {
          const d = userSnap.data();
          setUserData({ email: d.email, name: d.name, photoUrl: d.photoUrl || "" });
          setIsTutor(false);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleSwitchRole = () => {
    const nextRole = isTutor ? "Student" : "Tutor";
    Alert.alert(
      "Switch Role",
      `Switch to ${nextRole}? Your existing connections will be preserved.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Switch", onPress: doSwitch },
      ]
    );
  };

  const doSwitch = async () => {
    setSwitchLoading(true);
    const userId = currentUser.uid;
    try {
      if (isTutor) {
        // Tutor → Tutee: deactivate Tutor doc, ensure users doc exists
        await updateDoc(doc(db, "Tutor", userId), { isActive: false });
        const userSnap = await getDoc(doc(db, "users", userId));
        if (!userSnap.exists()) {
          await setDoc(doc(db, "users", userId), {
            name: userData.name,
            email: userData.email,
            photoUrl: userData.photoUrl || null,
            myTutors: [],
            createdAt: serverTimestamp(),
          });
        }
        setIsTutor(false);
      } else {
        // Tutee → Tutor: create or reactivate Tutor doc
        const tutorSnap = await getDoc(doc(db, "Tutor", userId));
        if (tutorSnap.exists()) {
          await updateDoc(doc(db, "Tutor", userId), { isActive: true });
        } else {
          await setDoc(doc(db, "Tutor", userId), {
            name: userData.name,
            email: userData.email,
            photoUrl: userData.photoUrl || null,
            inviteCode: generateInviteCode(),
            tutees: [],
            isOnboarded: false,
            isActive: true,
            createdAt: serverTimestamp(),
          });
        }
        setIsTutor(true);
      }
    } catch (err) {
      console.error("Role switch error:", err);
      Alert.alert("Error", "Failed to switch role. Please try again.");
    } finally {
      setSwitchLoading(false);
    }
  };

  const handleSaveTutorProfile = async () => {
    setSavingTutor(true);
    try {
      const userId = currentUser.uid;
      await updateDoc(doc(db, "Tutor", userId), {
        phone: editPhone.trim(),
        website: editWebsite.trim(),
        bio: editBio.trim(),
      });
      setTutorFields({ phone: editPhone.trim(), website: editWebsite.trim(), bio: editBio.trim() });
      setEditingTutor(false);
    } catch (err) {
      console.error("Error saving tutor profile:", err);
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSavingTutor(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(getAuth());
      navigation.navigate("Start");
    } catch (error) {
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: deleteUserAccount },
      ]
    );
  };

  const deleteUserAccount = async () => {
    const userId = currentUser.uid;
    try {
      const tutorSnap = await getDoc(doc(db, "Tutor", userId));
      if (tutorSnap.exists()) await deleteDoc(doc(db, "Tutor", userId));
      const userSnap = await getDoc(doc(db, "users", userId));
      if (userSnap.exists()) await deleteDoc(doc(db, "users", userId));
      await currentUser.delete();
      await signOut(auth);
      navigation.navigate("SignUp");
    } catch (error) {
      Alert.alert("Error", "Failed to delete account. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#0D9488" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <Image
            source={userData.photoUrl ? { uri: userData.photoUrl } : require("../assets/profilepic.jpg")}
            style={styles.avatar}
          />
          <Text style={styles.name}>{userData.name}</Text>
          <View style={[styles.roleBadge, isTutor ? styles.roleBadgeTutor : styles.roleBadgeTutee]}>
            <Ionicons
              name={isTutor ? "school-outline" : "book-outline"}
              size={13}
              color={isTutor ? "#0D9488" : "#6366F1"}
            />
            <Text style={[styles.roleBadgeText, isTutor ? styles.roleBadgeTextTutor : styles.roleBadgeTextTutee]}>
              {isTutor ? "Tutor" : "Student"}
            </Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="person-outline" size={18} color="#0D9488" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{userData.name}</Text>
            </View>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail-outline" size={18} color="#0D9488" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{userData.email}</Text>
            </View>
          </View>
        </View>

        {/* Tutor-only profile fields */}
        {isTutor && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>Tutor Profile</Text>
              {!editingTutor ? (
                <TouchableOpacity
                  onPress={() => {
                    setEditPhone(tutorFields.phone);
                    setEditWebsite(tutorFields.website);
                    setEditBio(tutorFields.bio);
                    setEditingTutor(true);
                  }}
                  style={styles.editBtn}
                >
                  <Ionicons name="pencil-outline" size={15} color="#0D9488" />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setEditingTutor(false)}
                  style={styles.editBtn}
                >
                  <Ionicons name="close-outline" size={16} color="#6B7280" />
                  <Text style={[styles.editBtnText, { color: "#6B7280" }]}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.card}>
              {/* Phone */}
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="call-outline" size={18} color="#0D9488" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  {editingTutor ? (
                    <TextInput
                      style={styles.fieldInput}
                      value={editPhone}
                      onChangeText={setEditPhone}
                      placeholder="e.g. +44 7700 900000"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                    />
                  ) : (
                    <Text style={[styles.infoValue, !tutorFields.phone && styles.emptyValue]}>
                      {tutorFields.phone || "Not set"}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.cardDivider} />

              {/* Website */}
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="globe-outline" size={18} color="#0D9488" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Website</Text>
                  {editingTutor ? (
                    <TextInput
                      style={styles.fieldInput}
                      value={editWebsite}
                      onChangeText={setEditWebsite}
                      placeholder="e.g. https://yoursite.com"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="url"
                      autoCapitalize="none"
                    />
                  ) : (
                    <Text style={[styles.infoValue, !tutorFields.website && styles.emptyValue]}>
                      {tutorFields.website || "Not set"}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.cardDivider} />

              {/* Bio */}
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="document-text-outline" size={18} color="#0D9488" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Bio</Text>
                  {editingTutor ? (
                    <TextInput
                      style={[styles.fieldInput, styles.bioInput]}
                      value={editBio}
                      onChangeText={setEditBio}
                      placeholder="Tell students about yourself..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                    />
                  ) : (
                    <Text style={[styles.infoValue, !tutorFields.bio && styles.emptyValue]}>
                      {tutorFields.bio || "Not set"}
                    </Text>
                  )}
                </View>
              </View>

              {/* Save button */}
              {editingTutor && (
                <TouchableOpacity
                  style={[styles.saveBtn, savingTutor && styles.saveBtnDisabled]}
                  onPress={handleSaveTutorProfile}
                  disabled={savingTutor}
                >
                  {savingTutor
                    ? <ActivityIndicator color="#fff" size="small" />
                    : (
                      <>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={styles.saveBtnText}>Save Profile</Text>
                      </>
                    )
                  }
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Switch role */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={handleSwitchRole} disabled={switchLoading} activeOpacity={0.7}>
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: "#EEF2FF" }]}>
                <Ionicons name="swap-horizontal-outline" size={18} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.actionText}>Switch to {isTutor ? "Student" : "Tutor"}</Text>
                <Text style={styles.actionSub}>
                  {isTutor ? "View the app as a student" : "Switch to teaching mode"}
                </Text>
              </View>
            </View>
            {switchLoading
              ? <ActivityIndicator color="#6366F1" size="small" />
              : <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            }
          </TouchableOpacity>
        </View>

        {/* Sign out + delete */}
        <Text style={styles.sectionLabel}>Danger zone</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={handleLogout} activeOpacity={0.7}>
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: "#FFF7ED" }]}>
                <Ionicons name="log-out-outline" size={18} color="#F97316" />
              </View>
              <Text style={styles.actionText}>Sign Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.cardDivider} />
          <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAccount} activeOpacity={0.7}>
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: "#FEF2F2" }]}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </View>
              <Text style={[styles.actionText, { color: "#EF4444" }]}>Delete Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E6FAF8",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#CCFBF1",
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleBadgeTutor: {
    backgroundColor: "#CCFBF1",
    borderColor: "#0D9488",
  },
  roleBadgeTutee: {
    backgroundColor: "#EEF2FF",
    borderColor: "#6366F1",
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 5,
  },
  roleBadgeTextTutor: {
    color: "#0D9488",
  },
  roleBadgeTextTutee: {
    color: "#6366F1",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F0FDFA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  actionSub: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 20,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDFA",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0D9488",
    marginLeft: 4,
  },
  fieldInput: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: "#CCFBF1",
    paddingVertical: 4,
    paddingHorizontal: 0,
    marginTop: 2,
  },
  bioInput: {
    height: 72,
    textAlignVertical: "top",
  },
  emptyValue: {
    color: "#9CA3AF",
    fontWeight: "400",
    fontStyle: "italic",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D9488",
    marginHorizontal: 0,
    marginTop: 4,
    marginBottom: 14,
    paddingVertical: 13,
    borderRadius: 12,
  },
  saveBtnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 6,
  },
});
