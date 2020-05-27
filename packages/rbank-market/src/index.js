import MarketContract from './Market.json';
import Token from './token';
import { send, web3 } from '@rsksmart/rbank-utils';

export default class Market {
  constructor(address = '') {
    if (!address.match(/0x[a-fA-F0-9]{40}/))
      return new Error('Missing address');
    this._instance = new web3.eth.Contract(MarketContract.abi, address);
    this._address = address;
    this._token = this._instance.methods.token()
      .call()
      .then(tokenAddress => new Token(tokenAddress));
  }

  get address() {
    return this._address;
  }

  get eventualController() {
    return new Promise((resolve, reject) => {
      this._instance.methods.controller()
        .call()
        .then(resolve)
        .catch(reject);
    });
  }

  get eventualBaseBorrowRate() {
    return new Promise((resolve, reject) => {
      this._instance.methods.baseBorrowRate()
        .call()
        .then(baseBorrowRate => Number(baseBorrowRate))
        .then(resolve)
        .catch(reject);
    });
  }

  get balance() {
    return new Promise((resolve, reject) => {
      this._instance.methods.getCash()
        .call()
        .then(balance => Number(balance))
        .then(resolve)
        .catch(reject);
    });
  }

  setControllerAddress(controllerAddress) {
    return new Promise((resolve, reject) => {
      send(this._instance.methods.setController(controllerAddress))
        .then(resolve)
        .catch(reject);
    });
  }

  supply(amount, from = '') {
    return new Promise((resolve, reject) => {
      this._token
        .then(token => token.approve(this._address, amount, from))
        .then(() => send(this._instance.methods.supply(amount), from))
        .then(resolve)
        .catch(reject);
    });
  }

  borrow(amount, from = '') {
    return new Promise((resolve, reject) => {
      send(this._instance.methods.borrow(amount), from)
        .then(resolve)
        .catch(reject);
    });
  }

  supplyOf(from = '') {
    return new Promise((resolve, reject) => {
      web3.eth.getAccounts()
        .then(([account]) => this._instance.methods.supplyOf(from || account).call())
        .then(balance => Number(balance))
        .then(resolve)
        .catch(reject);
    });
  }

  payBorrow(amount, from = '') {
    return new Promise((resolve, reject) => {
      send(this._instance.methods.payBorrow(amount), from)
        .then(resolve)
        .catch(reject);
    });
  }

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
