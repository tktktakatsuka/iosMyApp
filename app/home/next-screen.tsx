import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NextScreen() {
  const { date } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text>選んだ日付: {date}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
