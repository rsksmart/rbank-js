# rbank-js
Rbank handler library. _Note_: This library does work with a very specific set of smart contracts.

We highly recommend reading this [article](https://medium.com/@angeljavalopez/building-a-defi-application-e8f42f8263fa)
explaining the details of the Rbank operation.

## Installation
To install this library just execute:

```bash
$ npm i --save @rsksmart/rbank.js
```

### Usage
#### Core
Importing the library and creating an instance.
```javascript
import Rbank from '@rsksmart/rbank.js';
const rbank = new Rbank();
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

The contoller also let to set values for both, the collateral and liquidation factors.
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

* `eventualMarketListSize: Promise<number>`
* `setMarketPrice(marketAddress, marketPrice): Promise<TXResult>`
* `eventualMarketPrice(marketAddress): Promise<number>`
* `getAccountValues(account): Promise<AccountValues>`
* `getAccountLiquidity(account): Promise<number>`
* `getEventualMarketAddress(marketIdx): Promise<string>`

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
rbank.Market.create(tokenAddress, baseBorrowRate)
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
* `eventualController: Promise<string>`
* `eventualBaseBorrowRate: Promise<number>`
* `eventualBalance: Promise<number>`
* `setControllerAddress(controllerAddress): Promise<TXResult>`
* `supply(amount, from = ''): Promise<TXResult>`
* `borrow(amount, from = ''): Promise<TXResult>`
* `supplyOf(from = ''): Promise<number>`

## Development
Just clone this repo and install npm dependencies:

```bash
$ git clone git@github.com:rsksmart/rbank-js.git
$ cd rbank-js
$ npm i
```

### Usage
On development stages, this package is not available on npm. To make it available for other projects
you can link them by:
- Go to the project directory.
- Build it, test it and finally exectue `npm link` to make it globally available in the local host.
- Go to the other project where you need to use this library and execute `npm link @rsksmart/rbank.js`.
_Note_: the package is not going to be linked as a dependency in the target project `package.json` 
file, but it's going to be available to be used.

Any change on this library will be automatically reflected on all the projects that have linked the
library into them.

### Testing
In order to run the test in this project you should have a console running with `ganache-cli`

#### `ganache-cli` installation
You might want to have `ganache-cli` installed globally.

```bash
$ npm i -g ganache-cli
```

#### Running the tests
You should be located at this project root and run the tests.

```bash
$ npm test
```

#### Current coverage results
```
  Utils module
    ✓ should have a web3 instance tied to localhost
    ✓ should properly send transactions generically (179ms)
    ✓ should properly send transaction generically specifying the address performing the action (132ms)

  3 passing (358ms)

----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
----------|---------|----------|---------|---------|-------------------
All files |     100 |      100 |     100 |     100 |                   
 index.js |     100 |      100 |     100 |     100 |                   
----------|---------|----------|---------|---------|-------------------

  Market handler
    Creation


  Controller handler
    Initialization
      ✓ should throw an error no token address is set
      ✓ should get an error when initializing without controller address
      ✓ should get a new instance using the controller registered address
      ✓ should throw an error if no base borrow rate is set
      ✓ should get zero collateral factor
      ✓ should throw an error if an empty token address is set
      ✓ should get zero collateral factor
      ✓ should throw an error if it gets a no-token address (50ms)
      ✓ should allow the controller owner to set a new collateral factor (160ms)
      ✓ should returns the market contract address after creation (128ms)
      ✓ should allow the controller owner to set a new liquidation factor (122ms)
    Market management
      ✓ should get the instance smart contract address
    Initialization
      ✓ should have zero markets in the beginning
      ✓ should throw an error if no instance address is passed
      ✓ should allow the controller owner to add new markets (274ms)
      ✓ should return a valid market instance after passing a valid market address (153ms)
      ✓ should tell how many markets are registered (185ms)
      ✓ should be linked to a controller (172ms)
      ✓ should retrieve the address of a registered market upon idx selection (139ms)
    DeFi Operations
      ✓ should have the same borrow rate from its creation
    Operational
      ✓ should show zero values for the account for users that have not interacted yet
      ✓ should throws an error if there is not enough eventualBalance to supply into a market (106ms)
      ✓ should show updated values for users who have borrowed and supplied (1492ms)
      ✓ should allow the current and funded user to supply into the market (357ms)
      ✓ should calculate the liquidity for a given account (1475ms)


  13 passing (13s)

----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
----------|---------|----------|---------|---------|-------------------
All files |     100 |      100 |     100 |     100 |                   
 index.js |     100 |      100 |     100 |     100 |                   
----------|---------|----------|---------|---------|-------------------
      ✓ should allow any user to supply token to the market (121ms)
      ✓ should show zero as eventualBalance for an account that has not supplied tokens yet
      ✓ should show the value supplied by a user in the market (135ms)
      ✓ should show the value supplied by the current account in the market (143ms)
      ✓ should throw an error when borrowing from a market that has not been supplied
      ✓ should throw an error when a user wants to borrow but has no collateral (126ms)
      ✓ should return the eventualBalance of a supplied market (153ms)
      ✓ should allow a second user borrowing from what was supplied by a first one (414ms)
      - should allow a second user to pay a borrowed amount
      - should allow a first user to redeem tokens previously supplied into the market
      - should throw an error on redeem if there is not enough supplied amount from the user
      - should allow anyone to get the updatedSupplyOf value of any account
      - should allow anyone to get the updatedBorrowedBy value of any account
      - should allow anyone to get the current Market eventualBalance in its token terms

  Token handler
    Initialization
      ✓ should throw an error if no token address is passed
      ✓ should get a new Token instance using the token address (79ms)
    Operational
      ✓ should allow a token holder to authorize an address to perform transfers on their behalf (41ms)
      ✓ should allow a specified token holder to authorize an address to perform transfers on their behalf (48ms)


  24 passing (21s)
  6 pending

----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
----------|---------|----------|---------|---------|-------------------
All files |     100 |    97.37 |     100 |     100 |                   
 index.js |     100 |    96.43 |     100 |     100 | 114               
 token.js |     100 |      100 |     100 |     100 |                   
----------|---------|----------|---------|---------|-------------------

  Core
    Packages independence
      ✓ should have access to the controller handler
      ✓ should have access to the market handler
    Operational
      ✓ should create a controller instance assigning the controller address
      ✓ should create as many instances of markets as markets registered in the controller (49ms)
      ✓ should retrieve a market instance by its address (49ms)
      ✓ should retrieve a market instance by its index (45ms)
      ✓ should return an error for a non-existent market index (48ms)
      ✓ should return an error for a non-registered market address (50ms)


  8 passing (8s)

----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
----------|---------|----------|---------|---------|-------------------
All files |     100 |      100 |     100 |     100 |                   
 index.js |     100 |      100 |     100 |     100 |                   
----------|---------|----------|---------|---------|-------------------
```
