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

  approve(marketAddress, amount, from = '') {
    return new Promise((resolve, reject) => {
      send(this.instance.methods.approve(marketAddress, amount), from)
        .then(resolve)
        .catch(reject);
    });
  }
}
