# Goszakup MCP Server

Remote MCP сервер для госзакупок Казахстана. Подключается к Claude.ai на телефоне.

## Инструменты

| Инструмент | Описание |
|---|---|
| `goszakup_search` | Поиск лотов на goszakup.gov.kz |
| `goszakup_lot_detail` | Детали лота + документы |
| `goszakup_filters` | Регионы, статусы, методы |
| `samruk_search` | Поиск лотов на zakup.sk.kz |
| `samruk_lot_detail` | Детали лота Самрука |

## Деплой на Railway (бесплатно)

1. Зарегистрируйся на [railway.app](https://railway.app)
2. Создай новый проект → Deploy from GitHub repo
3. Загрузи эту папку в GitHub репозиторий
4. Railway автоматически задеплоит
5. Скопируй URL вида `https://xxx.railway.app`

## Подключение к Claude.ai на телефоне

1. Открой [claude.ai](https://claude.ai) в браузере телефона
2. Перейди в **Settings → Integrations → Add Integration**
3. Вставь URL: `https://YOUR-RAILWAY-URL.railway.app/sse`
4. Тип: **SSE**
5. Готово — инструменты появятся в чате

## Локальный запуск

```bash
npm install
npm run dev
```

Сервер запустится на `http://localhost:3000`
