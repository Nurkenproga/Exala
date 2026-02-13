export interface NFTMetadata {
  name?: string
  description?: string
  image?: string
  external_url?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
}

export interface NFT {
  contract: {
    address: string
    name?: string
    symbol?: string
  }
  tokenId: string
  title?: string
  description?: string
  tokenUri?: {
    raw: string
    gateway: string
  }
  media?: Array<{
    raw: string
    gateway: string
  }>
  metadata?: NFTMetadata
  timeLastUpdated: string
}

export interface NFTResponse {
  ownedNfts: NFT[]
  totalCount: number
  blockHash?: string
}

class NFTService {
  private readonly ALCHEMY_BASE_URLS: Record<number, string> = {
    1: 'https://eth-mainnet.g.alchemy.com/v2',
    5: 'https://eth-goerli.g.alchemy.com/v2',
    137: 'https://polygon-mainnet.g.alchemy.com/v2',
    80001: 'https://polygon-mumbai.g.alchemy.com/v2',
  }

  private readonly ALCHEMY_NFT_URLS: Record<number, string> = {
    1: 'https://eth-mainnet.g.alchemy.com/nft/v3',
    5: 'https://eth-goerli.g.alchemy.com/nft/v3',
    137: 'https://polygon-mainnet.g.alchemy.com/nft/v3',
    80001: 'https://polygon-mumbai.g.alchemy.com/nft/v3',
  }

  private apiKey: string = import.meta.env.VITE_ALCHEMY_API_KEY || ''

  async getNFTs(address: string, chainId: number = 1): Promise<NFT[]> {
    try {
      const nftBaseUrl = this.ALCHEMY_NFT_URLS[chainId]
      
      if (!nftBaseUrl) {
        console.warn(`Alchemy не поддерживает сеть ${chainId}, пробуем альтернативные методы`)
        return await this.getNFTsForUnsupportedChain(address, chainId)
      }

      if (!this.apiKey) {
        throw new Error('Требуется API ключ Alchemy. Добавьте VITE_ALCHEMY_API_KEY в .env файл')
      }

      const normalizedAddress = address.toLowerCase()
      const url = `${nftBaseUrl}/${this.apiKey}/getNFTsForOwner?owner=${normalizedAddress}&withMetadata=true&pageSize=100`

      console.log('Запрос NFT через Alchemy:', { address: normalizedAddress, chainId, url })

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      })
      
      console.log('Alchemy API ответ:', { status: response.status, ok: response.ok })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Alchemy API ошибка:', { status: response.status, error: errorText })
        
        if (response.status === 401 || response.status === 403) {
          throw new Error('Неверный API ключ Alchemy. Проверьте VITE_ALCHEMY_API_KEY в .env файле')
        }
        
