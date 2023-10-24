import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { doc, getDoc, onSnapshot, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function Favourites() {
  const [favouriteActivities, setFavouriteActivities] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    const auth = getAuth();
    const userId = auth.currentUser.uid;
    const db = getFirestore();
    const userDoc = doc(db, "users", userId);

    const unsubscribe = onSnapshot(userDoc, async (userSnap) => {
      if (userSnap.exists()) {
        const favIds = userSnap.data().favorites || [];
        const favs = [];

        for (const id of favIds) {
          const activityDoc = doc(db, "activities", id);
          const activitySnap = await getDoc(activityDoc);
          if (activitySnap.exists()) {
            favs.push({
              id,
              title: activitySnap.data().title,
              // Add more fields if needed
            });
          }
        }
        setFavouriteActivities(favs);
      }
    });

    // Cleanup function
    return () => {
      unsubscribe();
    };
  }, []);

  const handleActivityClick = (activityId) => {
    navigation.navigate("activity", { activityId });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Favourites</Text>
      <FlatList
        data={favouriteActivities}
        keyExtractor={(item) => item?.id?.toString() || String(Math.random())}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleActivityClick(item.id)}
          >
            <Text style={styles.cardText}>{item.title}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#2C2C2C",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 5,
    padding: 15,
    marginBottom: 10,
  },
  cardText: {
    fontSize: 18,
  },
});
