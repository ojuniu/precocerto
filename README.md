# PreçoCerto

**Confira. Compare. Não pague a mais.**

App mobile (iOS e Android) que funciona como um fiscal de preços pessoal: você fotografa as etiquetas na prateleira, o app reconhece produto e preço, monta a lista com o total esperado e, no fim, lê o cupom fiscal e aponta cada item cobrado diferente da etiqueta.

```
📸 foto da etiqueta → 🤖 reconhecimento → ✅ confirmar → 🛒 próximo produto
                                    ...
🧾 foto do cupom → 🔗 matching → ⚖️ comparação → ⚠️ divergências
```

---

## 1. Stack

| Camada | Tecnologia |
|---|---|
| App | React Native 0.86 + Expo SDK 57 + TypeScript estrito |
| Navegação | Expo Router (rotas em `/app`) |
| Estado | Zustand |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| IA / OCR | Edge Function `ai-vision` com adapters Gemini (padrão) e OpenAI |
| Testes | Jest + ts-jest (regras de negócio) |

## 2. Arquitetura

```
app/                      Rotas (Expo Router). Arquivos finos que só apontam para /screens
screens/                  Telas (UI + orquestração de stores, sem regra de negócio)
components/               Componentes reutilizáveis (Button, Card, ItemForm, ComparisonLineCard, PriceChart...)
store/                    Zustand: auth, shopping, scan, conference, history, subscription
hooks/                    Hooks compartilhados
services/
  ai/                     AIProvider (interface) + SupabaseEdgeAIProvider + parse.ts (validação das respostas)
  ocr/                    Etiqueta: foto → imagem otimizada → IA → leitura + avaliação de confiança
  image/                  Redimensionamento/compressão antes do envio
  receipt/                Cupom: normalização, linhas duplicadas, descontos, conferência de totais
  productMatching/        Matching etiqueta ↔ cupom (abreviações, tamanhos, marcas, desempate semântico por IA)
  pricing/                Regras de preço: promoções, leve X pague Y, 2ª unidade, por kg, estatísticas
  comparison/             Comparação prateleira × caixa e o fluxo completo da conferência
  shopping/               Rascunho de item, validação e persistência de produtos da compra
  subscription/           Planos, entitlements e interface de pagamento (freemium)
  data/                   Repositórios Supabase (única camada que fala com o banco)
types/                    Tipos de domínio e contratos de IA
utils/ constants/         Formatação (R$, datas), erros, tema, limiares
supabase/
  migrations/             Schema, RLS, triggers, funções, bucket de storage
  functions/ai-vision/    Edge Function (Deno) com os provedores de IA
__tests__/                Testes das regras de negócio
```

Princípios aplicados:

- **Nenhuma chamada de IA em componentes.** Telas chamam stores → services → `getAIProvider()`.
- **Trocar de IA não muda o app.** No servidor, `AI_PROVIDER=gemini|openai`. Para outro fornecedor, implemente `VisionProvider` em `supabase/functions/ai-vision/providers/`. No app, `setAIProvider()` aceita qualquer implementação de `AIProvider` (ex.: um OCR on-device).
- **Nada de resultado inventado.** Toda resposta da IA passa por `services/ai/parse.ts`; campos ilegíveis viram `null`, a confiança é medida e leituras fracas exigem confirmação manual.
- **Matching nunca assume em silêncio.** Abaixo de 82% de confiança a correspondência vai para o usuário ("É o mesmo produto?").
- **Regras de negócio puras e testadas.** `pricing`, `productMatching`, `receipt`, `comparison`, `subscription` não dependem de React Native.

### Fluxo do cupom (o coração do app)

1. `scanReceipt` reduz a foto e envia à IA (`task: receipt`).
2. `normalizeReceipt` completa preços unitários, agrupa linhas repetidas (mesmo produto passado duas vezes), aplica descontos por item e confere se a soma bate com o total.
3. `matchProducts` pontua cada par etiqueta × linha do cupom (tokens com abreviações expandidas, "COCA" ~ "Coca-Cola", tamanho 2L = 2000ml, marca, proximidade de preço). Pares duvidosos vão para desempate semântico pela IA (`task: match`). A atribuição é 1:1.
4. `compareShopping` calcula o esperado **com a quantidade do cupom** e as regras da etiqueta (promoção, leve 3 pague 2, 2ª unidade com desconto, preço por kg) e compara com o valor cobrado.
5. Tudo é salvo (`receipts`, `receipt_items`, `item_matches`) e o resumo vai para `shoppings`.

### Casos especiais tratados

