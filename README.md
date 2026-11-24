# Coffeo API

Fastify 5, Prisma 7, PostgreSQL. Робоча гілка — `dev`; `main` є старою версією. Next.js UI/BFF розташований в [окремому репозиторії](https://github.com/LeoFom/coffee-shop/tree/dev).

Потік: браузер → Next BFF → цей API → PostgreSQL. Реєстрація завжди створює Customer; продуктами керує Admin. API вже має модулі auth, profile, product, cart, order та інтеграційний модуль Нової пошти. Наявність модуля не є прийманням усіх бізнес-сценаріїв.

## Документи

- [Правила Codex](AGENTS.md), [розгортання та безпека БД](DEPLOYMENT.md)
- [Аудит](https://github.com/LeoFom/coffee-shop/blob/dev/docs/PROJECT_AUDIT_UA.md), [план](https://github.com/LeoFom/coffee-shop/blob/dev/docs/IMPLEMENTATION_PLAN_UA.md), [технічні рішення](https://github.com/LeoFom/coffee-shop/blob/dev/docs/TECHNICAL_IMPLEMENTATION_UA.md)
- [Історичні доступи та рішення власника](docs/security/C0_3_STATUS_UA.md), [C0.4: tooling і CI](docs/C0_4_RULES_AND_CI_UA.md)

## Локальна робота

Потрібні Node.js 24 та окрема PostgreSQL. Скопіювати `.env.example` у `.env`, додати локальні серверні значення й застосувати чинні міграції до призначеної порожньої dev БД командою `npm run db:deploy`. Потім `npm run dev`. Паролі й bootstrap ніколи не брати з історичного коду.

```sh
npm ci --include=dev
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run db:validate
```

`npm test` запускає інтеграційні тести та format-gate тести. Він потребує `NODE_ENV=test`, ізольованої PostgreSQL із застосованими міграціями та синтетичних auth/internal secrets. Локально можна задати їх через ігнорований `.env.test`; CI використовує disposable PostgreSQL. Не підставляти production env. `npm run test:tooling` працює без БД.
