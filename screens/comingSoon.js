import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ComingSoon = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Coming Soon</Text>
      <Text style={styles.message}>This feature is under development. Stay tuned!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ComingSoon;
