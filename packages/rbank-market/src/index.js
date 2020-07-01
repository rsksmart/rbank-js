import { BN, send, web3 } from '@rsksmart/rbank-utils';
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
        .then((factor) => [factor,
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
   * Returns the eventual balance of this market in terms of its registered token.
   * @return {Promise<number>} eventual balance of this market.
   */
  get eventualBalance() {
    return new Promise((resolve, reject) => {
      this.instance.methods.getCash()
        .call()
        .then((balance) => Number(balance))
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
   * Returns the amount on this market's token that has been supplied by the caller.
   * @param {string=} from if specified executes the transaction using this account.
   * @return {Promise<number>}
   */
  supplyOf(from = '') {
    return new Promise((resolve, reject) => {
      web3.eth.getAccounts()
        .then(([account]) => this.instance.methods.supplyOf(from || account).call())
        .then((balance) => Number(balance))
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
        .then(([from, gas]) => deploy.send({ from, gas }))
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
