const { ethers } = require('hardhat');

describe('BenefitsWallet', () => {
  let controller, testUser1, testUser2;
  let testContract;

  beforeEach(async () => {
    [controller, testUser1, testUser2] = await ethers.getSigners();

    const contractStartDate = new Date();
    contractStartDate.setFullYear(contractStartDate.getFullYear() + 1);
    const contractInterval = 365*24*60*60;    // 1 year
    const contractDuration = 20*365*24*60*60;

    testContract = await ethers.deployContract('BenefitsWallet', [
      testUser1.address,
      contractStartDate.getTime(),
      contractInterval,
      contractDuration
    ]);
  });

  it('should deploy contract with correct controller and beneficiary (owner)', async () => {
    const testOwner = await testContract.owner();
    const testController = await testContract.controller();
    expect(testOwner).toBe(testUser1.address);
    expect(testController).toBe(controller.address);
  });

});
