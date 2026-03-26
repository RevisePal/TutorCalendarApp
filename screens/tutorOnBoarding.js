import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth } from "../firebase";
import { launchImageLibrary } from "react-native-image-picker";
import { TextInput } from "react-native-paper";
import PropTypes from "prop-types";
import { Ionicons } from "@expo/vector-icons";

export default function TutorOnboarding({ navigation }) {
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const skipOnboarding = async () => {
    try {
      const userId = auth.currentUser.uid;
      await updateDoc(doc(db, "Tutor", userId), { isOnboarded: true });
      navigation.navigate("MainTabs");
    } catch (error) {
      console.error("Error skipping onboarding:", error);
    }
  };

  const selectFile = () => {
    launchImageLibrary({ mediaType: "mixed" }, async (response) => {
      if (response.didCancel) return;
      if (response.errorMessage) {
        console.error("Image Picker Error: ", response.errorMessage);
        return;
      }
      if (response.assets && response.assets.length > 0) {
        const selectedUri = response.assets[0].uri;
        const fileSize = response.assets[0].fileSize;
        if (fileSize > 5242880) {
          Alert.alert("File too large", "Please select a file smaller than 5MB.");
          return;
        }
        setProfileImage(selectedUri);
      }
    });
  };

  const uploadImage = async (uri, userId) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storage = getStorage();
    const storageRef = ref(storage, `profilePictures/${userId}.jpg`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async () => {
    const userId = auth.currentUser.uid;
    setIsSubmitting(true);
    try {
      let imageUrl = null;
      if (profileImage) {
        imageUrl = await uploadImage(profileImage, userId);
      }
      await updateDoc(doc(db, "Tutor", userId), {
        website: website,
        phone: phone,
        ...(imageUrl && { photoUrl: imageUrl }),
        isOnboarded: true,
      });
      Alert.alert("Success", "Your profile has been updated!");
      navigation.navigate("MainTabs", { screen: "Home" });
    } catch (error) {
      console.error("Onboarding Error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
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
            {profileImage ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: profileImage }} style={styles.image} />
                <TouchableOpacity style={styles.dismissButton} onPress={() => setProfileImage(null)}>
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.changeButton} onPress={selectFile}>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addPictureButton} onPress={selectFile}>
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color="#0D9488" />
                </View>
                <Text style={styles.addPictureText}>Add Profile Photo</Text>
                <Text style={styles.addPictureHint}>Tap to upload</Text>
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
    width: 140,
    height: 140,
    borderRadius: 70,
    borderColor: "#0D9488",
    borderWidth: 3,
    marginBottom: 12,
  },
  dismissButton: {
    position: "absolute",
    top: 4,
    right: -4,
    backgroundColor: "#6B7280",
    borderRadius: 12,
    padding: 4,
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  changeButton: {
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
});
