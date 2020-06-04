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
    this._controller = null;
    this._eventualMarkets = new Promise(resolve => { resolve([]); });
  }

  /**
   * Returns the initialized controller instance.
   * @return {Controller}
   */
  get controller() { return this._controller; }

  /**
   * By providing the on chain deployed controller address, a controller instance is made available.
   * @param {string} controllerAddress on chain deployed controller address.
   */
  set controller(controllerAddress) {
    this._controller = new this.Controller(controllerAddress);
    this._eventualMarkets = this._controller.eventualMarketListSize
      .then(marketListSize => _.range(marketListSize))
      .then(marketIdx => marketIdx.map(marketIdx => this._controller.getEventualMarketAddress(marketIdx)))
      .then(eventualMarketAddresses => Promise.all(eventualMarketAddresses))
      .then(marketAddresses => marketAddresses.map(marketAdderss => new Market(marketAdderss)));
  }

  /**
   * Returns the eventual market instances that are registered in the specified controller.
   * @return {Promise<[Market]>} eventual array of market instances.
   */
  get eventualMarkets() { return this._eventualMarkets; }

  /**
   * Gets an eventual instance of the specified market either by its position in the market list or
   * by its on chain deployed market address.
   * @param {string|number} id either the position in the market list array or its on chain deployed market address.
   * @return {Promise<Market>} eventual market instance
   */
  eventualMarket(id) {
    if (typeof id === 'string')
      return this._eventualMarkets
        .then(markets => markets.filter(market => market.address === id).pop());
    return this._eventualMarkets
      .then(markets => markets[id]);
  }
}
