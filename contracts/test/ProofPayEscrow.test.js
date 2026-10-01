const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProofPayEscrow", function () {
  let escrow, client, freelancer, arbitrator, stranger;
  const MILESTONE_AMOUNT = ethers.parseEther("1");

  beforeEach(async function () {
    [client, freelancer, arbitrator, stranger] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("ProofPayEscrow");
    escrow = await Escrow.deploy();
  });

  async function createFundedEscrowWithMilestone() {
    await escrow.connect(client).createEscrow(freelancer.address, arbitrator.address);
    const escrowId = 0n;
    await escrow.connect(client).deposit(escrowId, { value: MILESTONE_AMOUNT });
    await escrow.connect(client).addMilestone(escrowId, MILESTONE_AMOUNT);
    return escrowId;
  }

  it("runs the full happy-path lifecycle: create, deposit, milestone, approve, release", async function () {
    const escrowId = await createFundedEscrowWithMilestone();
    const milestoneId = 0n;
    const proofHash = ethers.keccak256(ethers.toUtf8Bytes("delivered-file-contents"));

    await escrow.connect(freelancer).submitMilestone(escrowId, milestoneId, proofHash);
    await escrow.connect(client).approveMilestone(escrowId, milestoneId);

    const balanceBefore = await ethers.provider.getBalance(freelancer.address);
    const tx = await escrow.connect(stranger).releasePayment(escrowId, milestoneId);
    await expect(tx)
      .to.emit(escrow, "PaymentReleased")
      .withArgs(escrowId, milestoneId, freelancer.address, MILESTONE_AMOUNT);

    const balanceAfter = await ethers.provider.getBalance(freelancer.address);
    expect(balanceAfter - balanceBefore).to.equal(MILESTONE_AMOUNT);

    const milestone = await escrow.milestones(escrowId, milestoneId);
    expect(milestone.status).to.equal(3n); // Released
    expect(milestone.proofHash).to.equal(proofHash);
  });

  it("rejects deposits and milestone actions from non-participants", async function () {
    await escrow.connect(client).createEscrow(freelancer.address, arbitrator.address);
    await expect(escrow.connect(stranger).deposit(0, { value: MILESTONE_AMOUNT })).to.be.revertedWith("not client");
    await expect(escrow.connect(stranger).addMilestone(0, MILESTONE_AMOUNT)).to.be.revertedWith("not client");
  });

  it("rejects release before approval and double release", async function () {
    const escrowId = await createFundedEscrowWithMilestone();
    await expect(escrow.releasePayment(escrowId, 0)).to.be.revertedWith("milestone not approved");

    await escrow.connect(freelancer).submitMilestone(escrowId, 0, ethers.ZeroHash);
    await escrow.connect(client).approveMilestone(escrowId, 0);
    await escrow.releasePayment(escrowId, 0);

    await expect(escrow.releasePayment(escrowId, 0)).to.be.revertedWith("milestone not approved");
  });

  it("resolves a dispute in the freelancer's favor via the arbitrator", async function () {
    const escrowId = await createFundedEscrowWithMilestone();
    await escrow.connect(freelancer).submitMilestone(escrowId, 0, ethers.ZeroHash);

    await escrow.connect(client).openDispute(escrowId, 0);
    let milestone = await escrow.milestones(escrowId, 0);
    expect(milestone.status).to.equal(4n); // Disputed

    await expect(escrow.connect(client).releasePayment(escrowId, 0)).to.be.revertedWith(
      "only arbitrator resolves dispute"
    );

    await expect(escrow.connect(arbitrator).releasePayment(escrowId, 0))
      .to.emit(escrow, "PaymentReleased")
      .withArgs(escrowId, 0, freelancer.address, MILESTONE_AMOUNT);
  });

  it("resolves a dispute in the client's favor via refund", async function () {
    const escrowId = await createFundedEscrowWithMilestone();
    await escrow.connect(freelancer).submitMilestone(escrowId, 0, ethers.ZeroHash);
    await escrow.connect(freelancer).openDispute(escrowId, 0);

    await expect(escrow.connect(client).refund(escrowId, 0)).to.be.revertedWith("not arbitrator");

    const balanceBefore = await ethers.provider.getBalance(client.address);
    await escrow.connect(arbitrator).refund(escrowId, 0);
    const balanceAfter = await ethers.provider.getBalance(client.address);
    expect(balanceAfter - balanceBefore).to.equal(MILESTONE_AMOUNT);

    const milestone = await escrow.milestones(escrowId, 0);
    expect(milestone.status).to.equal(5n); // Refunded
  });

  it("cannot dispute a milestone that hasn't been submitted", async function () {
    const escrowId = await createFundedEscrowWithMilestone();
    await expect(escrow.connect(client).openDispute(escrowId, 0)).to.be.revertedWith("milestone cannot be disputed");
  });
});
