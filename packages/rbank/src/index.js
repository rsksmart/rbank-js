// eslint-disable-next-line import/no-extraneous-dependencies
import _ from 'lodash';
import Controller from '@rsksmart/rbank-controller';
import Market from '@rsksmart/rbank-market';

/**
 * Rbank core
 */
export default class Rbank {
  /**
   * Makes available a controller and market handlers.
   */
  constructor() {
    this.Controller = Controller;
    this.Market = Market;
    this.internalController = null;
    this.markets = new Promise((resolve) => { resolve([]); });
  }

  /**
   * Returns the initialized controller instance.
   * @return {Controller}
   */
  get controller() { return this.internalController; }

  /**
   * By providing the on chain deployed controller address, a controller instance is made available.
   * @param {string} controllerAddress on chain deployed controller address.
   */
  set controller(controllerAddress) {
    this.internalController = new this.Controller(controllerAddress);
    this.markets = this.internalController.eventualMarketListSize
      .then((marketListSize) => _.range(marketListSize))
      .then((marketIdxs) => marketIdxs
        .map((marketIdx) => this.internalController.getEventualMarketAddress(marketIdx)))
      .then((eventualMarketAddresses) => Promise.all(eventualMarketAddresses))
      .then((marketAddresses) => marketAddresses
        .map((marketAddress) => new Market(marketAddress)));
  }

  /**
   * Returns the eventual market instances that are registered in the specified controller.
   * @return {Promise<[Market]>} eventual array of market instances.
   */
  get eventualMarkets() { return this.markets; }

  /**
   * Gets an eventual instance of the specified market either by its position in the market list or
   * by its on chain deployed market address.
   * @param {string|number} id either the position in the market list array or its on chain deployed
   * market address.
   * @return {Promise<Market>} eventual market instance
   */
  eventualMarket(id) {
    return new Promise((resolve, reject) => {
      if (typeof id === 'string') {
        this.markets
          .then((markets) => markets.filter((market) => market.address === id).pop())
          .then((result) => {
            if (result === undefined) {
              throw new Error('There is no market with that address');
            }
            return result;
          })
          .then(resolve)
          .catch(reject);
      }
      return this.markets
        .then((markets) => markets[id])
        .then((result) => {
          if (result === undefined) {
            throw new Error('There is no market at this index');
          }
          return result;
        })
        .then(resolve)
        .catch(reject);
    });
  }
}
