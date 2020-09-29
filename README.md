# rbank-js
Rbank handler library. _Note_: This library does work with a very specific set of smart contracts.

We highly recommend reading this [article](https://medium.com/@angeljavalopez/building-a-defi-application-e8f42f8263fa)
explaining the details of the Rbank operation.

## Installation
To install this library just execute:

```bash
$ npm i --save @rsksmart/rbank
```

### Usage
#### Core
Importing the library and creating an instance.
```javascript
import Rbank from '@rsksmart/rbank';
const rbank = new Rbank();
const controllerAddress = '0xda081f6f794bddfb033492d4b0aeb5e7e3e3ce98'
rbank.controller = controllerAddress;
```

By default, as a shortcut, the core package lets you to do some quick operations as getting
quick information about markets registered in the controller. After setting the controller address as
shown in the following controller section, you might get the markets as instances of `Market`.
```javascript
rbank.eventualMarkets
  .then((markets) => {
    markets.forEach((market) => console.log(market.address));
  });
```

You can even query a specific market by its position on the array or its on-chain address:
```javascript
rbank.eventualMarket(0)
  .then((market) => market.eventualBalance)
  .then(console.log)
  .catch(console.error);

rbank.eventualMarket('0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab')
  .then((market) => market.eventualBalance)
  .then(console.log)
  .catch(console.error);
```

#### Controller
The controller, as its name suggests, tracks the whole Rbank operation and keep detailed account of
all the markets registered within it.

![controller market relationship](https://miro.medium.com/max/1400/1*_kocdNELvWKknElksdKhTw.png)
 
You can use the library to create a new controller. This operation returns a promise of the address
that the controller smart contract got on chain and can be used to start the core instance.
```javascript
rbank.Controller.create()
  .then((controllerAddress) => {
    rbank.controller = controllerAddress;
  })
  .catch(console.error);
```

To initialize the controller instance, as seen in the code above, you only have to set the desired
controller smart contract on-chain address. However, by retrieving the controller from rbank, you don't
get the address of the controller, but an instance. If you want to get the address of the controller,
get it from the controller instance.

```javascript
console.log(rbank.controller.address);
```

You can have access to both, the collateral and liquidation factors.
```javascript
rbank.controller.eventualCollateralFactor
  .then((collateralFactor) => {
    // do something with this factor.
    console.log(collateralFactor);
  })
  .catch(console.error);

rbank.controller.eventualLiquidationFactor
  .then((liquidationFactor) => {
    // do something with this factor.
    console.log(liquidationFactor);
  })
  .catch(console.error);
```

The controller also let to set values for both, the collateral and liquidation factors.
```javascript
const collateralFactor = 15;
rbank.controller.setCollateralFactor(collateralFactor)
  .then(console.log)
  .catch(console.error);

const liquidationFactor = 15;
rbank.controller.setLiquidationFactor(liquidationFactor)
  .then(console.log)
  .catch(console.error);
```

Other operations related to the controller are (all the operations that involve on-chain reading and
writing return promises):

* `eventualDeployBlock: Promise<number>`
* `eventualCollateralFactor: Promise<number>`
* `eventualLiquidationFactor: Promise<number>`
* `eventualMarketListSize: Promise<number>`
* `eventualOwner: Promise<string>`
* `eventualMantissa: Promise<number>`
* `getOverallBalance: Promise<[[object, number]]>`
* `setDefaultBlock(blockNumber): void`
* `setCollateralFactor(collateralFactor): Promise<TXResult>`
* `setLiquidationFactor(liquidationFactor): Promise<TXResult>`
* `addMarket(marketAddress): Promise<TXResult>`
* `setMarketPrice(marketAddress, marketPrice): Promise<TXResult>`
* `eventualMarketPrice(marketAddress): Promise<number>`
* `getAccountValues(account): Promise<AccountValues>`
* `getAccountLiquidity(account): Promise<number>`
* `getAccountHealth(account): Promise<number>`
* `getEventualMarketAddress(marketIdx): Promise<string>`
* `getEventualMarketAddressByToken(tokenAddress): Promise<string | Error>`
* `eventualIsOwner(account): Promise<boolean>`

The source controller file is fully documented and you can check the signature of each method.

#### Market management
As seen on the controller section, the relation between a market and the controller is bidirectional.

In order to create a new market you will have to associate the token it will handle and other information.

![market token relation](https://miro.medium.com/max/1400/1*dLwei2BdhLZSq-ElGIFirA.png).

In order to create a new market you should have the associated on-chain `ERC20` token pool address
as well as the base borrow rate this market will handle. Once you get the market address on-chain,
you can register it into the controller.
```javascript
const tokenAddress = '0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab';
const baseBorrowRate = 15;
const blocksPerYear = 1e6;
const utilizationRateFraction = 20
rbank.Market.create(
    tokenAddress,
    baseBorrowRate,
    blocksPerYear,
    utilizationRateFraction,
    )
  .then((marketAddress) => [
    rbank.controller.addMarket(marketAddress),
    new rbank.Market(marketAddress),
  ])
  .then((results) => Promise.all(results))
  .then(([addingMarketTxObject, marketInstance]) => {
    console.log(`Tx Hash: ${addingMarketTxObject.transactionHash}`);
    return marketInstance.setControllerAddress(rbank.controller.address);
  })
  .then((settingControllerTxObject) => {
    console.log(settingControllerTxObject.transactionHash);
  })
  .catch(console.error);
``` 

Other operations related to the market are (all the operations that involve on-chain reading and
writing return promises):

* `address: string`
* `eventualDeployBlock: Promise<number>`
* `eventualController: Promise<string>`
* `eventualBlocksPerYear: Promise<number>`
* `eventualBorrowRate: Promise<number>`
* `eventualBaseBorrowRate: Promise<number>`
* `eventualFactor: Promise<number>`
* `eventualUpdatedTotalSupply: Promise<number>`
* `eventualUpdatedTotalBorrows: Promise<number>`
* `eventualCash: Promise<number>`
* `eventualToken: Promise<Token>`
* `events: EventEmmiter`
* `getPastEvents(eventName, fromBlock, filter): Promise<[Event]>`
* `getOverallBalance(period): Promise<[[object, number, number]]>`
* `setDefaultBlock(blockNumber): void`
* `setControllerAddress(controllerAddress): Promise<TXResult>`
* `supply(amount, from = ''): Promise<TXResult>`
* `borrow(amount, from = ''): Promise<TXResult>`
* `redeem(amount, from = ''): Promise<TXResult>`
* `payborrow(amount, from = ''): Promise<TXResult>`
* `supplyOf(from = ''): Promise<number>`
* `updatedSupplyOf(from = ''): Promise<number>`
* `borrowBy(from = ''): Promise<number>`
* `updatedBorrowBy(from = ''): Promise<number>`
* `eventualAccountEarnings(from = ''): Promise<number>`
* `liquidateBorrow(borrower, amount, collateralMarket, from = ''): Promise<TXResult>`



## Testing
Just clone this repo and install npm dependencies:

```bash
$ git clone git@github.com:rsksmart/rbank-js.git
$ cd rbank-js
$ git submodule init
$ git submodule update
```

In order to run the test in this project you should have a console running with `ganache-cli`

#### Prerequisites
You might want to have `ganache-cli`, `lerna` and `truffle` installed globally.

```bash
$ npm i -g ganache-cli truffle lerna
```

#### Preparation prior to the testing
You have to guarantee having the specific version of smart contracts, simply do as follows:

```bash
$ cd dependencies/DeFiProt
$ git pull origin/master
```

Sometimes it would be necessary to guarantee having everything built up from scratch. In order to
have the project ready to be tested do as follows:

```bash
$ npm i
$ npm run deploy:controller
$ npm run deploy:market
$ npm run bootstrap
``` 

These commands, install npm dependencies, compile smart contracts and copy the resulting `json`
files into the respective packages, link all the internal packages together.

#### Running the tests
You should be located at this project root and run the tests.

```bash
$ npm test
```
