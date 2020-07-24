import { send, web3 } from '@rsksmart/rbank-utils';
import TokenContract from './FaucetToken.json';

export default class Token {
  constructor(address = '') {
    if (!address.match(/0x[a-fA-F0-9]{40}/)) return new Error('Missing token address');
    this.instance = new web3.eth.Contract(TokenContract.abi, address);
    this.internalAddress = address;
  }

  get address() {
    return this.internalAddress;
  }

  get eventualName() {
    return new Promise((resolve, reject) => {
      this.instance.methods.name()
        .call()
        .then(resolve)
        .catch(reject);
    });
  }

  get eventualSymbol() {
    return new Promise((resolve, reject) => {
      this.instance.methods.symbol()
        .call()
        .then(resolve)
        .catch(reject);
    });
  }

  get eventualDecimals() {
    return new Promise((resolve, reject) => {
      this.instance.methods.decimals()
        .call()
        .then((decimals) => Number(decimals))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns the balance available of this token by the caller.
   * @param {string=} from if specified executes the transaction using this account.
   * @return {Promise<TXResult>}
   */
  eventualBalanceOf(from = '') {
    return new Promise((resolve, reject) => {
      this.instance.methods.balanceOf(from).call()
        .then((balance) => Number(balance))
        .then(resolve)
        .catch(reject);
    });
  }

  approve(marketAddress, amount, from = '') {
    return new Promise((resolve, reject) => {
      send(this.instance.methods.approve(marketAddress, amount), from)
        .then(resolve)
        .catch(reject);
    });
  }
}
