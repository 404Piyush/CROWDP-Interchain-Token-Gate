'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChainInfo } from '@keplr-wallet/types';

// Extend Window interface to include Keplr
declare global {
  interface Window {
    keplr?: KeplrWallet;
  }
}

interface KeplrWallet {
  enable: (chainId: string) => Promise<void>;
  getOfflineSigner: (chainId: string) => OfflineSigner;
  getKey: (chainId: string) => Promise<{ bech32Address: string; name: string }>;
  experimentalSuggestChain: (chainInfo: ChainInfo) => Promise<void>;
  signArbitrary: (chainId: string, signer: string, data: string | Uint8Array) => Promise<StdSignature>;
}

interface StdSignature {
  pub_key: {
    type: string;
    value: string;
  };
  signature: string;
}

interface OfflineSigner {
  getAccounts: () => Promise<{ address: string }[]>;
}

interface WalletConnectionProps {
  onWalletConnect: (address: string) => void;
}

// Osmosis testnet configuration
const osmosisChain: ChainInfo = {
  chainId: process.env.NEXT_PUBLIC_COSMOS_CHAIN_ID || 'osmo-test-5',
  chainName: 'Osmosis Testnet',
  rpc: process.env.NEXT_PUBLIC_COSMOS_RPC_URL || 'https://rpc.testnet.osmosis.zone',
  rest: process.env.NEXT_PUBLIC_COSMOS_REST_URL || 'https://lcd.testnet.osmosis.zone',
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: 'osmo',
    bech32PrefixAccPub: 'osmopub',
    bech32PrefixValAddr: 'osmovaloper',
    bech32PrefixValPub: 'osmovaloperpub',
    bech32PrefixConsAddr: 'osmovalcons',
    bech32PrefixConsPub: 'osmovalconspub',
  },
  currencies: [
    {
      coinDenom: 'OSMO',
      coinMinimalDenom: 'uosmo',
      coinDecimals: 6,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: 'OSMO',
      coinMinimalDenom: 'uosmo',
      coinDecimals: 6,
    },
  ],
  stakeCurrency: {
    coinDenom: 'OSMO',
    coinMinimalDenom: 'uosmo',
    coinDecimals: 6,
  },
};

export default function WalletConnection({ onWalletConnect }: WalletConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnectingDiscord, setIsConnectingDiscord] = useState(false);
  const [error, setError] = useState('');
  // Removed roles view - only profile view now

  const handleDiscordConnect = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    setIsConnectingDiscord(true);
    setError('');

    try {
      // Generate Discord OAuth URL directly with wallet address
      const discordClientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
      const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/discord/callback`);
      const state = encodeURIComponent(JSON.stringify({ walletAddress: address }));
      
      const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify&state=${state}`;

      // Redirect to Discord OAuth
      window.location.href = discordAuthUrl;
    } catch (err) {
      console.error('Discord connection failed:', err);
      setError(`Failed to connect Discord: ${err instanceof Error ? err.message : 'Please try again.'}`);
    } finally {
      setIsConnectingDiscord(false);
    }
  };

  const connectWallet = async () => {
    if (!window.keplr) {
      setError('Please install Keplr extension');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await window.keplr.experimentalSuggestChain(osmosisChain);
      await window.keplr.enable('osmo-test-5');
      
      const offlineSigner = window.keplr.getOfflineSigner(osmosisChain.chainId);
      const accounts = await offlineSigner.getAccounts();
      
      if (accounts.length > 0) {
        const userAddress = accounts[0].address;
        setAddress(userAddress);
        setIsConnected(true);
        onWalletConnect(userAddress);
        
        // Fetch balance
        await fetchBalance(userAddress);
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBalance = async (walletAddress: string) => {
    try {
      const cosmosRestUrl = process.env.NEXT_PUBLIC_COSMOS_REST_URL || 'https://lcd.testnet.osmosis.zone';
      const response = await fetch(`${cosmosRestUrl}/cosmos/bank/v1beta1/balances/${walletAddress}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }
      
      const data = await response.json();
      const osmoBalance = data.balances?.find((b: { denom: string; amount: string }) => b.denom === 'uosmo');
      
      if (osmoBalance) {
        const balanceInOsmo = parseInt(osmoBalance.amount) / 1000000;
        setBalance(balanceInOsmo);
      } else {
        setBalance(0);
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
      setBalance(0);
    }
  };

  // Removed disconnectWallet function as it's no longer needed after removing the X button

  if (!isConnected) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 max-w-md mx-auto">
        {/* Centered Logo */}
        <div className="text-center mb-8">
          <Image 
            src="/imgs/logo.png" 
            alt="Logo" 
            width={80}
            height={80}
            className="mx-auto object-contain"
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 font-druk">
            Connect Your Wallet
          </h1>
          <p className="text-white/80 text-lg leading-relaxed font-arkitech">
            Connect your Keplr wallet to access the Crowdpunk ecosystem
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <button
          onClick={connectWallet}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 text-lg shadow-lg shadow-teal-500/25 disabled:shadow-none font-arkitech"
        >
          {isLoading ? 'Connecting...' : 'Connect Keplr Wallet'}
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm text-black/60 font-arkitech">
            Don&apos;t have Keplr?{' '}
            <a 
              href={process.env.NEXT_PUBLIC_KEPLR_WALLET_URL || "https://www.keplr.app/"} 
              rel="noopener noreferrer"
              className="text-teal-600 hover:text-teal-700 underline font-arkitech"
            >
              Download here
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-teal-500/20 to-cyan-500/20 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
      {/* Header with Logo and Navigation */}
      <div className="flex items-center justify-between mb-8">
        <Image 
          src="/imgs/logo.png" 
          alt="Logo" 
          width={48}
          height={48}
          className="object-contain"
        />
        
        <div className="flex justify-center">
          <button
            className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25 font-arkitech"
          >
            Profile
          </button>
        </div>
      </div>

      <div>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2 font-druk">
            Wallet Connected
          </h2>
          <p className="text-white/80 text-lg font-arkitech">Welcome to Crowdpunk!</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wide font-druk">Address</h3>
            <p className="text-white font-mono text-sm break-all bg-black/20 p-3 rounded-lg font-arkitech">{address}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wide font-druk">OSMO Balance</h3>
            <p className="text-white text-2xl font-bold font-arkitech">{balance !== null ? balance.toFixed(2) : 'Loading...'} <span className="text-lg text-white/70 font-arkitech">OSMO</span></p>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleDiscordConnect}
            disabled={isConnectingDiscord}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-lg shadow-indigo-500/25 font-arkitech"
          >
            {isConnectingDiscord ? 'Connecting...' : 'Connect Discord Account'}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
          <h3 className="text-lg font-bold text-white mb-4 font-druk">Discord Commands</h3>
          <div className="space-y-3 text-sm text-white/80">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
              <code className="bg-black/30 px-3 py-2 rounded-lg font-mono text-teal-300 font-arkitech">/rolegoals</code>
              <span className="font-arkitech">- View all role requirements</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}