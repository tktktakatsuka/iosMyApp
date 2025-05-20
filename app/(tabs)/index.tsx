import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native'; // ← ここに StyleSheet を追加
import { Calendar, DateData } from 'react-native-calendars';

// 以下略...



const mockData: Record<string, number> = {
  '2025-05-18': 3000,
  '2025-05-19': -1500,
  '2025-05-20': 0,
};

export default function CalendarScreen() {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const lastTappedDate = useRef<string | null>(null);

  function handleDayPress(day: DateData) {
    if (lastTappedDate.current === day.dateString) {
      router.push({
        pathname: '/home/next-screen',
        params: { date: day.dateString },
      });
      lastTappedDate.current = null;
    } else {
      setSelectedDate(day.dateString);
      lastTappedDate.current = day.dateString;
      setTimeout(() => {
        lastTappedDate.current = null;
      }, 1500);
    }
  }

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={handleDayPress}
        markedDates={{
          [selectedDate]: { selected: true, selectedColor: '#00adf5' },
        }}
        theme={{
          textDayFontSize: 20,
          textMonthFontSize: 10,
          textDayHeaderFontSize: 18,
          selectedDayBackgroundColor: '#00adf5',
          todayTextColor: '#00adf5',
        }}
        dayComponent={({ date, state }) => {
          if (!date) return null;
          const profit = mockData[date.dateString];
          const isSelected = selectedDate === date.dateString;
          return (
            <View style={[styles.dayContainer, isSelected && styles.selectedDay]}>
              <Text style={[styles.dayText, state === 'disabled' && styles.disabledText]}>
                {date.day}
              </Text>
              {profit !== undefined && (
                <Text style={[styles.profitText, profit >= 0 ? styles.profit : styles.loss]}>
                  {profit > 0 ? `+${profit}` : profit}
                </Text>
              )}
            </View>
          );
        }}
      />
      <View style={styles.selectedProfitContainer}>
        <Text style={[styles.selectedProfitText, (mockData[selectedDate] ?? 0) >= 0 ? styles.profit : styles.loss]}>
          {selectedDate} の損益: {(mockData[selectedDate] ?? 0) >= 0 ? `+${mockData[selectedDate]}` : mockData[selectedDate]} 円
        </Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  dayContainer: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDay: {
    backgroundColor: '#00adf5',
    borderRadius: 16,
  },
  dayText: {
    fontSize: 16,
  },
  disabledText: {
    color: '#d9d9d9',
  },
  profitText: {
    fontSize: 9,
    marginTop: 2,
    fontWeight: 'bold',
  },
  profit: {
    color: 'red',
  },
  loss: {
    color: 'blue',
  },
  selectedProfitContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  selectedProfitText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});