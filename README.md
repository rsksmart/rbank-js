# rbank-js
Rbank handler library. _Note_: This library does work with a very specific set of smart contracts.

## Installation
Just clone this repo and install npm dependencies:

```bash
$ git clone git@github.com:rsksmart/rbank-js.git
$ cd rbank-js
$ npm i
```

## Usage
This library is under development. Usage instructions will be clarified in further versions.

## Testing
In order to run the test in this project you should have a console running with `ganache-cli`

### `ganache-cli` installation
You might want to have `ganache-cli` installed globally.

```bash
$ npm i -g ganache-cli
```

### Running the tests
You should be located at this project root and run the tests.

```bash
$ npm test
```

### Current coverage results
```
  Utils module
    ✓ should have a web3 instance tied to localhost
    ✓ should properly send transactions generically (244ms)


  2 passing (248ms)

----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
----------|---------|----------|---------|---------|-------------------
All files |     100 |      100 |     100 |     100 |                   
 index.js |     100 |      100 |     100 |     100 |                   
----------|---------|----------|---------|---------|-------------------

  Controller handler
    Initialization
      ✓ should get an error when initializing without controller address
      ✓ should get a new instance using the controller registered address
      ✓ should get zero collateral factor
      ✓ should get zero collateral factor
      ✓ should allow the controller owner to set a new collateral factor (75ms)
      ✓ should allow the controller owner to set a new liquidation factor (66ms)
    Market management
      ✓ should have zero markets in the beginning
      ✓ should allow the controller owner to add new markets (214ms)
    DeFi Operations
      ✓ should show zero values for the account for users that have not interacted yet
      ✓ should show updated values for users who have borrowed and supplied (990ms)
      ✓ should calculate the liquidity for a given account (1026ms)


  11 passing (9s)

----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
----------|---------|----------|---------|---------|-------------------
All files |     100 |      100 |     100 |     100 |                   
 index.js |     100 |      100 |     100 |     100 |                   
----------|---------|----------|---------|---------|-------------------

```
