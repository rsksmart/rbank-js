import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as utils from '../src';
import ControllerContract from '../../../dependencies/DeFiProt/build/contracts/Controller.json';

chai.use(chaiAsPromised);

const { expect } = chai;

describe('Utils module', () => {
  let controller, deploy;
  let user;
  beforeEach(async () => {
    controller = new utils.web3.eth.Contract(ControllerContract.abi);
    deploy = controller.deploy({ data: ControllerContract.bytecode });
    const [owner, user1] = await utils.web3.eth.getAccounts();
    user = user1;
  });
  it('should have a web3 instance tied to localhost', () => {
    return expect(utils.web3.currentProvider.host).to.eq('http://127.0.0.1:8545');
  });
  it('should properly send transactions generically', () => {
    return utils.web3.eth.getAccounts()
      .then(([from]) => ([from, deploy.estimateGas({ from })]))
      .then(result => Promise.all(result))
      .then(([from, gas]) => deploy.send({ from, gas }))
      .then(c => utils.send(c.methods.setCollateralFactor(3)))
      .then(result => {
        expect(result.transactionHash).to.match(/0x[a-fA-F0-9]{64}/);
      });
  });
  it('should properly send transaction generically specifying the address performing the action', () => {
    return deploy.estimateGas({ from: user })
      .then(gas => deploy.send({ from: user, gas }))
      .then(c => utils.send(c.methods.setCollateralFactor(3), user))
      .then(result => {
        expect(result.transactionHash).to.match(/0x[a-fA-F0-9]{64}/);
      });
  });
});
