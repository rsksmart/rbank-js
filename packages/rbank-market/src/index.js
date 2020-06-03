import MarketContract from './Market.json';
import Token from './token';
import { send, web3 } from '@rsksmart/rbank-utils';

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
    if (!address.match(/0x[a-fA-F0-9]{40}/))
      return new Error('Missing address');
    this._instance = new web3.eth.Contract(MarketContract.abi, address);
    this._address = address;
    this._token = this._instance.methods.token()
      .call()
      .then(tokenAddress => new Token(tokenAddress));
  }

  /**
   * Market address
   * @return {string} this market instance address.
   */
  get address() {
    return this._address;
  }

  /**
   * Returns an eventual controller address.
   * @return {Promise<string>} eventual registered controller address.
   */
  get eventualController() {
    return new Promise((resolve, reject) => {
      this._instance.methods.controller()
        .call()
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns an eventual base borrow rate for this market.
   * @return {Promise<number>} eventual market's base borrow rate.
   */
  get eventualBaseBorrowRate() {
    return new Promise((resolve, reject) => {
      this._instance.methods.baseBorrowRate()
        .call()
        .then(baseBorrowRate => Number(baseBorrowRate))
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
      this._instance.methods.getCash()
        .call()
        .then(balance => Number(balance))
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
      send(this._instance.methods.setController(controllerAddress))
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
      this._token
        .then(token => token.approve(this._address, amount, from))
        .then(() => send(this._instance.methods.supply(amount), from))
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
      send(this._instance.methods.borrow(amount), from)
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
        .then(([account]) => this._instance.methods.supplyOf(from || account).call())
        .then(balance => Number(balance))
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
      if (!tokenAddress.match(/0x[a-fA-F0-9]{40}/) || baseBorrowRate === undefined)
        reject(new Error('Either the token address or the base borrow rate are missing'));
      const market = new web3.eth.Contract(MarketContract.abi);
      const deploy = market.deploy({
        data: MarketContract.bytecode,
        arguments: [tokenAddress, baseBorrowRate],
      });
      web3.eth.getAccounts()
        .then(([from]) => [from, deploy.estimateGas({ from })])
        .then(result => Promise.all(result))
        .then(([from, gas]) => deploy.send({ from, gas }))
        .then(instance => instance._address)
        .then(resolve)
        .catch(reject);
    });
  }
}
