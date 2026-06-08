const NFT_CONTRACT_ADDRESS =
  (import.meta.env.VITE_NFT_CONTRACT_ADDRESS as string | undefined)?.trim() ||
  '0x77951dD6E495d480a6ad61133189d651D63d0E0b'

const PROMPT_STORAGE_VERSION = 'v2'
const PENDING_REQUEST_RETRY_MS = 5_000
const MAX_PENDING_REQUEST_RETRIES = 12

export interface MetaMaskNftAsset {
  tokenId: string
  imageUrl?: string | null
}

export const getNftPromptStorageKey = (tokenId: string) =>
  `nft:metamask-watch-asset:${PROMPT_STORAGE_VERSION}:${NFT_CONTRACT_ADDRESS.toLowerCase()}:${tokenId}`

export const hasPromptedMetaMaskForNft = (tokenId: string) =>
  Boolean(localStorage.getItem(getNftPromptStorageKey(tokenId)))

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

export const requestMetaMaskNftImport = async (
  asset: MetaMaskNftAsset,
  pendingRequestRetries = MAX_PENDING_REQUEST_RETRIES,
  shouldContinue: () => boolean = () => true,
): Promise<boolean> => {
  const ethereum = (window as any).ethereum
  if (
    !asset.tokenId ||
    !ethereum?.request ||
    !shouldContinue() ||
    hasPromptedMetaMaskForNft(asset.tokenId)
  ) {
    return false
  }

  try {
    const added = await ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC721',
        options: {
          address: NFT_CONTRACT_ADDRESS,
          tokenId: asset.tokenId,
          image: asset.imageUrl || undefined,
        },
      },
    })

    localStorage.setItem(getNftPromptStorageKey(asset.tokenId), added ? 'added' : 'shown')
    return Boolean(added)
  } catch (error: any) {
    if (error?.code === -32002 && pendingRequestRetries > 0) {
      await wait(PENDING_REQUEST_RETRY_MS)
      return requestMetaMaskNftImport(asset, pendingRequestRetries - 1, shouldContinue)
    }

    if (error?.code === 4001) {
      localStorage.setItem(getNftPromptStorageKey(asset.tokenId), 'shown')
    }

    console.warn('MetaMask не добавил NFT:', error)
    return false
  }
}
