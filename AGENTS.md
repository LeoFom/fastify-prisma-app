# Coffeo API — правила роботи

Цей репозиторій — Fastify API Coffeo, не Lead Finder. Робоча гілка — `dev`; `main` містить стару версію. Не зливати старий код або конфіг із `main` автоматично. Зберігати два репозиторії: [UI/BFF](https://github.com/LeoFom/coffee-shop/tree/dev) і цей API.

## Перед змінами

- Прочитати [актуальний аудит](https://github.com/LeoFom/coffee-shop/blob/dev/docs/PROJECT_AUDIT_UA.md), [план](https://github.com/LeoFom/coffee-shop/blob/dev/docs/IMPLEMENTATION_PLAN_UA.md), відповідний розділ [технічних рішень](https://github.com/LeoFom/coffee-shop/blob/dev/docs/TECHNICAL_IMPLEMENTATION_UA.md), `DEPLOYMENT.md` та релевантні ADR у `docs/adr/`.
- Виконувати лише замовлений квиток. Наступний — за окремим дорученням. Старі `project-description/*` у web — історичний контекст, не актуальний backlog.
- Не створювати платні ресурси та не змінювати хмарну конфігурацію без відповідного доручення. Звичайний push `dev` може запускати CI й Render; не створювати зайвих deployment.

## Архітектура й безпека

- Потік запитів: browser → Next.js BFF → Fastify → Prisma/PostgreSQL. `INTERNAL_API_KEY` залишається на серверах. Цей ключ не замінює авторизацію користувача та перевірку ролі з БД.
- Routes → controller → service → repository; бізнес-правила й остаточні суми визначає API. TypeScript strict. Не додавати Supabase starter або клієнтський доступ до PostgreSQL.
- Публічна реєстрація створює тільки Customer й відхиляє додаткові поля. Не відновлювати ADMIN_EMAIL. Admin bootstrap — окрема контрольована операція, див. ADR-003.
- Секрети читати з env; у Git тільки порожні приклади. Не друкувати env, cookies, токени, raw payload чи персональні дані. Історичні секрети не використовувати повторно; очищення Git не означає відкликання у провайдера. Статуси — у `docs/security/C0_3_STATUS_UA.md`.
- Не змінювати робочу поведінку checkout, авторизації чи сесій у косметичному/CI-квитку. Проєктовані money DTO, ідемпотентність, склад і COD реалізуються відповідними наступними квитками, а не вважаються вже завершеними.

## Дані та перевірки

- Міграції — новими файлами. Не редагувати виконані міграції. Не виконувати reset, seed, bootstrap або тестові покупки на production. БД Coffeo та Lead Finder не змішувати.
- Тести записують лише синтетичні fixtures в ізольовану test PostgreSQL. Перед DB-тестами перевірити ціль без виведення URL/пароля. `npm run db:deploy` дозволений для test DB; production migration потребує відповідного доручення й плану відновлення.
- Перевірити `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run build`, `npm run db:validate`, `npm test` та `npm audit --audit-level=high`. Для тестів спочатку застосувати міграції на test DB. Не зараховувати незапущений CI як успішний.
- Форматування: спільний Prettier config із web. `.format-baseline.json` фіксує тільки незмінений початковий борг; новий або змінений файл повинен пройти Prettier. Не додавати baseline entries, щоб обійти перевірку; форматувати лише файли свого квитка.
- У звіті назвати зміни, виконані перевірки, неперевірені пункти, статус CI і наступний квиток. Не оголошувати весь крок завершеним, якщо є непідтверджені критерії; рішення власника про відкладення записувати явно.
