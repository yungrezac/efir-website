# Панель администратора EFIR

Адрес после развёртывания: `https://efirlive.pro/admin`.

Панель использует обычную авторизацию Supabase. Сервисный ключ в сайт не передаётся. Доступ к данным и изменениям выполняют `security definer` RPC из `admin-access.sql`, которые дополнительно проверяют пользователя по таблице `admin_users`.

## Первичная настройка

1. Выполнить `exclusive-apps.sql`, затем `admin-access.sql` в SQL Editor проекта Supabase.
2. Добавить администратора один раз из SQL Editor:

```sql
insert into public.admin_users(user_id)
select id from auth.users where lower(email) = lower('admin@example.com')
on conflict do nothing;
```

Эксклюзивная выдача одновременно показывает скрытое эксклюзивное приложение в лаунчере и разрешает его запуск без подписки. Выдача «Без подписки» разрешает запуск выбранного приложения, но не показывает скрытое эксклюзивное приложение в каталоге.
