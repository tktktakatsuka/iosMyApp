// components/AdBanner.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import * as GoogleMobileAds from 'react-native-google-mobile-ads';

const { BannerAd, BannerAdSize, TestIds } = GoogleMobileAds;

type AdBannerProps = {
  size?: keyof typeof BannerAdSize;
};

const AdBanner: React.FC<AdBannerProps> = ({ size = 'BANNER' }) => {
  const adUnitId = __DEV__
    ? TestIds.BANNER
    : 'ca-app-pub-4855274440005459/4417505504';

  if (!BannerAd) {
    console.warn('BannerAd component not loaded');
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize[size]}
        onAdFailedToLoad={(error) =>
          console.warn('Ad failed to load:', error)
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
});

export default AdBanner;
