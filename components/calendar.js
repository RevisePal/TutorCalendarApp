import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Calendar } from "react-native-calendars";
import {
  collection,
  getDoc,
  doc,
  updateDoc,
  addDoc,
  arrayUnion,
  setDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import Modal from "react-native-modal";
import { AntDesign } from "@expo/vector-icons";
import { launchImageLibrary } from "react-native-image-picker";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

const screenHeight = Dimensions.get("window").height;

export default function CalendarComponent({ tutorId, userId }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [bookings, setBookings] = useState({});
  const [displayDate, setDisplayDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [showTimeInputs, setShowTimeInputs] = useState(false);
  const [isTutor, setIsTutor] = useState(false);

  const auth = getAuth();
  const db = getFirestore();
  const tutoruid = auth.currentUser.uid;

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

  const onClose = () => {
    setModalVisible(false);
    setShowTimeInputs(false); // Reset visibility when closed
    fetchBookings();
  };

  const onClose2 = () => {
    setModalVisible(false);
    setShowTimeInputs(false); // Reset visibility when closed
  };

  const fetchUserData = async () => {
    const user = auth.currentUser;

    if (!user) {
      console.log("No current user available.");
      return;
    }

    const userId = user.uid;
    console.log("Fetching user data for userId:", userId);

    try {
      const tutorDocRef = doc(db, "Tutor", userId);
      const tutorDocSnap = await getDoc(tutorDocRef);

      if (tutorDocSnap.exists()) {
        console.log("Tutor found, setting isTutor to true"); // Log if user is a tutor
        setIsTutor(true); // Set isTutor to true
      } else {
        console.log("No tutor found for userId:", userId); // Log if no tutor document exists
        setIsTutor(false); // Ensure non-tutors are marked as such
      }
    } catch (error) {
      Alert.alert("Error", error.message);
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleCreateBooking = async () => {
    if (!startTime || !endTime) {
      Alert.alert("Please fill in both start and end times.");
      return;
    }

    try {
      // Prepare booking data
      const bookingData = {
        bookingDates: new Date(`${selectedDate}T${startTime}:00`),
        endTime: new Date(`${selectedDate}T${endTime}:00`),
      };

      const bookingsDocRef = doc(db, `Tutor/${tutoruid}/bookings/${userId}`);

      // Check if the document exists
      const docSnap = await getDoc(bookingsDocRef);

      if (docSnap.exists()) {
        // Document exists, update with new booking
        await updateDoc(bookingsDocRef, {
          tuteeBookings: arrayUnion(bookingData),
        });
      } else {
        // Document does not exist, create a new one with the booking
        await setDoc(bookingsDocRef, {
          tuteeBookings: [bookingData],
        });
      }

      Alert.alert("Success", "Booking created successfully.");
      setStartTime(""); // Reset input field
      setEndTime(""); // Reset input field
      onClose(); // Close the modal
    } catch (error) {
      console.error("Error creating booking:", error);
      Alert.alert("Error", "Failed to create booking. Please try again.");
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

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const currentUserId = currentUser.uid;

      let bookingsDocRef;
      let bookings = {};

      // Case when the current user is a tutor viewing a specific tutee's bookings
      if (userId) {
        bookingsDocRef = doc(db, `Tutor/${currentUserId}/bookings/${userId}`);
      }
      // Case when the current user is a tutee viewing their tutor's bookings
      else if (tutorId) {
        bookingsDocRef = doc(db, `Tutor/${tutorId}/bookings/${currentUserId}`);
      } else {
        throw new Error("Either userId or tutorId must be provided.");
      }

      const docSnapshot = await getDoc(bookingsDocRef);

      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        if (data.tuteeBookings) {
          data.tuteeBookings.forEach((booking) => {
            const startTime = new Date(
              booking.bookingDates.seconds * 1000
            ).toISOString();
            const endTime = new Date(
              booking.endTime.seconds * 1000
            ).toISOString();
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
              bookingDates: startTime,
              endTime: endTime,
            };
          });
        }
      } else {
        console.warn("No bookings found for the specified tutor/tutee.");
      }

      setBookings(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [userId, tutorId]);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <View>
      <Calendar
        onDayPress={handleDayPress} // Make sure to define handleDayPress
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
            <Text style={styles.modalHeader}>Selected Date: {displayDate}</Text>

            {selectedBooking ? (
              <View>
                <Text style={styles.bookingDetails}>
                  Lesson Starts at{" "}
                  <Text style={styles.redText}>
                    {new Date(selectedBooking.bookingDates).toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </Text>
                </Text>
                <Text style={styles.bookingDetails}>
                  Lesson Ends at{" "}
                  <Text style={styles.redText}>
                    {new Date(selectedBooking.endTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </Text>
                <TouchableOpacity
                  style={styles.plusContainer}
                  onPress={selectFile}
                >
                  <AntDesign name="plus" size={24} color="black" />
                  <Text style={styles.fileText}>Upload a file here</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {isTutor ? (
                  !showTimeInputs ? (
                    <TouchableOpacity
                      style={styles.createBookingButton}
                      onPress={() => setShowTimeInputs(true)} // Show time inputs when pressed
                    >
                      <Text style={styles.createBookingText}>
                        Create Booking
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <Text style={styles.label}>
                        Start Time (24hr format, e.g., 14:30)
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholder="HH:MM"
                        value={startTime}
                        onChangeText={setStartTime}
                      />
                      <Text style={styles.label}>
                        End Time (24hr format, e.g., 15:30)
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholder="HH:MM"
                        value={endTime}
                        onChangeText={setEndTime}
                      />
                      <View style={styles.buttonContainer}>
                        <TouchableOpacity
                          style={styles.button}
                          onPress={handleCreateBooking}
                        >
                          <Text style={styles.buttonText}>Confirm Booking</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )
                ) : (
                  <Text style={styles.noBookingText}>
                    No bookings for this date
                  </Text>
                )}
              </>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={onClose2}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    //position: "absolute",
    bottom: 0,
    width: "100%",
    height: screenHeight * 0.33, // Take 1/3 of the screen height
    backgroundColor: "white",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    padding: 20,
    elevation: 5, // Add shadow on Android
    shadowColor: "#000", // Add shadow on iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    //width: "80%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  bookingDetails: {
    fontSize: 16,
    marginVertical: 5,
  },
  redText: {
    color: "red",
  },
  plusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  fileText: {
    marginLeft: 5,
    color: "blue",
  },
  closeButton: {
    backgroundColor: "lightgray",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  closeButtonText: {
    textAlign: "center",
  },
  createBookingButton: {
    backgroundColor: "gold", // Customize as needed
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
  },
  createBookingText: {
    color: "black",
    fontWeight: "600",
  },
  label: {
    fontSize: 16,
    marginTop: 10,
  },
  input: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginVertical: 5,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  button: {
    backgroundColor: "gold",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: "black",
    fontWeight: "600",
    textAlign: "center",
  },
  cancelButton: {
    backgroundColor: "lightgray",
  },
  cancelText: {
    color: "black",
  },
});
