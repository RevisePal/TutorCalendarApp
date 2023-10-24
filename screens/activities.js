import React from 'react';
import { View, Text, StyleSheet } from "react-native";

export default function Activities() {
  return (
    <View style={styles.container}>
            <Text style={styles.header}>Activities</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50, // Adjust as needed
  },
  header: {
    fontSize: 30,
    fontWeight: "bold",
    color: '#2C2C2C',
    paddingHorizontal: 20, // Adjust as needed
    marginBottom: 20, 
  },
});
