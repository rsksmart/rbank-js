import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as Utils from '../src/utils';
import {
  describe,
  it,
  beforeEach
} from 'mocha';

chai.use(chaiAsPromised);

const { expect } = chai;

describe('Utils module', () => {
  it('should have a web3 instance tied to localhost', () => {
    expect(Utils.web3.currentProvider.host).to.eq('http://127.0.0.1:8545')
  });
});
