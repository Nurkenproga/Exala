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
      
      const chainMap: Record<number, string[]> = {
        1: ['0x1', 'eth'],
        5: ['0x5', 'goerli'],
        56: ['0x38', 'bsc'],
        97: ['0x61', 'bsc testnet'],
        137: ['0x89', 'polygon'],
        80001: ['0x13881', 'mumbai'],
      }
      
      const chainCandidates = chainMap[chainId]
      if (!chainCandidates || chainCandidates.length === 0) {
        console.warn(`Moralis не поддерживает сеть ${chainId}`)
        return []
      }
      
      const normalizedAddress = address.toLowerCase()
      let data: any = null
      let lastError: string | null = null
      let selectedChain: string | null = null

      for (const chain of chainCandidates) {
        const url = `https://deep-index.moralis.io/api/v2.2/${normalizedAddress}/nft?chain=${encodeURIComponent(chain)}&format=decimal&limit=100&normalizeMetadata=true&media_items=true`

        console.log('Запрос NFT через Moralis:', {
          address: normalizedAddress,
          chainId,
          chain,
          url,
        })

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-API-Key': moralisApiKey,
            'Accept': 'application/json',
          }
        })

        console.log('Moralis API ответ:', { status: response.status, ok: response.ok, chain })

        if (!response.ok) {
          const errorText = await response.text()
          lastError = errorText
          console.error('Moralis API ошибка:', { status: response.status, error: errorText, chain })

          if (response.status === 401 || response.status === 403) {
            throw new Error('Неверный API ключ Moralis. Проверьте VITE_MORALIS_API_KEY в .env файле')
          }

          continue
        }

        const currentData = await response.json()
        console.log('Moralis вернул данные:', {
          chain,
          total: currentData.total,
          count: currentData.result?.length || 0,
        })

        if (currentData.result?.length) {
          data = currentData
          selectedChain = chain
          break
        }

        if (!data) {
          data = currentData
          selectedChain = chain
        }
      }

      if (!data) {
        throw new Error(`Moralis API error: ${lastError || 'Пустой ответ API'}`)
      }
      
      if (!data.result || data.result.length === 0) {
        return []
      }
      
      const mappedNfts = await Promise.all(data.result.map(async (nft: any) => {
        const parsedMetadata = this.tryParseMetadata(nft.metadata)
        const normalizedMetadata = nft.normalized_metadata || {}

        const tokenUri = this.processImageUrl(nft.token_uri)
        let tokenUriMetadata: any = null

        const initialDescription = this.pickFirstNonEmpty(
          parsedMetadata?.description,
          normalizedMetadata?.description,
          nft?.description,
        )

        const initialImage = this.pickFirstNonEmpty(
          parsedMetadata?.image,
          parsedMetadata?.image_url,
          normalizedMetadata?.image,
          normalizedMetadata?.image_url,
          nft?.media?.[0]?.gateway,
          nft?.media?.items?.[0]?.gateway,
          nft?.image,
        )

        if (tokenUri && (!initialDescription || !initialImage)) {
          tokenUriMetadata = await this.fetchMetadataFromTokenUri(tokenUri)
        }

        const mergedMetadata = {
          name: this.pickFirstNonEmpty(
            tokenUriMetadata?.name,
            parsedMetadata?.name,
            normalizedMetadata?.name,
            nft?.name,
          ),
          description: this.pickFirstNonEmpty(
            tokenUriMetadata?.description,
            parsedMetadata?.description,
            normalizedMetadata?.description,
            nft?.description,
          ),
          image: this.pickFirstNonEmpty(
            tokenUriMetadata?.image,
            tokenUriMetadata?.image_url,
            parsedMetadata?.image,
            parsedMetadata?.image_url,
            normalizedMetadata?.image,
            normalizedMetadata?.image_url,
          ),
          attributes:
            tokenUriMetadata?.attributes ||
            tokenUriMetadata?.traits ||
            parsedMetadata?.attributes ||
            parsedMetadata?.traits ||
            normalizedMetadata?.attributes ||
            normalizedMetadata?.traits ||
            [],
        }

        const imageCandidates = [
          mergedMetadata?.image,
          nft?.media?.[0]?.gateway,
          nft?.media?.[0]?.thumbnail,
          nft?.media?.items?.[0]?.gateway,
          nft?.media?.items?.[0]?.thumbnail,
          nft?.normalized_metadata?.image,
          nft?.normalized_metadata?.image_url,
          nft?.possible_spam === true ? null : nft?.image,
        ]

        const processedImage =
          imageCandidates
            .map((candidate) => this.processImageUrl(candidate))
            .find((candidate) => Boolean(candidate)) || null

        return {
          rawNft: nft,
          mapped: {
          contract: {
            address: nft.token_address?.toLowerCase() || '',
            name: mergedMetadata?.name || nft.name || 'Unknown Collection',
            symbol: nft.symbol || '',
          },
          tokenId: nft.token_id || '0',
          title: mergedMetadata?.name || nft.name || `#${nft.token_id}`,
          description: mergedMetadata?.description || nft.description || '',
          tokenUri: {
            raw: nft.token_uri || '',
            gateway: processedImage || '',
          },
          media: processedImage ? [{
            raw: processedImage,
            gateway: processedImage,
          }] : [],
          metadata: {
            name: mergedMetadata?.name || nft.name || `#${nft.token_id}`,
            description: mergedMetadata?.description || nft.description || '',
            image: processedImage || undefined,
            attributes: mergedMetadata?.attributes || [],
          },
          timeLastUpdated: nft.last_token_uri_sync || nft.last_metadata_sync || new Date().toISOString(),
          },
        }
      }))

      const chainForDetails = selectedChain ?? chainCandidates[0] ?? '0x1'

      const missingContentItems = mappedNfts
        .filter((item) => {
          const hasImage = Boolean(item.mapped.metadata?.image)
          const hasDescription = Boolean(this.pickFirstNonEmpty(item.mapped.metadata?.description))
          return !hasImage || !hasDescription
        })
        .slice(0, 40)

      if (missingContentItems.length > 0) {
        await Promise.all(
          missingContentItems.map(async (item) => {
            let fallbackImage = await this.fetchNftImageViaMoralisDetails(
              item.rawNft.token_address,
              item.rawNft.token_id,
              chainForDetails,
              moralisApiKey,
            )

            const chainMetadata = await this.fetchNftMetadataFromChain(
              item.rawNft.token_address,
              item.rawNft.token_id,
              chainId,
            )

            if (!fallbackImage) {
              fallbackImage = chainMetadata?.image || null
            }

            const fallbackDescription = this.pickFirstNonEmpty(
              chainMetadata?.description,
              item.mapped.metadata?.description,
              item.mapped.description,
            )

            const fallbackName = this.pickFirstNonEmpty(
              chainMetadata?.name,
              item.mapped.metadata?.name,
              item.mapped.title,
            )

            const fallbackAttributes =
              chainMetadata?.attributes && chainMetadata.attributes.length > 0
                ? chainMetadata.attributes
                : item.mapped.metadata?.attributes || []

            if (fallbackImage) {
              item.mapped.media = [{
                raw: fallbackImage,
                gateway: fallbackImage,
              }]

              item.mapped.tokenUri = {
                ...item.mapped.tokenUri,
                gateway: fallbackImage,
              }
            }

            item.mapped.metadata = {
              ...item.mapped.metadata,
              name: fallbackName || item.mapped.metadata?.name,
              description: fallbackDescription || item.mapped.metadata?.description,
              image: fallbackImage || item.mapped.metadata?.image,
              attributes: fallbackAttributes,
            }

            item.mapped.title = fallbackName || item.mapped.title
            item.mapped.description = fallbackDescription || item.mapped.description
          })
        )
      }

      const nfts = mappedNfts.map((item) => item.mapped)
      
      console.log('Обработано NFT:', nfts.length)
      return nfts
    } catch (error: any) {
      console.error('Ошибка получения NFT через Moralis:', error)
      throw error
    }
  }

  private tryParseMetadata(rawMetadata: unknown): Record<string, any> | null {
    if (!rawMetadata) {
      return null
    }

    if (typeof rawMetadata === 'object') {
      return rawMetadata as Record<string, any>
    }

    if (typeof rawMetadata !== 'string') {
      return null
    }

    try {
      return JSON.parse(rawMetadata)
    } catch (error) {
      console.warn('Ошибка парсинга метаданных NFT:', error)
      return null
    }
  }

  private processImageUrl(url: string | null | undefined): string | null {
    if (!url) {
      return null
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }

    if (url.startsWith('//')) {
      return `https:${url}`
    }

    if (url.startsWith('ipfs://')) {
      const ipfsHash = url.replace(/^ipfs:\/\//, '').replace(/^ipfs\//, '')
      return `https://ipfs.io/ipfs/${ipfsHash}`
    }

    if (url.startsWith('Qm') || url.startsWith('baf')) {
      return `https://ipfs.io/ipfs/${url}`
    }

    if (url.startsWith('data:')) {
      return url
    }

    return url
  }

  private async fetchMetadataFromTokenUri(tokenUri: string): Promise<Record<string, any> | null> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      const response = await fetch(tokenUri, {
        method: 'GET',
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        return null
      }

      const text = await response.text()
      return this.tryParseMetadata(text)
    } catch (error) {
      console.warn('Не удалось загрузить metadata по token_uri:', error)
      return null
    }
  }

  private pickFirstNonEmpty(...values: Array<unknown>): string | null {
    for (const value of values) {
      if (typeof value !== 'string') {
        continue
      }

      const trimmed = value.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }

    return null
  }

  private async fetchNftImageViaMoralisDetails(
    contractAddress: string | undefined,
    tokenId: string | undefined,
    chain: string,
    apiKey: string,
  ): Promise<string | null> {
    if (!contractAddress || !tokenId) {
      return null
    }

    try {
      const url = `https://deep-index.moralis.io/api/v2.2/nft/${contractAddress}/${encodeURIComponent(tokenId)}?chain=${encodeURIComponent(chain)}&format=decimal&normalizeMetadata=true&media_items=true`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        return null
      }

      const detail = await response.json()
      const detailMetadata = {
        ...(this.tryParseMetadata(detail.metadata) || {}),
        ...(detail.normalized_metadata || {}),
      }

      const imageCandidates = [
        detailMetadata?.image,
        detailMetadata?.image_url,
        detailMetadata?.imageUrl,
        detailMetadata?.content?.image,
        detailMetadata?.properties?.image,
        detail?.media?.[0]?.gateway,
        detail?.media?.[0]?.thumbnail,
        detail?.media?.items?.[0]?.gateway,
        detail?.media?.items?.[0]?.thumbnail,
      ]

      let image =
        imageCandidates
          .map((candidate) => this.processImageUrl(candidate))
          .find((candidate) => Boolean(candidate)) || null

      if (!image && detail.token_uri) {
        const tokenUri = this.processImageUrl(detail.token_uri)
        if (tokenUri) {
          const tokenMetadata = await this.fetchMetadataFromTokenUri(tokenUri)
          image = this.processImageUrl(tokenMetadata?.image || tokenMetadata?.image_url)
        }
      }

      return image
    } catch {
      return null
    }
  }

  private async fetchNftMetadataFromChain(
    contractAddress: string | undefined,
    tokenId: string | undefined,
    chainId: number,
  ): Promise<{
    image: string | null
    description: string | null
    name: string | null
    attributes: Array<{ trait_type: string; value: string | number }>
  } | null> {
    if (!contractAddress || !tokenId) {
      return null
    }

    const rpcByChain: Record<number, string> = {
      1: 'https://rpc.ankr.com/eth',
      56: 'https://bsc-dataseed.binance.org/',
      97: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      137: 'https://polygon-rpc.com/',
      80001: 'https://rpc-mumbai.maticvigil.com/',
    }

    const rpcUrl = rpcByChain[chainId]
    if (!rpcUrl) {
      return null
    }

    try {
      const { JsonRpcProvider, Contract } = await import('ethers')
      const provider = new JsonRpcProvider(rpcUrl)

      const erc721: any = new Contract(
        contractAddress,
        ['function tokenURI(uint256 tokenId) view returns (string)'],
        provider,
      )

      const erc1155: any = new Contract(
        contractAddress,
        ['function uri(uint256 tokenId) view returns (string)'],
        provider,
      )

      let uri: string | null = null

      try {
        if (typeof erc721.tokenURI === 'function') {
          uri = await erc721.tokenURI(tokenId)
        }
      } catch {
        uri = null
      }

      if (!uri) {
        try {
          if (typeof erc1155.uri === 'function') {
            uri = await erc1155.uri(tokenId)
          }
        } catch {
          uri = null
        }
      }

      if (!uri) {
        return null
      }

      if (uri.includes('{id}')) {
        const hexId = BigInt(tokenId).toString(16).padStart(64, '0')
        uri = uri.replace('{id}', hexId)
      }

      const normalizedUri = this.processImageUrl(uri)
      if (!normalizedUri) {
        return null
      }

      const metadata = await this.fetchMetadataFromTokenUri(normalizedUri)
      const image = this.processImageUrl(
        metadata?.image || metadata?.image_url || metadata?.imageUrl,
      )
      const description = this.pickFirstNonEmpty(metadata?.description)
      const name = this.pickFirstNonEmpty(metadata?.name)
      const attributes =
        (metadata?.attributes || metadata?.traits || []).filter(
          (item: any) => item && typeof item.trait_type === 'string',
        ) || []

      return {
        image: image || null,
        description,
        name,
        attributes,
      }
    } catch {
      return null
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
