import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";

export default function Home() {
  const navigation = useNavigation();
  const [activities, setActivities] = useState([]);

  const handleActivityClick = (activityId) => {
    navigation.navigate("activity", { activityId });
  };

  useEffect(() => {
    const fetchActivities = async () => {
      const db = getFirestore();
      const querySnapshot = await getDocs(collection(db, "activities"));
      const fetchedActivities = [];
      querySnapshot.forEach((doc) => {
        fetchedActivities.push({ id: doc.id, title: doc.data().title });
      });
      setActivities(fetchedActivities);
    };

    fetchActivities();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/kiddl-logo.webp")}
            style={{ width: 90, height: 60 }}
          />
        </View>
      </View>
      <Text style={styles.header}>Explore</Text>
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Search</Text>
        <TextInput
          style={styles.searchBox}
          placeholder="Search activities..."
        />
      </View>
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>All Activities</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {activities.map((activity, index) => (
            <TouchableOpacity
              key={index}
              style={styles.activityBox}
              onPress={() => handleActivityClick(activity.id)}
            >
              <Text style={styles.boxTitle}>{activity.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Most Popular</Text>
        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50, // Adjust as needed
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 10, // Adjust as needed
  },
  header: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#2C2C2C",
    paddingHorizontal: 20, // Adjust as needed
    marginBottom: 20,
  },
  sectionContainer: {
    marginVertical: 10, // Adjust as needed
    paddingHorizontal: 20, // Adjust as needed
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "grey",
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
  activityBox: {
    width: 100,
    marginTop: 10,
    height: 100,
    justifyContent: "center",
    borderRadius: 10,
    borderColor: "grey",
    alignItems: "center",
    borderWidth: 1,
    marginHorizontal: 5,
  },
  boxTitle: {
    textAlign: "center",
  },
});
