import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Rbank from '../src';
import Controller from '@rsksmart/rbank-controller';
import Market from '@rsksmart/rbank-market';

chai.use(chaiAsPromised);

const { expect } = chai;

describe('Core', () => {
  let rbank;
  beforeEach(async () => {
    rbank = new Rbank();
  });
  context('Packages independence', () => {
    it('should have access to the controller handler', () => {
      return expect(rbank.Controller).to.eq(Controller);
    });
    it('should have access to the market handler', () => {
      return expect(rbank.Market).to.eq(Market);
    });
  });
});
