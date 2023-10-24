import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import BackButton from "../components/backButton";
import { MaterialIcons } from "@expo/vector-icons"; // Import vector icons

export default function Activity({ route }) {
  const [activityData, setActivityData] = useState({});
  const { activityId } = route.params;
  const [isFavourite, setIsFavourite] = useState(false); // Add this line

  useEffect(() => {
    const fetchData = async () => {
      const auth = getAuth();
      const userId = auth.currentUser.uid;
      const db = getFirestore();

      // Fetch activity data
      const activityRef = doc(db, "activities", activityId);
      const activitySnap = await getDoc(activityRef);
      if (activitySnap.exists()) {
        setActivityData(activitySnap.data());
      } else {
        console.log("No such document!");
      }

      // Fetch user's favorites
      const userDoc = doc(db, "users", userId);
      const userSnap = await getDoc(userDoc);
      if (userSnap.exists()) {
        const userFavorites = userSnap.data().favorites || [];
        setIsFavourite(userFavorites.includes(activityId));
      }
    };

    fetchData();
  }, [activityId]);

  const toggleFavourite = async () => {
    const auth = getAuth();
    const userId = auth.currentUser.uid;
    const db = getFirestore();
    const userDoc = doc(db, "users", userId);

    const userSnap = await getDoc(userDoc);
    let currentFavourites =
      userSnap.exists() && userSnap.data().favorites
        ? userSnap.data().favorites
        : [];

    let newIsFavourite = false;

    if (currentFavourites.includes(activityId)) {
      currentFavourites = currentFavourites.filter((id) => id !== activityId);
    } else {
      currentFavourites.push(activityId);
      newIsFavourite = true;
    }

    await updateDoc(userDoc, { favorites: currentFavourites });

    setIsFavourite(newIsFavourite);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topBar}>
        <BackButton />
        <TouchableOpacity onPress={toggleFavourite}>
          <MaterialIcons
            name={isFavourite ? "favorite" : "favorite-border"}
            size={24}
            color="black"
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.header}>{activityData.title}</Text>
      {Object.entries(activityData)
        .filter(([key]) => key !== "title")
        .map(([key, value]) => {
          if (key === "popular" && !value) return null;
          return (
            <View style={styles.card} key={key}>
              <Text style={styles.label}>
                {key.replace(/([A-Z])/g, " $1").replace(/^./, function (str) {
                  return str.toUpperCase();
                })}
              </Text>
              {Array.isArray(value) ? (
                <View>
                  {value.map((item, index) => (
                    <Text style={styles.value} key={index}>
                      {item}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text style={styles.value}>{value}</Text>
              )}
            </View>
          );
        })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  header: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#2C2C2C",
    marginVertical: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 5,
    padding: 15,
    marginBottom: 10,
  },
  label: {
    fontSize: 18,
    fontWeight: "bold",
  },
  value: {
    fontSize: 16,
    marginTop: 5,
  },
});
