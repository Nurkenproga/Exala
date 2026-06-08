# Almaty Events Platform — API Documentation

## Обзор

Платформа состоит из двух сервисов:

| Сервис | URL | Назначение |
|--------|-----|-----------|
| **auth** | `http://localhost:8001` | Регистрация, логин, токены |
| **back** | `http://localhost:8000` | События, NFT, профили, подписки |

Все защищённые эндпоинты требуют заголовок:
```
Authorization: Bearer <access_token>
```

---

## Запуск проекта

```bash
git clone <repo>
cd diplomaback
cp .env.example .env  # заполни переменные
docker compose up -d --build
```

### Переменные окружения (.env)

```env
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=qwerty123
POSTGRES_DB=diploma_nft
POSTGRES_URL=postgresql+asyncpg://postgres:qwerty123@db:5432/diploma_nft

# Auth
SECRET_KEY=<случайная строка>
AUTH_SECRET_KEY=<та же строка>

# Blockchain (Ethereum Sepolia Testnet)
WEB3_RPC_URL=https://sepolia.infura.io/v3/<INFURA_KEY>
RELAYER_PRIVATE_KEY=0x<приватный ключ кошелька с тестовым ETH>
CONTRACT_ADDRESS=0x<адрес задеплоенного контракта>
WALLET_ENCRYPTION_KEY=<32 байта hex>

# Supabase Storage
SUPABASE_URL=https://<id>.supabase.co
SUPABASE_SERVICE_KEY=<service key>
SUPABASE_S3_ENDPOINT=https://<id>.supabase.co/storage/v1/s3
SUPABASE_S3_REGION=ap-northeast-2
SUPABASE_S3_ACCESS_KEY=<access key>
SUPABASE_S3_SECRET_KEY=<secret key>
SUPABASE_BUCKET=nft_images
```

---

## Auth Service (порт 8001)

### POST /auth/register

Регистрация нового пользователя. Автоматически создаётся ETH кошелёк.

**Запрос (form-data):**
```bash
curl -X POST http://localhost:8001/auth/register \
  -F "username=alibek" \
  -F "password=mypassword123"
```

**Ответ:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

---

### POST /auth/login

Вход по username и паролю.

**Запрос (form-data):**
```bash
curl -X POST http://localhost:8001/auth/login \
  -F "username=alibek" \
  -F "password=mypassword123"
```

**Ответ:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

---

## Events — Back Service (порт 8000)

### GET /concerts/

Список всех концертов.

```bash
curl http://localhost:8000/concerts/
```

**Поля ответа:**
- `id` — ID в нашей БД
- `concert_id` — ID в Ticketon
- `title` — название
- `date` — дата и время
- `place` — место проведения
- `price` — цена (тенге)
- `poster` — URL обложки
- `url` — ссылка на Ticketon

---

### GET /concerts/search?title=

Поиск концертов по названию.

```bash
curl "http://localhost:8000/concerts/search?title=гарик"
```

---

### GET /concerts/{id}

Концерт по ID.

```bash
curl http://localhost:8000/concerts/2
```

---

### GET /theatres/

Список театральных постановок.

```bash
curl http://localhost:8000/theatre/
```

**Поля:** `id`, `name`, `partner_name` (театр), `next_session_date`, `price_from`, `small_poster`

---

### GET /movies/

Список фильмов.

```bash
curl http://localhost:8000/movies/
```

**Поля:** `id`, `title`, `rating`, `duration`, `genres`, `premiere_date`, `poster`

---

### GET /standups/

Список стендап-шоу.

```bash
curl http://localhost:8000/standups/
```

**Поля:** `id`, `title`, `address`, `price`, `event_dates`, `image`

---

## Check-in и NFT

### POST /checkins/

Чек-ин на событие. Запускает генерацию и минтинг NFT в блокчейне.

**Требует:** JWT токен

**event_type_id:**
- `1` — movies
- `2` — concerts
- `3` — theatres
- `4` — standups

```bash
curl -X POST http://localhost:8000/checkins/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type_id": 2,
    "external_event_id": 2
  }'
```

**Ответ:**
```json
{
  "checkin_id": 13,
  "nft_token_id": 13,
  "status": "pending",
  "rarity": "legendary"
}
```

**Rarity логика:**
- Первые 10 чек-инов на событии → `legendary` (50 баллов)
- 11–50 → `rare` (25 баллов)
- 51+ → `common` (10 баллов)

---

### GET /checkins/{checkin_id}/nft-status

Статус минтинга NFT. Опрашивать каждые 3 секунды пока `status != minted`.

```bash
curl http://localhost:8000/checkins/13/nft-status
```