| Caso | Onde |
|---|---|
| Promoção de/por, preço clube | `pricing.ts` (`sale`) + `parse.ts` garante promo < normal |
| Leve X pague Y | `pricing.ts` (`multibuy`) |
| 2ª unidade com X% | `pricing.ts` (`nth_unit_discount`) |
| A partir de N unidades | `pricing.ts` (`min_quantity`) |
| Preço por kg / litro, pesáveis | `priceUnit` + peso vindo do cupom |
| Quantidade > 1 | quantidade do cupom; linhas repetidas agrupadas |
| Descontos no cupom | por item (`discount`) e descontos gerais (aviso) |
| Produto sem correspondência no cupom | seção "Fotografados, mas não encontrados" + vínculo manual |
| Produto do cupom não fotografado | seção "No cupom, mas não fotografados" |
| Etiqueta sem preço legível | leitura marcada como incerta → formulário com destaque |
| Várias etiquetas na mesma foto | modo Prateleira (Premium) com bbox e seleção |
| Mesmo produto fotografado 2x | soma a quantidade em vez de duplicar |

## 3. Banco de dados

Migração: `supabase/migrations/20261006000000_init.sql`.

| Tabela | Conteúdo |
|---|---|
| `profiles`, `subscriptions` | usuário e plano (criados por trigger no cadastro) |
| `markets` | supermercados (catálogo compartilhado) |
| `products` | catálogo de produtos (chave normalizada marca+nome+tamanho) |
| `shoppings` | compra: mercado, data, status, total esperado/pago, diferença, nº de divergências |
| `shopping_items` | produto fotografado: preço, promoção, quantidade, imagem, confiança |
| `shelf_prices` | observação de preço de prateleira (preenchida por trigger) |
| `receipts`, `receipt_items` | cupom lido e suas linhas |
| `item_matches` | correspondência etiqueta ↔ cupom, valores e "divergência confirmada" |
| `price_history` (view) | histórico unificado prateleira + caixa por produto |

Segurança (validada com testes SQL durante o desenvolvimento):

- RLS em todas as tabelas: cada usuário só lê e grava os próprios dados. Inserir item em compra de outro usuário é bloqueado.
- `subscriptions` só é escrita pelo backend (service role / webhook de pagamento).
- Limite do plano gratuito aplicado **no banco** (trigger `enforce_product_limit`, 80 produtos/mês).
- Bucket privado `scans`; cada usuário só acessa a pasta `{user_id}/`.
- `market_price_comparison()` devolve preços agregados e anônimos entre usuários (Premium).

## 4. Como rodar localmente

### Pré-requisitos

