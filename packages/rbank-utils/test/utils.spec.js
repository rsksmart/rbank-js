import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as utils from '../src';
import ControllerContract from '../../../dependencies/DeFiProt/build/contracts/Controller.json';

chai.use(chaiAsPromised);

const { expect } = chai;

describe('Utils module', () => {
  it('should have a web3 instance tied to localhost', () => {
    expect(utils.web3.currentProvider.host).to.eq('http://127.0.0.1:8545');
  });
  it('should properly send transactions generically', () => {
    const controller = new utils.web3.eth.Contract(ControllerContract.abi);
    const deploy = controller.deploy({ data: ControllerContract.bytecode });
    return utils.web3.eth.getAccounts()
      .then(([from]) => ([from, deploy.estimateGas({ from })]))
      .then(result => Promise.all(result))
      .then(([from, gas]) => deploy.send({ from, gas }))
      .then(c => utils.send(c.methods.setCollateralFactor(3)))
      .then(result => {
        expect(result.transactionHash).to.match(/0x[a-fA-F0-9]{64}/);
      });
  });
});
