import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@/constants/theme';
import type { ItemDraft, DraftError } from '@/services/shopping/itemDraft';
import type { PriceUnit, PromoType, SizeUnit } from '@/types/domain';
import { parseMoney, parseQuantity } from '@/utils/money';
import { AppText } from './AppText';
import { Chips } from './Chips';
import { QuantityStepper } from './QuantityStepper';
import { TextField } from './TextField';

const SIZE_UNITS: { value: SizeUnit; label: string }[] = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'l', label: 'L' },
  { value: 'un', label: 'un' },
];

const PRICE_UNITS: { value: PriceUnit; label: string }[] = [
  { value: 'un', label: 'Por unidade' },
  { value: 'kg', label: 'Por kg' },
  { value: 'l', label: 'Por litro' },
];

const PROMO_TYPES: { value: PromoType; label: string }[] = [
  { value: 'none', label: 'Sem promoção' },
  { value: 'sale', label: 'De / Por' },
  { value: 'multibuy', label: 'Leve X pague Y' },
  { value: 'nth_unit_discount', label: '2ª unidade com desconto' },
  { value: 'min_quantity', label: 'A partir de X un' },
];

const moneyText = (value: number | null) => (value === null ? '' : value.toFixed(2).replace('.', ','));
const numberText = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value).replace('.', ','));
const parseOptionalNumber = (text: string) => parseQuantity(text);

export interface ItemFormProps {
  draft: ItemDraft;
  onChange: (draft: ItemDraft) => void;
  errors?: DraftError[];
  /** Campos que a IA leu com baixa confiança. */
  uncertain?: ('name' | 'price' | 'size' | 'brand')[];
}

export function ItemForm({ draft, onChange, errors = [], uncertain = [] }: ItemFormProps) {
  const [priceText, setPriceText] = useState(moneyText(draft.shelfPrice));
  const [promoText, setPromoText] = useState(moneyText(draft.promoPrice));
  const [weightText, setWeightText] = useState(numberText(draft.quantity));
  const update = (patch: Partial<ItemDraft>) => onChange({ ...draft, ...patch });
  const updatePromo = (patch: Partial<ItemDraft['promo']>) => update({ promo: { ...draft.promo, ...patch } });
  const weighable = draft.priceUnit !== 'un';
  const usesPromoPrice = draft.promo.type === 'sale' || draft.promo.type === 'min_quantity';

  return (
    <View style={styles.form}>
      <TextField
        label="Produto"
        value={draft.name}
        onChangeText={(name) => update({ name })}
        placeholder="Ex.: Coca-Cola Original"
        highlight={uncertain.includes('name')}
        error={errors.includes('name') ? 'Informe o nome do produto' : null}
      />
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField label="Marca" value={draft.brand ?? ''} onChangeText={(brand) => update({ brand })} highlight={uncertain.includes('brand')} />
        </View>
        <View style={styles.flex}>
          <TextField label="Descrição" value={draft.description ?? ''} onChangeText={(description) => update({ description })} placeholder="Sabor, tipo..." />
        </View>
      </View>

      <View style={styles.group}>
        <TextField
          label="Peso / volume"
          value={numberText(draft.sizeValue)}
          onChangeText={(text) => update({ sizeValue: parseOptionalNumber(text) })}
          keyboardType="decimal-pad"
          placeholder="Ex.: 2"
          highlight={uncertain.includes('size')}
        />
        <Chips options={SIZE_UNITS} value={draft.sizeUnit} onChange={(sizeUnit) => update({ sizeUnit })} />
      </View>

      <View style={styles.group}>
        <TextField
          label={usesPromoPrice ? 'Preço normal' : 'Preço'}
          prefix="R$"
          value={priceText}
          onChangeText={(text) => {
            setPriceText(text);
            update({ shelfPrice: parseMoney(text) });
          }}
          keyboardType="decimal-pad"
          placeholder="0,00"
          highlight={uncertain.includes('price')}
          error={errors.includes('price') ? 'Informe o preço da etiqueta' : null}
        />
        <Chips options={PRICE_UNITS} value={draft.priceUnit} onChange={(priceUnit) => update({ priceUnit, quantity: priceUnit === 'un' ? 1 : draft.quantity })} />
      </View>

      <View style={styles.group}>
        <AppText variant="label">Promoção</AppText>
        <Chips options={PROMO_TYPES} value={draft.promo.type} onChange={(type) => update({ promo: { type }, promoPrice: type === 'sale' || type === 'min_quantity' ? draft.promoPrice : null })} />
        {usesPromoPrice ? (
          <TextField
            label="Preço promocional"
            prefix="R$"
            value={promoText}
            onChangeText={(text) => {
              setPromoText(text);
              update({ promoPrice: parseMoney(text) });
            }}
            keyboardType="decimal-pad"
          />
        ) : null}
        {draft.promo.type === 'multibuy' ? (
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField label="Leve" value={numberText(draft.promo.buyQuantity)} onChangeText={(t) => updatePromo({ buyQuantity: parseOptionalNumber(t) })} keyboardType="number-pad" />
            </View>
            <View style={styles.flex}>
              <TextField label="Pague" value={numberText(draft.promo.payQuantity)} onChangeText={(t) => updatePromo({ payQuantity: parseOptionalNumber(t) })} keyboardType="number-pad" />
            </View>
          </View>
        ) : null}
        {draft.promo.type === 'nth_unit_discount' ? (
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField label="Unidade" value={numberText(draft.promo.nthUnit ?? 2)} onChangeText={(t) => updatePromo({ nthUnit: parseOptionalNumber(t) })} keyboardType="number-pad" />
            </View>
            <View style={styles.flex}>
              <TextField label="Desconto %" value={numberText(draft.promo.discountPercent)} onChangeText={(t) => updatePromo({ discountPercent: parseOptionalNumber(t) })} keyboardType="number-pad" />
            </View>
          </View>
        ) : null}
        {draft.promo.type === 'min_quantity' ? (
          <TextField label="A partir de (unidades)" value={numberText(draft.promo.buyQuantity)} onChangeText={(t) => updatePromo({ buyQuantity: parseOptionalNumber(t) })} keyboardType="number-pad" />
        ) : null}
      </View>

      <View style={styles.group}>
        {weighable ? (
          <TextField
            label={`Quantidade estimada (${draft.priceUnit})`}
            value={weightText}
            onChangeText={(text) => {
              setWeightText(text);
              const quantity = parseQuantity(text);
              if (quantity) update({ quantity });
            }}
            keyboardType="decimal-pad"
            error={errors.includes('quantity') ? 'Informe a quantidade' : null}
          />
        ) : (
          <>
            <AppText variant="label">Quantidade</AppText>
            <QuantityStepper value={draft.quantity} onChange={(quantity) => update({ quantity })} />
          </>
        )}
        {weighable ? (
          <AppText variant="caption">O peso exato vem do cupom; aqui é só para estimar o total.</AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
