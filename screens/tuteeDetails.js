import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import {
  getFirestore,
  doc,
  getDoc,
  addDoc,
  collection,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import BackButton from "../components/backButton";
import Calendar from "../components/calendar";
import { AntDesign } from "@expo/vector-icons";
import Tooltip from "react-native-walkthrough-tooltip";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { launchImageLibrary } from "react-native-image-picker";

// Initialize Firestore
const db = getFirestore();

export default function TuteeDetails({ route }) {
  const { userId } = route.params;
  const [tuteeData, setTuteeData] = useState(null);
  const [source, setSource] = useState(require("../assets/profilepic.jpg"));
  const [showTooltip, setShowTooltip] = useState(false);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  const fetchTuteeDetails = async () => {
    setLoading(true);
    try {
      const currentUserId = auth.currentUser.uid;

      // Fetch the current tutor's document
      const tutorDocRef = doc(db, "Tutor", currentUserId);
      const tutorDocSnap = await getDoc(tutorDocRef);

      if (tutorDocSnap.exists()) {
        const tutorData = tutorDocSnap.data();
        const tuteesArray = tutorData.tutees || []; // Ensure tuteesArray is defined

        // Find the matching tutee by userId from route params
        const selectedTutee = tuteesArray.find(
          (tutee) => tutee.userId === userId // Use userId from params
        );

        if (selectedTutee) {
          console.log("Selected tutee details:", selectedTutee);
          setTuteeData(selectedTutee);
          setSource({ uri: selectedTutee.photoUrl });
        } else {
          console.error("No details found for this tutee");
        }
      } else {
        console.error("No tutor document found for the current user");
      }
    } catch (error) {
      console.error("Error fetching tutee details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTuteeDetails();
  }, [userId]); // Ensure to use selectedUserId here

  useEffect(() => {
    const checkFirstAccess = async () => {
      try {
        const hasAccessed = await AsyncStorage.getItem("hasAccessedScreen");

        if (!hasAccessed) {
          // Show the tooltip only if this is the first access
          setShowTooltip(true);
          await AsyncStorage.setItem("hasAccessedScreen", "true");
        }
      } catch (error) {
        console.log("Error checking AsyncStorage:", error);
      }
    };

    checkFirstAccess();
  }, []);

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

        if (selectedUri && auth.currentUser && userId) {
          const fileName = selectedUri.split("/").pop();
          await uploadFile(selectedUri, auth.currentUser.uid, userId, fileName);
        } else {
          Alert.alert(
            "Missing Data",
            "User or tutor data is not loaded. Please try again."
          );
        }
      }
    });
  };

  const uploadFile = async (uri, userId, tutorId, fileName) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const storage = getStorage();
      const filePath = `uploads/${userId}/${fileName}`;
      const storageRef = ref(storage, filePath);

      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
        },
        (error) => {
          console.error("Upload failed:", error);
          Alert.alert(
            "Upload failed",
            "Error uploading the file. Please try again."
          );
        },
        async () => {
          const fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, "files"), {
            filePath: fileUrl,
            uploadedBy: userId,
            sharedWith: tutorId,
            uploadDate: new Date(),
          });
          Alert.alert("Success", "File uploaded and metadata saved!");
        }
      );
    } catch (error) {
      console.error("File upload error:", error);
      Alert.alert("Error uploading file", "Please try again.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topBar}>
        <BackButton />
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <>
            <Text style={styles.boxTitle}>
              {tuteeData?.name || "Tutee Name"}
            </Text>
            <Tooltip
              isVisible={showTooltip}
              content={
                <Text>
                  Tap to upload a document and share it with your tutor.
                </Text>
              }
              placement="bottom"
              onClose={() => setShowTooltip(false)}
              contentStyle={styles.tooltipContent}
            >
              <AntDesign
                name="plus"
                size={24}
                color="#fff"
                onPress={selectFile}
              />
            </Tooltip>
          </>
        )}
      </View>

      <View style={styles.profileContainer}>
        <Image source={source} style={styles.profileImage} />
        <AntDesign
          name="mail"
          size={24}
          color="#fff"
          onPress={() => {
            if (tuteeData.email) {
              const emailUrl = `mailto:${tuteeData.email}`;
              Linking.openURL(emailUrl).catch(() => {
                Alert.alert(
                  "Error",
                  "Unable to open the mail app. Please make sure you have an email client installed."
                );
              });
            } else {
              Alert.alert(
                "Email unavailable",
                "This tutor does not have an email listed."
              );
            }
          }}
          style={styles.icon}
        />
      </View>

      <View style={styles.containerCalendar}>
        <Text style={styles.boxTitle3}>{"Check your bookings..."}</Text>
        {/* <Calendar tutorId={userId} /> */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: 80,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 20,
    marginLeft: 5,
    justifyContent: "space-evenly",
  },
  containerCalendar: {
    flex: 1,
    paddingTop: 40,
  },
  boxTitle: {
    flex: 0.8,
    color: "#fff",
    fontSize: 22,
    textAlign: "center",
  },
  boxTitle3: {
    flex: 1,
    color: "#fff",
    fontSize: 20,
    textAlign: "center",
    paddingBottom: 20,
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginLeft: 20,
  },
  tooltipContent: {
    backgroundColor: "#fff",
    borderRadius: 5,
    padding: 10,
    minWidth: 200,
  },
  icon: {
    paddingHorizontal: 40,
    width: 50,
    height: 50,
  },
});
