export type ApiTransaction = {
  id: string;
  date: string;
  bank: string;
 merchant: string;
  category: string;
  allocation: string | null;
  amount: number;
  direction: string;
  reconciled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiBudget = {
  id: string;
  category: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
};