export default function AboutPage() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">About ProofPay</h1>
        <p className="page-subtitle">Blockchain-based payment escrow for freelancers.</p>
      </div>

      <div className="card">
        <p className="card-title">The problem</p>
        <p>
          Freelancers and international clients face a trust problem: the freelancer wants payment security before
          starting, while the client wants proof of delivery before releasing payment. Traditional escrow introduces
          a centralized intermediary. ProofPay explores a blockchain-based alternative in which the payment rules are
          enforced by a smart contract instead of a third party.
        </p>
      </div>

      <div className="card">
        <p className="card-title">Architecture</p>
        <p className="mono text-muted" style={{ whiteSpace: "pre-wrap" }}>
          {`Next.js Frontend (wagmi/viem, wallet-signed txs)
        │
        ▼
NestJS API (Postgres + Redis) ── never holds a signer, read-only chain access
        ▲
        │ events
ProofPayEscrow.sol (Hardhat/Solidity) ── sole custodian of escrowed funds`}
        </p>
        <p className="text-muted text-small">
          The smart contract owns on-chain escrow state. The backend mirrors it into Postgres — once immediately when
          a transaction confirms, and continuously in the background via an event indexer — so reads are fast without
          ever trusting anything the backend didn't read back from the chain itself.
        </p>
      </div>

      <div className="card">
        <p className="card-title">Lifecycle</p>
        <ol className="text-small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
          <li>Client creates an escrow and deposits funds into the contract.</li>
          <li>Client defines milestones and amounts.</li>
          <li>Freelancer submits work — only a content hash is recorded, never the file itself.</li>
          <li>Client approves the milestone and the contract releases that milestone's funds.</li>
          <li>Either party can open a dispute; the designated arbitrator resolves it on-chain.</li>
        </ol>
      </div>

      <div className="callout warn">
        Local / testnet only. This is a portfolio project: it does not handle real customer funds, and does not
        implement KYC/AML, consumer protection, or jurisdiction-specific regulation. Treat those as separate
        engineering and legal requirements before this touches mainnet.
      </div>
    </>
  );
}
