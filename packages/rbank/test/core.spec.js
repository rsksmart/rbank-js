import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Web3 from 'web3';
import Rbank from '../src';
import Controller from '@rsksmart/rbank-controller';
import Market from '@rsksmart/rbank-market';
import TokenContract from '../../rbank-market/src/FaucetToken.json';

const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');

chai.use(chaiAsPromised);

const { expect } = chai;

describe('Core', () => {
  let rbank;
  beforeEach(async () => {
    rbank = new Rbank();
  });
  context('Packages independence', () => {
    it('should have access to the controller handler', () => {
      return expect(rbank.Controller)
        .to
        .eq(Controller);
    });
    it('should have access to the market handler', () => {
      return expect(rbank.Market)
        .to
        .eq(Market);
    });
    it('should have access to the token handler', () => {
      return expect(rbank.Token)
        .to
        .match(/Token/);
    });
  });
  context('Operational', () => {
    let controller;
    let token1,
      market1,
      market2,
      market3,
      market4,
      market5;
    beforeEach(async () => {
      const [owner] = await web3.eth.getAccounts();

      const token = new web3.eth.Contract(TokenContract.abi);

      const deployToken1 = token.deploy({
        data: TokenContract.bytecode,
        arguments: [100000, 'TOK1', 0, 'TOK1']
      });
      const deployToken2 = token.deploy({
        data: TokenContract.bytecode,
        arguments: [100000, 'TOK2', 0, 'TOK2']
      });
      const deployToken3 = token.deploy({
        data: TokenContract.bytecode,
        arguments: [100000, 'TOK3', 0, 'TOK3']
      });
      const deployToken4 = token.deploy({
        data: TokenContract.bytecode,
        arguments: [100000, 'TOK4', 0, 'TOK4']
      });
      const deployToken5 = token.deploy({
        data: TokenContract.bytecode,
        arguments: [100000, 'TOK5', 0, 'TOK5']
      });

      const gasToken1 = await deployToken1.estimateGas({ from: owner });
      const gasToken2 = await deployToken2.estimateGas({ from: owner });
      const gasToken3 = await deployToken3.estimateGas({ from: owner });
      const gasToken4 = await deployToken4.estimateGas({ from: owner });
      const gasToken5 = await deployToken5.estimateGas({ from: owner });

      token1 = await deployToken1.send({
        from: owner,
        gas: gasToken1,
      });
      const token2 = await deployToken2.send({
        from: owner,
        gas: gasToken2,
      });
      const token3 = await deployToken3.send({
        from: owner,
        gas: gasToken3,
      });
      const token4 = await deployToken4.send({
        from: owner,
        gas: gasToken4,
      });
      const token5 = await deployToken5.send({
        from: owner,
        gas: gasToken5,
      });

      controller = new Controller(await Controller.create());

      market1 = new Market(await Market.create(token1._address, 2, 1e6, 20));
      market2 = new Market(await Market.create(token2._address, 2, 1e6, 20));
      market3 = new Market(await Market.create(token3._address, 2, 1e6, 20));
      market4 = new Market(await Market.create(token4._address, 2, 1e6, 20));
      market5 = new Market(await Market.create(token5._address, 2, 1e6, 20));

      await controller.addMarket(market1.address);
      await controller.addMarket(market2.address);
      await controller.addMarket(market3.address);
      await controller.addMarket(market4.address);

      await market1.setControllerAddress(controller.address);
      await market2.setControllerAddress(controller.address);
      await market3.setControllerAddress(controller.address);
      await market4.setControllerAddress(controller.address);

      rbank.controller = controller.address;
    });
    it('should create a controller instance assigning the controller address', () => {
      return expect(rbank.controller.address)
        .to
        .eq(controller.address);
    });
    it('should create as many instances of markets as markets registered in the controller', () => {
      return rbank.eventualMarkets
        .then(markets => {
          expect(markets.length)
            .to
            .eq(4);
        });
    });
    it('should retrieve the right number of market instance after adding a new market', () => {
      return market5.setControllerAddress(controller.address)
        .then(() => rbank.controller.addMarket(market5.address))
        .then(() => rbank.eventualMarkets)
        .then(markets => {
          expect(markets.length)
            .to
            .eq(5);
        });
    });
    it('should retrieve a market instance by its address', () => {
      return rbank.eventualMarket(market3.address)
        .then(market => {
          expect(market.address)
            .to
            .eq(market3.address);
        });
    });
    it('should retrieve a market instance by its index', () => {
      return rbank.eventualMarket(1)
        .then(market => {
          expect(market.address)
            .to
            .eq(market2.address);
        });
    });
    it('should return an error for a non-existent market index', () => {
      return expect(rbank.eventualMarket(4)).to.be.eventually.rejected;
    });
    it('should return an error for a non-registered market address', () => {
      return expect(rbank.eventualMarket('0xC89Ce4735882C9F0f0FE26686c53074E09B0D550'))
        .to.be.eventually.rejected;
    });
    it('should return false validating a non-existing token address', () => {
      return rbank.marketExistsByToken(controller.address)
        .then((validationResult) => {
          expect(validationResult).to.be.false;
        });
    });
    it('should return true validating an existing token address', () => {
      return rbank.marketExistsByToken(token1._address)
        .then((validationResult) => {
          expect(validationResult).to.be.true;
        });
    });
  });
});
