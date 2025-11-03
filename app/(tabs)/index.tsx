import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import AdBanner from '../../components/AdBanner';


import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

// 日本語カレンダー設定
LocaleConfig.locales['ja'] = {
  monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  dayNames: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  dayNamesShort: ['日', '月', '火', '水', '木', '金', '土'],
  today: '今日'
};
LocaleConfig.defaultLocale = 'ja';

// ProfitItem の型定義にidを追加
type ProfitItem = {
  id: string; // 各項目を一意に識別するためのID
  amount: number;
  categoryId?: string;
  type?: 'income' | 'expense';
};

// ProfitData の型定義を ProfitItem の配列を保持するように変更
type ProfitData = Record<string, ProfitItem[]>;

export default function CalendarScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(dayjs().format('YYYY-MM-DD'));
  const [profitData, setProfitData] = useState<ProfitData>({});
  const lastTappedDate = useRef<string | null>(null);

  const selectedMonth = selectedDate ? dayjs(selectedDate).format('YYYY-MM') : dayjs().format('YYYY-MM');

  // 月の合計損益の計算ロジックを修正
  const totalProfit = Object.entries(profitData)
    .filter(([date]) => date.startsWith(selectedMonth))
    .reduce((sum, [, items]) => {
      // items が配列であることを確認し、そうでない場合は空の配列として扱う
      const itemsArray = Array.isArray(items) ? items : [];

      // その日のすべての項目を合計に追加
      const dayTotal = itemsArray.reduce((daySum, item) => { // ここで itemsArray を使用
        const type = item.type ?? 'income';
        const signedAmount = type === 'expense' ? -Math.abs(item.amount) : Math.abs(item.amount);
        return daySum + signedAmount;
      }, 0);
      return sum + dayTotal;
    }, 0);

  useFocusEffect(
    useCallback(() => {
      loadProfitData();
    }, [])
  );

  const loadProfitData = async () => {
    try {
      const json = await AsyncStorage.getItem('profitData');
      console.log('読み込みデータ:', json); // デバッグ用にログを追加

      if (json) {
        const rawData = JSON.parse(json);
        let convertedData: ProfitData = {};

        // 読み込んだデータがオブジェクトであることを確認
        if (rawData && typeof rawData === 'object' && Object.keys(rawData).length > 0) {
          // 各日付のエントリをループ処理
          for (const dateString in rawData) {
            if (Object.prototype.hasOwnProperty.call(rawData, dateString)) {
              const value = rawData[dateString];

              if (Array.isArray(value)) {
                // 既に新しい形式 (ProfitItem[]) の場合
                convertedData[dateString] = value;
              } else if (typeof value === 'object' && value !== null && 'amount' in value) {
                // 旧形式 (単一の ProfitItem オブジェクト) の場合、配列にラップしてIDを追加
                // IDがない場合は仮のIDを生成 (例: 日付+ランダム文字列)
                const itemWithId: ProfitItem = { 
                  ...value, 
                  id: value.id || dayjs(dateString).format('YYYYMMDDHHmmss') + Math.random().toString(36).substring(2, 10) 
                };
                convertedData[dateString] = [itemWithId];
              }
              // その他の予期しない形式の場合は無視するか、エラー処理
            }
          }
        }
        setProfitData(convertedData);
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

  const screenWidth = Dimensions.get('window').width;
  const dayCellWidth = screenWidth / 7;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Calendar
          onDayPress={handleDayPress}
          theme={{
            textDayFontSize: 16,
            textMonthFontSize: 14,
            textDayHeaderFontSize: 14,
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

          dayComponent={({ date, state }) => {
            if (!date) return null;
            // その日付のすべてのProfitItemを取得
            const profitItemsForDay = profitData[date.dateString] || [];
            const isSelected = selectedDate === date.dateString;

            // その日の合計損益を計算
           const totalAmountForDay = profitItemsForDay.reduce((sum, item) => { 
              const type = item.type ?? 'income';
              const signedAmount = type === 'expense' ? -Math.abs(item.amount) : Math.abs(item.amount);
              return sum + signedAmount;
            }, 0);

            return (
              <TouchableOpacity onPress={() => handleDayPress(date)}>
                <View style={[
                  styles.dayContainer,
                  { width: dayCellWidth },
                  isSelected ? styles.selectedDay : null
                ]}>
                  <Text style={[styles.dayText, state === 'disabled' && styles.disabledText]}>
                    {date.day}
                  </Text>
                  {/* その日の合計損益を表示 */}
                  {profitItemsForDay.length > 0 && (
                    <Text style={[
                      styles.profitText,
                      totalAmountForDay >= 0 ? styles.profit : styles.loss
                    ]}>
                      {totalAmountForDay >= 0 ? `+${totalAmountForDay}` : totalAmountForDay}
                    </Text>
                  )}
                  {/*
                  // もし個別の項目を表示したい場合（デザインと相談）
                  {profitItemsForDay.slice(0, 2).map((item) => ( // 例: 上位2件のみ表示
                    <Text key={item.id} style={[
                      styles.smallProfitText, // 必要に応じて新しいスタイルを定義
                      item.type === 'expense' ? styles.loss : styles.profit
                    ]}>
                      {item.type === 'expense' ? `-${Math.abs(item.amount)}` : `+${item.amount}`}
                    </Text>
                  ))}
                  */}
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

        <AdBanner size="LARGE_BANNER" />

      </ScrollView>



    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  dayContainer: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDay: {
    backgroundColor: '#00adf5', // 修正: typo '00rradf5' -> '00adf5'
    borderRadius: 4,
  },
  dayText: {
    fontSize: 16,
  },
  disabledText: {
    color: '#d9d9d9',
  },
  profitText: {
    fontSize: 12,
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
  todayBox: {
    backgroundColor: '#00adf5',
    borderRadius: 4,
  },
  // 必要に応じて追加する小額表示用のスタイル
  smallProfitText: {
    fontSize: 10,
  }
});