- Node 20+ e npm
- Conta no [Supabase](https://supabase.com) (plano gratuito serve) e [Supabase CLI](https://supabase.com/docs/guides/cli)
- Chave de API do Google Gemini ([aistudio.google.com/apikey](https://aistudio.google.com/apikey)) **ou** da OpenAI
- Celular com o app **Expo Go** (para testar rápido) ou Android Studio / Xcode

### Passo a passo

```bash
# 1. Dependências
npm install

# 2. Supabase: vincular o projeto e criar o banco
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push

# 3. Chave de IA (fica só no servidor)
npx supabase secrets set AI_PROVIDER=gemini GEMINI_API_KEY=sua-chave
#    (opcional) GEMINI_MODEL=gemini-2.5-flash
#    ou: npx supabase secrets set AI_PROVIDER=openai OPENAI_API_KEY=sua-chave OPENAI_MODEL=gpt-4o-mini

# 4. Publicar a Edge Function
npx supabase functions deploy ai-vision

# 5. Variáveis do app
cp .env.example .env
#    preencha EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY
#    (Supabase → Project Settings → API)

# 6. Rodar
npx expo start
```

Escaneie o QR code com o Expo Go. Para um build nativo: `npx expo run:android` ou `npx expo run:ios`.

### Configurações no painel do Supabase

- **Authentication → Sign In / Providers → Anonymous sign-ins: ativar.** É o que permite o botão "Começar agora" sem cadastro. O usuário pode virar conta com e-mail depois (tela Conta) sem perder o histórico.
- **Authentication → Email:** se "Confirm email" estiver ligado, o cadastro por e-mail pede confirmação antes do primeiro login.

### Rodar tudo localmente (sem nuvem)

Com Docker instalado:

```bash
npx supabase start                       # sobe Postgres, Auth, Storage local e aplica a migração
cp supabase/functions/.env.example supabase/functions/.env   # coloque sua GEMINI_API_KEY
npx supabase functions serve ai-vision --env-file supabase/functions/.env
```

Use a URL e a anon key que o `supabase start` imprime no `.env` do app. No celular, troque `127.0.0.1` pelo IP da sua máquina na rede.

## 5. Variáveis de ambiente

App (`.env`, públicas):

| Variável | Obrigatória | Descrição |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | sim | URL do projeto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | sim | anon key (pública; a proteção vem do RLS) |
| `EXPO_PUBLIC_AI_FUNCTION_NAME` | não | nome da Edge Function (padrão `ai-vision`) |

Edge Function (secrets do Supabase, **nunca no app**):

| Secret | Descrição |
|---|---|
| `AI_PROVIDER` | `gemini` (padrão) ou `openai` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | chave e modelo do Gemini (padrão `gemini-2.5-flash`) |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | chave e modelo da OpenAI (padrão `gpt-4o-mini`) |

`SUPABASE_URL` e `SUPABASE_ANON_KEY` são injetadas automaticamente pelo Supabase na função.

## 6. Comandos

```bash
npm start            # Expo dev server
npm run android      # abrir no Android
npm run ios          # abrir no iOS
npm test             # testes das regras de negócio (Jest)
npm run typecheck    # TypeScript estrito (app + testes)
npm run lint         # ESLint (config Expo)
```

## 7. O que já funciona

- Login sem cadastro (anônimo) ou por e-mail; conversão de visitante em conta.
- Nova compra com busca/criação de supermercado e data automática.
- Câmera com guia de enquadramento, lanterna, galeria e tela de processamento.
- Leitura real de etiqueta pela IA (nome, marca, descrição, peso/volume, preço, preço promocional, tipo de promoção, preço por kg/l) com confiança por campo.
- Tela "Produto identificado" com miniatura, confirmar/editar e alerta de baixa confiança com confirmação manual.
- Confirmar volta direto para a câmera (próximo produto) com total da compra visível.
- Lista da compra com total estimado, edição e remoção de itens.
- Leitura em lote de prateleira (várias etiquetas, bbox, seleção) – Premium.
- Leitura de cupom pela câmera ou galeria: itens, quantidades, unitário, total, descontos, subtotal e total.
- Matching etiqueta ↔ cupom com confirmação do usuário para casos duvidosos e vínculo manual.
- Conferência: esperado × cobrado × diferença, divergências destacadas, "Confirmar divergência", itens sem correspondência dos dois lados.
- Histórico de compras com resumo; abrir compra antiga mostra a conferência completa.
- Histórico de preços por produto com gráfico, atual, média, menor e maior (Premium).
- Comparação entre mercados com "🏆 Melhor preço" (Premium, dados agregados).
- Freemium: limite mensal aplicado no banco, telas bloqueadas com convite ao Premium, paywall.
- Fotos salvas em storage privado por usuário.

Validação feita durante o desenvolvimento: TypeScript estrito sem erros, ESLint limpo, 41 testes unitários, bundles Android e iOS gerados com `expo export`, migração SQL e políticas RLS testadas em Postgres (21 checagens), Edge Function verificada com `deno check` e executada localmente (autenticação, validação, bloqueio Premium e erro de configuração), e o fluxo de telas percorrido em navegador headless.

## 8. O que depende de configuração externa

| Item | O que fazer |
|---|---|
| Projeto Supabase | criar o projeto, `supabase db push`, preencher `.env` |
| Chave de IA | `supabase secrets set GEMINI_API_KEY=...` e publicar `ai-vision`. Sem ela, a câmera funciona mas a leitura mostra "Serviço de IA não configurado" e oferece digitar manualmente |
| Login anônimo | ativar em Authentication → Providers |
| Pagamentos | `services/subscription/paymentProvider.ts` hoje é `NotConfiguredPaymentProvider`. Para cobrar: implemente `PaymentProvider` (RevenueCat ou Play/App Store Billing), chame `setPaymentProvider()` no início do app e grave o plano em `subscriptions` via webhook com a service role |
| Liberar Premium para testes | no SQL Editor: `update subscriptions set plan = 'premium' where user_id = '<uuid>';` |
| Ícone e splash definitivos | substituir os arquivos em `assets/` |
| Publicação nas lojas | `npx eas-cli build` / `submit` |

## 9. Preparado para o futuro

- **Comparação automática de mercados / mapa:** `markets` já tem `latitude`/`longitude`; `market_price_comparison()` pronto.
- **Alertas de preço:** `price_history` + feature `price_alerts` no plano.
- **Leitura de encartes:** basta um novo `VisionTask` no `AIProvider` e um prompt na Edge Function.
- **Dados confiáveis de preço:** `item_matches.divergence_confirmed` registra divergências confirmadas pelo usuário.
- **Painel para varejistas / inteligência de preços:** catálogo compartilhado de `products` e `markets` + observações em `shelf_prices`.
