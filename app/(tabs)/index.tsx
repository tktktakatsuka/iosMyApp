import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';

// 日本語カレンダー設定
LocaleConfig.locales['ja'] = {
  monthNames: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
  monthNamesShort: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
  dayNames: ['日曜日','月曜日','火曜日','水曜日','木曜日','金曜日','土曜日'],
  dayNamesShort: ['日','月','火','水','木','金','土'],
  today: '今日'
};
LocaleConfig.defaultLocale = 'ja';

type ProfitData = Record<string, number>;

export default function CalendarScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [profitData, setProfitData] = useState<ProfitData>({});
  const lastTappedDate = useRef<string | null>(null);

  // 合計損益計算
  const totalProfit = Object.values(profitData).reduce((sum, val) => sum + val, 0);

  useFocusEffect(
    useCallback(() => {
      loadProfitData(); // ← フォーカス時にデータ再読み込み
    }, [])
  );

  // AsyncStorageからデータ読み込み
  const loadProfitData = async () => {
    try {
      const json = await AsyncStorage.getItem('profitData');
      if (json) {
        setProfitData(JSON.parse(json));
      }
    } catch (e) {
      console.error('データ読み込み失敗:', e);
    }
  };

  // AsyncStorageに保存
  const saveProfitData = async (data: ProfitData) => {
    try {
      await AsyncStorage.setItem('profitData', JSON.stringify(data));
    } catch (e) {
      console.error('データ保存失敗:', e);
    }
  };

  // 日付タップ処理
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

  // デモ用: 選択された日にランダム損益を保存する関数（本来はフォームなどで入力）
  const addRandomProfit = async () => {
    if (!selectedDate) return;
    const newProfit = Math.floor(Math.random() * 5000) * (Math.random() > 0.5 ? 1 : -1);
    const updated = { ...profitData, [selectedDate]: newProfit };
    setProfitData(updated);
    await saveProfitData(updated);
  };

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={handleDayPress}
        markedDates={selectedDate ? { [selectedDate]: { selected: true, selectedColor: '#00adf5' } } : {}}
        theme={{
          textDayFontSize: 20,
          textMonthFontSize: 10,
          textDayHeaderFontSize: 18,
          selectedDayBackgroundColor: '#00adf5',
          todayTextColor: '#00adf5',
        }}
        monthFormat={'yyyy年 MM月'}
        firstDay={0}
        dayComponent={({ date, state }) => {
          if (!date) return null;
          const profit = profitData[date.dateString];
          const isSelected = selectedDate === date.dateString;

          return (
            <TouchableOpacity onPress={() => handleDayPress(date)}>
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
            </TouchableOpacity>
          );
        }}
      />

      {/* 合計損益 */}
      <View style={styles.selectedProfitContainer}>
        <Text style={[styles.selectedProfitText, totalProfit >= 0 ? styles.profit : styles.loss]}>
          合計損益: {totalProfit >= 0 ? `+${totalProfit}` : totalProfit} 円
        </Text>
      </View>

      {/* デモボタン */}
      <TouchableOpacity onPress={addRandomProfit} style={styles.addButton}>
        <Text style={styles.addButtonText}>損益をランダムに追加</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 90,
    paddingHorizontal: 1,
  },
  dayContainer: {
    width: 50,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDay: {
    backgroundColor: '#00adf5',
    borderRadius: 1,
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
  addButton: {
    marginTop: 20,
    backgroundColor: '#00adf5',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
  },
});
