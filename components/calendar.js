// CalendarComponent.js
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, Dimensions } from "react-native";
import { Calendar } from "react-native-calendars";
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';  // Import Firestore initialization
import Modal from 'react-native-modal';

const { width } = Dimensions.get("window");

export default function CalendarComponent({ tutorId }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [bookings, setBookings] = useState({});
  const [displayDate, setDisplayDate] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const handleDayPress = async (day) => {
    const dateString = day.dateString;
    setSelectedDate(dateString);
    
    const [year, month, dayPart] = dateString.split('-');
    const europeanDate = `${dayPart}/${month}/${year}`;
    setDisplayDate(europeanDate);

    // Fetch the booking for the selected date
    const booking = bookings[dateString] ? bookings[dateString] : null;
    setSelectedBooking(booking);
    
    setModalVisible(true);
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
          const startTime = new Date(data.startTime.seconds * 1000).toISOString();
          const endTime = new Date(data.endTime.seconds * 1000).toISOString();
          bookings[startTime.split('T')[0]] = {
            customStyles: {
              container: {
                backgroundColor: 'gold',
                borderRadius: 10,
                elevation: 5,
                height: 35,
                width: 35,
              },
              text: {
                color: 'black',
                fontWeight: 'bold',
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
        markedDates={bookings}  // Pass the bookings as markedDates
        markingType={'custom'}  // Use 'custom' to apply custom styles
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
        <Text style={styles.modalHeader}>Selected Date: {displayDate}</Text>

        {bookings[selectedDate] ? (
          <View>
                  <Text style={styles.bookingDetails}>
                    Lesson Starts at <Text style={styles.redText}>{new Date(selectedBooking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </Text>
                  <Text style={styles.bookingDetails}>
                    Lesson Ends at <Text style={styles.redText}>{new Date(selectedBooking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </Text>
                </View>
        ) : (
          <Text style={styles.noBookingText}>No bookings for this date</Text>
        )}

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
    borderColor: '#e3e3e3',
    borderRadius: 10,
    alignSelf: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  bookingDetails: {
    fontSize: 16,
    marginVertical: 5,
  },
  noBookingText: {
    fontSize: 16,
    color: 'red',
    marginVertical: 5,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: 'gold',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight:"600"
  },
  redText: {
    color: 'tomato',
    fontWeight:'600'
  },
});