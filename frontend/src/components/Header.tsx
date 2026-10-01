"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { useAuth } from "@/lib/auth-context";
import { localChain } from "@/lib/wagmi";

function truncate(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function Header() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { authed, signingIn, signIn, signOut } = useAuth();

  const onExpectedChain = chainId === localChain.id;

  return (
    <header className="header">
      <div className="header-title">Milestone-based escrow — demo lifecycle</div>
      <div className="header-actions">
        {isConnected && !onExpectedChain && (
          <button className="small danger" onClick={() => switchChain({ chainId: localChain.id })} disabled={switching}>
            {switching ? "Switching…" : `Switch to ${localChain.name}`}
          </button>
        )}
        {isConnected && (
          <span className="chip">
            <span className={`chip-dot ${onExpectedChain ? "on" : "warn"}`} />
            {onExpectedChain ? localChain.name : `Wrong network (chain ${chainId})`}
          </span>
        )}

        {isConnected ? (
          <>
            <span className="chip mono">{address && truncate(address)}</span>
            {authed ? (
              <button className="secondary small" onClick={signOut}>
                Sign out
              </button>
            ) : (
              <button className="small" onClick={signIn} disabled={signingIn}>
                {signingIn ? "Signing…" : "Sign in"}
              </button>
            )}
            <button className="secondary small" onClick={() => disconnect()}>
              Disconnect
            </button>
          </>
        ) : (
          connectors.map((connector) => (
            <button key={connector.id} className="small" onClick={() => connect({ connector })}>
              Connect {connector.name}
            </button>
          ))
        )}
      </div>
    </header>
  );
}
