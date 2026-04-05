export type Category = {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
  /** 1 if this category is preselected for new receipts; only one at a time. */
  is_default: number;
};

export type Bill = {
  id: number;
  category_id: number;
  amount_paise: number;
  image_uri: string;
  created_at: string;
};

export type CategorySpendingRow = {
  category_id: number;
  name: string;
  total_paise: number;
  bill_count: number;
};
