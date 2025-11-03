import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

// ProfitItem の型定義にidを追加
type ProfitItem = {
  id: string; // 各項目を一意に識別するためのID
  amount: number;
  categoryId?: string;
  type?: 'income' | 'expense'; // 'type' を必須から任意に変更、またはデフォルト値を設定
};

// ProfitData の型定義を ProfitItem の配列を保持するように変更
type ProfitData = Record<string, ProfitItem[]>;

export default function GraphScreen() {
  const [profitData, setProfitData] = useState<ProfitData>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [labels, setLabels] = useState<string[]>([]);
  const [dataPoints, setDataPoints] = useState<number[]>([]);
  const [totalProfit, setTotalProfit] = useState<number>(0);

  useFocusEffect(
    useCallback(() => {
      loadProfitData();
    }, [])
  );

  const loadProfitData = async () => {
    try {
      const json = await AsyncStorage.getItem('profitData');
      console.log('GraphScreen 読み込みデータ:', json); // デバッグ用にログを追加

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
                const itemWithId: ProfitItem = {
                  ...value,
                  id: value.id || dayjs(dateString).format('YYYYMMDDHHmmss') + Math.random().toString(36).substring(2, 10),
                  type: value.type ?? 'income' // typeが未定義の場合のデフォルト値を設定
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
      console.error('GraphScreen データ読み込み失敗:', e);
    }
  };

  useEffect(() => {
    const filteredDates = Object.keys(profitData)
      .filter(date => date.startsWith(selectedMonth))
      .sort();

    const dailyTotals: Record<string, number> = {};

    // 各日付の合計損益を計算
    filteredDates.forEach(date => {
      const itemsForDay = profitData[date] || [];
      const dayTotal = itemsForDay.reduce((sum, item) => {
        const type = item.type ?? 'income'; // typeが未定義の場合のデフォルト
        const signedAmount = type === 'expense' ? -Math.abs(item.amount) : Math.abs(item.amount);
        return sum + signedAmount;
      }, 0);
      dailyTotals[date] = dayTotal;
    });

    // グラフのデータポイント（累積値）を生成
    const cumulativeValues = filteredDates.reduce<number[]>((acc, date) => {
      const last = acc.length > 0 ? acc[acc.length - 1] : 0;
      acc.push(last + dailyTotals[date]);
      return acc;
    }, []);

    setLabels(filteredDates.map(d => dayjs(d).format('M/D'))); // ラベルをM/D形式に変更
    setDataPoints(cumulativeValues);
    setTotalProfit(cumulativeValues[cumulativeValues.length - 1] || 0);
  }, [profitData, selectedMonth]);


  const screenWidth = Dimensions.get('window').width;
  // 1日あたりのグラフ上の幅を確保し、最小でも画面幅になるようにする
  const chartWidth = Math.max(labels.length * 50, screenWidth - 16); // 左右のパディングを考慮して調整

  const currentYear = dayjs().year(); // 現在の年を取得

  const monthItems = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, '0');
    const value = `${currentYear}-${month}`; // 現在の年で Picker を生成
    return <Picker.Item key={value} label={`${currentYear}年${month}月`} value={value} />;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={styles.title}>月別損益グラフ</Text>

      <Picker
        selectedValue={selectedMonth}
        onValueChange={setSelectedMonth}
        style={styles.picker}
      >
        {monthItems}
      </Picker>

      {/* グラフ or データなしメッセージ */}
      <View style={styles.graphContainer}> {/* 新しいコンテナで横スクロールを管理 */}
        {dataPoints.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.chartScrollContent}>
            <LineChart
              data={{
                labels: labels,
                datasets: [{ data: dataPoints }],
              }}
              width={chartWidth} // ここは計算された幅
              height={280}
              yAxisSuffix="円"
              fromZero
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                propsForDots: {
                  r: '5',
                  strokeWidth: '2',
                  stroke: '#00adf5',
                },
                propsForLabels: {
                  fontSize: labels.length > 7 ? 8 : 10,
                }
              }}
              bezier
              style={{ marginVertical: 80, borderRadius: 16, paddingTop: 24 }}
            />
          </ScrollView>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>この月のデータはありません。</Text>
          </View>
        )}
      </View>

      <Text style={styles.totalText}>合計損益：{totalProfit.toLocaleString()}円</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 80,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  picker: {
    marginVertical: 20,
    marginHorizontal: 32,
    height: 56,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 20,
  },
  graphContainer: { // グラフ全体を囲むコンテナ
    minHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    // 横スクロールを機能させるために、内側のコンテンツが幅を超える必要がある
    // ここでは特にスタイルは不要だが、存在を明確にする
  },
  chartScrollContent: { // 横スクロールするコンテンツのスタイル
    alignItems: 'center', // 垂直方向の中央揃え
    // paddingHorizontal: 8, // 必要であれば左右にパディングを追加
  },
  noDataContainer: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 60,
    color: '#333',
  },
});