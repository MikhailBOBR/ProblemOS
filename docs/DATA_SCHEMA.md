# Data Schema

Этот файл фиксирует PostgreSQL/Django-compatible модель данных. Текущий MVP хранит данные в JSON, но названия сущностей и полей уже держим близко к будущей базе.

## users

| field | type | note |
| --- | --- | --- |
| id | uuid/text pk | `user_*` в MVP |
| email | varchar unique | логин |
| password_hash | text | PBKDF2 hash |
| full_name | varchar | ФИО пользователя |
| phone | varchar nullable | контакт |
| telegram_id | varchar nullable unique | привязка Telegram |
| role | varchar | `user`, `admin`, позже `expert` |
| created_at | timestamptz | дата создания |
| updated_at | timestamptz | дата обновления |

## cases

| field | type | note |
| --- | --- | --- |
| id | uuid/text pk | `case_*` в MVP |
| user_id | fk users | владелец |
| category_id | fk categories | сценарий |
| title | varchar | короткое название |
| description | text | исходное описание |
| facts | jsonb | структурированные ответы |
| status | varchar | статус workflow |
| priority | varchar | `normal`, `medium`, `high` |
| next_action | text | подсказка системы |
| deadline_at | timestamptz nullable | ближайший срок |
| result | text nullable | итог |
| created_at | timestamptz | дата создания |
| updated_at | timestamptz | дата обновления |
| closed_at | timestamptz nullable | дата закрытия |

## case_steps

| field | type | note |
| --- | --- | --- |
| id | uuid/text pk | шаг маршрута |
| case_id | fk cases | дело |
| title | varchar | название шага |
| description | text | пояснение |
| status | varchar | `todo`, `active`, `done`, `blocked` |
| order | integer | порядок |
| deadline_at | timestamptz nullable | срок шага |
| completed_at | timestamptz nullable | завершение |

## evidence

| field | type | note |
| --- | --- | --- |
| id | uuid/text pk | `evidence_*` |
| case_id | fk cases | дело |
| evidence_type | varchar | тип из playbook категории |
| title | varchar | пользовательское название |
| description | text | комментарий |
| file_name | varchar | оригинальное имя |
| file_type | varchar | MIME |
| file_size | integer | размер |
| storage_key | varchar | путь внутри storage |
| file_hash | varchar | SHA-256 |
| uploaded_at | timestamptz | дата загрузки |

## document_templates

| field | type | note |
| --- | --- | --- |
| id | uuid/text pk | шаблон |
| category_id | fk categories | категория |
| title | varchar | название |
| type | varchar | `claim`, `request`, `complaint`, `act` |
| body | text | шаблон с `{{variables}}` |
| variables | jsonb | список переменных |
| is_active | boolean | доступен для генерации |

## generated_documents

| field | type | note |
| --- | --- | --- |
| id | uuid/text pk | документ |
| case_id | fk cases | дело |
| template_id | fk document_templates | источник |
| title | varchar | название |
| content | text | итоговый текст |
| variables | jsonb | значения подстановки |
| format | varchar | сейчас `rtf` |
| created_at | timestamptz | дата генерации |

## notifications

| field | type | note |
| --- | --- | --- |
| id | uuid/text pk | уведомление |
| user_id | fk users | получатель |
| case_id | fk cases nullable | связанное дело |
| type | varchar | тип события |
| title | varchar | заголовок |
| message | text | текст |
| is_read | boolean | прочитано |
| read_at | timestamptz nullable | дата прочтения |
| channel | varchar | `in_app`, позже `telegram/email` |
| dedupe_key | varchar nullable | защита от дублей scheduler |
| meta | jsonb | дополнительные данные |
| telegram_status | varchar | `pending`, `sent`, `failed` |
| telegram_delivered_at | timestamptz nullable | отправка в Telegram |
| telegram_error | text nullable | ошибка отправки |
| send_at | timestamptz | когда показывать/отправлять |
| created_at | timestamptz | дата создания |

## case_comments

| field | type | note |
| --- | --- | --- |
| id | uuid/text pk | комментарий |
| case_id | fk cases | дело |
| author_id | fk users | автор |
| text | text | текст комментария |
| created_at | timestamptz | дата создания |

## audit_logs

| field | type | note |
| --- | --- | --- |
| id | uuid/text pk | событие |
| actor_id | fk users nullable | кто сделал |
| case_id | fk cases nullable | связанное дело |
| entity_type | varchar | `case`, `evidence`, `document`, `user`, `telegram` |
| entity_id | varchar | id сущности |
| action | varchar | машинное имя события |
| title | varchar | читаемое название |
| details | jsonb | дополнительные данные |
| created_at | timestamptz | дата события |

## bot_sessions

| field | type | note |
| --- | --- | --- |
| id | uuid/text pk | сессия |
| user_id | fk users nullable | пользователь |
| telegram_id | varchar | Telegram user id |
| current_state | varchar | состояние диалога |
| data | jsonb | временные ответы |
| updated_at | timestamptz | дата обновления |
