import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Controller from '../src/controller.js';

chai.use(chaiAsPromised);

const { expect } = chai;

describe('Controller handler', () => {
  context('Initialization', () => {
    let controller;
    beforeEach(() => {
      controller = new Controller('0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab');
    });
    it('should get an error when initializing without controller address', () => {
      expect(new Controller()).to.be.an('error');
    });
    it('should get a new instance using the controller registered address', () => {
      expect(controller).not.to.be.an('error');
    });
    it('should get zero collateral factor', () => {
      return controller.eventualCollateralFactor
        .then(collateralFactor => {
          expect(collateralFactor).to.eq(0);
        });
    });
    it('should get zero collateral factor', () => {
      return controller.eventualLiquidationFactor
        .then(collateralFactor => {
          expect(collateralFactor).to.eq(0);
        });
    });
  });
});
