import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Spending: undefined;
  Categories: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  SaveBill: { imageUri: string };
  CategoryDetail: {
    categoryId: number;
    categoryName: string;
    /** When set, lists bills in this inclusive ISO range (Spending filter). */
    dateRangeStartIso?: string;
    dateRangeEndIso?: string;
  };
};
