export type Table = {
    table: string;
    columns: string[];
};

export const schema: Table[] = [
    {
        table: "logs",
        columns: [
            "ID SERIAL PRIMARY KEY",
            "PAIR VARCHAR(255) NOT NULL",
            "SIDE VARCHAR(32) NOT NULL",
            "ORDER_ID VARCHAR(255) NOT NULL",
            "ORDER_PRICE DECIMAL(10, 5) NOT NULL",
            "FILLED_PRICE DECIMAL(10, 5) NOT NULL",
            "DATE TIMESTAMP DEFAULT NOW()",
            "VOLUME DECIMAL(10, 5) NOT NULL",
            "FILLED_VOLUME DECIMAL(10, 5) NOT NULL",
            "SPREAD DECIMAL(10, 5) NOT NULL",
            "FEE DECIMAL(10, 5) NOT NULL",
            "FEE_VOLUME DECIMAL(10, 5) NOT NULL",
            "FEE_PRICE DECIMAL(10, 5) NOT NULL",
            "ORDER_STATUS VARCHAR(32) NOT NULL",
        ]
    },
    {
        table: "spot_instruments",
        columns: [
            "INSTRUMENT_ID VARCHAR(255) NOT NULL PRIMARY KEY",
            "LAST_TRADED_PRICE DECIMAL(10, 5)",
            "SPREAD DECIMAL(10, 5)",
            "SPREAD_BID DECIMAL(10, 5)",
            "TOTAL_SPREAD_BID DECIMAL(10, 5)",
            "SPREAD_ASK DECIMAL(10, 5)",
            "TOTAL_SPREAD_ASK DECIMAL(10, 5)",
            "FEE DECIMAL(10, 5)",
            "VOLUME DECIMAL(10, 5)",
            "FEE_VOLUME DECIMAL(10, 5)",
            "EXPIRE_DATE TIMESTAMPTZ",
        ]
    },
    {
        table: "config",
        columns: [
            "ID INTEGER PRIMARY KEY",
            "FEE DECIMAL(10, 5) NOT NULL",
            "SPREAD DECIMAL(10, 5) NOT NULL",
        ]
    }
];