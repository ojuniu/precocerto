// Prompts e formatos de saída. Todos os provedores recebem o mesmo prompt e devolvem o mesmo JSON.

const PRICE_TAG_FIELDS = `{
  "productName": string | null,        // nome do produto como um consumidor diria, sem marca repetida desnecessária
  "brand": string | null,
  "description": string | null,        // sabor/variante/tipo (ex.: "Original", "Integral", "Tipo 1")
  "sizeValue": number | null,          // ex.: 2 para "2L", 500 para "500g"
  "sizeUnit": "g" | "kg" | "ml" | "l" | "un" | "m" | null,
  "priceUnit": "un" | "kg" | "l",      // "kg" se o preço é por quilo (produto pesável)
  "regularPrice": number | null,       // preço normal; se houver só um preço, ele vai aqui
  "promoPrice": number | null,         // preço promocional ("por", "oferta", "clube"); null se não houver
  "promo": {
    "type": "none" | "sale" | "multibuy" | "nth_unit_discount" | "min_quantity",
    "buyQuantity": number | null,      // multibuy: "leve 3"; min_quantity: quantidade mínima
    "payQuantity": number | null,      // multibuy: "pague 2"
    "nthUnit": number | null,          // nth_unit_discount: 2 para "2ª unidade"
    "discountPercent": number | null   // nth_unit_discount: 50 para "50% off"
  },
  "priceLegible": boolean,             // false se o preço não estiver legível
  "fieldConfidence": { "name": number, "price": number, "size": number, "brand": number }, // 0 a 1
  "confidence": number                 // confiança geral 0 a 1
}`;

const RULES = `Regras:
- Responda SOMENTE com JSON válido, sem markdown.
- Preços em reais como número decimal com ponto (9.99). Nunca invente valores: se não conseguir ler, use null e reduza a confiança.
- Ignore preço por unidade de medida auxiliar ("R$ 4,99/L") quando houver o preço da embalagem; use-o apenas se for o único preço (e então ajuste priceUnit).
- Etiquetas de "De R$ X Por R$ Y": regularPrice = X, promoPrice = Y, promo.type = "sale".
- Confiança deve refletir a nitidez real da imagem.`;

export const PRICE_TAG_PROMPT = `Você é um leitor de etiquetas de preço de supermercados brasileiros.
Leia a etiqueta principal da imagem e responda neste formato:
${PRICE_TAG_FIELDS}
${RULES}`;

export const SHELF_PROMPT = `Você é um leitor de etiquetas de preço de supermercados brasileiros.
A imagem mostra uma prateleira com VÁRIAS etiquetas. Leia cada etiqueta legível e responda:
{ "tags": [ ${PRICE_TAG_FIELDS.replace(/\n}$/, ',\n  "bbox": [x, y, largura, altura] // posição da etiqueta, valores normalizados 0 a 1\n}')} ] }
${RULES}`;

export const RECEIPT_PROMPT = `Você é um leitor de cupons fiscais brasileiros (NFC-e, SAT, cupom fiscal).
Extraia todos os itens comprados e responda SOMENTE com JSON neste formato:
{
  "marketName": string | null,
  "issuedAt": string | null,           // data/hora de emissão como aparece no cupom
  "items": [
    {
      "lineNumber": number | null,     // número do item no cupom
      "code": string | null,           // código do produto/EAN
      "description": string,           // descrição exatamente como impressa
      "quantity": number,              // quantidade ou peso (ex.: 0.452 para 0,452 kg)
      "unit": "un" | "kg" | "l",
      "unitPrice": number | null,      // valor unitário (ou por kg)
      "totalPrice": number | null,     // valor total da linha ANTES do desconto do item
      "discount": number               // desconto aplicado a este item (positivo), 0 se não houver
    }
  ],
  "subtotal": number | null,
  "discountTotal": number | null,      // soma dos descontos do cupom
  "total": number | null,              // valor total pago
  "confidence": number                 // 0 a 1
}
Regras:
- Linhas de desconto/cancelamento ("DESC", "DESCONTO", "CANC") não são itens: aplique o desconto ao item correspondente ou some em discountTotal.
- Itens cancelados devem ser omitidos.
- Valores como número decimal com ponto. Nunca invente valores.`;

export function matchPrompt(pairs: Array<{ shelf: { id: string; name: string }; receipt: { id: string; name: string } }>): string {
  return `Você compara nomes de produtos de supermercado. Cada par tem o nome lido na etiqueta da prateleira
e a descrição abreviada impressa no cupom fiscal. Diga se são o MESMO produto (mesma marca, variante e tamanho).
Responda SOMENTE com JSON: { "pairs": [ { "shelfId": string, "receiptId": string, "sameProduct": boolean, "confidence": number } ] }
Pares:
${JSON.stringify(pairs)}`;
}
