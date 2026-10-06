/** Limiares de confiança usados em toda a aplicação. */
export const CONFIDENCE = {
  /** Abaixo disso a leitura da etiqueta exige confirmação manual. */
  priceTagLow: 0.75,
  /** A partir disso uma correspondência cupom↔etiqueta é aceita automaticamente. */
  matchAuto: 0.82,
  /** Abaixo disso não há correspondência; entre os dois, o usuário confirma. */
  matchMin: 0.45,
} as const;

/** Tolerância (R$) para considerar dois preços iguais. */
export const PRICE_TOLERANCE = 0.01;

export const IMAGE = {
  priceTagMaxWidth: 1280,
  shelfMaxWidth: 1800,
  receiptMaxWidth: 1600,
  compress: 0.7,
} as const;

export const STORAGE_BUCKET = 'scans';
