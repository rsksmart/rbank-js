import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Web3 from 'web3';
import Market from '../src';
import Token from '../src/token';
import TokenContract from '../src/FaucetToken.json';

const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');

chai.use(chaiAsPromised);

const { expect } = chai;

describe('Token handler', () => {
  let token1;
  let market;
  beforeEach(async () => {
    const token = new web3.eth.Contract(TokenContract.abi);
    const deploy = token.deploy({
      data: TokenContract.bytecode,
      arguments: [1000000000000, 'Token 1', 0, 'TOK1'],
    });
    const [owner, user] = await web3.eth.getAccounts();
    const gas = await deploy.estimateGas({ from: owner });
    token1 = await deploy.send({ from: owner, gas });
    market = new Market(await Market.create(token1._address, 10));
    await token1.methods.allocateTo(user, 1000).send({ from: owner });
    await token1.methods.allocateTo(owner, 1000).send({ from: owner });
  });
  context('Initialization', () => {
    it('should throw an error if no token address is passed', () => {
      return expect(new Token()).to.be.an('error');
    });
    it('should get a new Token instance using the token address', () => {
      const tokenContract = new web3.eth.Contract(TokenContract.abi);
      const deployToken = tokenContract.deploy({
        data: TokenContract.bytecode,
        arguments: [1000000000000, 'TOK1', 0, 'TOK1'],
      });
      return web3.eth.getAccounts()
        .then(([from]) => [from, deployToken.estimateGas({ from })])
        .then(result => Promise.all(result))
        .then(([from, gas]) => deployToken.send({ from, gas }))
        .then(instance => instance._address)
        .then(tokenAddress => [tokenAddress, new Token(tokenAddress)])
        .then(([address, token]) => {
          expect(token).not.to.be.an('error');
          expect(token.address).to.eq(address);
        });
    });
  });
  context('Operational', () => {
    let tok;
    beforeEach(async () => {
      tok = new Token(await token1._address);
    });
    it('should allow a token holder to authorize an address to perform transfers on their behalf', () => {
      const t1 = new Token(token1._address);
      return t1.approve(market.address, 10)
        .then(result => {
          expect(result.transactionHash).to.match(/0x[a-fA-F0-9]{64}/);
        });
    });
    it('should allow a specified token holder to authorize an address to perform transfers on their behalf', () => {
      const t1 = new Token(token1._address);
      return web3.eth.getAccounts()
        .then(([owner, user1]) => user1)
        .then(user1 => t1.approve(market.address, 10, user1))
        .then(result => {
          expect(result.transactionHash).to.match(/0x[a-fA-F0-9]{64}/);
        });
    });
    it('should return the token name', () => {
      return tok.eventualName
        .then((name) => {
          expect(name).to.eq('Token 1');
        });
    });
    it('should return the token symbol', () => {
      return tok.eventualSymbol
        .then((symbol) => {
          expect(symbol).to.eq('TOK1');
        });
    });
    it('should return the token decimals', () => {
      return tok.eventualDecimals
        .then((decimals) => {
          expect(decimals).to.eq(0);
        });
    });
  });
});
