const NFT_CONTRACT_ADDRESS =
  (import.meta.env.VITE_NFT_CONTRACT_ADDRESS as string | undefined)?.trim() ||
  '0x77951dD6E495d480a6ad61133189d651D63d0E0b'
const NFT_CHAIN_ID = Number(
  (import.meta.env.VITE_NFT_CHAIN_ID as string | undefined)?.trim() || '11155111',
)
const NFT_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com'
const OWNER_OF_ABI = ['function ownerOf(uint256 tokenId) view returns (address)']
const MINT_EVENT_ABI = [
  'event NFTMinted(address indexed to, uint256 tokenId, uint256 eventId)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
]
const IMPORT_STORAGE_VERSION = 'v3'

export interface MetaMaskNftAsset {
  tokenId: string
  imageUrl?: string | null
  contractAddress?: string | null
}

export interface MetaMaskNftImportResult {
  status:
    | 'added'
    | 'already-added'
    | 'superseded'
    | 'not-owned'
    | 'wallet-unavailable'
    | 'wrong-network'
    | 'request-pending'
    | 'rejected'
    | 'failed'
  message: string
}

const AUTO_IMPORT_RETRY_MS = 2_500
const AUTO_IMPORT_TIMEOUT_MS = 90_000

let activeImportKey: string | null = null
let automaticImportGeneration = 0

const getContractAddress = (asset: MetaMaskNftAsset) =>
  asset.contractAddress?.trim() || NFT_CONTRACT_ADDRESS

const getAssetKey = (asset: MetaMaskNftAsset) =>
  `${getContractAddress(asset).toLowerCase()}:${asset.tokenId}`

const getImportStorageKey = (account: string, contractAddress: string, tokenId: string) =>
  `nft:metamask-import:${IMPORT_STORAGE_VERSION}:${account.toLowerCase()}:${contractAddress.toLowerCase()}:${tokenId}`

const getErrorCode = (error: unknown): number | undefined =>
  typeof error === 'object' && error !== null && 'code' in error
    ? Number((error as { code?: unknown }).code)
    : undefined

const wait = (durationMs: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, durationMs))

export const getMintedTokenIdFromTransaction = async (
  txHash: string,
  contractAddress?: string | null,
): Promise<string | null> => {
  try {
    const { Interface, JsonRpcProvider } = await import('ethers')
    const provider = new JsonRpcProvider(NFT_RPC_URL)
    const receipt = await provider.getTransactionReceipt(txHash)
    if (!receipt) return null

    const expectedContract = (contractAddress?.trim() || NFT_CONTRACT_ADDRESS).toLowerCase()
    const eventInterface = new Interface(MINT_EVENT_ABI)

    for (const log of receipt.logs) {
      if (expectedContract && log.address.toLowerCase() !== expectedContract) continue

      try {
        const parsed = eventInterface.parseLog({ topics: [...log.topics], data: log.data })
        if (parsed?.name === 'NFTMinted' || parsed?.name === 'Transfer') {
          return String(parsed.args.tokenId)
        }
      } catch {
        // Ignore unrelated transaction logs.
      }
    }
  } catch (error) {
    console.warn('Не удалось получить Token ID из mint-транзакции:', error)
  }

  return null
}

export const requestMetaMaskNftImportDirect = async (
  asset: MetaMaskNftAsset,
  pendingRequestRetries = 18,
): Promise<MetaMaskNftImportResult> => {
  const ethereum = (window as any).ethereum
  if (!asset.tokenId || !ethereum?.request) {
    return {
      status: 'wallet-unavailable',
      message: 'MetaMask не найден или кошелек не подключен.',
    }
  }

  try {
    const added = await ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC721',
        options: {
          address: getContractAddress(asset),
          tokenId: asset.tokenId,
          image: asset.imageUrl || undefined,
        },
      },
    })

    return added
      ? { status: 'added', message: 'NFT подтвержден в MetaMask.' }
      : { status: 'rejected', message: 'Добавление NFT не было подтверждено в MetaMask.' }
  } catch (error: unknown) {
    if (getErrorCode(error) === -32002 && pendingRequestRetries > 0) {
      await wait(5_000)
      return requestMetaMaskNftImportDirect(asset, pendingRequestRetries - 1)
    }

    if (getErrorCode(error) === 4001) {
      return {
        status: 'rejected',
        message: 'Вы отменили добавление NFT в MetaMask.',
      }
    }

    console.warn('Автоматическое добавление NFT в MetaMask не сработало:', error)
    return {
      status: 'failed',
      message: 'MetaMask не открыл окно автоматически. Используйте кнопку в уведомлении.',
    }
  }
}

const getCurrentAccount = async (): Promise<string | null> => {
  const ethereum = (window as any).ethereum
  if (!ethereum?.request) return null

  const accounts = await ethereum.request({ method: 'eth_accounts' })
  return Array.isArray(accounts) && typeof accounts[0] === 'string' ? accounts[0] : null
}

const ensureNftChain = async (): Promise<'ready' | 'pending' | 'rejected' | 'failed'> => {
  const ethereum = (window as any).ethereum
  if (!ethereum?.request) return 'failed'

  const requiredChain = `0x${NFT_CHAIN_ID.toString(16)}`
  const currentChain = await ethereum.request({ method: 'eth_chainId' })
  if (String(currentChain).toLowerCase() === requiredChain.toLowerCase()) {
    return 'ready'
  }

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: requiredChain }],
    })
    return 'ready'
  } catch (error) {
    if (getErrorCode(error) === -32002) return 'pending'
    if (getErrorCode(error) === 4001) return 'rejected'
    return 'failed'
  }
}

