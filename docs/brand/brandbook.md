# 🧀 Брендбук «Сыр» (FreeAI)

> Брендбук — единственный источник правды по визуалу, неймингу и tone of voice бота. При любых изменениях текста/визуала сначала сверяемся с этим документом.

---

## 1. Brand essence

**Что это:** бесплатный AI-чат в Telegram, который не врёт про «free». Да, бесплатно. Да, есть нюанс — ты приносишь свой Puter-токен. Эта честная самоирония — главный инсайт бренда.

**Promise:** доступ к 500+ моделям, ноль комиссий оператору. Свобода = твой токен в твоих руках.

**Personality:** самоироничный · дружелюбный · простой · скептичный · тёплый

**Values:**

- Не врём про «бесплатно» — catch обозначаем сразу.
- Уважаем юзера — никаких dark patterns, никаких рассылок.
- Operator pays $0 — и юзер тоже не платит нам.

---

## 2. Имя

| Слой | Что |
|---|---|
| Display name | **Сыр** |
| Технический / репо | FreeAI |
| Telegram-канал | `@privatekey_ai` (приватный ключ ≈ свой токен) |
| Бот-username | на твой выбор: `@cheez_ai_bot` / `@syr_ai_bot` / `@freeai_cheese_bot` |

**Слоганы:**

- 🟡 **«Бесплатный сыр без мышеловки»** — основной
- ⚪ **«Подгрызи свой AI»** — короткий, для постов
- ⚪ **«AI без мышеловки»** — мини, для подписей

---

## 3. Маскот: Сыр

**Канон (не менять):**

- Клиновидный кусок (треугольник, скошенный сбоку).
- **Ровно 3 круглые дырки**: две покрупнее, одна маленькая.
- Тёплый жёлтый `#FFC93C`, оранжевые тени `#E89B0E`.
- Корка по верху: тонкая полоса `#C77912`.
- **Плоская графика**, без 3D-рендеров.

**Эмоции (опциональные надстройки):**

| Состояние | Описание | Где |
|---|---|---|
| 😊 Базовый | улыбка, 2 точки-глаза | аватар, дефолт |
| 🤓 Учёный | круглые очки | посты-туториалы |
| 😎 Крутой | чёрные очки | релизы, новости |
| 🤔 Думающий | палец у дырки | «AI печатает...» |
| 💀 Мёртвый | крестики вместо глаз | error/404 |
| 🚀 Космонавт | в шлеме | major-релизы |

---

## 4. Палитра

| Роль | HEX | Где |
|---|---|---|
| **Primary** Сыр-жёлтый | `#FFC93C` | логотип, аватар, главные акценты |
| **Secondary** Корка | `#E89B0E` | тени, hover |
| Accent Подвал | `#C77912` | контуры, тёмные элементы |
| BG light Кремовый | `#FFF8E7` | фон постов |
| BG dark Шоколад | `#2B1810` | тёмный режим, текст на жёлтом |
| Mousetrap red | `#E63946` | **только** ошибки/warnings |
| Gruyère gold | `#D4A017` | premium-акценты |

Контрастная пара по умолчанию: **жёлтый + шоколад**. Этого хватает на 90% сценариев, проходит AA по контрасту.

---

## 5. Типографика

Telegram форсит свой шрифт — поэтому правила про шрифты применяются к **кросс-каналке** (баннеры, посты-картинки, медиа, сайт):

- **Display / Logo:** Druk Cyrillic / Pragmatica Bold. Бесплатные альтернативы — **Onest Black**, **Inter Black**.
- **Body:** **Inter** 400/500.
- **Mono:** **JetBrains Mono** — для токенов, ID, кода.

Внутри Telegram-сообщений: `**bold**` для ключевых слов, `_italic_` для нюансов, `` `mono` `` для команд/ID/моделей.

---

## 6. Voice & Tone

**База:** на «ты», коротко, без официоза, с лёгкой самоиронией. Не «Уважаемый пользователь», а «Окей, поехали».

### DO ✅

- «🧀 Подгрыз свой AI»
- «Сыр кончился 🪤» (для 404)
- «Токен такой же, как у меня — невалидный»
- 1 emoji на сообщение, не гирлянда
- Короткие предложения

### DON'T ❌

- «Уважаемый пользователь!»
- «🚀✨💎🔥💯» — ёлочка
- Капс
- Простыни — режем
- Извинения за бесплатность

### Канонические тексты

Эти строки реализованы в коде. При правках — сюда же.

