# C0.5 — release baseline

Дата: 24.11.2026. Замовлений scope — зафіксувати перевірені версії, середовища й порядок випуску/відкату без зміни хмарної конфігурації.

Створені [manifest](releases/2026-11-24-baseline.json) та [інструкція релізу й відкату](RELEASE_AND_ROLLBACK_UA.md). Копії однакові в API та web, щоб оператор мав усі deployment/migration targets незалежно від checkout.

## Зафіксований стан

| Компонент                   | Версія                                       | Доказ                                                                                                                                            |
| --------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| API dev і Render production | `4085ab946271a8507d2279d3ea1eb670683c768c`   | Render live `dep-dc2v6b60tbcc738rd5i0`, [CI success](https://github.com/LeoFom/fastify-prisma-app/actions/runs/45480830945)                      |
| Web dev / preview           | `00e8df13adea0176c1c3a0161e0d0677c5c26dee`   | READY preview `dpl_A7zyakC5UZGXijN9pdvetipWZxH6`, [CI success](https://github.com/LeoFom/coffee-shop/actions/runs/45480407017)                   |
| Web production              | `a31adeb384121d678d6617f33045f8bb88f3158a`   | Production domain резолвиться в `dpl_6ZJquJL4HBzXCBbmSdYEyFoEAnXo`, [CI success](https://github.com/LeoFom/coffee-shop/actions/runs/45463925271) |
| PostgreSQL production       | 8 міграцій до `20260907160319_add_user_role` | Read-only журнал: усі finished, не rolled back; 8/8 checksums збігаються з repository SQL                                                        |

Manifest містить SHA-256 схеми, migration lock, SQL та npm lockfiles. Хешування використовує LF, щоб Windows checkout не створював хибного розходження. Це immutable snapshot до документаційного коміту C0.5. Наступний docs push може автоматично створити deployment того самого коду з новим commit ID; він не переписує історичне спостереження в manifest.

## Результати перевірок та межі

- Production read-only: `/health/live` 200, `/health/ready` 200, HEAD `/shop` 200. Покупці/замовлення в production не створювалися.
- Production migration journal перевірений без читання customer rows. Schema drift не перевірявся.
- У test branch немає `_prisma_migrations`: відокремлено schema/fixture testing від репетиції Prisma migration chain. Цю БД не «виправляли» прихованим baseline/reset. CI disposable PostgreSQL залишається джерелом перевірки ланцюжка.
- Постійного full-stack staging немає. Ізоляція preview API/env не підтверджена. В інструкції описані безкоштовна локальна репетиція та заплановане кероване переключення, а не оголошене наявним staging.
- Конектор не відкрив поточну налаштовану Vercel Production Branch: значення не вигадано, перед релізом його слід перевірити. Робочі SHA та ціль production domain перевірені окремо.
- Локальні перевірки пройдені: manifest-копії ідентичні; 8/8 migration fingerprints, schema/migration lock та npm lockfiles збігаються; перевірено 31 локальне посилання; format gate обох repo пройшов. CI саме документаційного коміту перевіряється після push. Попередній CI не зараховується замість нього.
- Немає schema/code/dependency changes. Повторні локальні продуктові build/E2E для документації не запускалися; чинні перевірені SHA наведено вище, новий CI виконує звичайні checks.
- Rollback та restore drill не виконувалися. Жодних нових платних ресурсів, гілок Neon, env-змін, auto-deploy/production-branch змін або ручного production promotion.

## Приймання C0.5

Reviewable manifest розрізняє dev, preview і production; є схема міграцій та ціль відкату для кожного компонента. Оператор бачить фактичний ризик production-linked `dev`, відсутнього staging та test migration ledger. Процедура описує сумісний rollout і відокремлює code rollback від відновлення даних.

Рішення власника щодо старих доступів не змінені: Nodemailer відкликано за повідомленням власника, MongoDB вирішено видалити, інші історичні відкликання відкладені. Це не підтвердження повної ротації й не заборона на вже доручений C0.5.

Наступний квиток — C1.1: узгодити API-контракт v1, DTO та сумісність старих маршрутів. Він не виконується автоматично в C0.5.

Публікація: API docs commit містить `[skip render]`, щоб не перебудовувати незмінений сервер; GitHub CI залишається активним. Vercel production promotion не запитується. [Render skip phrase](https://render.com/docs/deploys#skipping-an-auto-deploy).
