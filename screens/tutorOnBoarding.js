import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Firebase Storage
import { db, auth } from "../firebase"; // Adjust based on your Firebase config
import { launchImageLibrary } from "react-native-image-picker";
import { TextInput } from "react-native-paper";
import PropTypes from "prop-types";

export default function TutorOnboarding({ navigation }) {
  const [website, setWebsite] = useState("");
  const [profileImage, setProfileImage] = useState(null); // To store image URI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);

  const skipOnboarding = async () => {
    console.log("Skipping onboarding...");
    try {
      const userId = auth.currentUser.uid;
      await updateDoc(doc(db, "Tutor", userId), {
        isOnboarded: true,
      });

      console.log("Onboarding skipped. Updating state...");
      setIsOnboarded(true);
      navigation.navigate("MainTabs"); // Navigate to MainTabs instead of Home
      // No need to navigate, the state change will re-render App.js
    } catch (error) {
      console.error("Error skipping onboarding:", error);
    }
  };

  const selectFile = () => {
    launchImageLibrary({ mediaType: "mixed" }, async (response) => {
      if (response.didCancel) {
        console.log("User cancelled image picker");
      } else if (response.errorMessage) {
        console.error("Image Picker Error: ", response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        const selectedUri = response.assets[0].uri;
        const fileSize = response.assets[0].fileSize;

        if (fileSize > 5242880) {
          Alert.alert(
            "File too large",
            "Please select a file smaller than 5MB."
          );
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

      // Only upload the image if one is selected
      if (profileImage) {
        imageUrl = await uploadImage(profileImage, userId);
      }

      await updateDoc(doc(db, "Tutor", userId), {
        website: website,
        ...(imageUrl && { photoUrl: imageUrl }), // Only include photoUrl if imageUrl is not null
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

  const removeImage = () => {
    setProfileImage(null); // Clear the profile image
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={skipOnboarding}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={styles.title}>Set Up Your Tutor Profile</Text>
        {profileImage ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: profileImage }} style={styles.image} />
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={removeImage}
            >
              <Text style={styles.dismissText}>X</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addPictureButton}
            onPress={selectFile}
          >
            <Text style={styles.addPictureText}>Add a Profile Picture</Text>
            <Image
              source={require("../assets/profilepic.jpg")}
              style={styles.profileImage}
            />
          </TouchableOpacity>
        )}
        <TextInput
          selectionColor="gold"
          underlineColor="gold"
          mode="flat"
          activeOutlineColor="white"
          textColor="#fff"
          label={"Add your website"}
          theme={{
            colors: {
              placeholder: "gold",
              text: "gold",
              primary: "white",
            },
          }}
          value={website}
          onChangeText={setWebsite}
          style={styles.input}
        />
      </View>

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={[
          styles.submit, // your custom style
          isSubmitting && styles.disabledSubmit, // optionally style when disabled
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Continue</Text>
        )}
      </TouchableOpacity>
    </View>
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
    backgroundColor: "#000", // Black background to match the signup screen
    padding: 20,
  },
  skipButton: {
    position: "absolute", // Position it absolutely
    top: 30, // Adjust based on how much space you want from the top
    right: 15, // Place it on the right side
    padding: 10,
    zIndex: 1,
  },
  skipText: {
    fontSize: 18,
    color: "gold", // Match the color theme of the app
    fontWeight: "bold",
    fontStyle: "italic",
    textDecorationLine: "underline",
  },
  content: {
    flex: 1, // This will allow the content to take the remaining vertical space
    justifyContent: "space-evenly",
  },
  addPictureButton: {
    backgroundColor: "black", // Matches the background but with visible text
    borderWidth: 1,
    borderColor: "gold",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20, // Adds space between this and the next component
  },
  addPictureText: {
    color: "gold", // Gold text to match the theme
    fontSize: 18,
    fontWeight: "bold",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "gold", // Gold text color
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    marginBottom: 18,
    backgroundColor: "transparent",
    width: "80%",
  },
  imageContainer: {
    position: "relative",
    alignSelf: "center",
    marginVertical: 20,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderColor: "gold",
    borderWidth: 2,
  },
  dismissButton: {
    position: "absolute",
    top: 15,
    right: 20,
    backgroundColor: "rgba(128, 128, 128, 0.6)", // Semi-transparent red background
    borderRadius: 15,
    padding: 5,
    width: 30,
  },
  dismissText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    alignSelf: "center",
  },
  submit: {
    backgroundColor: "gold",
    width: "80%",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 40,
  },
  disabledSubmit: {
    backgroundColor: "#b3b3b3",
  },
  submitText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 18,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 80,
    marginVertical: 10,
    alignSelf: "center",
  },
});
