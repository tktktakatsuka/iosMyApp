import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

type ProfitData = Record<string, number>;

export default function NextScreen() {
  const { date } = useLocalSearchParams(); // URLから日付を取得
  const router = useRouter();
  const [amount, setAmount] = useState<string>(''); // 入力欄の金額（文字列）
  const [totalProfit, setTotalProfit] = useState<number>(0); // ← 追加

  useEffect(() => {
    if (typeof date === 'string') {
      loadProfit(date);
    }
  }, [date]);

  // 指定日付の金額を読み込む
  const loadProfit = async (targetDate: string) => {
    try {
      const json = await AsyncStorage.getItem('profitData');
      if (json) {
        const data: ProfitData = JSON.parse(json);
        const existing = data[targetDate];
        if (existing !== undefined) {
          setAmount(String(existing));
        }
      }
    } catch (e) {
      console.error('読み込み失敗:', e);
    }
  };

  // 保存処理
  const saveProfit = async () => {
    if (typeof date !== 'string') return;

    const numericValue = parseInt(amount);
    if (isNaN(numericValue)) {
      Alert.alert('数字を入力してください');
      return;
    }

    try {
      const json = await AsyncStorage.getItem('profitData');
      const data: ProfitData = json ? JSON.parse(json) : {};

      data[date] = numericValue; // 新しい金額で更新
      await AsyncStorage.setItem('profitData', JSON.stringify(data));

      Alert.alert('保存しました');
      router.back(); // ← 前の画面に戻る
    } catch (e) {
      console.error('保存失敗:', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{date} の損益</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="例: 3000 または -1500"
      />
      <Button title="保存する" onPress={saveProfit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 18,
    marginBottom: 16,
  },
  input: {
    borderColor: 'gray',
    borderWidth: 1,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
});
