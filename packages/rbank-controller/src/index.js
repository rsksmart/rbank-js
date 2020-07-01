import { send, web3 } from '@rsksmart/rbank-utils';
import ControllerContract from './Controller.json';

/**
 * A blockchain transaction response.
 * @typedef {Object} TXResult
 */

/**
 * Controller handler.
 */
export default class Controller {
  /**
   * Controller handler constructor.
   * @param {string} address On chain `Controller` deployed address.
   * @return {Error}
   */
  constructor(address = '') {
    if (!address.match(/0x[a-fA-F0-9]{40}/)) return new Error('Missing address');
    this.instance = new web3.eth.Contract(ControllerContract.abi, address);
    this.instanceAddress = address;
  }

  /**
   * Controller address.
   * @return {string} this controller instance address.
   */
  get address() {
    return this.instanceAddress;
  }

  /**
   * Returns an eventual value for the collateral factor.
   * @return {Promise<number>} eventual collateral factor.
   */
  get eventualCollateralFactor() {
    return new Promise((resolve, reject) => {
      this.eventualMantissa
        .then((mantissa) => [
          mantissa,
          this.instance.methods.collateralFactor().call(),
        ])
        .then((promises) => Promise.all(promises))
        .then(([mantissa, collateralFactor]) => Number(collateralFactor
          / mantissa))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns an eventual value for the liquidation factor.
   * @return {Promise<number>} eventual liquidation factor.
   */
  get eventualLiquidationFactor() {
    return new Promise((resolve, reject) => {
      this.eventualMantissa
        .then((matissa) => [
          matissa,
          this.instance.methods.liquidationFactor().call(),
        ])
        .then((promises) => Promise.all(promises))
        .then(([mantissa, liquidationFactor]) => Number(liquidationFactor
          / mantissa))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns an eventual value for the size of registered markets
   * within this controller.
   * @return {Promise<number>} eventual market list size.
   */
  get eventualMarketListSize() {
    return new Promise((resolve, reject) => {
      this.instance.methods.marketListSize()
        .call()
        .then((marketListSize) => Number(marketListSize))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns the eventual controller owner.
   * @return {Promise<string>} eventual controller owner.
   */
  get eventualOwner() {
    return new Promise((resolve, reject) => {
      this.instance.methods.owner()
        .call()
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns the eventual mantissa.
   * @return {Promise<number>} eventual controller mantissa.
   */
  get eventualMantissa() {
    return new Promise((resolve, reject) => {
      this.instance.methods.MANTISSA()
        .call()
        .then((mantissa) => Number(mantissa))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Sets the collateral factor for this controller.
   * @param {number} collateralFactor
   * @return {Promise<TXResult>}
   */
  setCollateralFactor(collateralFactor) {
    return new Promise((resolve, reject) => {
      this.eventualMantissa
        .then((mantissa) => send(this.instance.methods
          .setCollateralFactor(collateralFactor * mantissa)))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Sets the liquidation factor for this controller.
   * @param {number} liquidationFactor
   * @return {Promise<TXResult>}
   */
  setLiquidationFactor(liquidationFactor) {
    return new Promise((resolve, reject) => {
      this.eventualMantissa
        .then((mantissa) => send(this.instance.methods
          .setLiquidationFactor(liquidationFactor * mantissa)))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Adds a new market into this controller. Fails if the market was already added.
   * @param {string} marketAddress address of an existing market on chain.
   * @return {Promise<TXResult>}
   */
  addMarket(marketAddress) {
    return new Promise((resolve, reject) => {
      send(this.instance.methods.addMarket(marketAddress))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Sets the price in USD for a given market
   * @param {string} marketAddress address of the registered market in this controller.
   * @param {number} marketPrice the new price for the given market.
   * @return {Promise<TXResult>}
   */
  setMarketPrice(marketAddress, marketPrice) {
    return new Promise((resolve, reject) => {
      send(this.instance.methods.setPrice(marketAddress, marketPrice))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns the current price for a given market.
   * @param marketAddress address of the registered market in this controller.
   * @return {Promise<number>} eventual price for a given market in this controller.
   */
  eventualMarketPrice(marketAddress) {
    return new Promise((resolve, reject) => {
      this.instance.methods.prices(marketAddress)
        .call()
        .then((price) => Number(price))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns the current supplied and borrowed values for a given account.
   * @param {string} account
   * @return {Promise<AccountValues>}
   */
  getAccountValues(account) {
    return new Promise((resolve, reject) => {
      this.instance.methods.getAccountValues(account)
        .call()
        .then(({ supplyValue, borrowValue }) => ({
          supplyValue: Number(supplyValue),
          borrowValue: Number(borrowValue),
        }))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns the liquidity for a given account according to its current state in all the markets.
   * @param {string} account
   * @return {Promise<number>} eventual liquidity
   */
  getAccountLiquidity(account) {
    return new Promise((resolve, reject) => {
      this.instance.methods.getAccountLiquidity(account)
        .call()
        .then((liquidity) => Number(liquidity))
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns the address of the market registered at certain index.
   * @param {number} marketIdx Market index position
   * @return {Promise<string>}
   */
  getEventualMarketAddress(marketIdx) {
    return new Promise((resolve, reject) => {
      this.instance.methods.marketList(marketIdx)
        .call()
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Returns an address if the markets exists, it would be the market address
   * otherwise it would be an empty address of zeros.
   * @param tokenAddress
   * @return {Promise<string>}
   */
  getEventualMarketAddressByToken(tokenAddress) {
    return new Promise((resolve, reject) => {
      this.instance.methods.marketsByToken(tokenAddress)
        .call()
        .then((marketAddress) => {
          if (marketAddress.match(/0x[0]{40}/)) throw new Error('Token address not valid');
          return marketAddress;
        })
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Validates either the current account or an specified one is the owner of this controller.
   * @param {string=} from the account used to determine property of this controller.
   * @return {Promise<boolean>} eventual answer of property validation.
   */
  eventualIsOwner(from = '') {
    return new Promise((resolve, reject) => {
      web3.eth.getAccounts()
        .then(([account]) => [
          account,
          this.instance.methods.owner().call(),
        ])
        .then((results) => Promise.all(results))
        .then(([account, registeredOwner]) => {
          if (from) { return from === registeredOwner; }
          return account === registeredOwner;
        })
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Deploys a new controller on chain
   * @return {Promise<string>} the address of the created controller smart contract
   */
  static create() {
    return new Promise((resolve, reject) => {
      const controller = new web3.eth.Contract(ControllerContract.abi);
      const deploy = controller.deploy({ data: ControllerContract.bytecode });
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
}