| Где | Текст |
|---|---|
| Welcome (новый юзер) | `🧀 Привет, {имя}.\n\nЯ — Сыр. Бесплатный чат с 500+ AI-моделями: GPT, Claude, Gemini, Grok, DeepSeek и другими.\n\nМодель: {model}\nСтатус: 🪤 не вошёл\n\nЧтобы начать — жми «🔑 Войти в Puter» ниже.` |
| Welcome (вернувшийся) | `🧀 С возвращением, {имя}.\n\nМодель: {model}\nСтатус: 🧀 в деле\n\nПиши, что нужно — отвечу.` |
| Login intro (Mini App) | `🔑 Тапни кнопку — откроется Mini App с Puter. Войди по email или зарегайся.\n\n🚫 Google-вход внутри Telegram заблокирован самим Google. Если на Puter ты только через Google — открой {LOGIN_HELPER_URL} в обычном браузере: страничка покажет токен с кнопкой «Скопировать».` |
| Login intro (fallback) | `🔑 Достаём ключ от мышеловки\n\nAuth-helper ещё не настроен админом. Если ты уже знаешь свой Puter-токен — пришли его следующим сообщением.\n\nПередумал — «Отмена ❌».` |
| Login success | `🧀 Ты в сырной комнате, {username}. Пиши.` |
| Login error | `🪤 Не пускают. Puter ругается: «{error}». Кинь другой токен или «Отмена ❌».` |
| Cancel | `Откатил. Сыр цел.` |
| History cleared | `🗑️ Чисто. Сыр всё забыл.` |
| Subscription gate | `🪤 Сыра нет. Сначала подпишись на {channel}, потом возвращайся.` |
| Generic error | `💀 Сыр треснул. Попробуй ещё раз через секунду.` |

---

## 7. Иконография

- Толстая обводка 2-3 px цветом `#2B1810`
- Заливка из палитры
- Округлые углы (не острые)
- Сетки 24×24 / 48×48

**Иконки меню:**

| Раздел | Иконка |
|---|---|
| Главное меню | 🧀 |
| Модели | 🤓 (учёный сыр) |
| System prompt | 📝 |
| Очистить историю | 🗑️ |
| Войти в Puter | 🔑 |

В одном меню **не смешивать** свои иконки и стандартные emoji — выбираем что-то одно.

---

## 8. Применение

### 🤖 Аватар бота (512×512)

Базовый Сыр в улыбке, фон `#FFF8E7` (cream). Контур читается и на light, и на dark Telegram-темах.

**Промпт (Midjourney / DALL-E / Stable Diffusion):**

```
Flat vector illustration of a wedge of swiss cheese, triangular shape,
exactly three round holes (two larger, one smaller), warm yellow #FFC93C
body with orange #E89B0E shadows and a thin darker rind #C77912 along
the top edge, two small round black dot eyes and a small curved smile,
friendly minimalist mascot, thick #2B1810 outline 3px, cream background
#FFF8E7, no gradients, no 3D, no realistic textures, sticker style,
centered composition, 1:1 aspect ratio, 512x512
```

Для Midjourney добавь `--ar 1:1 --style raw --no realistic, photo, 3d, gradient`.

### 📢 Баннер канала (1280×640)

3-4 Сыра в разных эмоциях (учёный + крутой + базовый + космонавт) + слоган «Бесплатный сыр без мышеловки» в верхнем-левом углу.

**Промпт:**

```
Wide horizontal banner 1280x640, group of four flat-vector swiss cheese
wedges as cartoon mascots arranged in a row, each with three round holes,
different facial expressions: one with round nerd glasses, one with black
sunglasses, one with neutral smile, one wearing astronaut helmet. Warm
yellow #FFC93C bodies, thick #2B1810 outlines, cream background
#FFF8E7 with subtle dotted texture. Bold black display text in upper left
reading "Бесплатный сыр без мышеловки". Sticker style, no 3D, no gradients
```

### 🎨 Стикерпак (опционально, второй этап)

6-8 квадратных стикеров 512×512 с прозрачным фоном, одна эмоция = один стикер. Один промпт-шаблон, меняется только выражение:

```
Flat vector swiss cheese wedge mascot with three round holes, [EMOTION],
warm yellow #FFC93C, thick #2B1810 outline, transparent background,
sticker style, 512x512, centered
```

Где `[EMOTION]` =
- `smiling, two black dot eyes` — базовый
- `wearing round nerd glasses` — учёный
- `wearing black sunglasses, smug face` — крутой
- `thinking pose, finger near a hole, raised eyebrow` — думающий
- `shocked face, X-shaped eyes, tongue out` — мёртвый
- `wearing astronaut helmet, sparkles around` — космонавт
- `crying laughing, tears, wide grin` — рофлящий
- `winking, one eye closed, tiny heart nearby` — флиртующий

### 📣 Промо-пост в канале

```
🧀 СЫР

Бесплатный AI без мышеловки.
GPT-5, Claude, Gemini, Grok, DeepSeek —
все 500+ моделей за твой Puter-токен.

→ @your_bot_handle
```

---

## 9. Жёсткие НЕ

- 🚫 Другие сыры (моцарелла, фета, бри) — у нас канон, **жёлтый клин**.
- 🚫 3D-рендеры маскота.
- 🚫 Не 3 дырки / квадратный сыр.
- 🚫 Red/green как primary.
- 🚫 Капс и эмодзи-гирлянды.
- 🚫 Извиняться за бесплатность — гордимся, что `operator pays $0`.
- 🚫 Прятать catch — наоборот, шутим про него первыми.

---

## ASCII-набросок маскота

```
       ___________________
      /                   \
     /   o            o    \
     \        ‿            /
      \    O       O      /
       \                 /
        \      O        /
         \             /
          \___________/
```

Базовый Сыр: треугольный клин (вид сбоку, корочка-арка сверху), внутри ровно 3 круглые дырки `O`, два глаза-точки `o`, улыбка-дуга `‿`.

---

## История

- **2026-04-26** — v1.0, первая редакция: концепт «Сыр», палитра, ToV, канонические тексты.
