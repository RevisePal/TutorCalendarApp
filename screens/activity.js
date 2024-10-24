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

export default function Activity({ route }) {
  const { tutorId } = route.params; // Get the tutor ID passed from the previous screen
  const [tutorData, setTutorData] = useState({});
  const [userData, setUserData] = useState(null);
  const [source, setSource] = useState(require("../assets/profilepic.jpg"));
  const [showTooltip, setShowTooltip] = useState(false);
  const [userTutorSubject, setUserTutorSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Start loading

      try {
        const db = getFirestore();

        // Fetch tutor details
        const tutorDocRef = doc(db, "Tutor", tutorId);
        const tutorDoc = await getDoc(tutorDocRef);
        if (tutorDoc.exists()) {
          const tutorData = tutorDoc.data();
          setTutorData(tutorData);

          // Update the image source only if a photoUrl is found
          if (tutorData.photoUrl) {
            setSource({ uri: tutorData.photoUrl });
          }
        } else {
          console.log("No such tutor in the Tutor collection!");
        }

        // Fetch current user details
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userId = currentUser.uid;
          const userDocRef = doc(db, "users", userId);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserData(userData);

            // Find the subject for the current tutorId in the myTutors array
            const matchedTutor = userData.myTutors.find(
              (tutor) => tutor.id === tutorId
            );
            if (matchedTutor) {
              setUserTutorSubject(matchedTutor.subject); // Set the subject from myTutors
            } else {
              console.log("Tutor not found in user's myTutors array");
            }
          } else {
            console.log("No such user in the users collection!");
          }
        } else {
          console.log("No user is currently logged in.");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false); // Stop loading when data fetch is complete
      }
    };

    if (tutorId) {
      fetchData();
    }
  }, [tutorId]);

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
        const fileSize = response.assets[0].fileSize; // Check file size

        // Let's assume the limit is 5MB (5 * 1024 * 1024 = 5242880 bytes)
        if (fileSize > 5242880) {
          Alert.alert(
            "File too large",
            "Please select a file smaller than 5MB."
          );
          return;
        }

        if (selectedUri && auth.currentUser && tutorId) {
          const fileName = selectedUri.split("/").pop();

          console.log("File Name:", fileName);
          console.log("Uploading file by user:", auth.currentUser.uid);
          console.log("For tutor with ID:", tutorId);

          await uploadFile(
            selectedUri,
            auth.currentUser.uid,
            tutorId,
            fileName
          );
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

      // Start resumable file upload
      console.log("Uploading file to:", filePath);

      const uploadTask = uploadBytesResumable(storageRef, blob);

      // Monitor the upload progress
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
          switch (snapshot.state) {
            case "paused":
              console.log("Upload is paused");
              break;
            case "running":
              console.log("Upload is running");
              break;
          }
        },
        (error) => {
          // Handle unsuccessful uploads
          console.error("Upload failed:", error);
          Alert.alert(
            "Upload failed",
            "Error uploading the file. Please try again."
          );
        },
        async () => {
          // Handle successful uploads
          const fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("File uploaded successfully, fileUrl:", fileUrl);

          // Proceed to store metadata in Firestore
          const db = getFirestore();
          const fileData = {
            filePath: fileUrl,
            uploadedBy: userId,
            sharedWith: tutorId,
            uploadDate: new Date(),
          };

          console.log("Saving file metadata to Firestore:", fileData);
          await addDoc(collection(db, "files"), fileData);

          // Success alert
          Alert.alert("Success", "File uploaded and metadata saved!");
        }
      );
    } catch (error) {
      console.error("File upload error:", error);

      // Handle specific Firebase storage error
      if (error.code === "storage/retry-limit-exceeded") {
        Alert.alert(
          "Upload failed",
          "Max retry time exceeded. Please check your network connection and try again."
        );
      } else {
        Alert.alert(
          "Error uploading file",
          "There was an issue with uploading the file. Please try again."
        );
      }
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
            <Text style={styles.boxTitle}>{tutorData.name}</Text>
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
        <Image
          source={source} // Ensure correct type for Image component
          style={styles.profileImage}
        />
        <View>
          <Text style={[styles.boxTitle2, styles.italic]}>
            {userTutorSubject}
          </Text>
          <View style={styles.iconContainer}>
            <AntDesign
              name="phone"
              size={24}
              color="#fff"
              onPress={() => {
                if (tutorData.phone) {
                  Linking.openURL(`tel:${tutorData.phone}`);
                } else {
                  Alert.alert(
                    "Phone number unavailable",
                    "This tutor does not have a phone number listed."
                  );
                }
              }}
              style={styles.icon}
            />
            <AntDesign
              name="mail"
              size={24}
              color="#fff"
              onPress={() => {
                if (tutorData.mail) {
                  const emailUrl = `mailto:${tutorData.mail}`;
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
            <AntDesign
              name="link"
              size={24}
              color="#fff"
              onPress={() => {
                if (tutorData.website) {
                  const websiteUrl =
                    tutorData.website.startsWith("http://") ||
                    tutorData.website.startsWith("https://")
                      ? tutorData.website
                      : `http://${tutorData.website}`;
                  Linking.openURL(websiteUrl).catch((err) =>
                    console.error("Failed to open URL:", err)
                  );
                } else {
                  Alert.alert(
                    "Website unavailable",
                    "This tutor does not have a website listed."
                  );
                }
              }}
              style={styles.icon}
            />
          </View>
        </View>
      </View>

      <View style={styles.containerCalendar}>
        <Text style={styles.boxTitle3}>{"Check your bookings..."}</Text>
        <Calendar tutorId={tutorId} />
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
  italic: {
    fontStyle: "italic",
  },
  boxTitle: {
    flex: 0.8,
    color: "#fff",
    fontSize: 22,
    textAlign: "center",
  },
  boxTitle2: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
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
    justifyContent: "space-around",
    padding: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  iconContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  icon: {
    paddingHorizontal: 10,
  },
  tooltipContent: {
    backgroundColor: "#fff",
    borderRadius: 5,
    padding: 10,
    minWidth: 200,
  },
});
