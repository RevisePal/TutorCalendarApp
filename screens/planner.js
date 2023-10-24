import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { getFirestore, collection, getDocs } from "firebase/firestore";

export default function Planner() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const fetchActivities = async () => {
      const db = getFirestore();
      const querySnapshot = await getDocs(collection(db, "activities"));
      const fetchedActivities = [];
      querySnapshot.forEach((doc) => {
        fetchedActivities.push(doc.data().title);
      });
      setActivities(fetchedActivities);
    };

    fetchActivities();
  }, []);

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Planner</Text>

      <Calendar onDayPress={(day) => handleDayPress(day)} />
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                style={{
                  backgroundColor: "white",
                  padding: 20,
                  borderRadius: 10,
                  width: "80%", // 80% of screen width
                  height: "60%", // 60% of screen height
                }}
              >
                <Text>Planned activities for {selectedDate}</Text>
                <ScrollView vertical showsHorizontalScrollIndicator={false}>
                  {activities.map((title, index) => (
                    <View
                      style={{
                        marginTop: 10,
                        width: "90%",
                        padding: 15,
                        justifyContent: "center",
                        alignItems: "center",
                        borderWidth: 1,
                        borderRadius: 10,
                        marginHorizontal: 5,
                      }}
                      key={index}
                    >
                      <Text>{title}</Text>
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.add}
                  onPress={() => alert("Add an Activity")}
                >
                  <Text style={styles.addText}>Add an Activity</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50, // Adjust as needed
  },
  backButtonContainer: {
    position: "absolute",
    top: 60,
    left: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: "#3b88c3",
    width: "80%",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  add: {
    backgroundColor: "#3b88c3",
    marginBottom: 10,
    width: 300,
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: {
    color: "#fff",
    fontWeight: "bold",
  },
  header: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#2C2C2C",
    paddingHorizontal: 20, // Adjust as needed
    marginBottom: 20,
  },
});
