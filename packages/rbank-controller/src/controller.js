import ControllerContract from './Controller.json';
import Web3 from 'web3';

const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');

const send = (signature) => new Promise((resolve, reject) => {
  web3.eth.getAccounts()
    .then(([from]) => [from, signature.estimateGas({ from })])
    .then(promises => Promise.all(promises))
    .then(([from, gas]) => signature.send({ from, gas }))
    .then(resolve)
    .catch(reject);
});

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

  get eventualMarketListSize() {
    return new Promise((resolve, reject) => {
      this._instance.methods.marketListSize()
        .call()
        .then(marketListSize => Number(marketListSize))
        .then(resolve)
        .catch(reject);
    });
  }

  setCollateralFactor(collateralFactor) {
    return new Promise((resolve, reject) => {
      send(this._instance.methods.setCollateralFactor(collateralFactor))
        .then(resolve)
        .catch(reject);
    });
  }

  setLiquidationFactor(liquidationFactor) {
    return new Promise((resolve, reject) => {
      send(this._instance.methods.setLiquidationFactor(liquidationFactor))
        .then(resolve)
        .catch(reject);
    });
  }

  addMarket(marketAddress) {
    return new Promise((resolve, reject) => {
      send(this._instance.methods.addMarket(marketAddress))
        .then(resolve)
        .catch(reject);
    });
  }

  static create() {
    return new Promise((resolve, reject) => {
      const controller = new web3.eth.Contract(ControllerContract.abi);
      const deploy = controller.deploy({ data: ControllerContract.bytecode });
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
