-- Modo Caixa: conferência item a item na hora de pagar, antes do cupom.
alter table public.shopping_items
  add column checkout_status text not null default 'pending'
    check (checkout_status in ('pending', 'passed', 'wrong')),
  add column checkout_charged_price numeric(12, 2)
    check (checkout_charged_price is null or checkout_charged_price >= 0);
