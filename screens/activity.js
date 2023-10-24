import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import BackButton from "../components/backButton";

export default function Activity({ route }) {
  const [activityData, setActivityData] = useState({});
  const { activityId } = route.params;

  useEffect(() => {
    const fetchData = async () => {
      const db = getFirestore();
      const activityRef = doc(db, "activities", activityId); // Replace 'activityId' with actual document ID
      const activitySnap = await getDoc(activityRef);

      if (activitySnap.exists()) {
        setActivityData(activitySnap.data());
      } else {
        console.log("No such document!");
      }
    };

    fetchData();
  }, [activityId]);

  return (
    <View style={styles.container}>
      <BackButton />

      <Text style={styles.header}>{activityData.title}</Text>
      <Text>Age Range: {activityData.ageRange}</Text>
      <Text>Education Type: {activityData.educationType}</Text>
      <Text>Engagement Time: {activityData.engagementTime}</Text>
      <Text>How to Play: {activityData.howToPlay}</Text>
      <Text>How to Setup: {activityData.howToSetup}</Text>
      <Text>Popular: {activityData.popular ? "Yes" : "No"}</Text>
      <Text>Things Needed: {activityData.thingsNeeded?.join(", ")}</Text>
      <Text>Time to Setup: {activityData.timeToSetup}</Text>
      <Text>Type: {activityData.type}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50, // Adjust as needed
    paddingHorizontal: 20, // Adjust as needed
  },
  header: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#2C2C2C",
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "grey",
  },
});
