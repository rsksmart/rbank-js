import ControllerContract from './Controller.json';
import Web3 from 'web3';

const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');

/**
 * Controller handler
 */
export default class Controller {
  /**
   * Constructor
   * @param {string} address On chain `Controller` deployed address
   * @return {Error}
   */
  constructor(address = '') {
    if (!address.match(/0x[a-fA-F0-9]{40}/))
      return new Error('Missing address');
    this._instance = new web3.eth.Contract(ControllerContract.abi, address);
  }

  get eventualCollateralFactor() {
    return new Promise((resolve, reject) => {
      this._instance.methods.collateralFactor()
        .call()
        .then(collateralFactor => Number(collateralFactor))
        .then(resolve)
        .catch(reject);
    });
  }

  get eventualLiquidationFactor() {
    return new Promise((resolve, reject) => {
      this._instance.methods.liquidationFactor()
        .call()
        .then(liquidationFactor => Number(liquidationFactor))
        .then(resolve)
        .catch(reject);
    });
  }
}