        throw new Error(`Alchemy API error: ${response.status} - ${errorText}`)
      }

      const data: NFTResponse = await response.json()
      console.log('Получено NFT:', { count: data.ownedNfts?.length || 0, total: data.totalCount })
      
      return data.ownedNfts || []
    } catch (error: any) {
      console.error('Ошибка получения NFT через Alchemy:', error)
      throw error
    }
  }

  private async getNFTsForUnsupportedChain(address: string, chainId: number): Promise<NFT[]> {
    console.log(`Попытка получить NFT для неподдерживаемой Alchemy сети ${chainId} через Moralis`)
    
    try {
      return await this.getNFTsViaMoralis(address, chainId)
    } catch (error) {
      console.error(`Moralis не смог получить NFT для сети ${chainId}:`, error)
      return []
    }
  }

  private async getNFTsViaBSCRPC(address: string, chainId: number): Promise<NFT[]> {
    try {
      console.log(`Получение NFT через BSC RPC для сети ${chainId}`)
      
      const rpcUrl = chainId === 56 
        ? 'https://bsc-dataseed.binance.org/'
        : 'https://data-seed-prebsc-1-s1.binance.org:8545/'
      
      const { JsonRpcProvider } = await import('ethers')
      const provider = new JsonRpcProvider(rpcUrl)
      const normalizedAddress = address.toLowerCase()
      
      const nfts: NFT[] = []
      console.log('BSC RPC: Для получения NFT требуется индексация событий Transfer')
      console.log('Рекомендуется использовать Moralis API для BSC')
      
      return nfts
    } catch (error) {
      console.error('Ошибка получения NFT через BSC RPC:', error)
      return []
    }
  }

  async getNFTsViaMoralis(address: string, chainId: number = 1): Promise<NFT[]> {
    try {
      const moralisApiKey = import.meta.env.VITE_MORALIS_API_KEY || ''
      
      if (!moralisApiKey) {
        console.warn('Moralis API ключ не найден. Добавьте VITE_MORALIS_API_KEY в .env')
        return []
      }
      
      const chainMap: Record<number, string> = {
        1: 'eth',
        5: 'goerli',
        56: 'bsc',
        97: 'bsc testnet',
        137: 'polygon',
        80001: 'mumbai',
      }
      
      const chain = chainMap[chainId]
      if (!chain) {
        console.warn(`Moralis не поддерживает сеть ${chainId}`)
        return []
      }
      
      const normalizedAddress = address.toLowerCase()
      const url = `https://deep-index.moralis.io/api/v2/${normalizedAddress}/nft?chain=${encodeURIComponent(chain)}&format=decimal&limit=100`
      
      console.log('Запрос NFT через Moralis:', { address: normalizedAddress, chainId, chain, url })

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': moralisApiKey,
          'Accept': 'application/json',
        }
      })
      
      console.log('Moralis API ответ:', { status: response.status, ok: response.ok })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Moralis API ошибка:', { status: response.status, error: errorText })
        
        if (response.status === 401 || response.status === 403) {
          throw new Error('Неверный API ключ Moralis. Проверьте VITE_MORALIS_API_KEY в .env файле')
        }
        
        throw new Error(`Moralis API error: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      console.log('Moralis вернул данные:', { total: data.total, count: data.result?.length || 0 })
      
      if (!data.result || data.result.length === 0) {
        return []
      }
      
      const nfts = data.result.map((nft: any) => {
        let metadata = null
        if (nft.metadata) {
          try {
            metadata = typeof nft.metadata === 'string' ? JSON.parse(nft.metadata) : nft.metadata
          } catch (e) {
            console.warn('Ошибка парсинга метаданных NFT:', e)
            metadata = {}
          }
        }
        
        const imageUrl = metadata?.image || 
                        metadata?.image_url || 
                        nft.metadata?.image ||
                        (metadata?.image_data ? `data:image/svg+xml;base64,${metadata.image_data}` : null)
        
        const processImageUrl = (url: string | null | undefined): string | null => {
          if (!url) return null
          
          if (url.startsWith('ipfs://')) {
            const ipfsHash = url.replace('ipfs://', '').replace('ipfs/', '')
            return `https://ipfs.io/ipfs/${ipfsHash}`
          }
          
          if (url.startsWith('Qm') || url.startsWith('baf')) {
            return `https://ipfs.io/ipfs/${url}`
          }
          
          if (url.startsWith('data:')) {
            return url
          }
          
          if (url.startsWith('http://') || url.startsWith('https://')) {
            return url
          }
          
          return url
        }
        
        const processedImage = processImageUrl(imageUrl)
        
        return {
          contract: {
            address: nft.token_address?.toLowerCase() || '',
            name: nft.name || metadata?.name || 'Unknown Collection',
            symbol: nft.symbol || metadata?.symbol || '',
          },
          tokenId: nft.token_id || '0',
          title: metadata?.name || nft.name || `#${nft.token_id}`,
          description: metadata?.description || nft.metadata?.description || '',
          tokenUri: {
            raw: nft.token_uri || '',
            gateway: processedImage || '',
          },
          media: processedImage ? [{
            raw: processedImage,
            gateway: processedImage,
          }] : [],
          metadata: {
            name: metadata?.name || nft.name || `#${nft.token_id}`,
            description: metadata?.description || '',
            image: processedImage || undefined,
            attributes: metadata?.attributes || metadata?.traits || [],
          },
          timeLastUpdated: nft.last_token_uri_sync || nft.last_metadata_sync || new Date().toISOString(),
        }
      })
      
      console.log('Обработано NFT:', nfts.length)
      return nfts
    } catch (error: any) {
      console.error('Ошибка получения NFT через Moralis:', error)
      throw error
    }
  }

  async getNFTMetadata(contractAddress: string, tokenId: string, chainId: number = 1): Promise<NFTMetadata | null> {
    try {
      const baseUrl = this.ALCHEMY_BASE_URLS[chainId]
      if (!baseUrl) {
        return null
      }

      const url = `${baseUrl}/${this.apiKey ? this.apiKey : 'demo'}/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}`

      const response = await fetch(url)
      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data.metadata || null
    } catch (error) {
      console.error('Ошибка получения метаданных NFT:', error)
      return null
    }
  }


  setApiKey(key: string) {
    this.apiKey = key
  }
}

export const nftService = new NFTService()
