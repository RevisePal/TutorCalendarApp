import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  Animated,
} from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, auth } from "../firebase";
import * as ImagePicker from "expo-image-picker";
import { TextInput } from "react-native-paper";
import PropTypes from "prop-types";
import { Ionicons } from "@expo/vector-icons";
import AvatarImage, { PRESET_AVATARS } from "../components/AvatarImage";
import useDraggableSheet from "../components/useDraggableSheet";

export default function TutorOnboarding({ navigation }) {
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null); // preset:id or local URI
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const avatarSheet = useDraggableSheet(() => setAvatarModalVisible(false));

  const skipOnboarding = async () => {
    try {
      const userId = auth.currentUser.uid;
      await updateDoc(doc(db, "Tutor", userId), { isOnboarded: true });
      navigation.navigate("MainTabs");
    } catch (error) {
      console.error("Error skipping onboarding:", error);
    }
  };

  const handleSelectPreset = (id) => {
    setSelectedPhotoUrl(`preset:${id}`);
    setAvatarModalVisible(false);
  };

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    setAvatarModalVisible(false);
    setSelectedPhotoUrl(result.assets[0].uri);
  };

  const uploadImage = async (uri, userId) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storage = getStorage();
    const storageRef = ref(storage, `profilePictures/${userId}.jpg`);
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, blob);
      task.on("state_changed", null, reject, async () => {
        resolve(await getDownloadURL(storageRef));
      });
    });
  };

  const handleSubmit = async () => {
    const userId = auth.currentUser.uid;
    setIsSubmitting(true);
    try {
      let photoUrl = null;

      if (selectedPhotoUrl?.startsWith("preset:")) {
        photoUrl = selectedPhotoUrl;
      } else if (selectedPhotoUrl) {
        setUploadingAvatar(true);
        photoUrl = await uploadImage(selectedPhotoUrl, userId);
        setUploadingAvatar(false);
      }

      await updateDoc(doc(db, "Tutor", userId), {
        website,
        phone,
        ...(photoUrl && { photoUrl }),
        isOnboarded: true,
      });

      navigation.navigate("MainTabs", { screen: "Home" });
    } catch (error) {
      console.error("Onboarding Error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
      setUploadingAvatar(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scroll} bounces={false}>

          {/* Header row */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.stepLabel}>Step 1 of 1</Text>
              <Text style={styles.title}>Set up your profile</Text>
            </View>
            <TouchableOpacity style={styles.skipButton} onPress={skipOnboarding}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Add a photo and website so tutees can find and recognise you.
          </Text>

          {/* Profile picture */}
          <View style={styles.imageSection}>
            {selectedPhotoUrl ? (
              <View style={styles.imageContainer}>
                <TouchableOpacity
                  onPress={() => { avatarSheet.reset(); setAvatarModalVisible(true); }}
                  activeOpacity={0.85}
                >
                  <AvatarImage photoUrl={selectedPhotoUrl} style={styles.image} />
                  <View style={styles.cameraEditBadge}>
                    <Ionicons name="camera" size={14} color="#fff" />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={() => { avatarSheet.reset(); setAvatarModalVisible(true); }}
                >
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addPictureButton}
                onPress={() => { avatarSheet.reset(); setAvatarModalVisible(true); }}
              >
                <View style={styles.avatarPlaceholder}>
                  {uploadingAvatar ? (
                    <ActivityIndicator color="#0D9488" />
                  ) : (
                    <Ionicons name="camera-outline" size={32} color="#0D9488" />
                  )}
                </View>
                <Text style={styles.addPictureText}>Add Profile Photo</Text>
                <Text style={styles.addPictureHint}>Tap to choose</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Website input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Website</Text>
            <TextInput
              selectionColor="#0D9488"
              underlineColor="#CCFBF1"
              activeUnderlineColor="#0D9488"
              mode="flat"
              textColor="#111827"
              placeholder="https://yourwebsite.com"
              theme={{ colors: { placeholder: "#9CA3AF", text: "#111827", primary: "#0D9488" } }}
              value={website}
              onChangeText={setWebsite}
              style={styles.input}
            />
          </View>

          {/* Phone input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              selectionColor="#0D9488"
              underlineColor="#CCFBF1"
              activeUnderlineColor="#0D9488"
              mode="flat"
              textColor="#111827"
              placeholder="+44 7700 000000"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              theme={{ colors: { placeholder: "#9CA3AF", text: "#111827", primary: "#0D9488" } }}
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
            />
          </View>

        </ScrollView>

        {/* Pinned bottom button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[styles.submit, isSubmitting && styles.disabledSubmit]}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Save & Continue</Text>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      {/* Avatar picker modal */}
      <Modal
        visible={avatarModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setAvatarModalVisible(false)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>
        <Animated.View style={[styles.avatarSheet, avatarSheet.animatedStyle]} {...avatarSheet.panHandlers}>
          <View style={styles.handleBar} />
          <Text style={styles.avatarSheetTitle}>Choose Photo</Text>

          <FlatList
            data={PRESET_AVATARS}
            keyExtractor={(item) => item.id}
            numColumns={4}
            scrollEnabled={false}
            contentContainerStyle={styles.avatarGrid}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.presetAvatarBtn}
                onPress={() => handleSelectPreset(item.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.presetAvatar, { backgroundColor: item.bg, alignItems: "center", justifyContent: "center" }]}>
                  <Ionicons name={item.icon} size={28} color="#fff" />
                </View>
              </TouchableOpacity>
            )}
          />

          <View style={styles.avatarSheetDivider} />

          <TouchableOpacity style={styles.galleryBtn} onPress={handlePickFromGallery} activeOpacity={0.7}>
            <Ionicons name="images-outline" size={20} color="#0D9488" />
            <Text style={styles.galleryBtnText}>Choose from Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => setAvatarModalVisible(false)} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>

    </SafeAreaView>
  );
}

TutorOnboarding.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E6FAF8",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: "#E6FAF8",
    borderTopWidth: 1,
    borderTopColor: "#CCFBF1",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  stepLabel: {
    fontSize: 12,
    color: "#6B7280",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0D9488",
  },
  skipButton: {
    paddingTop: 6,
  },
  skipText: {
    fontSize: 15,
    color: "#6B7280",
    textDecorationLine: "underline",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 32,
  },
  imageSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  addPictureButton: {
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#0D9488",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  addPictureText: {
    color: "#0D9488",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  addPictureHint: {
    color: "#9CA3AF",
    fontSize: 13,
  },
  imageContainer: {
    alignItems: "center",
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  cameraEditBadge: {
    position: "absolute",
    bottom: 4,
    right: 0,
    backgroundColor: "#0D9488",
    borderRadius: 12,
    padding: 5,
    borderWidth: 2,
    borderColor: "#E6FAF8",
  },
  changeButton: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#0D9488",
  },
  changeText: {
    color: "#0D9488",
    fontSize: 13,
    fontWeight: "600",
  },
  inputSection: {
    marginBottom: 36,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
    marginLeft: 2,
  },
  input: {
    backgroundColor: "transparent",
  },
  submit: {
    backgroundColor: "#0D9488",
    width: "100%",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledSubmit: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.3,
  },
  // Modal
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  avatarSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 16,
  },
  avatarSheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 16,
  },
  avatarGrid: {
    alignItems: "center",
  },
  presetAvatarBtn: {
    padding: 8,
  },
  presetAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarSheetDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  galleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F0FDFA",
    marginBottom: 10,
  },
  galleryBtnText: {
    color: "#0D9488",
    fontSize: 15,
    fontWeight: "600",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelBtnText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "500",
  },
});
