import { CONFIDENCE } from '@/constants/config';
import type { PriceTagReading } from '@/types/ai';

export type MissingField = 'productName' | 'price';

export interface ReadingQuality {
  lowConfidence: boolean;
  missingFields: MissingField[];
  /** Campos legíveis mas com confiança baixa, para destacar no formulário. */
  uncertainFields: (keyof PriceTagReading['fieldConfidence'])[];
}

/** Decide se uma leitura de etiqueta pode ser confirmada direto ou precisa de revisão manual. */
export function assessPriceTag(reading: PriceTagReading): ReadingQuality {
  const missingFields: MissingField[] = [];
  if (!reading.productName) missingFields.push('productName');
  if (!reading.priceLegible || reading.regularPrice === null) missingFields.push('price');
  const uncertainFields = (Object.keys(reading.fieldConfidence) as (keyof PriceTagReading['fieldConfidence'])[]).filter(
    (field) => reading.fieldConfidence[field] < CONFIDENCE.priceTagLow,
  );
  const lowConfidence =
    missingFields.length > 0 ||
    reading.confidence < CONFIDENCE.priceTagLow ||
    uncertainFields.includes('price') ||
    uncertainFields.includes('name');
  return { lowConfidence, missingFields, uncertainFields };
}
