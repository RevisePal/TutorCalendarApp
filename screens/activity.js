import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import BackButton from "../components/backButton";
import Calendar from "../components/calendar";
import { AntDesign } from '@expo/vector-icons';
import { Linking, Alert } from "react-native";


export default function Activity({ route }) {
  const { tutorId } = route.params; // Get the tutor ID passed from the previous screen
  const [tutorData, setTutorData] = useState("");
  const [userData, setUserData] = useState(null);
  const [source, setSource] = useState(null);
  const [userTutorSubject, setUserTutorSubject] = useState(null);
  const auth = getAuth();

  useEffect(() => {
  }, [tutorId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const db = getFirestore();

        // Fetch tutor details
        const tutorDocRef = doc(db, "Tutor", tutorId);
        const tutorDoc = await getDoc(tutorDocRef);
        if (tutorDoc.exists()) {
          const tutorData = tutorDoc.data();
          setTutorData(tutorData);
          const photoUrl = tutorData.photoUrl;
          setSource(photoUrl);
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
      }
    };

    if (tutorId) {
      fetchData();
    }
  }, [tutorId, auth.currentUser]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topBar}>
        <BackButton />
        <Text style={styles.boxTitle}>{tutorData.name}</Text>
        <AntDesign name="plus" size={24} color="#fff" onPress={() => {}}/>
      </View>

      <View style={styles.profileContainer}>
    <Image
      source={{uri:source}}
      style={styles.profileImage}
    />
    <View>
    <Text style={[styles.boxTitle2, styles.italic]}>{userTutorSubject}</Text>
    <View style={styles.iconContainer}>
    <AntDesign name="phone" size={24} color="#fff" onPress={() => {if (tutorData.phone) {
      Linking.openURL(`tel:${tutorData.phone}`);
    } else {
      Alert.alert("Phone number unavailable", "This tutor does not have a phone number listed.");
    }}} style={styles.icon} />
    <AntDesign name="mail" size={24} color="#fff" onPress={() => {if (tutorData.mail) {
      const emailUrl = `mailto:${tutorData.mail}`;
      
      Linking.openURL(emailUrl).catch(() => {
        Alert.alert(
          "Error",
          "Unable to open the mail app. Please make sure you have an email client installed."
        );
      });
    } else {
      Alert.alert("Email unavailable", "This tutor does not have an email listed.");
    }}} style={styles.icon} />
      <AntDesign name="link" size={24} color="#fff" onPress={() => {if (tutorData.website) {
      const websiteUrl = tutorData.website.startsWith('http://') || tutorData.website.startsWith('https://')
        ? tutorData.website
        : `http://${tutorData.website}`;
      
      Linking.openURL(websiteUrl).catch((err) => 
        console.error("Failed to open URL:", err)
      );
    } else {
      Alert.alert("Website unavailable", "This tutor does not have a website listed.");
    }}} style={styles.icon} />
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
    flexDirection: "row",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom:20,
    marginLeft: 5,
    justifyContent:'space-evenly'
  },
  containerCalendar: {
    flex: 1,
    paddingTop: 40,
  },
  header: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#2C2C2C",
    marginVertical: 20,
  },
  italic: {
    fontStyle: "italic",
  },
  boxTitle: {
    flex: 0.8,
    textAlign: "center",
    fontSize: 25,
    fontWeight: "700",
    color: "#fff",
  },
  boxTitle2: {
    fontSize: 18,
    paddingVertical: 5,
    color: "white",
    fontWeight: "700",
  },
  boxTitle3: {
    fontSize: 18,
    paddingVertical: 5,
    color: "white",
    fontWeight: "700",
  },
  profileContainer: {
    flexDirection: 'row',  // Aligns profile image and subject in a row
    marginVertical: 15,    // Adds spacing around the row
    paddingHorizontal: 25, // Adds padding to the sides
  },
  profileImage: {
    width: 100,             // Width of the profile picture
    height: 100,            // Height of the profile picture
    borderRadius: 25,      // Makes the image circular
    marginRight: 20,       // Adds space between the image and the text
  },
  iconContainer: {
    flexDirection: 'row', // Aligns icons in a row
    justifyContent: 'space-around', // Distributes space evenly
    marginTop: 25,         // Adds space between the subject and icons
  },
  
  icon: {
    fontSize: 24,         // Adjust icon size
    marginHorizontal: 20, // Adds space between icons
  },  
});
