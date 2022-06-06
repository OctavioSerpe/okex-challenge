export type Table = {
  table: string;
  columns: string[];
};

export const schema: Table[] = [
  {
    table: "spot_instruments",
    columns: [
      "ID SERIAL PRIMARY KEY",
      "INSTRUMENT_ID VARCHAR(255) NOT NULL",
      "LAST_TRADED_PRICE DECIMAL",
      "SPREAD DECIMAL",
      "SPREAD_BID DECIMAL",
      "TOTAL_SPREAD_BID DECIMAL",
      "SPREAD_ASK DECIMAL",
      "TOTAL_SPREAD_ASK DECIMAL",
      "FEE DECIMAL",
      "VOLUME DECIMAL",
      "TRADE_VOLUME DECIMAL",
      "FEE_VOLUME DECIMAL",
      "EXPIRE_DATE TIMESTAMPTZ",
    ],
  },
  {
    table: "logs",
    columns: [
      "SWAP_ID INTEGER NOT NULL",
      "PAIR VARCHAR(255) NOT NULL",
      "SIDE VARCHAR(32) NOT NULL",
      "ORDER_ID VARCHAR(255) NOT NULL",
      "ORDER_PRICE DECIMAL NOT NULL",
      "FILLED_PRICE DECIMAL NOT NULL",
      "DATE TIMESTAMP DEFAULT NOW()",
      "VOLUME DECIMAL NOT NULL",
      "FILLED_VOLUME DECIMAL NOT NULL",
      "SPREAD DECIMAL NOT NULL",
      "FEE DECIMAL NOT NULL",
      "FEE_VOLUME DECIMAL NOT NULL",
      "FEE_PRICE DECIMAL NOT NULL",
      "ORDER_STATUS VARCHAR(32) NOT NULL",
      "FOREIGN KEY (SWAP_ID) REFERENCES spot_instruments(ID)",
    ],
  },
  {
    table: "config",
    columns: [
      "ID INTEGER PRIMARY KEY",
      "FEE DECIMAL NOT NULL",
      "SPREAD DECIMAL NOT NULL",
    ],
  },
];
