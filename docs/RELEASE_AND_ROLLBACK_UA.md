# Coffeo: реліз і відкат

Порядок для двох репозиторіїв Next.js BFF + Fastify + PostgreSQL. [Зафіксований baseline](releases/2026-11-24-baseline.json) є знімком спостереження, а не дозволом на розгортання, зміни env чи міграцію. C0.5 описує процедуру; її виконання — окреме завдання.

## Фактичні середовища на момент baseline

| Середовище                   | Що є                                                                            | Обмеження                                                                |
| ---------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Local dev/test               | Локальні Next та Fastify; окрема Neon `deployment-check`                        | Використовувати тільки test env і синтетичні fixtures                    |
| CI                           | Disposable PostgreSQL 17 для API; build/typecheck/lint/format/tests в обох repo | CI не є публічним staging                                                |
| Vercel preview               | Фронтенд `00e8df1`, deployment `dpl_A7zyakC5UZGXijN9pdvetipWZxH6`               | Ізоляція API/env не підтверджена; записи й E2E покупки заборонені        |
| Production                   | Render API `4085ab9`, Vercel web `a31adeb`, Neon `production`                   | Це фактична пара; новий web у dev ще не є production                     |
| Постійний full-stack staging | Не створений                                                                    | Окремого тестового Render API та підтвердженого preview → test API немає |

Render зараз слухає `dev` і автоматично розгортає після CI (`checksPass`). Тому `dev` **не ізольований staging**: push може змінити production API. Vercel `dev` наразі дає preview. Налаштована Production Branch не була відкрита відповідями конектора; перед майбутнім релізом перевірити її в Settings → Environments/Git. Legacy `main` обох repo не зливати та не використовувати як основу релізу.

## Версії та міграції

Кожен майбутній реліз фіксує пару повних API/web commit SHA, CI run IDs, lockfile fingerprints, порядок міграцій, deployment IDs, цільові БД та rollback targets. Branch name або «останній deployment» не є достатньою ідентифікацією. Зберігати новий manifest; попередній baseline не переписувати.

У production є 8 завершених міграцій до `20260907160319_add_user_role`; їхні checksums збігаються з SQL у репозиторії. Це перевірка журналу міграцій, **не schema-drift audit**. У `deployment-check` таблиці `_prisma_migrations` немає: цей test branch раніше готувався SQL вручну. Не запускати на ньому `migrate deploy` і не виставляти міграції applied навмання. Для репетиції ланцюжка використовується порожня disposable PostgreSQL у CI; для нового staging — окремо підготовлена БД із коректним журналом. Тестовий branch у C0.5 не змінюється.

