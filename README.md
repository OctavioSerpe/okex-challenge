# okex-challenge

Build a service based on Okx order books that:

- Authenticates on Okx.
- Estimates & executes an optimal SPOT swap by volume of the next pairs
  - USDT <> ETH
  - USDT <> BTC
  - USDC <> AAVE
- Exposes an endpoint to ask for an estimated price of a given pair & volume with expiration.
- Exposes an endpoint to execute a swap at the estimated price
- Allows parametric spread & fee.

## Service

The service consists of a REST API built with

- Nodejs (v14.17.3) with TypeScript.
- PostgreSQL (v14.3).

that exposes 4 endpoints:

- `GET /swap?volume=<volume>&pair=<pair>&spread=<spread>&fee=<fee>`
  
  Where:

  - `volume` is the amount of the pair to be traded. **Required**.
  - `pair` is the pair to be traded. **Required**. Available options:
    - BTC-USDT
    - ETH-USDT
    - AAVE-USDT
    - AAVE-USDC
    - BTC-USDC
    - USDC-USDT
    > **Note**: AAVE is not available on the test mode on OKX. If you want to test the service with an unregistered pair, use the BTC-USDC pair.


    > **Note**: If the requested pair is unregistered on OKX, the spread is not applied to the sell side (as it executes two consecutive market orders). If you have any doubts check the integration test for unregistered pair.

  - `spread` is the percentage of the price to be added to the estimated price, expressed as a probability (between 0 & 1). **Optional**, it uses the default value stored in the database.
  - `fee` is the percentage of the price to be added to the estimated price, expressed as a probability (between 0 & 1). **Optional**, it uses the default value stored in the database.


  A response body for the request ``GET /swap?pair=btc-usdt&volume=0.0001&fee=0.1&spread=0.0001`` looks like:
    ```json
    {
        "id": 73,
        "pair": "BTC-USDT",
        "last_traded_price": 110424.7,
        "spread": 0.0001,
        "fee": 0.1,
        "buy": {
            "max_unit_price": 110413.65753,
            "max_total_price": 11.041365753000001,
            "fee_volume": 0.00001,
            "trade_volume": 0.00009
        },
        "sell": {
            "min_unit_price": 110435.74247,
            "min_total_price": 11.043574247,
            "min_fee_price": 1.1043574247,
            "min_final_price": 9.9392168223
        },
        "expire_ISO_date": "2022-06-07T13:23:44.515Z"
    }
    ```

- `POST /swap/:id`

  Where:

  - `id` is the id of the swap to be executed. **Required**.

  The request body template is:

  ```JSON
  {
      "side": <"buy"|"sell">,
  }
  ```

  Where:

  - `side` is the side of the swap to be executed. **Required**.

  A response body for a given request looks like:

  ```JSON
  {
      "order_id": "454398931718516735"
  }
  ```

- `GET /swap/:id`
  
  Fetches all the orders of a given swap.

  Where: 
  - `id` is the id of the swap to be fetched. **Required**.

  A response body for a given request looks like:
    ```json
    [
        {
            "swap_id": 79,
            "pair": "USDC-USDT",
            "side": "BUY",
            "order_id": "454398931718516735",
            "order_price": 1.0009,
            "filled_price": 1.0009,
            "volume": 9,
            "filled_volume": 9,
            "spread": 0,
            "fee": 0.1,
            "fee_volume": 1,
            "fee_price": 0,
            "order_status": "filled"
        },
        {
            "swap_id": 79,
            "pair": "USDC-USDT",
            "side": "BUY",
            "order_id": "454399380639068161",
            "order_price": 1.0009,
            "filled_price": 1.0009,
            "volume": 9,
            "filled_volume": 9,
            "spread": 0,
            "fee": 0.1,
            "fee_volume": 1,
            "fee_price": 0,
            "order_status": "filled"
        }
    ]
    ```

- `GET /swap/order/:id`

    Fetches the status of a given order & its associated swap data.

    Where: 
    - `id` is the id of the order to be fetched. **Required**.
    
    A response body for a given request looks like:
    ```json
    {
        "swap_id": 79,
        "pair": "USDC-USDT",
        "side": "BUY",
        "order_id": "454398931718516735",
        "order_price": 1.0009,
        "filled_price": 1.0009,
        "volume": 9,
        "filled_volume": 9,
        "spread": 0,
        "fee": 0.1,
        "fee_volume": 1,
        "fee_price": 0,
        "order_status": "filled"
    }
    ```

## How to run the service

First create a `.env` file with the template specified in the `.env.example` file, the template is:

```txt
PORT=<server running port>
OKEX_BASE_URL=<okx base url>
OKEX_API_KEY=<okx api key>
OKEX_SECRET_KEY=<okx secret key>
OKEX_PASSPHRASE=<okx passphrase>

# postgres database variables
PGHOST=<host where postgresql is running>
PGUSER=<postgresql user>
PGDATABASE=<postgresql database>
PGPASSWORD=<postgresql user password>
PGPORT=<postgresql running port>

NODE_ENV=<test|development|production>
```
> **Note**: The `NODE_ENV` variable is used to determine which environment to be used. I strongly recommend to change databases depending on the environment.

Before running any command install the libraries with the following command:
```bash
$ npm i
```

Then run the service in `development mode` with the following command:
```bash
$ npm run dev
```

In order to run the service in `production mode` run the following commands:

```bash
$ npm run build
$ npm run start
```

Lastly, to run the `integration tests` run the following command:
```txt
$ npm run test
```
