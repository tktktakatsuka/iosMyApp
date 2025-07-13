import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';

// 日本語カレンダー設定
LocaleConfig.locales['ja'] = {
  monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  dayNames: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  dayNamesShort: ['日', '月', '火', '水', '木', '金', '土'],
  today: '今日'
};
LocaleConfig.defaultLocale = 'ja';

type ProfitItem = {
  amount: number;
  categoryId?: string;
  type?: 'inÏcome' | 'expense'; // ← 追加
};


type ProfitData = Record<string, ProfitItem>;

export default function CalendarScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [profitData, setProfitData] = useState<ProfitData>({});
  const lastTappedDate = useRef<string | null>(null);

  const selectedMonth = selectedDate ? dayjs(selectedDate).format('YYYY-MM') : dayjs().format('YYYY-MM');

  const totalProfit = Object.entries(profitData)
    .filter(([date]) => date.startsWith(selectedMonth))
    .reduce((sum, [, item]) => {
      const type = item.type ?? 'income'; // デフォルトを収入とする
      const signedAmount = type === 'expense' ? -Math.abs(item.amount) : Math.abs(item.amount);
      return sum + signedAmount;
    }, 0);

  useFocusEffect(
    useCallback(() => {
      loadProfitData()
      console.log(profitData);
    }, [])
  );

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
        theme={{
          textDayFontSize: 20,
          textMonthFontSize: 10,
          textDayHeaderFontSize: 18,
          selectedDayBackgroundColor: '#00adf5',
          todayTextColor: '#00adf5',
        }}
        monthFormat={'yyyy年 MM月'}
        firstDay={0}
        onMonthChange={(month) => {
          const today = dayjs();
          const currentMonth = `${month.year}-${String(month.month).padStart(2, '0')}`;
          if (today.format('YYYY-MM') === currentMonth) {
            setSelectedDate(today.format('YYYY-MM-DD'));
          } else {
            const firstDayOfMonth = `${month.year}-${String(month.month).padStart(2, '0')}-01`;
            setSelectedDate(firstDayOfMonth);
          }
        }}
        markedDates={selectedDate ? { [selectedDate]: { selected: true, selectedColor: '#00adf5' } } : {}}
        dayComponent={({ date, state }) => {
          if (!date) return null;
          const profitItem = profitData[date.dateString];
          const isSelected = selectedDate === date.dateString;
          const amount = profitItem?.amount;

          return (
            <TouchableOpacity onPress={() => handleDayPress(date)}>
              <View style={[styles.dayContainer, isSelected && styles.selectedDay]}>
                <Text style={[styles.dayText, state === 'disabled' && styles.disabledText]}>
                  {date.day}
                </Text>
                {amount !== undefined && (
                  <Text style={[styles.profitText, profitItem?.type === 'expense' ? styles.loss : styles.profit]}>
                    {profitItem?.type === 'expense' ? `-${Math.abs(amount)}` : `+${amount}`}
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
          {selectedMonth} の合計損益: {totalProfit >= 0 ? `+${totalProfit}` : totalProfit} 円
        </Text>
      </View>
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
});
