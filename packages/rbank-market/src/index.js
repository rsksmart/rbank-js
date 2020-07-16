import { BN, send, web3, web3WS } from '@rsksmart/rbank-utils';
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
   * @return {Error}
   */
  constructor(address = '') {
    if (!address.match(/0x[a-fA-F0-9]{40}/)) return new Error('Missing address');
    this.instance = new web3.eth.Contract(MarketContract.abi, address);
    this.ws = new web3WS.eth.Contract(MarketContract.abi, address);
    this.instanceAddress = address;
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
   * Returns an eventual borrow rate, it varies depending on the total borrows
   * and cash of this market.
   * @return {Promise<number>} eventual market's base borrow rate.
   */
  get eventualBorrowRate() {
    return new Promise((resolve, reject) => {
      this.eventualFactor
        .then((factor) => [
          factor,
          this.instance.methods.borrowRatePerBlock().call(),
        ])
        .then((promises) => Promise.all(promises))
        .then(([factor, borrowRatePerBlock]) => new BN(borrowRatePerBlock)
          .div(new BN(factor)).toNumber())
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

  get events() {
    return {
      supply: (cb) => this.ws.events.Supply({ fromBlock: 'latest' }, cb),
    };
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
        .then(([account]) => this.instance.methods.supplyOf(from || account).call())
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
        .then(([account]) => this.instance.methods.updatedSupplyOf(from || account).call())
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
        .then(([account]) => this.instance.methods.borrowBy(from || account).call())
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
        .then(([account]) => this.instance.methods.updatedBorrowBy(from || account).call())
        .then((updatedBorrowBy) => Number(updatedBorrowBy))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Deploys new market on chain returning the deployed smart contract address.
   * Fails if the token address is not well formed or if the address does not correspond to an
   * actual ERC20 complied smart contract.
   * @param {string} tokenAddress on chain deployed ERC20 complied token address.
   * @param {number} baseBorrowRate new market's base borrow rate.
   * @return {Promise<string>} on chain deployed new market's address.
   */
  static create(tokenAddress = '', baseBorrowRate) {
    return new Promise((resolve, reject) => {
      if (!tokenAddress.match(/0x[a-fA-F0-9]{40}/) || baseBorrowRate === undefined) {
        reject(new Error('Either the token address or the base borrow rate are missing'));
      }
      const market = new web3.eth.Contract(MarketContract.abi);
      const deploy = market.deploy({
        data: MarketContract.bytecode,
        arguments: [tokenAddress, new BN(baseBorrowRate).times(new BN(1e18))],
      });
      web3.eth.getAccounts()
        .then(([from]) => [from, deploy.estimateGas({ from })])
        .then((result) => Promise.all(result))
        .then(([from, gas]) => deploy.send({
          from,
          gas,
        }))
        // eslint-disable-next-line no-underscore-dangle
        .then((instance) => instance._address)
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
