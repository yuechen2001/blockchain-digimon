/**
 * Wallet utility functions for MetaMask interactions
 */

// Ethereum window type
declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Sign a message with MetaMask
 * @param message Message to sign
 * @param account Account address to sign with
 * @returns Signature
 */
export async function signMessage(message: string, account: string): Promise<string> {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    // The message params must be in hex format
    const msgParams = `0x${Buffer.from(message).toString('hex')}`;

    // Request signature from MetaMask
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [msgParams, account],
    });

    return signature;
  } catch (error) {
    console.error('Error signing message:', error);
    throw error;
  }
}

/**
 * Send a transaction with MetaMask
 * @param params Transaction parameters
 * @returns Transaction hash
 */
export async function sendTransaction(params: {
  from: string;
  to: string;
  value?: string; // In wei
  data?: string;
  gas?: string;
  gasPrice?: string;
}): Promise<string> {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    // Create transaction object
    const transaction = {
      from: params.from,
      to: params.to,
      value: params.value || '0x0',
      data: params.data || '0x',
      gas: params.gas,
      gasPrice: params.gasPrice,
    };

    // Send transaction request to MetaMask
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [transaction],
    });

    return txHash;
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
}

/**
 * Get all accounts from the connected MetaMask wallet
 * @returns Array of account addresses
 */
export async function getAccounts(): Promise<string[]> {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    const accounts = await window.ethereum.request({
      method: 'eth_accounts',
    });

    return accounts;
  } catch (error) {
    console.error('Error getting accounts:', error);
    throw error;
  }
}

/**
 * Request connection to MetaMask and get accounts
 * @returns Array of account addresses
 */
export async function requestAccounts(): Promise<string[]> {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    return accounts;
  } catch (error) {
    console.error('Error requesting accounts:', error);
    throw error;
  }
}