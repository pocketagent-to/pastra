# Pastra — техническая архитектура

Nov 10, 2026 · @Mykhailo

## 1. Решение

Pastra — один TypeScript-репозиторий с двумя процессами: веб-приложение на Next.js (интерфейс и API) и фоновый воркер, над одной базой PostgreSQL, которая хранит и данные, и очередь задач. Это модульный монолит: микросервисы на этом масштабе не нужны.

Документ реализует [продуктовую спецификацию](https://claude.ai/artifact/V2Nsm6zBBBp2edzEXr8YXe) и [макеты](https://claude.ai/artifact/BJmDYAsutxRDjdTBZ1vKL6). При конфликте логика берётся из спецификации, вёрстка — из макетов, технические решения — отсюда.

**Принципы.**

- **Каталог как данные.** Сервисы, метрики, пороги, штампы, титулы и правила офферов описаны в типизированных конфигах и таблицах. Новый сервис = один файл адаптера и запись в каталоге.
- **Один контракт на все интеграции.** Каждый сервис реализует один интерфейс и возвращает только итоговые метрики. Сырые ответы API не сохраняются.
- **Расчёт — чистая функция.** Модуль расчёта не ходит в базу и сеть: метрики на входе, pass на выходе. Покрыт тестами по примерам из спецификации.
- **Дроп — переключение указателя.** Неделя готовится заранее в черновике и становится видимой одной транзакцией.
- **Карта за интерфейсом.** Всё общение с Wirex идёт через один модуль с фиксированным контрактом и тестовой заглушкой. Разработка не ждёт документации Wirex.
- **Секреты и чувствительные данные не покидают сервер.** Токены сервисов зашифрованы в базе, в браузер не попадают. Реквизиты карты не проходят через наши серверы вовсе.

Версии библиотек не зафиксированы в документе: берутся последние стабильные на момент начала работы и фиксируются в lock-файле.

## 2. Схема системы

&#91;embedded content: схема системы · 2 процесса, 1 база, 4 группы внешних систем\]

Браузер общается только с `web`. Все долгие и плановые обращения наружу делает `worker`; `web` ходит наружу в двух случаях, которых на рисунке нет: обмен кода на токен при возврате из сервиса и запросы карты к Wirex по действию пользователя. Вебхуки Wirex и Telegram принимает `web` и перекладывает в очередь.

## 3. Стек

| Слой | Выбор | Почему |
| --- | --- | --- |
| Язык | TypeScript, strict | Один язык на фронте, API и воркере; общие типы каталога и метрик |
| Веб и API | Next.js, App Router, React Server Components | Серверный рендер публичного pass для превью ссылок; API-маршруты в том же приложении |
| Стили | Tailwind CSS с токенами из макетов | Макеты свёрстаны инлайн-стилями; они переносятся в классы почти механически |
| База | PostgreSQL | Реляционные данные, транзакции для дропа, JSONB для правил |
| Доступ к базе | Drizzle ORM и SQL-миграции | Схема в TypeScript, миграции видны в репозитории |
| Очередь задач | pg-boss (очередь поверх PostgreSQL) | Не нужен Redis; повторы, отложенные задачи, расписание, лимит параллельности на очередь |
| Воркер | Node.js-процесс из того же репозитория | Долгие синхронизации не должны жить в веб-запросах |
| Вход | Свои сессии в базе; OAuth через библиотеку arctic; подписи кошельков через viem, tweetnacl, TON Connect | Четыре разнородных способа входа и привязка нескольких к одному аккаунту; готовые комбайны здесь мешают |
| Валидация | Zod | Одна схема на вход API, конфиг каталога и ответы внешних сервисов |
| Картинки для шеринга | Satori + resvg (через next/og) | Рендер JSX в PNG на сервере, шрифты Unbounded и Inter подключаются файлами |
| Telegram | grammY, вебхук в веб-приложении | Уведомления и привязка чата |
| Email | Resend или Postmark | Ссылки для входа и уведомления; за интерфейсом `Mailer` |
| Данные блокчейнов | Индексаторы: Alchemy для EVM, Helius для Solana, TonAPI для TON | Возраст, число транзакций и NFT нельзя дёшево получить с обычной ноды. Тарифы и лимиты не проверены (раздел 18) |
| Аналитика | PostHog | Воронки и удержание из коробки; события шлёт сервер |
| Ошибки | Sentry | Веб, API и воркер |
| Хостинг | Контейнеры (Fly.io, Railway или Render): сервис `web` и сервис `worker` + управляемый PostgreSQL, регион ЕС | Воркеру нужен долгоживущий процесс; один образ, две команды запуска |
| Сборка и тесты | pnpm, Vitest, Playwright, GitHub Actions | — |

**Что не берём и почему.**

- **Redis, Kafka, отдельные сервисы.** Нагрузка первого года — пакетная синхронизация раз в неделю; PostgreSQL справляется.
- **Нативные приложения.** Не в первом релизе. API проектируется так, чтобы им мог пользоваться мобильный клиент.
- **Свой блокчейн-индексатор.** Дорого и не нужно для трёх неглубоких метрик.

## 4. Структура репозитория

Один pnpm-воркспейс: два приложения и пакеты с чёткими границами. Пакет не импортирует приложение; `scoring` не импортирует ничего, кроме `catalog`.

```
pastra/
  apps/
    web/                 Next.js: страницы, API-маршруты, вебхуки, OG-картинки
      app/               маршруты (раздел 13)
      components/        компоненты интерфейса
      lib/               сессия, клиент API, форматирование чисел
    worker/              точка входа воркера, регистрация обработчиков задач
  packages/
    catalog/             каталог сервисов, метрик, порогов, штампов, титулов (данные + типы)
    scoring/             чистый расчёт: метрики -> оси, уровень, титул, штампы
    providers/           адаптеры сервисов, по файлу на сервис
    db/                  схема Drizzle, миграции, запросы
    core/                бизнес-операции: connect, disconnect, recompute, drop, offers
    card/                интерфейс CardProvider, реализации wirex и mock
    notify/              Telegram, email, шаблоны текстов
    crypto/              шифрование токенов, подписи, хэши
    config/              чтение и проверка переменных окружения
  design/                файлы макетов *.dc.html как эталон вёрстки
  docs/                  продуктовая спецификация, эта архитектура, ADR
  CLAUDE.md              правила работы в репозитории для Claude Code
```

**Границы.**

- `apps/web` и `apps/worker` вызывают только `core`, `db` (чтение), `notify`, `config`. Все изменения данных идут через операции `core`.
- `core` — единственное место, где встречаются `providers`, `scoring`, `db`, `card`.
- `providers` не знают о базе: получают токен, возвращают метрики.
- Файл `CLAUDE.md` содержит команды запуска, эти границы, правило «макет — эталон вёрстки» и список того, что нельзя логировать (раздел 14).

## 5. Модель данных

В базе 25 таблиц в пяти группах. Все идентификаторы — UUID v7, все моменты времени — `timestamptz` в UTC, у каждой таблицы есть `created_at`. Каталог сервисов и метрик живёт в коде (`packages/catalog`), не в базе: он меняется вместе с адаптерами.

### Пользователи и вход

| Таблица | Ключевые поля | Заметки |
| --- | --- | --- |
| `users` | `id`, `handle` (unique, citext), `country`, `status` (active, deleting), `invited_by`, `offers_consent`, `card_spend_consent`, `notify_telegram`, `notify_email`, `deleted_at` | `handle` по правилам спецификации; список запрещённых имён (маршруты: pass, offers, card, i, og, api и другие) |
| `identities` | `user_id`, `kind` (google, telegram, wallet\_evm, wallet\_solana, wallet\_ton, email), `subject`, `verified_at` | Unique (`kind`, `subject`). Способы входа; несколько на пользователя |
| `sessions` | `id`, `user_id`, `token_hash`, `expires_at`, `last_seen_at`, `user_agent` | В cookie лежит случайный токен, в базе — его SHA-256 |
| `login_challenges` | `kind` (email\_link, wallet\_nonce, oauth\_state), `value_hash`, `payload` jsonb, `expires_at`, `used_at` | Одноразовые; живут 15 минут |
| `consents` | `user_id`, `kind`, `subject` (например provider id), `action` (granted, withdrawn), `text_version`, `created_at` | Только добавление; журнал не правится |

### Подключения и метрики

| Таблица | Ключевые поля | Заметки |
| --- | --- | --- |
| `connections` | `id`, `user_id`, `provider`, `external_id`, `status` (connected, needs\_reconnect, error), `access_token_enc`, `refresh_token_enc`, `token_expires_at`, `scopes`, `last_synced_at`, `last_synced_week`, `stale_weeks`, `error_code` | Unique (`provider`, `external_id`) — правило «один аккаунт сервиса — один pass». Для кошельков `external_id` = адрес, токенов нет; до 5 строк на тип |
| `metric_values` | `connection_id`, `metric_key`, `value` numeric, `week`, `fetched_at` | Первичный ключ (`connection_id`, `metric_key`, `week`). Это и есть еженедельные снимки |
| `metric_extras` | `connection_id`, `key`, `value` jsonb, `week` | Нечисловое для показа: название топ-игры, топ-5 игр, год первой транзакции, хэши серверов Discord |
| `sync_runs` | `connection_id`, `week`, `status` (ok, failed, skipped), `attempt`, `error_code`, `duration_ms` | Журнал синхронизаций для мониторинга |

### Pass и недели

| Таблица | Ключевые поля | Заметки |
| --- | --- | --- |
| `weeks` | `week` (например 2026-W46), `drop_at`, `status` (preparing, live, closed) | Ровно одна строка в статусе live |
| `pass_snapshots` | `user_id`, `week`, `state` (draft, live), `axes` jsonb (шесть осей с частями и оценками сервисов), `points`, `level`, `title`, `top_pct` jsonb, `key_numbers` jsonb, `computed_at` | Первичный ключ (`user_id`, `week`, `state`). Текущий pass — строка live текущей недели |
| `stamps` | `user_id`, `stamp_key`, `tier`, `awarded_week`, `revoked_at`, `source_connection_id` | Штампы сервисов отзываются при отключении |
| `recaps` | `user_id`, `week`, `payload` jsonb, `seen_at` | Собирается на дропе из двух соседних снимков |
| `visibility` | `user_id`, `axis`, `public` bool | Шесть строк на пользователя; Sports по умолчанию false |
| `friendships` | `user_a`, `user_b` (a < b), `source` (invite, compare), `rewarded` bool | Одна строка на пару |
| `invites` | `inviter_id`, `invitee_id`, `joined_at`, `first_connect_at`, `last_reminded_at` | Источник наград и строки «Invited, hasn't joined yet» |

### Офферы

| Таблица | Ключевые поля | Заметки |
| --- | --- | --- |
| `merchants` | `id`, `name`, `logo_url`, `site_url`, `source` (direct, wirex) | — |
| `offers` | `id`, `merchant_id`, `type` (cashback, promo), `axis`, `headline`, `terms`, `rule` jsonb, `priority`, `countries`, `starts_week`, `ends_week`, `code_mode` (shared, pool), `shared_code`, `rate`, `active` | `rule` — список условий из раздела 10 |
| `offer_codes` | `offer_id`, `code_enc`, `assigned_user_id`, `assigned_week` | Пул личных кодов |
| `user_offers` | `user_id`, `offer_id`, `week`, `state` (available, locked, activated, used, expired), `reason` jsonb, `activated_at`, `used_at` | Unique (`user_id`, `offer_id`, `week`). `reason` — данные для строки «Because you played…» |

### Карта и служебное

| Таблица | Ключевые поля | Заметки |
| --- | --- | --- |
| `card_accounts` | `user_id` (unique), `provider_customer_id`, `kyc_status`, `kyc_reason`, `card_status` (none, active, frozen, closed), `last4`, `currency`, `country`, `notify_country` | Никаких реквизитов карты и документов |
| `card_events` | `provider_event_id` (unique), `user_id`, `type`, `payload` jsonb, `processed_at` | Входящие вебхуки; уникальность даёт идемпотентность. Из платежей храним категорию мерчанта и признак оффера, сумму не храним |
| `notifications` | `user_id`, `kind`, `channel`, `payload` jsonb, `status`, `sent_at`, `dedupe_key` (unique) | Защита от повторной отправки |
| `data_exports` | `user_id`, `status`, `file_key`, `expires_at` | Выгрузка данных |
| `audit_log` | `actor`, `action`, `subject`, `meta` jsonb | Действия админов и чувствительные операции |

**Правила целостности.**

- Удаление строки `connections` каскадно удаляет `metric_values`, `metric_extras`, `sync_runs`. Так выполняется обещание «данные сервиса удаляются сразу».
- `pass_snapshots` прошлых недель при отключении сервиса пересчитываются без его вклада: в снимках не должно оставаться производных удалённых данных.
- Храним снимки метрик за последние 26 недель, старше — удаляем задачей по расписанию.
- Индексы: `connections(user_id)`, `metric_values(connection_id, week)`, `pass_snapshots(week, state)`, `user_offers(user_id, week)`, `sessions(token_hash)`.

**Изменения модели от 10 ноября.** Они заменяют соответствующие поля в таблицах выше.

| Таблица | Изменение |
| --- | --- |
| `users` | Добавлены `display_name`, `bio` (до 80 символов), `avatar_key`, `friend_code` (unique, 6 символов из алфавита без 0, O, 1, I, L), `handle_changed_at`, `peak_points`, флаги `show_level`, `show_stamps`, `show_numbers`, `show_bio`. `handle` может быть пустым до шага выбора имени |
| `identities` | `kind` только `google` и `email` |
| `visibility` | Вместо `public` bool — `level`: `everyone`, `friends`, `me`. Sports по умолчанию `me` |
| `friendships` | `source`: `invite` или `code`. Награда только для `invite` |
| `pass_snapshots` | `level` считается от `users.peak_points`; в снимке хранятся и текущие `points`, и `level` |
| `card_accounts` | Добавлены `deposit_address_usdc`, `deposit_address_eurc`, `last_activity_at` (для правила неактивных карт) |

Аватары хранятся в объектном хранилище (S3-совместимом): загрузка до 5 МБ, JPEG, PNG или WebP, пересжатие до 512×512, метаданные удаляются. Без фото показывается круг с первой буквой.

## 6. Вход и сессии

Вход без паролей двумя способами; все сводятся к одной операции «найти или создать пользователя по identity и выдать сессию».

| Способ | Как проверяется | `identities.subject` |
| --- | --- | --- |
| Google | OAuth 2.0 + PKCE, проверка `id_token` | `sub` из токена |
| Email | Одноразовая ссылка, 15 минут, одно использование | Email в нижнем регистре |

После первого входа пользователь без имени всегда попадает на шаг выбора имени `/start/name`; остальные маршруты до этого закрыты. `GET /api/handles/check?name=` отвечает «свободно» или «занято» и даёт три свободных варианта; ограничение 30 запросов в минуту.

**Сессия.**

- Cookie `pastra_session`: HttpOnly, Secure, SameSite=Lax, 30 дней, продлевается при активности раз в сутки.
- В cookie — 256-битный случайный токен; в базе — его хэш. Утечка базы не даёт войти.
- «Log out» удаляет строку сессии. Удаление аккаунта удаляет все сессии.
- Изменяющие запросы принимаются только с совпадающим заголовком `Origin`.

**Привязка второго способа входа.** Вошедший пользователь проходит ту же проверку; identity добавляется к его аккаунту. Если она уже принадлежит другому аккаунту — ошибка, слияния аккаунтов нет.

**Связь входа и подключений.** Telegram и кошельки — только подключаемые сервисы; входить через них нельзя. Проверка подписей кошельков (SIWE, ed25519, ton\_proof) и Telegram Login остаётся в адаптерах этих сервисов. Вход через Google не даёт доступа к YouTube: для него отдельный запрос прав.

**Ограничения частоты.** Ссылка на email — 3 в час на адрес и 10 в час на IP; попытки входа — 20 в час на IP. Счётчики — в PostgreSQL.

## 7. Интеграции

Каждый сервис — один файл в `packages/providers`, реализующий общий интерфейс, и одна запись в `packages/catalog`. Ядро не знает особенностей сервисов.

### Контракт адаптера

```ts
type AuthKind = 'oauth2' | 'openid' | 'wallet_signature' | 'telegram_login' | 'musickit' | 'internal';

interface ProviderAdapter {
  id: ProviderId;                       // 'steam', 'twitch', 'wallet_evm', ...
  auth: AuthKind;

  // Начало подключения: куда отправить пользователя или что подписать
  begin(ctx: BeginContext): Promise<{ redirectUrl: string } | { messageToSign: string }>;

  // Завершение: обмен кода или проверка подписи
  complete(ctx: CompleteContext): Promise<{
    externalId: string;                 // id аккаунта в сервисе или адрес кошелька
    tokens?: { access: string; refresh?: string; expiresAt?: Date; scopes: string[] };
  }>;

  // Обновление токена, если сервис его выдаёт
  refresh?(tokens: Tokens): Promise<Tokens>;

  // Чтение метрик. Возвращает только итоговые числа
  fetch(ctx: FetchContext): Promise<{
    metrics: Record<MetricKey, number | null>;   // null = сервис не отдал поле
    extras?: Record<string, unknown>;            // топ-игра, год первой транзакции и т. п.
  }>;

  // Отзыв доступа на стороне сервиса, если API это умеет
  revoke?(tokens: Tokens): Promise<void>;
}
```

Ошибки адаптера — только из закрытого списка: `auth_expired` (нужен повторный вход), `rate_limited` (с временем повтора), `private_data` (Steam с закрытыми игровыми данными), `provider_down`, `unexpected_response`. Ядро решает, что делать, по коду ошибки.

### Запись каталога

```ts
interface ProviderSpec {
  id: ProviderId;
  name: string;                         // 'Steam'
  axis: Axis;                           // 'gaming'
  status: 'live' | 'coming_soon';
  health: boolean;                      // true = нужен экран Health consent
  syncEveryNthDrop: number;             // 1; для X — 4
  rateLimit: { perMinute: number; concurrency: number };
  consent: { weRead: string[]; weNever: string[] };   // тексты экрана согласия
  metrics: MetricSpec[];
  keyNumber?: { metric: MetricKey; template: string };   // '{value} hours in {topGame}'
  scoreCap?: number;                    // для X — 80
  axisBonus?: number;                   // Telegram — 5
}

interface MetricSpec {
  key: MetricKey;                       // 'steam.hours_total'
  part: 'volume' | 'activity' | 'depth';
  scale: 'log' | 'linear';
  t0: number;
  t100: number;
  source: 'api' | 'delta_30d';          // delta_30d = разница с нашим снимком 4 недели назад
  deltaOf?: MetricKey;                  // от какой накопительной метрики считать разницу
  label: string;                        // 'Hours played'
}
```

Пороги `t0` и `t100` переносятся из [таблицы метрик](https://claude.ai/artifact/RAd4VLA9PASHLdSdq38N9A) один раз при создании каталога; дальше источник истины — каталог в коде. Тест проверяет, что у каждого сервиса есть адаптер и что адаптер возвращает ровно метрики из каталога.

### Поток подключения

1. Пользователь нажимает кнопку на экране согласия. `POST /api/connections/{provider}/begin` записывает согласие, создаёт `login_challenges` с `state` и PKCE-секретом и возвращает адрес или текст для подписи.
2. Сервис возвращает пользователя на `GET /api/connections/{provider}/callback`. Сервер проверяет `state`, вызывает `complete`, шифрует токены, создаёт `connections`.
3. Если (`provider`, `external_id`) занят другим пользователем — ошибка `already_linked`, подключение не создаётся.
4. Ставится задача `sync.connection` с высоким приоритетом. Пользователь попадает на Building (первое подключение) или на экран сервиса.
5. Экран опрашивает `GET /api/connections/{id}/progress` раз в секунду: список уже найденных метрик и признак завершения. Веб-сокеты не нужны.
6. После синхронизации воркер вызывает `recompute(user)`: live-снимок текущей недели обновляется сразу.

Адреса возврата регистрируются у каждого сервиса заранее, отдельно для каждого окружения.

### Токены

- Шифрование AES-256-GCM, отдельный случайный nonce на значение, ключ из секрета окружения. В шифротексте хранится номер версии ключа: смена ключа без простоя.
- Расшифровка — только в воркере и в обработчике возврата. В логи, ответы API и ошибки Sentry токены не попадают.
- Токен обновляется перед синхронизацией, если до истечения меньше 10 минут. Неудачное обновление = `auth_expired`.
- Отключение: `revoke` у сервиса (если есть), затем удаление строки с каскадом, затем `recompute`.

### Особенности отдельных сервисов

| Сервис | Что учесть |
| --- | --- |
| Steam | OpenID даёт только SteamID, токена пользователя нет. Данные читаются ключом Web API приложения. Пустой список игр при публичном профиле = `private_data` → экран «Steam — private profile». Ачивки считаем по 20 играм с наибольшим временем, чтобы уложиться в лимит |
| X | Один платный запрос профиля на синхронизацию; ленту не читаем. Счётчик расходов в мониторинге, дневной потолок в конфиге |
| Кошельки | Токенов нет. Возраст = дата первой транзакции. Запросы к индексаторам не включают балансы; из ответов берутся только счётчики и даты. Список EVM-сетей — в конфиге (старт: Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, Avalanche, zkSync) |
| Discord | Список серверов превращается в число и набор хэшей (HMAC с серверным ключом) для «In common» |
| Apple Music | Токен пользователя выдаёт MusicKit JS в браузере; клиент передаёт его на сервер один раз. Срок жизни токена ограничен — частый `auth_expired` ожидаем |
| YouTube | Статус `coming_soon` до проверки приложения Google. Подключение без успешной синхронизации 30 дней — данные удаляются |
| Polar, Withings | Адаптер запрашивает только сводки тренировок и шаги; права на пульс и вес не запрашиваются |
| Telegram | Подключение = подтверждённый Telegram id и открытый чат с ботом для уведомлений. Метрик нет, только бонус |
| Card spend | `internal`: метрики считаются из `card_events`, внешнего входа нет |

Поля и права каждого API нужно сверить с актуальной документацией при написании адаптера: в спецификации проверена доступность сервисов, но не каждое поле.

## 8. Расчёт осей и уровня

Пакет `scoring` — одна чистая функция `computePass`, которая реализует раздел 6 спецификации без обращений к базе, сети и часам.

```ts
interface ScoringInput {
  week: string;
  connections: Array<{
    provider: ProviderId;
    status: 'connected' | 'needs_reconnect' | 'error';
    staleWeeks: number;                         // сколько дропов подряд без обновления
    metrics: Record<MetricKey, number | null>;  // уже с посчитанными delta_30d
    extras: Record<string, unknown>;
  }>;
  rewardedFriends: number;
  hasEns: boolean;
  existingStamps: StampRecord[];
  previous?: PassResult;                        // прошлая неделя, для штампа '4 weeks running'
  percentiles?: Record<Axis, number[]>;         // пусто, пока на оси меньше 1000 пользователей
}

interface PassResult {
  axes: Record<Axis, {
    score: number;                              // 0..100, целое
    parts: { volume: number | null; activity: number | null; depth: number | null };
    sources: Array<{ provider: ProviderId; score: number; contribution: number }>;
    topPct: number | null;
  }>;
  points: number;
  level: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  title: string;
  keyNumbers: Array<{ provider: ProviderId; axis: Axis; value: string; label: string }>;
  stamps: { awarded: StampRecord[]; revoked: StampRecord[] };
}

function computePass(input: ScoringInput, catalog: Catalog): PassResult;
```

**Порядок вычислений.** Метрика → часть → сервис (веса 0,40 / 0,35 / 0,25 с перенормировкой, потолок `scoreCap`, затухание Activity × 0,8^staleWeeks) → ось (лучший + 10% остальных + бонусы, потолок 100) → очки → уровень → титул → доли → ключевые числа → штампы.

**Правила реализации.**

- Все промежуточные значения — числа с плавающей точкой; округление только на выходе: оценки метрик и сервисов до одного знака, оси до целого (обычное округление).
- Очки считаются от округлённых осей, чтобы числа на экране сходились: пользователь может сложить шесть осей и получить свой уровень.
- Правила штампов — данные каталога: `{ key, axis, tiers, condition }`, где `condition` — небольшое выражение над метриками, осями и уровнем. Интерпретатор условий общий с правилами офферов (раздел 10).
- Функция `whatIfDisconnect(input, provider)` вызывает `computePass` без сервиса и возвращает разницу — для экрана «Disconnect a service».

**Обязательные тесты (из спецификации).**

| Вход | Ожидаемый результат |
| --- | --- |
| Сервисы Gaming с оценками 88, 40, 20; с оценками 90, 40 | Ось 94 в обоих случаях |
| Оси 34, 94, 88, 52, 61, 27 и 7 сервисов | 391 очко, уровень 27, редкость rare |
| То же без Steam (остаётся Twitch 40), Gaming становится 40 | 332 очка сейчас; peak остаётся 391, уровень 27 |
| Одна ось 94, один сервис | 99 очков, уровень 7, титул «Gamer», «Top 6%» |
| Gaming 94, Crypto 88 | Титул «Gamer & crypto veteran» |
| Сильнейшая ось 15 | Титул «Newcomer» |
| TON без Depth: Volume 50, Activity 80 | Оценка сервиса 64,0 |
| Метрика ниже `t0` и выше `t100` | 0 и 100 |
| Обратная шкала: ранг osu! 1 000 и 1 000 000 | 100 и 0 |
| Activity 60, staleWeeks 2 | Activity 38,4 |
| X с оценкой 95 | В ось идёт 80 |
| Social 98 + Telegram | Ось 100, не 103 |

**Уровень только растёт.** `computePass` принимает `peakPoints` и возвращает `points` (текущие), новый `peakPoints = max(peakPoints, points)` и `level = 1 + floor(peakPoints / 15)`. Оси, доли и титул считаются от текущих данных. Штампа «4 weeks running» нет; поле `previous` нужно только для recap. `whatIfDisconnect` показывает падение оси и «level stays».

## 9. Еженедельный дроп

Дроп — цепочка задач в очереди: подготовка идёт 24 часа в черновике, публикация — одна короткая транзакция в момент `drop_at`. Расписание задаётся конфигом `DROP_CRON` и DROP\_TZ (понедельник 13:00, Europe/Warsaw; момент каждой недели считается с учётом перехода на летнее время).

| Шаг | Когда | Задача | Что делает |
| --- | --- | --- | --- |
| 1 | T − 24 ч | `drop.prepare` | Создаёт строку `weeks` в статусе preparing; ставит `sync.connection` на каждое подключение, которому пора обновляться (`syncEveryNthDrop`) |
| 2 | T − 24 ч … T − 1 ч | `sync.connection` | Обновляет токен, вызывает `fetch`, пишет `metric_values` новой недели, считает `delta_30d` от снимка 4 недели назад. Очередь на каждый сервис со своим лимитом скорости |
| 3 | T − 1 ч | `drop.compute` | Для каждого пользователя: `computePass` → `pass_snapshots` в состоянии draft. Пакетами по 500 |
| 4 | T − 30 мин | `drop.percentiles` | Считает процентили по осям из черновиков, дописывает `top_pct` |
| 5 | T − 20 мин | `drop.offers` | Подбирает офферы по черновикам, пишет `user_offers` новой недели, закрепляет личные коды |
| 6 | T | `drop.publish` | Одна транзакция: draft → live, прошлая неделя → closed, офферы прошлой недели → expired, штампы выданы и отозваны, `recaps` созданы |
| 7 | T + 1 мин | `drop.notify` | Ставит уведомления партиями; Telegram — не больше 25 сообщений в секунду |
| 8 | T + 5 мин | `drop.og` | Сбрасывает кэш картинок шеринга |
| 9 | T + 1 ч, T + 6 ч, T + 24 ч | `drop.retry` | Повторяет синхронизацию неудавшихся подключений; при успехе пересчитывает live-снимок пользователя |

**Правила.**

- **Идемпотентность.** Ключ задачи = (тип, неделя, объект). Повторный запуск любого шага даёт тот же результат.
- **Повторы синхронизации.** `rate_limited` и `provider_down` — до 5 попыток с растущей паузой. `auth_expired` — без повторов: статус `needs_reconnect` и уведомление.
- **Неуспевшие подключения.** На шаге 3 берутся последние известные метрики, `stale_weeks` увеличивается на 1. Дроп не ждёт.
- **Новое подключение во время подготовки.** Синхронизируется сразу в обе недели: текущую live и черновик.
- **Состояние «дроп в процессе».** Между T и завершением `drop.publish` API отдаёт `dropInProgress: true`; интерфейс показывает «Your new week is loading».
- **Время.** Все расчёты недели — в UTC. Клиент получает `nextDropAt` и `serverNow` и считает таймер от их разницы.

**Оценка нагрузки.** При 100 000 пользователей и трёх подключениях на каждого — 300 000 синхронизаций за 23 часа, около 3,6 в секунду в среднем. Узкое место — Steam: при лимите 100 000 вызовов в день и примерно 23 вызовах на пользователя (профиль, игры, недавние игры, ачивки 20 игр) в сутки помещается около 4 300 пользователей. Решение в разделе 18.

## 10. Офферы

Офферы подбираются на шаге `drop.offers` по правилам в формате JSON; интерпретатор правил — чистая функция над снимком pass и метриками.

```ts
type Condition =
  | { kind: 'axis_gte'; axis: Axis; value: number }
  | { kind: 'connected'; provider: ProviderId }
  | { kind: 'metric_gte'; metric: MetricKey; value: number }
  | { kind: 'level_gte'; value: number }
  | { kind: 'country_in'; countries: string[] }
  | { kind: 'has_card' };

interface OfferRule { all: Condition[] }        // условия соединены 'и'; пустой список = общий оффер
```

**Алгоритм выдачи для одного пользователя.**

1. Взять активные офферы недели, подходящие по стране.
2. Если `offers_consent` выключено — оставить только общие офферы.
3. Отбросить офферы, чьи условия не выполнены. Условия по метрикам сервисов с `health: true` запрещены: валидатор отклоняет такое правило при сохранении оффера.
4. Отсортировать по `priority`, взять до 8, не больше 3 на ось.
5. Cashback-оффер: есть активная карта → состояние `activated`; нет карты → `locked`. Promo-оффер → `available`.
6. Записать `reason`: первое выполненное условие по метрике и её значение. Из него шаблон строит строку «For 14 hours in CS2 this week».

**Изменение от 10 ноября, заменяет шаг 5.** Cashback-оффер у владельца карты выдаётся в состоянии `available` и переходит в `activated` только по нажатию «Activate»; без карты — `locked`. После выпуска карты locked-офферы недели становятся `available`, не `activated`. Кешбэк начисляется только по платежам, прошедшим после активации.

**Промокоды.** Общий код отдаётся из `offers.shared_code`. Личный — закрепляется из `offer_codes` в момент первого показа кода (`SELECT … FOR UPDATE SKIP LOCKED`), не на дропе: коды не тратятся на тех, кто не открыл оффер. Пул пуст — оффер отдаёт «This offer has run out».

**Кешбэк.** Событие платежа от Wirex сопоставляется с активированными офферами пользователя по мерчанту или категории; совпавший оффер переходит в `used`. Кто начисляет деньги — Pastra через API Wirex или портал кешбэка Wirex сам — зависит от их продукта (раздел 18). В обоих случаях наша база хранит только состояние оффера и сумму кешбэка для показа.

**Админка.** Раздел `/admin` в том же приложении, доступ по списку пользователей из конфига. Функции: мерчанты, офферы с конструктором условий, загрузка пула кодов из CSV, предпросмотр «скольким пользователям подойдёт», статистика показов, активаций и покупок. Макетов админки нет; делается простыми таблицами и формами.

## 11. Карта

Всё общение с Wirex скрыто за интерфейсом `CardProvider` в `packages/card`. У интерфейса две реализации: `mock` (полностью рабочая имитация для разработки и тестов) и `wirex`. Реализация `wirex` пишется после получения их документации API: контракт ниже составлен по экранам макета и публичному описанию их платформы и может потребовать правок.

```ts
// Финальный контракт (сверен с документацией Wirex 10 ноября). Реализации: mock и wirex.
type CardStatus = 'requested' | 'active' | 'blocked' | 'closed';
type KycStatus = 'none' | 'applied' | 'in_review' | 'approved' | 'rejected' | 'canceled';

interface CardProvider {
  supportedCountries(): Promise<string[]>;

  // Регистрирует пользователя у провайдера по адресу его кошелька (EOA)
  createUser(input: { userAddress: string; email: string; country: string }): Promise<{ customerId: string }>;

  // Ссылка на проверку личности на стороне провайдера (SumSub)
  startKyc(customerId: string): Promise<{ url: string }>;
  getKycStatus(customerId: string): Promise<{ status: KycStatus; reason?: string; canIssueVirtualCard: boolean }>;

  issueVirtualCard(customerId: string): Promise<{ cardId: string; status: CardStatus }>;
  getCard(customerId: string): Promise<{ cardId: string; status: CardStatus; last4?: string; expiry?: string; dailyLimit: number | null; dailyUsage: number; currency: string }>;
  getBalance(customerId: string): Promise<{ available: string; currency: 'USD' | 'EUR' }>;
  listTransactions(customerId: string, cursor?: string): Promise<{ items: CardTx[]; next?: string }>;

  setFrozen(customerId: string, frozen: boolean): Promise<void>;       // block / unblock
  setDailyLimit(customerId: string, amount: number | null): Promise<void>; // null = без лимита
  closeCard(customerId: string): Promise<void>;                          // необратимо

  // Токен действия на 5 минут для показа номера, срока и кода компонентом провайдера
  requestActionToken(customerId: string, method: 'sms' | 'signature', proof?: string): Promise<{ token: string; expiresAt: Date }>;

  // Личные адреса пополнения: один на все сети EVM, отдельные для Solana и Tron
  getDepositAddresses(customerId: string): Promise<{ evm: string; solana?: string; tron?: string }>;

  // Вывод исполняет кошелёк пользователя в браузере через SDK; сервер только читает незавершённые
  listPendingWithdrawals(customerId: string): Promise<PendingWithdrawal[]>;

  // 3-D Secure: запрос живёт 5 минут, решение нельзя изменить
  listPending3ds(customerId: string): Promise<ThreeDsRequest[]>;
  resolve3ds(customerId: string, transactionId: string, decision: 'approve' | 'decline'): Promise<void>;

  // Подписи у веб-хуков нет: проверяем IP отправителя по списку и отбрасываем повторы
  parseWebhook(path: string, rawBody: string, sourceIp: string): CardWebhookEvent;
}
```

**Потоки.**

- **Выпуск.** `POST /api/card/verify` с выбранной страной → проверка по `supportedCountries` → `startKyc` → клиент открывает проверку Wirex → вебхук `kyc.updated` → при approved воркер вызывает `issueVirtualCard`, ставит `card_status = active`, выдаёт штамп «Card holder», шлёт уведомление, переводит locked-офферы недели в activated.
- **Страна не поддерживается.** Сохраняем `notify_country`; задача раз в сутки сверяет список стран и шлёт «Cards are now open».
- **Баланс и история.** Читаются у Wirex при открытии экрана, кэш в памяти процесса на 30 секунд. В базу не сохраняются.
- **Реквизиты.** Клиент получает `revealToken` и передаёт его компоненту Wirex в iframe. Номер карты не попадает ни в наш JavaScript, ни на наш сервер; так мы остаёмся вне области PCI DSS. Если Wirex такого компонента не даёт — это блокирующий вопрос (раздел 18).
- **Пополнение из кошелька.** Сервер отдаёт котировку и адрес депозита; перевод подписывает сам пользователь в кошельке. У Pastra нет ключей и прав на списание.
- **Вебхуки.** `POST /api/webhooks/card`: проверка подписи, запись в `card_events` (уникальный `provider_event_id`), ответ 200, обработка задачей. События: статус KYC, платёж авторизован, платёж проведён, пополнение зачислено, кешбэк начислен, статус карты изменён.
- **Траты в pass.** При согласии `card_spend_consent` из события проведённого платежа берётся категория мерчанта; адаптер `card_spend` считает число операций и категорий. Без согласия категория не сохраняется.

**Редкость и вид карты** — только оформление в нашем интерфейсе по уровню pass; к Wirex отношения не имеет.

**Ограничения тарифа Wirex Starter (предложение от 10 ноября), меняют контракт выше.**

- **Только карточные продукты, без счетов.** Банковского пополнения нет. Пополнение — перевод USDC или EURC на личный адрес депозита пользователя; метод `getDepositAddresses(customerId)` возвращает адреса и сети. Из подключённого кошелька клиент формирует обычный перевод токена на этот адрес.
- **Виртуальная карта Visa, один дизайн.** Физической карты нет; редкость — только оформление в нашем интерфейсе.
- **Кешбэка в предложении нет.** `listCashbackOffers` убирается. Офферы заводит команда; для начисления нужен метод `creditCashback(customerId, amount, reference)` — есть ли у Wirex зачисление на баланс карты от партнёра, нужно уточнить. Начисления ведутся в новой таблице `cashback_ledger` (`user_id`, `user_offer_id`, `amount`, `currency`, `status`: pending, paid, failed; уникальный ключ по событию платежа).
- **Неактивная карта стоит $1 в месяц, KYC — $1.** Задача `card.inactive` раз в сутки находит карты без операций дольше порога `CARD_INACTIVE_DAYS` и применяет правило из конфига: напомнить, затем закрыть. Само правило — продуктовое решение (раздел 18).
- **Наценка партнёра** задаётся на стороне Wirex один раз; в нашем коде она только показывается в таблице комиссий из конфига.

### 11.1 Интеграция по документации Wirex BaaS

Документация Wirex меняет главное допущение этого раздела: карта не кастодиальная. У каждого пользователя свой смарт-кошелёк в сети Base, ключ от него держит пользователь, а карта списывает средства из этого кошелька в момент покупки. Этот подраздел заменяет контракт `CardProvider` выше везде, где они расходятся.

**Как устроена платформа.**

| Что | Как у Wirex | Источник |
| --- | --- | --- |
| Кошелёк пользователя | Смарт-кошелёк Account Abstraction (ZeroDev Kernel) в Base; управляется ключом пользователя (EOA). Газ оплачивает Wirex | [Platform Overview](https://docs.wirexapp.com/docs/introduction), [Wallet Deployment](https://docs.wirexapp.com/docs/retail-onchain-registration) |
| Баланс | Единый баланс в токенах WUSD и WEUR, 1:1 к внесённым стейблкоинам. `GET /api/v1/wallet` | [Unified Balance](https://docs.wirexapp.com/docs/retail-unified-balance) |
| Пополнение | Личные адреса депозита: один на все EVM-сети, отдельные для Solana и Tron. Мост Rhino.fi переводит в Base за 1–15 минут. Минимум 1 USD, в Tron 2 USD | [Global Addresses](https://docs.wirexapp.com/docs/retail-global-addresses), [Global Address Support](https://docs.wirexapp.com/docs/global-address-support) |
| Токены и сети | USDC: Ethereum, Arbitrum, Base, BSC, Polygon, Optimism, Solana. USDT: те же плюс Kaia и Tron. EURC: только Base. TON нет. На тарифе Starter заявлены только USDC и EURC | Там же |
| Покупка | Wirex проверяет баланс кошелька и списывает сумму в момент авторизации; один токен должен покрывать всю сумму | [How it works](https://docs.wirexapp.com/docs/how-it-works), [Card Transactions](https://docs.wirexapp.com/docs/retail-card-transactions) |
| Вывод | Пользователь сам выводит на внешний адрес в Base, в два шага с задержкой 3 секунды; оба шага выполняет SDK Wirex в браузере | [Unified Balance](https://docs.wirexapp.com/docs/retail-unified-balance) |
| Страны | 72 страны; США в списке нет | [Supported Countries](https://docs.wirexapp.com/docs/supported-countries) |

**Путь пользователя к карте.**

1. **Ключ.** У пользователя появляется встроенный кошелёк (EOA). Wirex описывает три источника ключа: Privy, WalletConnect или wagmi, приватный ключ.
2. **Кошелёк.** В браузере SDK `@wirexapp/wpay-baas-sdk` разворачивает смарт-кошелёк и регистрирует его в контрактах Wirex одной операцией. Приходит вебхук `/v2/webhooks/wallets`.
3. **Регистрация.** Наш сервер: `POST /api/v2/user` с адресом EOA, email и страной. Страну нельзя добавить позже. Без шага 2 — ошибка `ErrorNotFound`.
4. **KYC.** `POST /api/v1/user/verification-link` возвращает ссылку на проверку SumSub; либо токен для встроенного виджета. Для карты нужен уровень SDD: документ, селфи и подтверждение адреса. Там же пользователь вводит телефон, он нужен для 3DS.
5. **Статус.** Вебхук `/v2/webhooks/user` с `verification.status`: None, Applied, InReview, Approved, Rejected, Canceled. После Approved сервер читает `GET /api/v2/user` и ждёт возможность `VisaVirtualCard` в статусе Active.
6. **Карта.** `POST /api/v3/cards/virtual`. Статусы: Requested → Active ↔ Blocked → Closed. Заморозка — `PUT /api/v1/cards/{id}/block` и `/unblock`; закрытие необратимо.
7. **Адреса депозита.** SDK: `initializeSmartDepositAddresses()` с ключом Rhino.fi от Wirex.
8. **Реквизиты.** Пакет `@wirexapp/card-reveal-web` рисует номер, срок и CVV в iframe Wirex. Нужен одноразовый токен действия на 5 минут: подпись кошельком пользователя или код из SMS.

**Что это меняет в архитектуре.**

- **Нужен встроенный кошелёк.** Вход у нас через Google и email, ключа у пользователя нет. Рекомендация: Privy — он даёт вход по email и Google и встроенный кошелёк, и у Wirex для него готовый поток регистрации ([Authentication](https://docs.wirexapp.com/docs/retail-authentication)). Тогда Privy заменяет нашу собственную реализацию входа из раздела 6; сессии и таблица `identities` остаются, `subject` = идентификатор Privy. Хранить ключи пользователей на нашем сервере не следует: это делает нас кастодианом чужих денег. Тарифы Privy не проверены.
- **Вопрос PCI DSS снят.** Реквизиты показывает iframe Wirex; наш сервер эти методы не проксирует.
- **Авторизация сервера.** `POST /api/v1/token` с `client_credentials`, токен на 48 часов, кэшируется. В запросах от имени пользователя — заголовки `X-User-Wallet` (адрес EOA) и `X-Chain-Id` (8453; в песочнице 84532). Для iframe нужен пользовательский токен: `POST /api/v1/user/authorize`.
- **Вебхуки без подписи.** Wirex не добавляет заголовков проверки ([Webhooks](https://docs.wirexapp.com/docs/retail-webhooks)). Проверки подписи нет, в контракте вместо неё parseWebhook; прежний `verifyWebhook` удалён. Защита: список IP-адресов Wirex, секретный путь в базовом адресе, и главное — вебхук считается только сигналом: состояние перечитывается из API Wirex перед любым действием. Ответ за 10 секунд, до 5 повторов, порядок не гарантирован; дедупликация по `operation_id` + `status`.
- **Платежи.** Приходят в `/v2/webhooks/activities` с `type: CardTransaction`: имя, категория и страна мерчанта, суммы, комиссия. Категория идёт в метрику Lifestyle и в сопоставление с офферами. Полный возврат меняет статус платежа на Failed — кешбэк по нему отменяется.
- **Баланс и история** читаются у Wirex; вебхук `/v2/webhooks/balances` сбрасывает кэш.
- **Песочница.** `https://api-baas.wirexapp.tech`, сеть Base Sepolia, общие тестовые учётные данные и Helper API для имитации платежей ([Environments](https://docs.wirexapp.com/docs/retail-environments)). Этап 8 можно начинать без ожидания договора.
- **Навыки для Claude Code.** Wirex публикует набор навыков и MCP-сервер ([Agent Skills](https://docs.wirexapp.com/docs/agent-skills)): `/plugin marketplace add wirexpay/wirex-baas-agent-skills`, затем `/plugin install wirex-baas@wirex-baas-agent-skills`. Подключить перед этапом 8.

**Чего в документации нет и нужно спросить у Wirex.**

- Как партнёру зачислить кешбэк пользователю. В описании баланса сказано, что WUSD выпускается «для кешбэка и промо-наград», но метода API для партнёра нет.
- Добавление карты в Apple Pay и Google Pay: в документации есть только пополнение через них.
- Можно ли на Starter принимать USDT и депозиты из Solana и Tron.
- Список IP-адресов для вебхуков.
- Срок проверки KYC; минимальная сумма и комиссия вывода.

Страницы 3DS, лимитов карты, вывода и токенов действий я не читал; их нужно прочесть при реализации этапа 8.

## 12. API

API — JSON поверх HTTPS под `/api`, авторизация по cookie сессии. Страницы читают данные на сервере напрямую через `core`; маршруты ниже нужны для действий пользователя, опроса и будущего мобильного клиента.

**Общие правила.**

- Вход и выход каждого маршрута описаны схемой Zod в одном файле с обработчиком.
- Ошибка: `{ "error": { "code": "already_linked", "message": "…" } }` и подходящий HTTP-статус. Коды ошибок — закрытый список в `core`.
- Изменяющие запросы принимают заголовок `Idempotency-Key` там, где повтор опасен (активация оффера, пополнение).
- Деньги — строки с десятичной точкой, никогда не float.

| Метод и путь | Назначение |
| --- | --- |
| `POST /api/auth/{google,telegram}/begin`, `GET …/callback` | Вход через Google и Telegram |
| `POST /api/auth/wallet/nonce`, `POST /api/auth/wallet/verify` | Вход подписью кошелька |
| `POST /api/auth/email/send`, `GET /api/auth/email/verify` | Ссылка на email |
| `POST /api/auth/logout` | Выход |
| `GET /api/me` | Профиль, настройки, способы входа, `nextDropAt`, `serverNow`, `dropInProgress` |
| `PATCH /api/me` | Имя, каналы уведомлений, согласие на офферы |
| `PUT /api/me/visibility` | Видимость осей |
| `POST /api/me/export`, `DELETE /api/me` | Выгрузка данных; удаление аккаунта (тело `{ "confirm": "DELETE" }`) |
| `GET /api/pass` | Текущий pass: оси, уровень, титул, ключевые числа, штампы, строка недели, устаревшие сервисы |
| `GET /api/pass/axes/{axis}` | Экран оси: части, источники, неподключённые сервисы |
| `GET /api/pass/stamps` | Полученные и ближайшие штампы |
| `GET /api/pass/recap`, `POST /api/pass/recap/seen` | Recap недели |
| `GET /api/public/{handle}` | Публичный pass с учётом видимости; без сессии |
| `GET /og/{handle}.png?format=x\|story\|square&v={version}` | Картинка для шеринга; кэш по `v` |
| `PUT /api/share/settings` | Что показывать на картинке |
| `GET /api/services` | Каталог с состоянием каждой плитки для пользователя |
| `POST /api/connections/{provider}/begin`, `GET …/callback`, `POST …/verify` | Подключение сервиса; `verify` — для подписей кошельков и токена MusicKit |
| `GET /api/connections/{id}`, `GET …/progress` | Экран сервиса; прогресс первой загрузки |
| `GET /api/connections/{id}/disconnect-preview`, `DELETE /api/connections/{id}` | «Что изменится»; отключение с удалением данных |
| `POST /api/services/{provider}/interest` | Кнопка «I want this» у сервисов Coming soon |
| `GET /api/offers`, `GET /api/offers/{id}` | Офферы недели |
| `POST /api/offers/{id}/activate`, `POST /api/offers/{id}/code` | Активация; показ промокода |
| `GET /api/friends`, `DELETE /api/friends/{handle}` | Список, лидеры, приглашённые; удаление друга |
| `GET /api/friends/{handle}/compare`, `POST /api/friends/{handle}` | Сравнение; добавление в друзья с чужого pass |
| `POST /api/invites/{id}/remind` | Напоминание приглашённому |
| `GET /api/card` | Состояние карты, баланс, последние операции, бусты |
| `GET /api/card/countries`, `POST /api/card/verify`, `GET /api/card/verify/status` | Страны; старт KYC; статус |
| `POST /api/card/notify-country`, `DELETE /api/card/notify-country` | Подписка на открытие карты в стране |
| `POST /api/card/freeze`, `POST /api/card/settings` | Заморозка; онлайн-платежи и уведомления |
| `POST /api/card/reveal-token` | Токен показа реквизитов |
| `POST /api/card/topup/quote`, `POST /api/card/topup/instructions` | Пополнение |
| `GET /api/card/cashback` | Кешбэк за неделю и всё время, бусты |
| `POST /api/webhooks/card`, `POST /api/webhooks/telegram` | Входящие вебхуки; проверка подписи вместо сессии |
| `GET /api/health` | Проверка живости: база и очередь |

**Изменения API от 10 ноября.**

| Метод и путь | Изменение |
| --- | --- |
| `/api/auth/telegram/*`, `/api/auth/wallet/*` | Удалены: вход только через Google и email |
| `GET /api/handles/check`, `POST /api/me/handle` | Проверка и выбор имени; смена не чаще раза в 30 дней |
| `PUT /api/me/profile`, `POST /api/me/avatar` | Отображаемое имя, строка о себе, флаги показа; загрузка фото |
| `PUT /api/me/visibility` | Принимает по оси `everyone`, `friends` или `me` |
| `GET /api/me/sign-in`, `POST /api/me/sign-in/{kind}`, `DELETE …` | Способы входа; удаление последнего запрещено |
| `GET /api/friends/code`, `POST /api/friends/code/rotate` | Свой код друга; выпуск нового |
| `POST /api/friends/lookup`, `POST /api/friends/by-code` | Карточка человека по коду; добавление. 10 попыток в час на пользователя |
| `GET /api/friends/{handle}` | Профиль друга: оси с видимостью `everyone` и `friends` |
| `POST /api/friends/{handle}` | Удалён: с публичного pass в друзья больше не добавляют |
| `GET /api/card/deposit-addresses` | Адреса депозита USDC и EURC; заменяет `topup/instructions` |
| `GET /og/compare/{a}/{b}.png`, `GET /og/week/{handle}/{week}.png` | Картинки сравнения и недели |
| `/api/admin/offers`, `/api/admin/merchants`, `/api/admin/codes` | Админка; доступ по `ADMIN_USERS` |

В ответе `GET /api/pass` поле `public` у оси заменено на `visibility`, добавлено `peakPoints`.

**Пример ответа `GET /api/pass`.**

```json
{
  "handle": "nomad",
  "week": "2026-W46",
  "level": 27,
  "points": 391,
  "rarity": "rare",
  "title": "Gamer & crypto veteran",
  "axes": {
    "sports":    { "score": 34, "delta": 0,  "topPct": null, "public": false },
    "gaming":    { "score": 94, "delta": 3,  "topPct": 6,    "public": true },
    "crypto":    { "score": 88, "delta": 1,  "topPct": 12,   "public": true },
    "music":     { "score": 52, "delta": 0,  "topPct": 48,   "public": true },
    "social":    { "score": 61, "delta": -2, "topPct": 39,   "public": true },
    "lifestyle": { "score": 27, "delta": 4,  "topPct": null, "public": true }
  },
  "keyNumbers": [
    { "provider": "steam", "axis": "gaming", "value": "2,140", "label": "hours in CS2" }
  ],
  "stamps": [ { "key": "hours_2000", "label": "2,000+ hours", "axis": "gaming", "week": "2026-W46", "isNew": true } ],
  "stale": [ { "provider": "tidal", "dataWeek": "2026-W45" } ],
  "nextDropAt": "2026-11-16T12:00:00Z",
  "serverNow": "2026-11-13T21:51:00Z",
  "dropInProgress": false
}
```

## 13. Фронтенд

Интерфейс переносится из макетов один к одному: каждый файл `*.dc.html` — эталон одного экрана или состояния, свёрстанный инлайн-стилями в рамке шириной 390 px. Соответствие файлов и адресов — в разделе 12 спецификации.

**Как переносить макет.**

1. Файлы макетов лежат в `design/` репозитория без изменений. Разметка экрана — внутри тега `<x-dc>`; блок `<helmet>` и скрипт в конце файла относятся к инструменту макетов и не переносятся.
2. Повторяющиеся куски становятся компонентами (список ниже), инлайн-стили — классами Tailwind с токенами.
3. Примеры данных (nomad, 2,140, LVL 27) заменяются полями API. Текст в квадратных скобках — полями конфига или API карты.
4. Ссылки `href="X.dc.html"` заменяются маршрутами; карта переходов прототипа — эталон навигации.
5. Логотипы сервисов встроены в макеты как data-URI; в репозитории они сохраняются файлами `public/logos/{provider}.png`.
6. Макеты, где на одном листе несколько состояний (CardKycStatus, ErrorState, Toasts), — это каталог состояний: в продукте показывается одно.

**Дизайн-токены (из макетов).**

| Токен | Значение |
| --- | --- |
| Фон экрана | `radial-gradient(130% 55% at 50% 0%, #10217A 0%, #05081F 45%, #000000 75%)`; Reveal и Recap — `#2B1260`, `#0A0820` |
| Панель | `#16171B`; разделитель `#2A2C34`; сетка шестиугольника `#3A3D47` |
| Синяя панель таймера | `linear-gradient(135deg, #0B1238, #2B1260)`, рамка `#3A2C8F` |
| Акценты | Синий `#1F4BFF`, оранжевый `#FF6B2C`, светло-оранжевый `#FF8A57`, фиолетовый `#6A3DFF`, розовый `#FF4D8D` |
| Статус | Зелёная плашка `#1E9E57` со свечением `0 0 18px rgba(46,204,113,0.45)`; зелёный текст `#4ADE80` |
| Текст | `#FFFFFF`, вторичный `#C7CBD6`, третичный `#A3A8B3`, на оранжевом `#0A0A0A` |
| Градиент текста и шестиугольника | `#FF6B2C → #C04DFF → #7C9BFF` (текст), `#FF6B2C → #C04DFF → #3D6BFF` (заливка, прозрачность 0,6) |
| Градиент кнопки и карты | Кнопка `#FF6B2C → #FF4D8D`; карта `#1F4BFF → #6A3DFF → #FF4D8D`, 135° |
| Шрифты | Заголовки Unbounded 500/700/800, верхний регистр; текст Inter 400/500/600. Подключаются через `next/font`, файлы в репозитории |
| Скругления | Панель 24, карта 22, кнопка 16, плитка 16–18, чип 10–12 |
| Касания | Минимальная высота интерактивного элемента 44 px |

Точные значения берутся из файлов макетов; таблица — сводка для `tailwind.config`.

**Компоненты.**

| Компонент | Где используется | Заметки |
| --- | --- | --- |
| `AppHeader`, `BottomNav`, `BackHeader` | Все экраны | Активная вкладка — `#FF6B2C` |
| `Logo` | Шапка, карта, картинка шеринга | SVG варианта A из макета LogoA |
| `Hexagon` | Pass, Public, Reveal, Compare, Share, картинка | Свойства: шесть значений, необязательный второй набор (пунктир), скрытые оси. Геометрия ниже |
| `DropTimer` | Pass, Offers | Плитки цифр; считает от `nextDropAt − serverNow`; состояние «дроп в процессе» |
| `GradientText`, `PrimaryButton`, `OutlineButton`, `StatusChip`, `LevelBadge` | Везде | — |
| `ServiceTile`, `ServiceLogo` | Services, First service, ось, «Your numbers» | Четыре состояния плитки |
| `KeyNumber`, `StampBadge`, `AxisRow`, `PartBar` | Pass, ось, Stamps, Compare | — |
| `OfferCard`, `PromoCode` | Offers | Пять состояний оффера |
| `CardFace` | Экраны карты | Градиент, редкость, имя, уровень |
| `ConsentList`, `Toggle`, `Toast` | Согласия, Settings, везде | Тексты тостов — из макета Toasts |

**Геометрия шестиугольника.** `viewBox="-180 -150 360 300"`, радиус R = 105, три кольца сетки (35, 70, 105). Оси по часовой стрелке от верхней вершины: Sports, Gaming, Crypto, Music, Social, Lifestyle. Вершина оси `i` со значением `s`:

```latex
x_i = R \cdot \frac{s}{100} \cdot \sin(60^\circ \cdot i) \qquad y_i = -R \cdot \frac{s}{100} \cdot \cos(60^\circ \cdot i)
```

Проверка по макету: Gaming 94 → (85,5; −49,4). Минимальный видимый радиус ненулевой оси — 6, чтобы фигура не вырождалась в линию (как на Reveal).

**Данные и состояние.**

- Страницы — серверные компоненты, читают данные через `core`. Клиентские компоненты — только там, где есть взаимодействие: таймер, переключатели, копирование, подпись кошельком, опрос прогресса.
- Действия — запросы к `/api` и `router.refresh()`. Глобального хранилища состояния нет.
- Публичный pass кэшируется на 60 секунд и сбрасывается при смене видимости и на дропе.
- Кошельки: wagmi + viem для EVM, Wallet Adapter для Solana, TON Connect UI для TON. Библиотеки грузятся только на экранах подключения кошелька и пополнения.

**Вёрстка на широком экране.** Колонка 390–430 px по центру на том же градиентном фоне. Отдельного десктопного макета нет.

**Доступность.** Настоящие `<a>`, `<button>`, `<input>` с `<label>`, как в макетах; у шестиугольника `role="img"` и текстовая подпись со всеми шестью значениями; видимый фокус; анимации отключаются при `prefers-reduced-motion`.

## 14. Безопасность и приватность в коде

Правила приватности из раздела 14 спецификации закреплены в коде так, чтобы их нельзя было нарушить случайно: типами, ограничениями базы и тестами.

| Требование | Как обеспечивается |
| --- | --- |
| Сырые данные сервисов не хранятся | Адаптер возвращает только `metrics` и `extras`; в схеме нет колонок для сырых ответов. Ключи `extras` — закрытый список в каталоге |
| Балансы кошельков не читаются | Адаптеры кошельков не вызывают методы балансов; тест проверяет список вызываемых методов индексатора |
| Данные о здоровье — только итоги, не в офферах, не публично по умолчанию | Флаг `health` в каталоге; валидатор правил офферов отклоняет метрики таких сервисов; публичный сериализатор скрывает ось без строки `visibility.public = true` |
| Публичный pass не раскрывает лишнего | Отдельный тип `PublicPass` и функция `toPublicPass`; публичные маршруты и картинки принимают только его. Тест: в ответе нет адресов, email, внешних id, скрытых осей |
| Токены защищены | Шифрование в базе (раздел 7); тип `Secret<string>`, который не сериализуется в JSON и логи |
| Реквизиты карты вне нашей системы | Только iframe провайдера по одноразовому токену |
| Удаление по запросу | Каскады в схеме; задача `account.purge` стирает остатки и файлы выгрузок; тест проверяет, что после неё нет строк с `user_id` |
| Согласия доказуемы | Журнал `consents` только на добавление; `connect` без свежей записи согласия не выполняется |

**Веб-безопасность.**

- Заголовки: строгий Content-Security-Policy (свои скрипты, iframe только провайдера карты и виджета Telegram), HSTS, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- OAuth: `state` и PKCE на каждом потоке, точное совпадение адреса возврата.
- Подписи кошельков: в тексте домен, одноразовый код и срок; повторное использование кода отклоняется.
- Вебхуки: проверка подписи по сырому телу, окно времени 5 минут, идемпотентность по id события.
- Ограничение частоты на вход, подключение, показ промокодов, публичные страницы и картинки.
- Имена пользователей проверяются по списку запрещённых и зарезервированных; весь пользовательский текст экранируется, в картинках тоже.

**Что нельзя писать в логи, аналитику и Sentry.** Токены и коды, адреса кошельков целиком, email, значения метрик, промокоды, тела вебхуков карты. В логах — идентификаторы, коды ошибок, длительности.

**Защита от накрутки.** Уникальность (`provider`, `external_id`) не даёт привязать один аккаунт к двум pass. Награда за друга начисляется только после его первой успешной синхронизации с ненулевой осью, не больше 10 на пользователя. Личные промокоды — один на пользователя на оффер в неделю.

## 15. Окружения, конфиг, наблюдаемость

Три окружения с отдельными базами, ключами и адресами возврата OAuth.

| Окружение | Назначение | Интеграции | Карта |
| --- | --- | --- | --- |
| local | Разработка; PostgreSQL в Docker | Адаптеры-заглушки с фиксированными метриками; реальные — по флагу | `mock` |
| staging | Проверка перед выпуском | Реальные, тестовые приложения сервисов | Песочница Wirex |
| production | Пользователи | Реальные | Wirex |

**Конфиг.** Все переменные читаются в `packages/config` и проверяются схемой при старте: процесс не запускается с неполным конфигом.

| Группа | Переменные |
| --- | --- |
| Основное | `APP_URL`, `DATABASE_URL`, `SESSION_SECRET`, `TOKEN_ENC_KEYS` (список версий), `HMAC_KEY` |
| Дроп | `DROP_CRON`, `DROP_PREPARE_HOURS`, `OFFERS_PER_USER`, `OFFERS_PER_AXIS` |
| Сервисы | Пара `{PROVIDER}_CLIENT_ID` и `{PROVIDER}_CLIENT_SECRET` на каждый OAuth-сервис; `STEAM_WEB_API_KEY`; `APPLE_MUSIC_KEY`; `X_DAILY_SPEND_CAP` |
| Сети | `ALCHEMY_KEY`, `HELIUS_KEY`, `TONAPI_KEY`, `EVM_CHAINS` |
| Карта | `CARD_PROVIDER` (mock или wirex), `WIREX_API_URL`, `WIREX_API_KEY`, `WIREX_WEBHOOK_SECRET` |
| Уведомления | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `MAIL_API_KEY`, `MAIL_FROM` |
| Наблюдение | `SENTRY_DSN`, `POSTHOG_KEY` |
| Флаги | `PROVIDERS_LIVE` (список включённых сервисов), `ADMIN_USERS` |

Флаг `PROVIDERS_LIVE` позволяет перевести сервис из Coming soon в рабочий без выкладки кода — например, в день одобрения заявки WHOOP.

**Выпуск.** GitHub Actions: проверка типов, линтер, тесты, сборка образа, миграции, выкладка `web` и `worker`. Миграции только обратно совместимые: сначала добавить, потом переключить код, потом удалить. Выкладка запрещена за 2 часа до дропа и час после.

**Что мониторим и когда будим.**

| Сигнал | Порог тревоги |
| --- | --- |
| Доля успешных синхронизаций по сервису за дроп | Ниже 90% |
| `drop.publish` не завершился | Через 5 минут после `drop_at` |
| Глубина очереди `sync.connection` за час до дропа | Больше 5% от числа подключений |
| Доля подключений в `needs_reconnect` по сервису | Рост больше чем на 5 пунктов за неделю |
| Ошибки проверки подписи вебхуков карты | Любая |
| Необработанные `card_events` | Старше 5 минут |
| Расход на API X за сутки | 80% от `X_DAILY_SPEND_CAP` |
| Доля ответов 5xx, время ответа `/api/pass` | Выше 1%; p95 выше 800 мс |

**Резервные копии.** Ежедневные снимки базы и восстановление на момент времени за 7 дней. После восстановления из копии повторно прогоняется журнал удалений, чтобы удалённые пользователи не вернулись.

## 16. Тесты и критерии приёмки

Релиз принимается, когда проходят четыре слоя тестов и экраны совпадают с макетами.

| Слой | Что проверяет | Инструмент |
| --- | --- | --- |
| Модульные | `scoring` по таблице раздела 8; интерпретатор правил офферов; форматирование чисел; шифрование; проверка подписей | Vitest |
| Контрактные | Каждый адаптер на записанных ответах сервиса: метрики ровно по каталогу; ошибки превращаются в коды из закрытого списка | Vitest + фикстуры |
| Интеграционные | Операции `core` на настоящем PostgreSQL: connect, disconnect с каскадом, полный дроп, повторный запуск шагов дропа, выдача кодов под конкуренцией, удаление аккаунта | Vitest + тестовая база |
| Сквозные | Сценарии ниже в браузере на окружении с адаптерами-заглушками и картой `mock` | Playwright, вьюпорт 390×844 |

**Сквозные сценарии.**

1. Гость открывает чужой pass → регистрируется по email → подключает Steam → видит Building и Reveal → попадает на Pass; у пригласившего +5 очков.
2. Steam с закрытыми данными → экран «private profile» → «Try again» после открытия данных → Reveal.
3. Подключение кошелька подписью; повторное использование подписи отклоняется.
4. Сервис оси Sports: без галочки кнопка неактивна; после подключения ось видна владельцу и скрыта на публичном pass.
5. Отключение сервиса: предпросмотр показывает те же числа, что получаются после; в базе нет строк этого подключения.
6. Полный дроп: таймер доходит до нуля → «loading» → новый pass, recap показан один раз, старые офферы исчезли, новые появились.
7. Дроп с упавшим сервисом: плашка «Drop partly updated», после повтора плашка уходит.
8. Оффер с промокодом: показ, копирование, истечение на дропе; без согласия на офферы видны только общие.
9. Карта: неподдерживаемая страна → подписка; поддерживаемая → KYC → In review → Approved → активная карта; locked-оффер стал активным.
10. Карта: платёж по вебхуку появляется в Recent с кешбэком; повторный вебхук не дублирует; заморозка и разморозка.
11. Друзья: сравнение, лидеры, скрытая ось друга показана как «—».
12. Шеринг: картинка отдаётся, меняется после смены видимости, не содержит скрытых осей.
13. Удаление аккаунта: недоступно с открытой картой; после удаления публичный pass отдаёт 404.

**Соответствие макетам.** Для каждого из 63 экранов, 5 картинок шеринга и 2 экранов админки — скриншот Playwright на данных примера (nomad, неделя 46) рядом со скриншотом файла макета. Расхождения допускаются только из таблицы «Расхождения макета и спецификации». Набор данных примера лежит в репозитории как сид базы.

**Нефункциональные требования.**

| Показатель | Цель |
| --- | --- |
| Первая отрисовка публичного pass на 4G | До 2 секунд |
| `GET /api/pass`, p95 | До 300 мс |
| От возврата из сервиса до первой метрики на Building | До 15 секунд |
| Публикация дропа после `drop_at` | До 60 секунд |
| Генерация картинки шеринга | До 1 секунды, далее из кэша |

## 17. План сборки

Сборка идёт десятью этапами, с 0 по 9; каждый заканчивается работающим результатом и проходящими тестами. Этапы 0–6 не зависят от Wirex и от одобрения заявок на API.

| Этап | Что делаем | Готово, когда |
| --- | --- | --- |
| 0. Каркас | Репозиторий, воркспейс, база в Docker, миграции, конфиг, CI, `CLAUDE.md`, макеты в `design/` | `pnpm dev` поднимает web и worker; CI зелёный |
| 1. Каталог и расчёт | `catalog` со всеми сервисами и порогами из таблицы метрик; `scoring` целиком | Проходят все тесты раздела 8 |
| 2. Дизайн-система | Токены, шрифты, компоненты раздела 13, страница-витрина компонентов | Витрина совпадает с макетами Pass, Services, Offers |
| 3. Вход и экраны на сидах | Вход через Google и email, выбор имени, сессии; все 63 экрана на данных примера из базы, навигация как в прототипе | Скриншоты совпадают с макетами |
| 4. Подключения | Контракт адаптера, шифрование, поток подключения, Building; первые адаптеры: Steam, EVM-кошелёк, Twitch, Discord, Telegram | Сценарии 1–5 |
| 5. Дроп | Очередь, цепочка задач, снимки, recap, штампы, таймер, уведомления в Telegram и на email | Сценарии 6–7; дроп запускается командой в любой момент на staging |
| 6. Офферы, друзья, шеринг | Правила и выдача, промокоды, админка; приглашения, сравнение; публичный pass, картинки, видимость | Сценарии 8, 11, 12 |
| 7. Остальные адаптеры | Solana, TON, FACEIT, Battle.net, Lichess, osu!, X, Farcaster, GitHub, TIDAL, Apple Music, AniList, MyAnimeList, Polar, Withings, Foursquare; YouTube, WHOOP, Oura — по мере одобрения | Контрактный тест и ручная проверка на реальном аккаунте для каждого |
| 8. Карта | `CardProvider` и `mock`, все экраны карты, вебхуки, траты в pass; затем реализация `wirex` в песочнице | Сценарии 9–10 на `mock`, затем в песочнице Wirex |
| 9. Подготовка к запуску | Выгрузка и удаление данных, ограничения частоты, мониторинг и тревоги, нагрузочный прогон дропа на 100 000 пользователей-заглушек, финальные Terms и Privacy | Сценарий 13; нефункциональные цели раздела 16 |

**Что идёт параллельно с первого дня и не делается кодом.**

- Регистрация приложений у каждого сервиса и заявки на доступ: WHOOP, Oura, проверка Google для YouTube, Wahoo, Suunto, TikTok, Pinterest, Trakt.
- Аккаунт разработчика Apple для Apple Music.
- Документация и песочница Wirex.
- Юрист: условия API, Terms, Privacy.

**Как передавать работу Claude Code.** Один этап — одна задача. В репозитории лежат этот документ, спецификация, таблица метрик в CSV и файлы макетов; в задаче — номер этапа, ссылки на разделы и критерий «готово, когда». Этап не начинается, пока тесты предыдущего не проходят.

## 18. Технические допущения и открытые вопросы

В архитектуре шесть решений, принятых как допущения, и список открытых вопросов. Два вопроса, блокировавших этап карты, закрыты 10 ноября документацией Wirex (раздел 11.1): документация и песочница есть, реквизиты показывает iframe Wirex. Новый главный вопрос — выбор встроенного кошелька (рекомендация: Privy), он влияет на вход и нужен до этапа 3.

### Допущения

| № | Допущение | Что меняется, если неверно |
| --- | --- | --- |
| 1 | Первый релиз — веб, нативных приложений нет | Нужен клиент на React Native или оболочка; API остаётся прежним |
| 2 | Одна база PostgreSQL и очередь pg-boss выдерживают первый год | При росте очередь переносится на отдельный брокер; контракт задач не меняется |
| 3 | Индексаторы Alchemy, Helius, TonAPI дают нужные счётчики по приемлемой цене | Замена поставщика внутри адаптера кошелька |
| 4 | Wirex даёт вебхуки, песочницу и встраиваемый KYC | Меняется реализация `wirex`; при отсутствии вебхуков — опрос по расписанию |
| 5 | Каталог и пороги меняются выкладкой кода | Если пороги нужно крутить без выкладки — таблица переопределений в базе и экран в админке |
| 6 | Снимки метрик хранятся 26 недель | Влияет только на размер базы и на глубину будущих графиков |

### Открытые вопросы

- [ ] **Блокирует этап 8. Документация Wirex API.** Формат KYC (виджет, переход или API), события вебхуков, песочница, способ пополнения из кошелька, кто начисляет кешбэк и как задаются ставки по мерчантам.
- [ ] **Блокирует этап 8. Показ реквизитов карты.** Есть ли у Wirex защищённый компонент. Если номер карты отдаётся только через API, наша система попадает под PCI DSS — это другой бюджет и сроки.
- [ ] **Лимит Steam.** 100 000 вызовов в день хватает примерно на 4 300 полных синхронизаций в сутки. Варианты: растянуть окно подготовки для Steam на всю неделю (около 30 000 пользователей); считать ачивки по 5 играм вместо 20 и раз в 4 недели, тоже в недельном окне (около 160 000); запросить у Valve повышение лимита. Решить до этапа 5.
- [ ] **Стоимость X.** $0.01 за профиль раз в 4 недели: 50 000 подключений — около $500 за цикл. Подтвердить бюджет и дневной потолок.
- [ ] **Тарифы индексаторов блокчейнов.** Не проверены; проверить цену запросов «первая транзакция», «число транзакций», «число NFT» на 8 EVM-сетях.
- [ ] **Поля FACEIT и точные права каждого API.** Сверяются при написании адаптера; метрика, которую сервис не отдаёт, убирается из каталога, веса перенормируются.
- [ ] **Хостинг и регион.** Выбор площадки и региона хранения данных зависит от стран запуска и мнения юриста.

* [ ] **Кешбэк на Starter.** В предложении Wirex нет ни доли межбанковской комиссии, ни портала кешбэка. Нужны: источник денег и способ зачислить кешбэк на баланс карты через API.
* [ ] **Правило неактивных карт.** Каждая стоит $1 в месяц. Варианты: выпускать карту только после первого пополнения; закрывать после N дней без операций; списывать комиссию с баланса.
* [ ] **Сети депозита USDC и EURC** и минимальная сумма. От этого зависит, из каких подключённых кошельков можно пополнять в одно нажатие.

### Связанные материалы

- [Продуктовая спецификация](https://claude.ai/artifact/V2Nsm6zBBBp2edzEXr8YXe)
- [Макеты и кликабельный прототип](https://claude.ai/artifact/BJmDYAsutxRDjdTBZ1vKL6)
- [Таблица метрик и порогов](https://claude.ai/artifact/RAd4VLA9PASHLdSdq38N9A)

## 19. Дополнения под финальный набор экранов (10 ноября)

Лендинг вынесен в отдельный проект: в `apps/web` его нет, корень `/` для гостя перенаправляет на `/signup`, публичные страницы пасса остаются в приложении.

### Новые маршруты и вызовы

| Экран | Маршрут | Вызов API | Что за ним стоит |
| --- | --- | --- | --- |
| CheckEmail | /check-email | POST /api/auth/email/resend | Повтор письма не чаще раза в 60 секунд, не больше 5 в час на адрес. |
| ChooseHandleTaken | /onboarding/name | GET /api/handle/check?name= | Возвращает `available`, `reason` (taken, invalid, reserved) и до трёх свободных вариантов. |
| OffersConsent | /offers/consent | POST /api/me/consents | Тип `personal_offers`, хранится версия текста согласия. |
| CardTopUp | /card/top-up | GET /api/card/deposit-address?token=&network= | Адрес из Wirex (Rhino.fi): один для сетей EVM, отдельные для Solana и Tron. Кэшируется в `card_accounts`. |
| CardWithdraw | /card/withdraw | POST /api/card/withdrawals | Создаёт вывод на адрес в Base; подпись операции делает кошелёк пользователя на клиенте. |
| CardWithdrawStatus | /card/withdraw/:id | GET /api/card/withdrawals/:id | Состояния `sending`, `sent`, `unfinished`. Оба шага вывода делает SDK в браузере; сервер создаёт запись и сверяет её по веб-хуку `/v2/webhooks/erc-withdrawals` и по хэшу транзакции. |
| CardRevealConfirm | /card/details/confirm | POST /api/card/action-token | Запрашивает у Wirex токен действия (SMS или подпись), живёт 5 минут, в базу не пишется. |
| Card3ds | /card/3ds/:id | POST /api/card/3ds/:id/approve, /decline | Запрос приходит веб-хуком Wirex, пользователю уходит уведомление со ссылкой. |
| CardClose | /card/close | POST /api/card/close | Разрешён только при нулевом балансе; после закрытия открывается удаление аккаунта. |

### Изменения в данных

- Новая таблица `card_withdrawals`: id, user\_id, amount, token, to\_address, status (`sending`, `sent`, `unfinished`), request\_tx\_hash, final\_tx\_hash, call\_data, valid\_after, created\_at, updated\_at.
- Новая таблица `card_3ds_requests`: id, user\_id, merchant, amount, currency, status, expires\_at, wirex\_operation\_id.
- `card_accounts`: поля `deposit_address_evm`, `deposit_address_solana`, `deposit_address_tron`, `count_in_pass` (переключатель «Count card activity in my pass», по умолчанию включён).
- `users`: удаление запрещено, пока карта не в статусе `Closed`.

### Интерфейс CardProvider: добавить методы

Финальный контракт `CardProvider` приведён в разделе 11 и уже включает эти методы. В mock-реализации вывод переходит в `sent` через 5 секунд, запрос 3-D Secure создаётся из админки кнопкой (в песочнице Wirex — вспомогательным вызовом `POST /card/3ds/initiate`).

### Сквозные сценарии: добавить

14. Вход по почте: письмо, повторная отправка, переход по ссылке. 15. Занятое имя: ошибка и выбор предложенного варианта. 16. Пополнение: смена токена и сети меняет адрес и предупреждение. 17. Вывод: создание, ожидание, отправка, отклонение. 18. Показ номера карты только после подтверждения. 19. Закрытие карты при ненулевом балансе запрещено.

### Сверено с документацией Wirex (10 ноября)

Все вызовы идут с заголовками `Authorization: Bearer`, `X-User-Wallet`, `X-Chain-Id`.

| Тема | Что у Wirex | Что делаем мы |
| --- | --- | --- |
| 3-D Secure | Веб-хук `POST /v2/webhooks/3ds` с полями `card_id`, `user_address`, `transaction_id`, `merchant_name`, `amount`, `currency`, `card_last_4`. Список: `GET /api/v1/cards/3ds/requests`. Решение: `POST /api/v1/cards/3ds/requests/{transactionId}/approve` или `/decline`. Запрос истекает через 5 минут, время истечения не передаётся. | Сохраняем в `card_3ds_requests` с `expires_at` = время прихода веб-хука + 5 минут минус 15 секунд запаса; шлём уведомление со ссылкой на `/card/3ds/:id`. Ошибка «No Active Request» окончательная: показываем «запрос уже закрыт», не повторяем. Запасной путь без нашего участия: код из SMS. |
| Лимиты | `GET /api/v1/cards/{cardId}` отдаёт объект `limit`; `PUT /api/v1/cards/{cardId}/limit` принимает `daily_limit`, `monthly_limit`, `transaction_limit`; `-1` снимает лимит, `0` блокирует траты. Новая карта без лимитов. Счётчики обнуляются в 00:00 UTC. Веб-хук `/v2/webhooks/card-limits`. | После выпуска ставим дневной лимит из конфига `CARD_DEFAULT_DAILY_LIMIT`; в Card details показываем лимит и расход за день. Менять лимит можно только у активной карты. |
| Вывод | Целиком в блокчейне, без сервера Wirex: `sdk.crypto.transfer.makeFullErc20Transfer({ tokenAddress, recipientAddress, amount })` делает запрос и исполнение, задержка 3 секунды. Незавершённые: `GET /api/v1/withdrawal/requests` (поля `destination_address`, `amount`, `valid_after`, `hash`, `call_data`). Веб-хук `/v2/webhooks/erc-withdrawals` при создании запроса. | Клиент вызывает SDK; если второй шаг не прошёл, запись остаётся `unfinished`, кнопка «Finish the transfer» вызывает `makeErc20TransferFinal(call_data)`. Отмены нет. Минимум и комиссия в документации не указаны. |
| Карта | Статусы Requested, NotActivated (только физические), Active, Blocked, Closed. `PUT /api/v1/cards/{cardId}/block`, `/unblock`, `/close`. Поле `allowed_actions` говорит, что разрешено в текущем статусе. Веб-хук `/v2/webhooks/cards`. | Кнопки на экранах карты включаем по `allowed_actions`. |
| Кэшбэк | В описании баланса указано, что cashback и промо-начисления зачисляются на баланс прямым начислением. Вызов для партнёра в прочитанных страницах не описан. | `cashback_ledger` ведём у себя; выплата скрыта за флагом `CASHBACK_PAYOUT_ENABLED` до ответа Wirex. |
| Apple Pay, Google Pay | Привязка карты к кошельку телефона не описана. | Кнопка «Add to phone wallet» за флагом `PHONE_WALLET_ENABLED`, по умолчанию выключена. |

Маршруты нашего API для вывода в таблице выше читать так: `POST /api/card/withdrawals` создаёт запись перед вызовом SDK, `PATCH /api/card/withdrawals/:id` принимает хэши транзакций и итоговое состояние. Вызов `setOnlinePayments` удалён: такой настройки у Wirex нет.
