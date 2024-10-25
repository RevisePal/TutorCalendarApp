// CalendarComponent.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { collection, getDocs, query, where, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Import Firestore initialization
import Modal from "react-native-modal";
import { AntDesign } from "@expo/vector-icons";
import { launchImageLibrary } from "react-native-image-picker";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

const { width } = Dimensions.get("window");

export default function CalendarComponent({ tutorId, userId }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [bookings, setBookings] = useState({});
  const [displayDate, setDisplayDate] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const auth = getAuth();

  const handleDayPress = async (day) => {
    const dateString = day.dateString;
    setSelectedDate(dateString);

    const [year, month, dayPart] = dateString.split("-");
    const europeanDate = `${dayPart}/${month}/${year}`;
    setDisplayDate(europeanDate);

    // Fetch the booking for the selected date
    const booking = bookings[dateString] ? bookings[dateString] : null;
    setSelectedBooking(booking);

    setModalVisible(true);
  };
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
          Alert.alert("Success", "File uploaded");
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

  async function fetchBookings(tutorId) {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      const db = getFirestore();

      if (user) {
        const userId = user.uid;
        const bookingsCollection = collection(db, `Tutor/${tutorId}/bookings`);
        const q = query(bookingsCollection, where("userId", "==", userId));

        const querySnapshot = await getDocs(q);
        const bookings = {};

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const startTime = new Date(
            data.startTime.seconds * 1000
          ).toISOString();
          const endTime = new Date(data.endTime.seconds * 1000).toISOString();
          bookings[startTime.split("T")[0]] = {
            customStyles: {
              container: {
                backgroundColor: "gold",
                borderRadius: 10,
                elevation: 5,
                height: 35,
                width: 35,
              },
              text: {
                color: "black",
                fontWeight: "bold",
              },
            },
            startTime: startTime,
            endTime: endTime,
          };
        });

        return bookings;
      } else {
        return {};
      }
    } catch (error) {
      console.error("Error fetching bookings: ", error);
      return {};
    }
  }

  useEffect(() => {
    const loadBookings = async () => {
      const fetchedBookings = await fetchBookings(tutorId);
      setBookings(fetchedBookings);
    };

    loadBookings();
  }, [tutorId]);

  return (
    <View>
      <Calendar
        onDayPress={handleDayPress}
        markedDates={bookings} // Pass the bookings as markedDates
        markingType={"custom"} // Use 'custom' to apply custom styles
        style={styles.calendar}
      />
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        onBackdropPress={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalHeader}>
                Selected Date: {displayDate}
              </Text>

              {bookings[selectedDate] ? (
                <View>
                  <Text style={styles.bookingDetails}>
                    Lesson Starts at{" "}
                    <Text style={styles.redText}>
                      {new Date(selectedBooking.startTime).toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </Text>
                  </Text>
                  <Text style={styles.bookingDetails}>
                    Lesson Ends at{" "}
                    <Text style={styles.redText}>
                      {new Date(selectedBooking.endTime).toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </Text>
                  </Text>
                </View>
              ) : (
                <Text style={styles.noBookingText}>
                  No bookings for this date
                </Text>
              )}
              <TouchableOpacity
                style={styles.plusContainer}
                onPress={selectFile}
              >
                <AntDesign name="plus" size={24} color="black" />
                <Text style={styles.fileText}>Upload a file here</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: {
    width: width * 0.99,
    borderWidth: 1,
    borderColor: "#e3e3e3",
    borderRadius: 10,
    alignSelf: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
    justifyContent: "center",
    alignItems: "center",
  },
  overlayTouchable: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  plusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
  },
  bookingDetails: {
    fontSize: 16,
    marginVertical: 5,
  },
  noBookingText: {
    fontSize: 16,
    color: "red",
    marginVertical: 5,
  },
  fileText: {
    fontSize: 16,
    color: "blue",
    marginHorizontal: 5,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: "gold",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  closeButtonText: {
    color: "black",
    fontSize: 16,
    fontWeight: "600",
  },
  redText: {
    color: "tomato",
    fontWeight: "600",
  },
});
