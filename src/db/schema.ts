export type Table = {
    table: string;
    columns: string[];
};

export const schema: Table[] = [
    {
        table: "logs",
        columns: [
            "ID SERIAL PRIMARY KEY",
            "DATE TIMESTAMP DEFAULT NOW()",
            "VOLUME DECIMAL(10, 5) NOT NULL",
            "INSTRUMENT_ID VARCHAR(255) NOT NULL",
            "INSTRUMENT_PRICE DECIMAL(10, 5) NOT NULL",
            "SIZE VARCHAR(32) NOT NULL",
            "SPREAD DECIMAL(10, 5) NOT NULL",
            "FEE DECIMAL(10, 5) NOT NULL",
        ]
    },
    {
        table: "spot_instruments",
        columns: [
            "INSTRUMENT_ID VARCHAR(255) NOT NULL PRIMARY KEY",
            "LAST_TRADED_PRICE DECIMAL(10, 5)",
            "SPREAD DECIMAL(10, 5)",
            "SPREAD_BID DECIMAL(10, 5)",
            "SPREAD_ASK DECIMAL(10, 5)",
            "EXPIRE_DATE TIMESTAMP",
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