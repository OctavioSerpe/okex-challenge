export const schema = [
    {
        table: "logs",
        columns: [
            "ID SERIAL PRIMARY KEY",
            "ACTION_ID INTEGER NOT NULL",
            "ACTION_NAME VARCHAR(255) NOT NULL",
            "ACTION_DATE TIMESTAMP DEFAULT NOW()",
            "AMOUNT DECIMAL(10,2) NOT NULL",
            "INSTRUMENT_ID VARCHAR(255) NOT NULL",
            "INSTRUMENT_PRICE DECIMAL(10, 5) NOT NULL",
        ]
    }
];