import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

type ProfitData = Record<string, number>;

export default function GraphScreen() {
  const [profitData, setProfitData] = useState<ProfitData>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format('YYYY-MM')); // 例: "2025-05"
  const [labels, setLabels] = useState<string[]>([]);
  const [dataPoints, setDataPoints] = useState<number[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const json = await AsyncStorage.getItem('profitData');
      if (json) {
        const allData: ProfitData = JSON.parse(json);
        setProfitData(allData);
      }
    };
    loadData();
  }, []);

  const [totalProfit, setTotalProfit] = useState<number>(0); // ← 追加

  useEffect(() => {
    const filteredDates = Object.keys(profitData)
      .filter(date => date.startsWith(selectedMonth))
      .sort();

    const values = filteredDates.map(date => profitData[date]);

    // ラベル（日付）
    setLabels(filteredDates.map(d => d.slice(8)));

    // ✅ 累積損益に変換
    const cumulativeValues = values.reduce<number[]>((acc, val) => {
      const last = acc.length > 0 ? acc[acc.length - 1] : 0;
      acc.push(last + val);
      return acc;
    }, []);

    setDataPoints(cumulativeValues);

    // 合計損益（累積の最後の値）
    const total = cumulativeValues[cumulativeValues.length - 1] || 0;
    setTotalProfit(total);
  }, [profitData, selectedMonth]);

  const chartWidth = Math.max(labels.length * 50, Dimensions.get('window').width - 16);
  // 年を指定（動的でもOK）
  const year = 2025;

  // 1月〜12月のPicker.Itemを生成
  const monthItems = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, '0'); // "01", "02", ..., "12"
    const value = `${year}-${month}`;
    return (
      <Picker.Item
        key={value}
        label={`${year}年${month}月`}
        value={value}
      />
    );
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>月別損益グラフ</Text>

      {/* 月選択ピッカー */}
      <Picker
        selectedValue={selectedMonth}
        onValueChange={setSelectedMonth}
        style={styles.picker}
      >
        {monthItems}
      </Picker>


      {/* 折れ線グラフ */}
      {dataPoints.length > 0 ? (
        <ScrollView horizontal>
          <LineChart
            data={{
              labels: labels,
              datasets: [{ data: dataPoints }],
            }}
            width={chartWidth}
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
            }}
            style={{ marginVertical: 16, borderRadius: 16 }}
          />
        </ScrollView>
      ) : (
        <Text style={styles.noDataText}>この月のデータはありません。</Text>
      )}

      {/* ✅ ここに追加 */}

      <Text style={styles.totalText}>合計損益：{totalProfit.toLocaleString()}円</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 60,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  picker: {
    marginVertical: 10,
    marginHorizontal: 20,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 20,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    color: '#333',
  }

});
