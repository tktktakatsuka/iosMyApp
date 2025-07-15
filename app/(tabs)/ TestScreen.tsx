import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import { Button, FlatList, StyleSheet, Text, View } from 'react-native';

// データ型
type TestItem = {
  id: number;
  value: string;
  intValue: number;
};

export default function TestScreen() {
  const [items, setItems] = useState<TestItem[]>([]);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);

  // 初期化処理
  useEffect(() => {
    const init = async () => {
      const dbInstance = await SQLite.openDatabaseAsync('databaseName');
      setDb(dbInstance);

      await dbInstance.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS test (
          id INTEGER PRIMARY KEY NOT NULL,
          value TEXT NOT NULL,
          intValue INTEGER
        );
      `);

      const allRows = await dbInstance.getAllAsync<TestItem>('SELECT * FROM test');
      setItems(allRows);
    };

    init();
  }, []);

  // データ追加処理
  const addData = async () => {
    if (!db) return;
    const value = `test-${Math.floor(Math.random() * 1000)}`;
    const intVal = Math.floor(Math.random() * 1000);
    await db.runAsync('INSERT INTO test (value, intValue) VALUES (?, ?)', value, intVal);

    const allRows = await db.getAllAsync<TestItem>('SELECT * FROM test');
    setItems(allRows);
  };

  return (
    <View style={styles.container}>
      <Button title="データを追加" onPress={addData} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Text style={styles.item}>
            ID: {item.id}, 値: {item.value}, 数値: {item.intValue}
          </Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 20 },
  item: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#ccc' },
});
