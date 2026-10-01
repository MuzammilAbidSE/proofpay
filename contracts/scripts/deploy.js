const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const Escrow = await ethers.getContractFactory("ProofPayEscrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log(`ProofPayEscrow deployed to ${address} on ${network.name}`);

  const artifact = await require("hardhat").artifacts.readArtifact("ProofPayEscrow");
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `${network.name}.json`),
    JSON.stringify({ address, abi: artifact.abi }, null, 2)
  );
  console.log(`Wrote deployments/${network.name}.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
