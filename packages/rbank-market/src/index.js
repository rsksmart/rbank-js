import {
  BN, getEventualChainId,
  PERIOD_DAY,
  PERIOD_MONTH,
  PERIOD_WEEK,
  PERIOD_YEAR,
  send,
  web3,
  Web3Utils,
} from '@rsksmart/rbank-utils';
import _ from 'lodash';
import MarketContract from './Market.json';
import Token from './token';

/**
 * A blockchain transaction response.
 * @typedef {Object} TXResult
 */

/**
 * Market handler
 */
export default class Market {
  /**
   * Market handler constructor
   * @param {string} address On chain `Market` deployed address.
   * @param {object} config of the network { chainId: WEB_SOCKETS_PROVIDER }
   * @return {Error}
   */
  constructor(address = '', config = {
    1337: {
      httpProvider: 'http://127.0.0.1:8545',
      wsProvider: 'ws://127.0.0.1:8545',
    },
  }) {
    this.instanceAddress = address.toLowerCase();
    if (!this.address.match(/0x[a-f0-9]{40}/)) return new Error('Missing address');
    this.instance = new web3.eth.Contract(MarketContract.abi, address);
    this.eventualWeb3WS = getEventualChainId()
      .then((chainId) => new Web3Utils(new Web3Utils
        .providers.WebsocketProvider(config[chainId].wsProvider)))
      .catch(() => new Error('Something went wrong with the web3 instance over web sockets on Market'));
    this.eventualWeb3Http = getEventualChainId()
      .then((chainId) => new Web3Utils(new Web3Utils
        .providers.HttpProvider(config[chainId].httpProvider)))
      .catch(() => new Error('Something went wrong with the web3 instance over http on Market'));
    this.token = this.instance.methods.token()
      .call()
      .then((tokenAddress) => new Token(tokenAddress));
  }

  /**
   * Market address
   * @return {string} this market instance address.
   */
  get address() {
    return this.instanceAddress;
  }

