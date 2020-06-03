import _ from 'lodash';
import Controller from '@rsksmart/rbank-controller';
import Market from '@rsksmart/rbank-market';

export default class Rbank {
  constructor() {
    this.Controller = Controller;
    this.Market = Market;
    this._controller = null;
    this._eventualMarkets = new Promise(resolve => { resolve([]); });
  }

  get controller() { return this._controller; }

  set controller(controllerAddress) {
    this._controller = new this.Controller(controllerAddress);
    this._eventualMarkets = this._controller.eventualMarketListSize
      .then(marketListSize => _.range(marketListSize))
      .then(marketIdx => marketIdx.map(marketIdx => this._controller.getEventualMarketAddress(marketIdx)))
      .then(eventualMarketAddresses => Promise.all(eventualMarketAddresses))
      .then(marketAddresses => marketAddresses.map(marketAdderss => new Market(marketAdderss)));
  }

  get eventualMarkets() { return this._eventualMarkets; }

  eventualMarket(id) {
    if (typeof id === 'string')
      return this._eventualMarkets
        .then(markets => markets.filter(market => market.address === id).pop());
    return this._eventualMarkets
      .then(markets => markets[id]);
  }
}