Застосовані SQL не редагувати. Нові міграції перевіряти до production. Міграції й backup/restore використовують direct connection; runtime — pooled. Повний restore drill ще не виконаний; це критерій майбутнього приймання C8, не результат C0.5. [Neon: branches](https://neon.com/docs/introduction/branching).

## Порядок наступного релізу

1. **Зафіксувати scope та SHA.** Почати з перевіреного `dev`, для несумісних змін працювати у `codex/*`, а не пушити їх у production-linked dev. Не merge legacy main. Перевірити обидва repo, CI, потрібні контрактні версії й schema compatibility; створити новий manifest.
2. **Репетиція в ізоляції.** Застосувати весь ланцюжок на disposable DB; перевірити нову міграцію на підготовленому середовищі з репрезентативними дозволеними даними. Запустити UI → BFF → API: login/refresh, Customer/Admin guards, кошик, checkout, історію та logout на test DB. Не переносити production cookies/env у fixtures. Preview дозволяє записи тільки після доказу, що він спрямований на окремий test API/DB.
3. **Підготувати контрольований випуск.** Погоджене завдання релізу має включати контроль Render auto-deploy та цільові project/service IDs. Запланований варіант — окремі release branches, створені з перевірених SHA, й кероване production переключення. Їх та хмарні настройки C0.5 не створює. Перед migration підготувати захищений backup і перевірений спосіб відновлення; файли з даними не класти в Git або CI artifacts.
4. **Розширити БД та API.** Тільки після перевірки точного production target і дозволу релізу застосувати backward-compatible міграції через `migrate deploy`. Не використовувати reset/dev/db push. API має підтримати старий web протягом rollout/rollback window. Якщо це неможливо — розділити зміну на expand → migration → contract. Нинішній Render start запускає `db:deploy`; врахувати це й при redeploy, й при поверненні старого коду.
5. **Випустити API за конкретним SHA.** Render → service `coffeo-api` → Manual Deploy → Deploy a specific commit. Перед підтвердженням перевірити service, SHA, env names і режим auto-deploy. Дочекатися live; перевірити `/health/live` і `/health/ready`. Внутрішні ключі порівнювати приватно, не виводити значення. [Render deploys](https://render.com/docs/deploys).
6. **Підготувати production build web без переключення домену.** Перевірити production `API_URL`/server key та точний SHA. Через підтримуваний staged production workflow створити build із production env без domain assignment, виконати read-only smoke і лише потім promote. Preview не вважати тотожним production build: зміна оточення може спричинити rebuild. Не запускати синтетичні замовлення на production. [Vercel promotion](https://vercel.com/docs/deployments/promoting-a-deployment).
7. **Перевірити та записати результат.** Фактичні deployment IDs, SHA, migration head, доступність магазину, auth error rates і технічні помилки. Наявність green CI не означає повне приймання магазину. Якщо впала readiness або старий клієнт перестав працювати — зупинити rollout, не повторювати міграції/checkout навмання.

До створення відокремленого staging мінімальна безкоштовна репетиція — локальні Next + Fastify з test DB та disposable PostgreSQL у GitHub CI. Вона не створює платних сервісів. Окремий hosted staging — наступне рішення про інфраструктуру, а не мовчазна зміна поточної конфігурації.

## Відкат

Baseline-кандидати повернення: API `4085ab946271a8507d2279d3ea1eb670683c768c` / `dep-dc2v6b60tbcc738rd5i0`; web `a31adeb384121d678d6617f33045f8bb88f3158a` / `dpl_6ZJquJL4HBzXCBbmSdYEyFoEAnXo`. Це доступні ідентифікатори на момент знімка; перед дією перевірити збереження artifacts та сумісність із поточною БД/env. Не повертатися до старих версій із виправленими security findings лише тому, що вони доступні в історії.

| Збій                                 | Дія оператора у межах погодженого rollback                                                   | Перевірка після                                                                                   |
| ------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Тільки web                           | Vercel project → Deployments → потрібний попередній production deployment → Instant Rollback | Production domain, фактичний SHA, shop/auth read-only; зберігається попередній build/env snapshot |
| API, схема сумісна                   | Render service → Deploys → потрібний успішний deploy → Rollback to this deploy               | Live/ready, поточний SHA, сумісність web, стан auto-deploy                                        |
| Новий API несумісний зі старим web   | Зупинити rollout; повернути сумісний web або API лише після перевірки матриці контрактів     | Не робити незалежний rollback одного компонента за випадковим SHA                                 |
| Нова схема несумісна зі старим кодом | Forward fix або окремий план data recovery                                                   | Не виконувати автоматичний down/reset; зберегти нові замовлення й історію                         |

**Відкат застосунку не відкочує PostgreSQL.** Відновлення backup поверх production може стерти пізніші записи, тому це окремий інцидентний план з аналізом втрат і явним дорученням. Перезапуск старого API з `db:deploy` не є механізмом скасування схеми.

Render Dashboard rollback вимикає auto-deploy; API rollback сам цього не робить. Після виправлення явно перевірити бажаний режим, інакше новий push може знову принести несправний код. [Render rollback](https://render.com/docs/rollbacks).

Vercel Instant Rollback повертає попередній build, а не перебудовує його з новими env. Після rollback автоматичне production assignment потребує відновлення через promote. Перед поверненням старого build врахувати ротацію ключів і сумісність із API; відкликані секрети не відновлювати. [Vercel Instant Rollback](https://vercel.com/docs/instant-rollback).

У C0.5 rollback, restore, migrations, env/branch changes та production promotion **не виконувалися**. Інструкція є reviewable планом, не доказом проведеної репетиції відновлення.