**Ответ (pending):**
```json
{
  "status": "pending"
}
```

**Ответ (minted):**
```json
{
  "status": "minted",
  "nft_token": {
    "token_id": 9,
    "image_url": "https://...supabase.co/.../nft_13.png",
    "tx_hash": "0xb8ef...",
    "rarity": "legendary"
  }
}
```

**Статусы:** `pending` → `minting` → `minted` / `failed`

---

### GET /nfts/my

Все NFT токены текущего пользователя.

```bash
curl http://localhost:8000/nfts/my \
  -H "Authorization: Bearer <TOKEN>"
```

---

### GET /nfts/{token_id}

Детали конкретного NFT токена.

```bash
curl http://localhost:8000/nfts/13
```

---

### GET /nfts/user/{username}

Публичная коллекция NFT пользователя.

```bash
curl http://localhost:8000/nfts/user/alibek
```

---

## Профиль и подписки

### GET /users/me

Мой профиль.

```bash
curl http://localhost:8000/users/me \
  -H "Authorization: Bearer <TOKEN>"
```

**Ответ:**
```json
{
  "id": 4,
  "username": "alibek",
  "wallet_address": "0x1f48...",
  "wallet_type": "embedded",
  "explorer_level": "explorer",
  "explorer_points": 50,
  "events_attended": 1,
  "nft_count": 1,
  "followers_count": 0,
  "following_count": 0
}
```

**Explorer levels:**
- `explorer` — 0–99 баллов
- `pioneer` — 100–499 баллов
- `legend` — 500+ баллов

---

### GET /users/{user_id}/profile

Публичный профиль пользователя.

```bash
curl http://localhost:8000/users/4/profile
```

---

### GET /users/search?username=

Поиск пользователей по username.

```bash
curl "http://localhost:8000/users/search?username=ali"
```

---

### POST /users/{username}/follow

Подписаться на пользователя.

```bash
curl -X POST http://localhost:8000/users/alibek/follow \
  -H "Authorization: Bearer <TOKEN>"
```

---

### DELETE /users/{username}/follow

Отписаться от пользователя.

```bash
curl -X DELETE http://localhost:8000/users/alibek/follow \
  -H "Authorization: Bearer <TOKEN>"
```

---

### GET /users/me/followers

Мои подписчики.

```bash
curl http://localhost:8000/users/me/followers \
  -H "Authorization: Bearer <TOKEN>"
```

---

### GET /users/me/following

На кого я подписан.

```bash
curl http://localhost:8000/users/me/following \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Кошелёк

### GET /wallet/my

Мой кошелёк.

```bash
curl http://localhost:8000/wallet/my \
  -H "Authorization: Bearer <TOKEN>"
```

**Ответ:**
```json
{
  "wallet_address": "0x1f48910bD2AA4ef58a409c2722080e2fb667834C",
  "wallet_type": "embedded"
}
```

---

### POST /wallet/connect-external

Подключить MetaMask кошелёк (опционально).

```bash
curl -X POST http://localhost:8000/wallet/connect-external \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x...",
    "signature": "0x...",
    "message": "Connect to Almaty Events"
  }'
```

Для получения подписи выполни в консоли браузера (MetaMask должен быть подключён):

```javascript
const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
const address = accounts[0];
const message = "Connect to Almaty Events";
const signature = await ethereum.request({
  method: 'personal_sign',
  params: [message, address]
});
console.log("address:", address);
console.log("signature:", signature);
```

---

## Блокчейн

**Сеть:** Ethereum Sepolia Testnet (Chain ID: 11155111)

**Контракт:** `AlmatyEventsNFT` (ERC-721)

**Функция минтинга:** `mintAttendance(address to, uint256 eventId, string tokenURI)`

**Проверить транзакцию:** `https://sepolia.etherscan.io/tx/<tx_hash>`

**NFT изображения:** хранятся в Supabase Storage, доступны по публичному URL.

**Wallet flow:**
1. При регистрации → создаётся embedded ETH кошелёк автоматически
2. NFT минтится на embedded кошелёк, gas платит relayer
3. Опционально — подключить MetaMask и перенести токены

---

## Swagger UI

Интерактивная документация доступна по адресу:

```
http://localhost:8000/docs  — back сервис
http://localhost:8001/docs  — auth сервис
```

---

## Типичный флоу

```
1. POST /auth/register       → получить токен
2. GET /concerts/            → посмотреть события
3. POST /checkins/           → чек-ин на событие
4. GET /checkins/{id}/nft-status  → ждать minted (polling каждые 3 сек)
5. GET /nfts/my              → посмотреть коллекцию NFT
6. GET /users/me             → проверить баллы и уровень
```