  /**
   * Market deploy block.
   * @return {Number} this controller deploy block.
   */
  get eventualDeployBlock() {
    return new Promise((resolve, reject) => {
      this.instance.methods.deployBlock()
        .call()
        .then((block) => Number(block))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns an eventual controller address.
   * @return {Promise<string>} eventual registered controller address.
   */
  get eventualController() {
    return new Promise((resolve, reject) => {
      this.instance.methods.controller()
        .call()
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns an eventual blocks per year of this market.
   * @return {Promise<number>} eventual blocks per year.
   */
  get eventualBlocksPerYear() {
    return new Promise((resolve, reject) => {
      this.instance.methods.blocksPerYear()
        .call()
        .then((blocksPerYear) => Number(blocksPerYear))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns an eventual borrow rate, it varies depending on the total borrows
   * and cash of this market.
   * @return {Promise<number>} eventual market's borrow rate.
   */
  get eventualBorrowRate() {
    return new Promise((resolve, reject) => {
      this.eventualFactor
        .then((factor) => [
          factor,
          this.eventualBlocksPerYear,
          this.instance.methods.borrowRatePerBlock()
            .call(),
        ])
        .then((promises) => Promise.all(promises))
        .then(([
          factor,
          blocksPerYear,
          borrowRatePerBlock,
        ]) => new BN(borrowRatePerBlock).times(new BN(100 * blocksPerYear))
          .div(new BN(factor))
          .toNumber())
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns an eventual initial borrow rate set for the market.
   * @return {Promise<number>} eventual market's base borrow rate.
   */
  get eventualBaseBorrowRate() {
    return new Promise((resolve, reject) => {
      this.eventualFactor
        .then((factor) => Promise.all([
          factor,
          this.eventualBlocksPerYear,
          this.instance.methods.baseBorrowRate().call(),
        ]))
        .then(([factor, blocksPerYear, baseBorrowRate]) => new BN(baseBorrowRate)
          .times(new BN(100 * blocksPerYear)).div(new BN(factor)).toNumber())
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns the eventual factor of this market.
   * @returns {Promise<number>}
   */
  get eventualFactor() {
    return new Promise((resolve, reject) => {
      this.instance.methods.FACTOR()
        .call()
        .then((factor) => Number(factor))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns the eventual updated total supply of this market.
   * @return {Promise<number>}
   */
  get eventualUpdatedTotalSupply() {
    return new Promise((resolve, reject) => {
      this.instance.methods.getUpdatedTotalSupply()
        .call()
        .then((updatedTotalSupply) => Number(updatedTotalSupply))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns the eventual updated total borrows of this market.
   * @return {Promise<number>}
   */
  get eventualUpdatedTotalBorrows() {
    return new Promise((resolve, reject) => {
      this.instance.methods.getUpdatedTotalBorrows()
        .call()
        .then((updatedTotalBorrows) => Number(updatedTotalBorrows))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns the eventual cash of this market corresponding to the
   * balance of the market on it's token.
   * @return {Promise<number>}
   */
  get eventualCash() {
    return new Promise((resolve, reject) => {
      this.instance.methods.getCash()
        .call()
        .then((cash) => Number(cash))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns the eventual token handler instance of this market
   * @return {Promise<Token>}
   */
  get eventualToken() {
    return this.token;
  }

  /**
   * Generates a market subscription to a event.
   * @return {Promise<{EventEmitter}>}
   */
  get eventualEvents() {
    return new Promise((resolve, reject) => {
      this.eventualWeb3WS
        .then((web3WS) => {
          const ws = new web3WS.eth.Contract(MarketContract.abi, this.address);
          resolve(
            {
              supply: (filter = {}, fromBlock = 'latest', cb) => ws
                .events.Supply({ filter, fromBlock }, cb),
              borrow: (filter = {}, fromBlock = 'latest', cb) => ws
                .events.Borrow({ filter, fromBlock }, cb),
              redeem: (filter = {}, fromBlock = 'latest', cb) => ws
                .events.Redeem({ filter, fromBlock }, cb),
              payBorrow: (filter = {}, fromBlock = 'latest', cb) => ws
                .events.PayBorrow({ filter, fromBlock }, cb),
              liquidateBorrow: (filter = {}, fromBlock = 'latest', cb) => ws
                .events.LiquidateBorrow({ filter, fromBlock }, cb),
              allEvents: (cb) => ws.events
                .allEvents({ fromBlock: 'latest' }, cb),
            },
          );
        })
        .catch(reject);
    });
  }

  /**
   * Gets the provided past events from the given block.
   * @param {string} eventName On chain controller's address
   * @param {number} fromBlock On chain controller's address
   * @param {Object} filter used for bring filtered events based on its attributes
   * @return {Promise<[Event]>} a Promise to an array of events occurred on the past
   */
  getPastEvents(eventName, fromBlock, filter = {}) {
    return new Promise((resolve, reject) => {
      this.eventualWeb3Http
        .then((web3Http) => new web3Http
          .eth.Contract(MarketContract.abi, this.address))
        .then((marketInstance) => marketInstance.getPastEvents(eventName,
          {
            filter,
            fromBlock,
            toBlock: 'latest',
          }))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns an array with the blocks series according to the period
   * @param period string the period over the calculation is based
   * @return {Promise<[number]>} a promise to a result array block numbers
   */
  getPastBlockNumbers(period) {
    const pastBlockNumbers = [];
    const blocksPerYear = 1000000;
    let labelsPerPeriod;
    let blocksPerPeriod;
    switch (period) {
      case PERIOD_DAY:
        labelsPerPeriod = 12;
        blocksPerPeriod = Math.floor(blocksPerYear / (365.25 * 12));
        break;
      case PERIOD_WEEK:
        labelsPerPeriod = 7;
        blocksPerPeriod = Math.floor(blocksPerYear / 365.25);
        break;
      case PERIOD_MONTH:
        labelsPerPeriod = 15;
        blocksPerPeriod = Math.floor((blocksPerYear * 2) / (365.25));
        break;
      case PERIOD_YEAR:
        labelsPerPeriod = 12;
        blocksPerPeriod = Math.floor((blocksPerYear) / (12));
        break;
      default:
        labelsPerPeriod = 7;
        blocksPerPeriod = Math.floor(blocksPerYear / 365.25);
    }
    return new Promise((resolve, reject) => {
      Promise.all([this.eventualDeployBlock, web3.eth.getBlockNumber()])
        .then(([deployBlock, currentBlockNumber]) => {
          _.range(labelsPerPeriod).forEach((i) => {
            const pastBlockNumber = currentBlockNumber - (blocksPerPeriod * i) >= deployBlock
              ? currentBlockNumber - (blocksPerPeriod * i) : deployBlock;
            pastBlockNumbers.push(pastBlockNumber);
          });
          resolve(pastBlockNumbers);
        })
        .catch(reject);
    });
  }

  /**
   * Returns an two dimensional array with the market balance through a given period
   * @param {string} period over the balances ('day', 'week', 'month', 'year')
   * @return {Promise<[[object, number, number]]>} an array of arrays with the timestamp,
   * the total supply value and total borrow value of this market.
   */
  getOverallBalance(period = PERIOD_WEEK) {
    return new Promise((resolve, reject) => {
      this.getPastBlockNumbers(period)
        .then((pastBlockNumbers) => {
          const pastMarketBalancesPromises = Promise.all(pastBlockNumbers
            .map((blockNumber) => {
              const market = new Market(this.address);
              market.setDefaultBlock(blockNumber);
              return Promise.all([
                market.eventualUpdatedTotalSupply,
                market.eventualUpdatedTotalBorrows,
              ]);
            }));
          const pastBlocksPromise = Promise.all(pastBlockNumbers
            .map((blockNumber) => web3.eth.getBlock(blockNumber)));
          return Promise.all([pastMarketBalancesPromises, pastBlocksPromise]);
        })
        .then(([pastMarketBalances, pastBlocks]) => {
          const overallBalances = pastMarketBalances
            .map(([updatedTotalSupply, updatedTotalBorrow], idx) => {
              const time = new Date(pastBlocks[idx].timestamp * 1000);
              return [time, updatedTotalSupply, updatedTotalBorrow];
            });
          resolve(overallBalances);
        })
        .catch(reject);
    });
  }

  /**
   * Modifies the instance default block
   * @param blockNumber Number new default block
   */
  setDefaultBlock(blockNumber) {
    this.instance.defaultBlock = blockNumber;
  }

  /**
   * Registers a controller for this market.
   * @param {string} controllerAddress On chain controller's address
   * @return {Promise<TXResult>}
   */
  setControllerAddress(controllerAddress) {
    return new Promise((resolve, reject) => {
      send(this.instance.methods.setController(controllerAddress))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Asks the user permission to approve transactions on this market's token on their behalf, and
   * then supplies the specified amount to be transferred into this market.
   * @param {number} amount of this market's token to be transferred.
   * @param {string=} from if specified executes the transaction using this account.
   * @return {Promise<TXResult>}
   */
  supply(amount, from = '') {
    return new Promise((resolve, reject) => {
      this.token
        .then((token) => token.approve(this.instanceAddress, amount, from))
        .then(() => send(this.instance.methods.supply(amount), from))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Borrows the specified amount from this market. May fail if no collateral has been supplied.
   * onto another market.
   * @param {number} amount of this market's token to be borrowed.
   * @param {string=} from if specified executes the transaction using this account.
   * @return {Promise<TXResult>}
   */
  borrow(amount, from = '') {
    return new Promise((resolve, reject) => {
      send(this.instance.methods.borrow(amount), from)
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Pays off the specified amount from an existing debt in this market.
   * May fail if there is no debt to be paid or if the user doesn't have enough
   * tokens to pay the amount entered.
   * @param {number} amount of the debt of this market's token to be paid.
   * @param {string=} from if specified executes the transaction using this account.
   * @return {Promise<TXResult>}
   */
  payBorrow(amount, from = '') {
    return new Promise((resolve, reject) => {
      this.token
        .then((token) => token.approve(this.instanceAddress, amount, from))
        .then(() => send(this.instance.methods.payBorrow(amount), from))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Withdraws the specified amount of tokens from this market.
   * It may fail if the given amount exceeds the market's cash or if
   * the given amount it's bigger than the total amount supplied by
   * the user.
   * @param {number} amount of this market's token to be redeem.
   * @param {string=} from if specified executes the transaction using this account.
   * @return {Promise<TXResult>}
   */
  redeem(amount, from = '') {
    return new Promise((resolve, reject) => {
      send(this.instance.methods.redeem(amount), from)
        .then(resolve)
        .catch(() => {
          reject(new Error('There was an error redeeming your tokens'));
        });
    });
  }

  /**
   * Returns the amount on this market's token that has been supplied by the caller.
   * @param {string=} from if specified executes the transaction using this account.
   * @return {Promise<number>}
   */
  supplyOf(from = '') {
    return new Promise((resolve, reject) => {
      web3.eth.getAccounts()
        .then(([account]) => this.instance.methods.supplyOf(from || account)
          .call())
        .then((supplyOf) => Number(supplyOf))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns an updated amount according to the chain block number
   * for this market's token that has been supplied by the caller.
   * @param {string=} from if specified executes the transaction using this account.
   * @return {Promise<number>}
   */
  updatedSupplyOf(from = '') {
    return new Promise((resolve, reject) => {
      web3.eth.getAccounts()
        .then(([account]) => this.instance.methods.updatedSupplyOf(from || account)
          .call())
        .then((updatedSupplyOf) => Number(updatedSupplyOf))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns the amount of token's borrowed by the account in this market.
   * @param {string=} from if specified executes the transaction using this account.
   * @return {Promise<number>}
   */
  borrowBy(from = '') {
    return new Promise((resolve, reject) => {
      web3.eth.getAccounts()
        .then(([account]) => this.instance.methods.borrowBy(from || account)
          .call())
        .then((borrowBy) => Number(borrowBy))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns an updated amount according to the chain block number
   * for this market's token that has been borrowed by the caller.
   * @param {string=} from if specified executes the transaction using this account.
   * @return {Promise<number>}
   */
  updatedBorrowBy(from = '') {
    return new Promise((resolve, reject) => {
      web3.eth.getAccounts()
        .then(([account]) => this.instance.methods.updatedBorrowBy(from || account)
          .call())
        .then((updatedBorrowBy) => Number(updatedBorrowBy))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns the earnings of an account on this market.
   * for this market's token that has been borrowed by the caller.
   * @param {string=} from if specified executes the transaction using this account.
   * @return {Promise<number>}
   */
  eventualAccountEarnings(from = '') {
    return new Promise((resolve, reject) => {
      web3.eth.getAccounts()
        .then(([account]) => Promise.all([
          this.instance.methods.updatedSupplyOf(from || account).call(),
          this.instance.methods.supplyOf(from || account).call(),
        ]))
        .then(([updatedSupplyOf, supplyOf]) => Number(updatedSupplyOf - supplyOf))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Liquidate the collateral for a given borrower based on the amount of its
   * debt provided .
   * @param {string} borrower account on the market.
   * @param {number} amount debt on market amount to pay.
   * @param {string} collateralMarket collateral market address on platform.
   * @param {string=} from if specified executes the transaction using this account.
   * @return {Promise<TXResult>}
   */
  liquidateBorrow(borrower, amount, collateralMarket, from = '') {
    return new Promise((resolve, reject) => {
      this.token
        .then((token) => token.approve(this.instanceAddress, amount, from))
        .then(() => send(this.instance.methods.liquidateBorrow(
          borrower,
          amount,
          collateralMarket,
        ), from))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Deploys new market on chain returning the deployed smart contract address.
   * Fails if the token address is not well formed or if the address does not correspond to an
   * actual ERC20 complied smart contract.
   * @param {string} tokenAddress on chain deployed ERC20 complied token address.
   * @param {number} baseBorrowAnnualRate
   * @param {number} blocksPerYear
   * @param {number} utilizationRateFraction
   * @return {Promise<string>} on chain deployed new market's address.
   */
  static async create(
    tokenAddress = '',
    baseBorrowAnnualRate,
    blocksPerYear,
    utilizationRateFraction,
  ) {
    return new Promise((resolve, reject) => {
      const factor = 1e18;
      if (!tokenAddress.match(/0x[a-fA-F0-9]{40}/)
        || baseBorrowAnnualRate === undefined
        || blocksPerYear === undefined
        || utilizationRateFraction === undefined) {
        reject(new Error('Either the token address or the annual rate or the block per year or utilization rate are missing'));
      }
      const market = new web3.eth.Contract(MarketContract.abi);
      const deploy = market.deploy({
        data: MarketContract.bytecode,
        arguments: [
          tokenAddress.toLowerCase(),
          web3.utils.toBN(new BN(baseBorrowAnnualRate).div(new BN(100))
            .times(new BN(factor)).toNumber()),
          blocksPerYear,
          web3.utils.toBN(new BN(utilizationRateFraction).div(new BN(100))
            .times(new BN(factor)).toNumber()),
        ],
      });
      web3.eth.getAccounts()
        .then(([from]) => [from, deploy.estimateGas({ from })])
        .then((result) => Promise.all(result))
        .then(([from, gas]) => deploy.send({
          from,
          gas,
        }))
        // eslint-disable-next-line no-underscore-dangle
        .then((instance) => instance._address.toLowerCase())
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns a Token Handler
   * @returns {Token}
   * @constructor
   */
  static get Token() {
    return Token;
  }
}
