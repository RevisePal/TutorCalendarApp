import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons for the profile icon

export default function Home() {
  const navigation = useNavigation();
  const [tutors, setTutors] = useState([]);

  const handleTutorClick = (tutorId) => {
    console.log("Selected tutor:", tutorId);
    navigation.navigate("activity", { tutorId });
  };

  useEffect(() => {
    const fetchTutors = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (currentUser) {
          const userId = currentUser.uid;
          const db = getFirestore();
          const userDocRef = doc(db, "users", userId);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const data = userDoc.data();
            const myTutorsArray = Array.isArray(data.myTutors) ? data.myTutors : [];

            // Log the tutors array to verify structure
            console.log("Fetched tutors:", myTutorsArray);

            const fetchedTutors = myTutorsArray.map((tutor) => ({
              tutorId: tutor.id,
              name: tutor.name,
              subject: tutor.subject,
            }));

            // Log the formatted tutors array
            console.log("Formatted tutors:", fetchedTutors);

            setTutors(fetchedTutors);
          } else {
            console.log("User document does not exist");
          }
        } else {
          console.log("No user is currently logged in.");
        }
      } catch (error) {
        console.error("Error fetching tutors:", error);
      }
    };

    fetchTutors();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Home</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <Ionicons name="person-circle" size={30} color="gold" />
        </TouchableOpacity>
      </View>
      <View style={styles.logoContainer}>
      </View>
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>My Tutors</Text>
        {tutors.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tutors.map((tutor) => (
              <TouchableOpacity
                key={tutor.tutorId}
                onPress={() => handleTutorClick(tutor.tutorId)}
                style={{
                  width: 100,
                  height: 100,
                  backgroundColor: "gold",
                  margin: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: "black",
                  borderWidth: 2,
                  borderRadius: 15,
                  shadowColor: "transparent",
                }}
              >
                <Text style={styles.boxTitle}>{tutor.name}</Text>
                <Text style={[styles.boxTitle, styles.italic]}>{tutor.subject}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <TouchableOpacity style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>No Current {'\n'}Tutors</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Favourites</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tutors
            .filter((activity) => activity.recommended)
            .map((activity, index) => (
              <TouchableOpacity
                key={index}
                style={styles.activityBox}
                onPress={() => handleActivityClick(activity.id)}
              >
                <Text style={styles.boxTitle}>{activity.tutorName}</Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "flex-start",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: "10%",
  },
  header: {
    fontSize: 30,
    fontWeight: "bold",
    color: "gold",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 10, // Adjust as needed
  },
  sectionContainer: {
    marginVertical: 10, // Adjust as needed
    paddingHorizontal: 20, // Adjust as needed
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  signOutButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "red",
    padding: 10,
    borderRadius: 5,
  },
  signOutText: {
    color: "white",
    fontWeight: "bold",
  },
  searchBox: {
    borderWidth: 1,
    marginTop: 10,
    padding: 10,
    height: 50,
    borderRadius: 10,
    borderColor: "grey",
  },
  boxTitle: {
    textAlign: "center",
    fontSize: 18,
    alignContent: "center",
    paddingVertical: 5,
    color: "black",
    fontWeight: "700",
  },
  emptyButton: {
    width: "100%",
    height: 80,
    backgroundColor: "gray",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    marginTop: 20,
  },
  emptyButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    padding: 10,
    textAlign: 'center',
  },
  italic: {
    fontStyle: "italic",
  },
});