const getTokenOwner = async (contractAddress: string, tokenId: string): Promise<string | null> => {
  try {
    const { Contract, JsonRpcProvider, getAddress } = await import('ethers')
    const provider = new JsonRpcProvider(NFT_RPC_URL)
    const contract = new Contract(contractAddress, OWNER_OF_ABI, provider)
    return getAddress(String(await (contract as any).ownerOf(BigInt(tokenId))))
  } catch {
    return null
  }
}

export const requestMetaMaskNftImport = async (
  asset: MetaMaskNftAsset,
  options: { force?: boolean; verifyOwner?: boolean } = {},
): Promise<MetaMaskNftImportResult> => {
  const ethereum = (window as any).ethereum
  if (!asset.tokenId || !ethereum?.request) {
    return {
      status: 'wallet-unavailable',
      message: 'MetaMask не найден или кошелек не подключен.',
    }
  }

  const importKey = getAssetKey(asset)
  if (activeImportKey) {
    return {
      status: 'request-pending',
      message: 'MetaMask занят другим запросом. Новый NFT откроется после его завершения.',
    }
  }

  activeImportKey = importKey
  try {
    const account = await getCurrentAccount()
    if (!account) {
      return {
        status: 'wallet-unavailable',
        message: 'Откройте MetaMask и подключите аккаунт к сайту.',
      }
    }

    const contractAddress = getContractAddress(asset)
    const storageKey = getImportStorageKey(account, contractAddress, asset.tokenId)
    if (!options.force && localStorage.getItem(storageKey) === 'added') {
      return {
        status: 'already-added',
        message: 'Этот NFT уже подтверждался для текущего аккаунта MetaMask.',
      }
    }

    if (options.verifyOwner) {
      const owner = await getTokenOwner(contractAddress, asset.tokenId)
      if (owner && owner.toLowerCase() !== account.toLowerCase()) {
        return {
          status: 'not-owned',
          message: `NFT принадлежит адресу ${owner.slice(0, 6)}...${owner.slice(-4)}, а не текущему аккаунту MetaMask.`,
        }
      }
    }

    const chainStatus = await ensureNftChain()
    if (chainStatus === 'pending') {
      return {
        status: 'request-pending',
        message: 'В MetaMask уже открыт запрос. Новый NFT будет предложен после его завершения.',
      }
    }
    if (chainStatus === 'rejected') {
      return {
        status: 'rejected',
        message: 'Вы отменили переключение MetaMask на сеть Sepolia.',
      }
    }
    if (chainStatus !== 'ready') {
      return {
        status: 'wrong-network',
        message: 'Переключите MetaMask на сеть Sepolia и повторите.',
      }
    }

    const added = await ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC721',
        options: {
          address: contractAddress,
          tokenId: asset.tokenId,
          image: asset.imageUrl || undefined,
        },
      },
    })

    if (added) {
      localStorage.setItem(storageKey, 'added')
      return {
        status: 'added',
        message: 'NFT подтвержден в MetaMask.',
      }
    }

    return {
      status: 'rejected',
      message: 'Добавление NFT не было подтверждено в MetaMask.',
    }
  } catch (error: unknown) {
    if (getErrorCode(error) === -32002) {
      return {
        status: 'request-pending',
        message: 'MetaMask занят старым запросом. Завершите или отмените его в кошельке.',
      }
    }

    if (getErrorCode(error) === 4001) {
      return {
        status: 'rejected',
        message: 'Вы отменили добавление NFT в MetaMask.',
      }
    }

    console.warn('MetaMask не добавил NFT:', error)
    return {
      status: 'failed',
      message: 'MetaMask не смог открыть этот NFT. Повторите из карточки коллекции.',
    }
  } finally {
    activeImportKey = null
  }
}

export const requestMetaMaskNftImportWithRetry = async (
  asset: MetaMaskNftAsset,
  options: {
    force?: boolean
    verifyOwner?: boolean
    onPending?: (message: string) => void
  } = {},
): Promise<MetaMaskNftImportResult> => {
  const deadline = Date.now() + AUTO_IMPORT_TIMEOUT_MS
  let verifyOwner = options.verifyOwner

  while (Date.now() < deadline) {
    const result = await requestMetaMaskNftImport(asset, {
      force: options.force,
      verifyOwner,
    })

    if (result.status !== 'request-pending') {
      return result
    }

    options.onPending?.(
      'MetaMask занят старым запросом. Завершите или отмените его: этот NFT откроется автоматически.',
    )
    verifyOwner = false
    await wait(AUTO_IMPORT_RETRY_MS)
  }

  return {
    status: 'request-pending',
    message: 'MetaMask оставался занят дольше 90 секунд. Завершите старый запрос и нажмите кнопку еще раз.',
  }
}

export const requestLatestMetaMaskNftImport = async (
  asset: MetaMaskNftAsset,
): Promise<MetaMaskNftImportResult> => {
  const generation = ++automaticImportGeneration
  const deadline = Date.now() + AUTO_IMPORT_TIMEOUT_MS
  let verifyOwner = true

  while (Date.now() < deadline) {
    if (generation !== automaticImportGeneration) {
      return {
        status: 'superseded',
        message: 'Появился более новый NFT, поэтому старый запрос больше не показывается.',
      }
    }

    const result = await requestMetaMaskNftImport(asset, { verifyOwner })
    verifyOwner = false
    if (generation !== automaticImportGeneration) {
      return {
        status: 'superseded',
        message: 'Появился более новый NFT, поэтому старый запрос больше не показывается.',
      }
    }

    if (result.status !== 'request-pending') {
      return result
    }

    await wait(AUTO_IMPORT_RETRY_MS)
  }

  return {
    status: 'request-pending',
    message: 'MetaMask долго занят другим запросом. Завершите его, затем повторите из раздела «Мои NFT».',
  }
}
